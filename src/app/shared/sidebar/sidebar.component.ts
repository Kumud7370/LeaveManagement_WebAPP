import {
  Component, HostListener, inject, OnDestroy, OnInit,
  Inject, PLATFORM_ID, Input, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { SidebarService } from '../sidebar/sidebar.service';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LanguageService } from '../../core/services/api/language.api';
import { ApiClientService } from '../../core/services/api/apiClient';

interface NavItem {
  labelKey: string;
  label: string;
  route?: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
  expanded?: boolean;
}

interface UserProfile {
  name: string;
  role: string;
  avatar: string;
  isOnline: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  animations: [
    trigger('fadeInOut', [
      state('in', style({ opacity: 1 })),
      transition(':enter', [style({ opacity: 0 }), animate('300ms ease-in', style({ opacity: 1 }))]),
      transition(':leave', [animate('300ms ease-out', style({ opacity: 0 }))]),
    ]),
    trigger('expandCollapse', [
      state('expanded', style({ height: '*', opacity: 1 })),
      state('collapsed', style({ height: '0px', opacity: 0 })),
      transition('expanded <=> collapsed', animate('300ms ease-in-out')),
    ]),
  ],
})
export class SidebarComponent implements OnInit, OnDestroy {
  public router = inject(Router);
  private sidebarService = inject(SidebarService);
  private langService = inject(LanguageService);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser: boolean;
  private apiClient = inject(ApiClientService);

  isExpanded = false;
  isMobile = false;
  activeRoute = '';
  isPinned = false;
  @Input() isBlurred = false;

  private hoverTimeout: any;
  private subscriptions: Subscription[] = [];

  userProfile: UserProfile = {
    name: sessionStorage.getItem('username') || 'Guest User',
    role: sessionStorage.getItem('RoleName') || 'Guest',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNDEyIDRTMTQuMjEgNiAxNiA4UzEyIDEwLjIxIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDQgMTUuMzQgNCAyMFYyMkgyMFYyMEMxNiAxNS4zNCAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K',
    isOnline: true,
  };

  menuItems: NavItem[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      const savedPinState = localStorage.getItem('sidebarPinned');
      this.isPinned = savedPinState === 'true';
    }
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.checkScreenSize();
      this.setupUserProfile();
      if (this.isPinned && !this.isMobile) this.sidebarService.expand();
    }

    this.subscriptions.push(
      this.sidebarService.sidebarState$.subscribe(state => {
        this.isExpanded = state;
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.push(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.activeRoute = event.urlAfterRedirects;
          this.updateExpandedStates();
          if (this.isMobile && this.isExpanded) this.sidebarService.collapse();
        }
      })
    );

    // Re-translate when language switches
    this.subscriptions.push(
      this.langService.lang$.subscribe(() => {
        this.translateMenuItems();
        this.cdr.detectChanges();
      })
    );

    // Build menu AFTER lang$ subscription is registered,
    // then ensure translations are loaded before resolving labels
    if (this.isBrowser) {
      this.setupMenuItems();
    }

    this.activeRoute = this.router.url;
    this.updateExpandedStates();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.isBrowser) this.checkScreenSize();
  }

  private checkScreenSize(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        this.sidebarService.collapse();
      } else {
        if (this.isPinned) { this.sidebarService.expand(); }
        else { this.sidebarService.collapse(); }
      }
    }
  }

  private setupUserProfile(): void {
    const storedUsername = sessionStorage.getItem('username');
    const storedRole = sessionStorage.getItem('RoleName');
    if (storedUsername) this.userProfile.name = storedUsername;
    if (storedRole) this.userProfile.role = storedRole;
  }

  private setupMenuItems(): void {
    const role = sessionStorage.getItem('RoleName') || '';
    this.menuItems = this.getRawMenuForRole(role);

    console.log('=== SIDEBAR DEBUG ===');
    console.log('1. Menu items built:', this.menuItems.length);
    console.log('2. Lang service cache:', (this.langService as any).cache);
    console.log('3. Lang service loaded:', (this.langService as any).loaded);
    console.log('4. t(menu.dashboard):', this.langService.t('menu.dashboard'));

    this.apiClient.get<Record<string, string>>('Translation/flat?lang=mr').subscribe({
      next: (flat) => {
        console.log('5. API response keys:', Object.keys(flat).length);
        console.log('6. Sample key:', flat['menu.dashboard']);
        (this.langService as any).cache['mr'] = flat;
        (this.langService as any).loaded['mr'] = true;
        this.translateMenuItems();
        console.log('7. After translate, first label:', this.menuItems[0]?.label);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('5. API FAILED:', err.status, err.message, err.url);
      }
    });
  }

  private getRawMenuForRole(role: string): NavItem[] {
    switch (role) {
      case 'Admin':
        return [
          { labelKey: 'menu.dashboard', label: '', route: '/dashboard', icon: 'fas fa-tachometer-alt' },
          { labelKey: 'menu.userManagement', label: '', route: '/user-management', icon: 'fas fa-user-shield' },
          { labelKey: 'menu.employees', label: '', route: '/employees', icon: 'fas fa-users' },
          { labelKey: 'menu.departments', label: '', route: '/departments', icon: 'fas fa-sitemap' },
          { labelKey: 'menu.designations', label: '', route: '/designations', icon: 'fas fa-award' },
          {
            labelKey: 'menu.leave', label: '', icon: 'fas fa-plane-departure', expanded: false,
            children: [
              { labelKey: 'menu.leaveManagement', label: '', route: '/leave/list', icon: 'fas fa-list-alt' },
              { labelKey: 'menu.leaveTypes', label: '', route: '/leave-types', icon: 'fas fa-tags' },
              { labelKey: 'menu.leaveBalances', label: '', route: '/leave-balance/list', icon: 'fas fa-wallet' },
            ]
          },
        ];

      case 'Tehsildar':
      case 'NayabTehsildar':
        return [
          { labelKey: 'menu.dashboard', label: '', route: '/dashboard', icon: 'fas fa-tachometer-alt' },
          { labelKey: 'menu.employees', label: '', route: '/employees', icon: 'fas fa-users' },
          {
            labelKey: 'menu.leave', label: '', icon: 'fas fa-plane-departure', expanded: false,
            children: [
              { labelKey: 'menu.leaveManagement', label: '', route: '/leave/list', icon: 'fas fa-list-alt' },
            ]
          },
        ];

      case 'Employee':
        return [
          { labelKey: 'menu.dashboard', label: '', route: '/dashboard', icon: 'fas fa-tachometer-alt' },
          {
            labelKey: 'menu.leave', label: '', icon: 'fas fa-plane-departure', expanded: false,
            children: [
              { labelKey: 'menu.myLeaves', label: '', route: '/my-leaves', icon: 'fas fa-list-alt' },
            ]
          },
        ];

      default:
        return [
          { labelKey: 'menu.dashboard', label: '', route: '/dashboard', icon: 'fas fa-tachometer-alt' },
        ];
    }
  }

