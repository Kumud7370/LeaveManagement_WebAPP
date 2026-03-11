import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService, Theme } from '../services/theme.service';
import { trigger, style, transition, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-wrap">

      <!-- ── PAGE HEADER ── -->
      <div class="page-header">
        <div class="page-title">Settings Management</div>
        <div class="page-subtitle">Manage your preferences and configurations.</div>
      </div>

      <div class="settings-content" @listAnim>

        <!-- ── THEME TOGGLE ── -->
        <div class="section-block toggle-block" @cardAnim>
          <div class="toggle-row">
            <div class="toggle-left">
              <div class="toggle-icon-wrap" [class.is-dark]="current === 'dark'">
                <i class="fas" [class.fa-sun]="current === 'light'" [class.fa-moon]="current === 'dark'"></i>
              </div>
              <div>
                <div class="toggle-label">Active Theme</div>
                <div class="toggle-value">{{ current === 'light' ? '☀️ Light Mode is active' : '🌙 Dark Mode is active' }}</div>
              </div>
            </div>
            <button class="switch-pill" (click)="toggle()">
              <span class="pill-track" [class.dark-track]="current === 'dark'">
                <span class="pill-thumb" [class.dark-thumb]="current === 'dark'"></span>
              </span>
              <span class="pill-label">{{ current === 'light' ? 'Switch to Dark' : 'Switch to Light' }}</span>
            </button>
          </div>
        </div>

        <!-- ── NOTIFICATIONS ── -->
        <div class="section-block notif-block" @cardAnim>
          <div class="notif-header">
            <div class="toggle-left">
              <div class="notif-icon-wrap">
                <i class="fas fa-bell"></i>
              </div>
              <div>
                <div class="toggle-label">Notifications</div>
                <div class="toggle-value">Manage your alert preferences</div>
              </div>
            </div>
          </div>

          <div class="notif-divider"></div>

          <div class="notif-row">
            <div class="notif-row-left">
              <div class="notif-dot green"></div>
              <div>
                <div class="notif-row-title">Email Alerts</div>
                <div class="notif-row-desc">Receive important updates via email</div>
              </div>
            </div>
            <button class="switch-pill notif-toggle">
              <span class="pill-track dark-track">
                <span class="pill-thumb dark-thumb"></span>
              </span>
              <span class="pill-label">On</span>
            </button>
          </div>

          <div class="notif-divider"></div>

          <div class="notif-row">
            <div class="notif-row-left">
              <div class="notif-dot cyan"></div>
              <div>
                <div class="notif-row-title">Push Notifications</div>
                <div class="notif-row-desc">Get real-time alerts on your device</div>
              </div>
            </div>
            <button class="switch-pill notif-toggle">
              <span class="pill-track">
                <span class="pill-thumb"></span>
              </span>
              <span class="pill-label">Off</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

    :host { display: block; font-family: 'DM Sans', sans-serif; }

    .settings-wrap {
      min-height: 100vh;
      background: var(--bg-primary, #f8f9fa);
      position: relative;
      padding-bottom: 3rem;
    }

    /* ── PAGE HEADER (matches Dashboard style) ── */
    .page-header {
      padding: 2rem 2.5rem 0.75rem;
      max-width: 960px;
      margin: 0 auto;
    }

    .page-title {
      font-family: 'DM Sans', sans-serif;
      font-size: 2rem;
      font-weight: 800;
      color: #1a2a6c;
      letter-spacing: -0.3px;
      margin: 0 0 0.25rem 0;
    }

    .page-subtitle {
      font-size: 0.95rem;
      color: #6b7280;
      font-weight: 400;
      margin: 0;
    }

    /* ── CONTENT ── */
    .settings-content {
      max-width: 960px;
      margin: 0 auto;
      padding: 1.5rem 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .section-block {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 1.75rem 2rem;
      box-shadow: 0 1px 8px rgba(0,0,0,0.05);
      position: relative;
      overflow: hidden;
    }

    /* ── THEME TOGGLE ── */
    .toggle-block { padding: 1.4rem 2rem; }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .toggle-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .toggle-icon-wrap {
      width: 44px; height: 44px;
      border-radius: 12px;
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem;
      color: #f59e0b;
      transition: all 0.3s;
      &.is-dark {
        background: rgba(99,102,241,0.08);
        border-color: rgba(99,102,241,0.2);
        color: #818cf8;
      }
    }

    .toggle-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.9px;
      color: #6b7280;
      font-weight: 600;
    }

    .toggle-value {
      font-size: 0.92rem;
      font-weight: 600;
      color: #1a2a6c;
      margin-top: 2px;
    }

    .switch-pill {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.55rem 1.1rem 0.55rem 0.65rem;
      border-radius: 50px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      cursor: pointer;
      transition: all 0.2s;
      color: #374151;
      font-size: 0.82rem;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      &:hover {
        border-color: #00ffcc;
        box-shadow: 0 2px 12px rgba(0,255,204,0.12);
        transform: translateY(-1px);
      }
    }

    .pill-track {
      width: 36px; height: 19px;
      border-radius: 20px;
      background: #d1d5db;
      position: relative;
      transition: background 0.3s;
      flex-shrink: 0;
      &.dark-track { background: #00ffcc; }
    }

    .pill-thumb {
      position: absolute;
      top: 2.5px; left: 2.5px;
      width: 14px; height: 14px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
      &.dark-thumb { transform: translateX(17px); }
    }

    .pill-label { white-space: nowrap; }

    /* ── NOTIFICATIONS BLOCK ── */
    .notif-block { padding: 1.4rem 2rem; }

    .notif-header { margin-bottom: 0; }

    .notif-icon-wrap {
      width: 44px; height: 44px;
      border-radius: 12px;
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.2);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem;
      color: #818cf8;
    }

    .notif-divider {
      height: 1px;
      background: #e5e7eb;
      margin: 1rem 0;
    }

    .notif-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .notif-row-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .notif-dot {
      width: 9px; height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
      &.green  { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.6); }
      &.cyan   { background: #06b6d4; box-shadow: 0 0 6px rgba(6,182,212,0.6); }
      &.orange { background: #f97316; box-shadow: 0 0 6px rgba(249,115,22,0.6); }
    }

    .notif-row-title {
      font-size: 0.88rem;
      font-weight: 600;
      color: #1a2a6c;
    }

    .notif-row-desc {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 1px;
    }

    .notif-toggle {
      padding: 0.45rem 0.85rem 0.45rem 0.55rem;
      font-size: 0.78rem;
    }

    @media (max-width: 600px) {
      .page-header { padding: 1.5rem 1.25rem 0.5rem; }
      .page-title { font-size: 1.35rem; }
      .settings-content { padding: 1.25rem 1rem; }
      .toggle-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .notif-row { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
    }
  `],
  animations: [
    trigger('listAnim', [
      transition(':enter', [
        query('@cardAnim', stagger(100, [animate('1ms')]), { optional: true })
      ])
    ]),
    trigger('cardAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class SettingsComponent implements OnInit {
  private themeService = inject(ThemeService);
  private router = inject(Router);

  get current() { return this.themeService.currentTheme; }

  ngOnInit() {}

  setTheme(t: Theme) { this.themeService.setTheme(t); }
  toggle() { this.themeService.toggleTheme(); }
  goBack() { this.router.navigate(['/dashboard']); }
}