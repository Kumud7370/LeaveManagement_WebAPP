import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LanguageService } from '../core/services/api/language.api';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lang-switcher">
      <button
        class="lang-btn"
        [class.lang-btn--active]="currentLang === 'mr'"
        (click)="setLang('mr')"
        title="मराठी">
        म
      </button>
      <button
        class="lang-btn"
        [class.lang-btn--active]="currentLang === 'en'"
        (click)="setLang('en')"
        title="English">
        EN
      </button>
      <button
        class="lang-btn"
        [class.lang-btn--active]="currentLang === 'hi'"
        (click)="setLang('hi')"
        title="हिंदी">
        हि
      </button>
    </div>
  `,
  styles: [`
    .lang-switcher {
      display: flex;
      align-items: center;
      gap: 2px;
      background: rgba(0,0,0,0.06);
      border-radius: 8px;
      padding: 3px;
    }

    .lang-btn {
      padding: 4px 10px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #6b7280;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      line-height: 1;
      min-width: 30px;
      font-family: inherit;

      &:hover {
        background: rgba(0,0,0,0.08);
        color: #374151;
      }

      &--active {
        background: #1a2a6c !important;
        color: #ffffff !important;
        box-shadow: 0 1px 4px rgba(26, 42, 108, 0.3);
      }
    }
  `]
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  currentLang = 'mr';
  private sub!: Subscription;

  constructor(private langService: LanguageService) {}

  ngOnInit(): void {
    this.currentLang = this.langService.currentLang;
    this.sub = this.langService.lang$.subscribe(lang => {
      this.currentLang = lang;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  setLang(lang: 'mr' | 'en' | 'hi'): void {
    this.langService.setLang(lang);
  }
}