private translateMenuItems(): void {
  const resolve = (items: NavItem[]): NavItem[] => {
    return items.map(item => ({
      ...item,
      label: this.langService.t(item.labelKey),
      children: item.children ? resolve(item.children) : undefined
    }));
  };
  this.menuItems = resolve(this.menuItems);
}

  // ── Computed labels for footer buttons ───────────────────────────
  get settingsLabel(): string { return this.langService.t('menu.settings'); }
  get pinLabel(): string {
    return this.isPinned
      ? this.langService.t('menu.unpinSidebar')
      : this.langService.t('menu.pinSidebar');
  }
  get logoutLabel(): string { return this.langService.t('menu.logout'); }

  // ── Navigation helpers ────────────────────────────────────────────
  private updateExpandedStates(): void {
    this.menuItems.forEach(item => {
      if (item.children) item.expanded = item.children.some(c => c.route && this.isActive(c.route));
    });
  }

  isActive(route: string): boolean {
    return this.activeRoute.replace(/\/$/, '') === route.replace(/\/$/, '');
  }

  isParentActive(item: NavItem): boolean {
    return item.children ? item.children.some(c => c.route && this.isActive(c.route)) : false;
  }

  navigateTo(route: string): void { this.router.navigateByUrl(route); }

  toggleSubmenu(item: NavItem): void {
    if (item.children) item.expanded = !item.expanded;
  }

  trackByRoute(_index: number, item: NavItem): string { return item.route || item.labelKey; }

  // ── Sidebar expand / collapse ─────────────────────────────────────
  togglePin(): void {
    this.isPinned = !this.isPinned;
    if (this.isBrowser) localStorage.setItem('sidebarPinned', String(this.isPinned));
    if (this.isPinned) { this.sidebarService.expand(); }
    else if (!this.isExpanded) { this.sidebarService.collapse(); }
  }

  toggleSidebar(): void { this.sidebarService.toggle(); }

  onSidebarPointerEnter(): void {
    if (this.isMobile) return;
    if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
    if (!this.isExpanded && !this.isPinned) this.sidebarService.expand();
  }

  onSidebarPointerLeave(): void {
    if (this.isMobile) return;
    if (this.isExpanded && !this.isPinned) {
      this.hoverTimeout = setTimeout(() => this.sidebarService.collapse(), 300);
    }
  }

  onImageError(event: any): void {
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNDEyIDRTMTQuMjEgNiAxNiA4UzEyIDEwLjIxIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDQgMTUuMzQgNCAyMFYyMkgyMFYyMEMxNiAxNS4zNCAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
  }

  openSettings(): void { this.router.navigate(['/settings']); }

  logout(): void {
    ['UserId', 'EmployeeId', 'SiteName', 'RoleName', 'token', 'refreshToken',
      'deviceId', 'username', 'Email', 'FirstName', 'LastName'].forEach(k => sessionStorage.removeItem(k));
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.router.navigate(['/login']);
  }
}