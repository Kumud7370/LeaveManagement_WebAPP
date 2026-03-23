import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

export type Lang = 'mr' | 'en' | 'hi';

@Injectable({ providedIn: 'root' })
export class LanguageService {

  private readonly STORAGE_KEY = 'appLang';
  private readonly API_BASE    = environment.apiUrl; 

  /** In-memory flat translation cache per language */
  private cache: Partial<Record<Lang, Record<string, string>>> = {};
  private loaded: Partial<Record<Lang, boolean>> = {};

  private langSubject = new BehaviorSubject<Lang>(this.getInitialLang());
  readonly lang$ = this.langSubject.asObservable();

  get currentLang(): Lang { return this.langSubject.value; }

  constructor(private http: HttpClient) {
    // Kick off load for the initial language silently
    this.loadTranslations(this.currentLang);
  }

  /** Call in APP_INITIALIZER to block render until first language is ready */
  async initialize(): Promise<void> {
    await this.loadTranslations(this.currentLang);
  }

  /** Switch language — loads from API if not cached yet */
  async setLang(lang: Lang): Promise<void> {
    localStorage.setItem(this.STORAGE_KEY, lang);
    await this.loadTranslations(lang);
    this.langSubject.next(lang);
  }

  /**
   * Translate a UI key.
   * Falls back: active lang → Marathi → English → raw key.
   */
  t(key: string): string {
    return this.cache[this.currentLang]?.[key]
        ?? this.cache['mr']?.[key]
        ?? this.cache['en']?.[key]
        ?? key;
  }

  /**
   * Returns the correct name from a multilingual object.
   * e.g. getLocalizedName(employee, 'firstName')
   *   tries firstNameMr / firstName / firstNameHi based on active language
   */
  getLocalizedName(obj: any, baseField: string): string {
    if (!obj) return '';
    const lang = this.currentLang;
    const mrField = baseField + 'Mr';
    const enField = baseField;
    const hiField = baseField + 'Hi';
    if (lang === 'mr') return obj[mrField] || obj[enField] || obj[hiField] || '';
    if (lang === 'en') return obj[enField] || obj[mrField] || obj[hiField] || '';
    if (lang === 'hi') return obj[hiField] || obj[mrField] || obj[enField] || '';
    return obj[enField] || '';
  }

  /** Returns the correct full name from an employee object */
  getEmployeeFullName(emp: any): string {
    if (!emp) return '';
    const lang   = this.currentLang;
    const mrName = [emp.firstNameMr, emp.middleNameMr, emp.lastNameMr].filter(Boolean).join(' ').trim();
    const enName = [emp.firstName,   emp.middleName,   emp.lastName  ].filter(Boolean).join(' ').trim();
    const hiName = [emp.firstNameHi, emp.middleNameHi, emp.lastNameHi].filter(Boolean).join(' ').trim();
    if (lang === 'mr') return mrName || enName || hiName || emp.fullName || '';
    if (lang === 'en') return enName || mrName || hiName || emp.fullName || '';
    if (lang === 'hi') return hiName || mrName || enName || emp.fullName || '';
    return emp.fullName || '';
  }

  getDepartmentName(dept: any): string {
    if (!dept) return '';
    return this.getLocalizedName(dept, 'departmentName');
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private async loadTranslations(lang: Lang): Promise<void> {
    if (this.loaded[lang]) return;
    try {
      const flat = await firstValueFrom(
        this.http.get<Record<string, string>>(
          `${this.API_BASE}/Translation/flat?lang=${lang}`
        )
      );
      this.cache[lang]  = flat;
      this.loaded[lang] = true;
    } catch (err) {
      console.warn(`[LanguageService] Could not load translations for "${lang}":`, err);
      // Mark as loaded with empty map so we don't keep retrying
      this.cache[lang]  = {};
      this.loaded[lang] = true;
    }
  }

  /** Force-reload a language (call after admin edits translations) */
  async reloadLang(lang: Lang): Promise<void> {
    this.loaded[lang] = false;
    await this.loadTranslations(lang);
    if (lang === this.currentLang) this.langSubject.next(lang);
  }

  private getInitialLang(): Lang {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Lang | null;
    return (stored === 'mr' || stored === 'en' || stored === 'hi') ? stored : 'mr';
  }
}