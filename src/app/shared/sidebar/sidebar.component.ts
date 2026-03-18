import {
  Component, HostListener, inject, type OnDestroy, type OnInit,
  Inject, PLATFORM_ID, Input
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { SidebarService } from '../sidebar/sidebar.service';
import type { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
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
  private isBrowser: boolean;

  isExpanded = false;
  isMobile = false;
  activeRoute = '';
  isPinned = false;
  @Input() isBlurred = false;

  private isUserInteraction = false;
  private hoverTimeout: any;

  userProfile: UserProfile = {
    name: sessionStorage.getItem('username') || 'Guest User',
    role: sessionStorage.getItem('RoleName') || 'Guest',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNDEyIDRTMTQuMjEgNiAxNiA4UzEyIDEwLjIxIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDQgMTUuMzQgNCAyMFYyMkgyMFYyMEMxNiAxNS4zNCAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K',
    isOnline: true,
  };

  menuItems: NavItem[] = [];

  private subscriptions: Subscription[] = [];

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
      this.setupMenuItems();

      if (this.isPinned && !this.isMobile) {
        this.sidebarService.expand();
      }
    }

    this.subscriptions.push(
      this.sidebarService.sidebarState$.subscribe(state => {
        this.isExpanded = state;
      })
    );

    this.subscriptions.push(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.activeRoute = event.urlAfterRedirects;
          this.updateExpandedStates();
          if (this.isMobile && this.isExpanded) {
            this.sidebarService.collapse();
          }
        }
      })
    );

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

  // ── Screen size ───────────────────────────────────────────────

  private checkScreenSize(): void {
    if (!this.isBrowser || typeof window === 'undefined') return;
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;

    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        this.sidebarService.collapse();
        this.isUserInteraction = false;
      } else {
        if (this.isPinned) {
          this.sidebarService.expand();
        } else {
          this.sidebarService.collapse();
          this.isUserInteraction = false;
        }
      }
    }
  }

  // ── User profile ──────────────────────────────────────────────

  private setupUserProfile(): void {
    const storedUsername = sessionStorage.getItem('username');
    const storedRole = sessionStorage.getItem('RoleName');
    if (storedUsername) this.userProfile.name = storedUsername;
    if (storedRole) this.userProfile.role = storedRole;
  }

  // ── Menu items per role ───────────────────────────────────────

  private setupMenuItems(): void {
    const role = sessionStorage.getItem('RoleName') || '';

    switch (role) {

      // ── Admin: full access ──────────────────────────────────
      case 'Admin':
        this.menuItems = [
          { label: 'Dashboard', route: '/dashboard', icon: 'fas fa-tachometer-alt' },
          { label: 'User Management', route: '/user-management', icon: 'fas fa-user-shield' },
          { label: 'Employees', route: '/employees', icon: 'fas fa-users' },
          { label: 'Departments', route: '/departments', icon: 'fas fa-sitemap' },
          { label: 'Designations', route: '/designations', icon: 'fas fa-award' },
          {
            label: 'Leave',
            icon: 'fas fa-plane-departure',
            expanded: false,
            children: [
              { label: 'Leave Management', route: '/leave/list', icon: 'fas fa-list-alt' },
              { label: 'Leave Types', route: '/leave-types', icon: 'fas fa-tags' },
              { label: 'Leave Balances', route: '/leave-balance/list', icon: 'fas fa-wallet' },
            ]
          },
        ];
        break;

      case 'Tehsildar':
        this.menuItems = [
          { label: 'Dashboard', route: '/dashboard', icon: 'fas fa-tachometer-alt' },
          { label: 'Employees', route: '/employees', icon: 'fas fa-users' },
          {
            label: 'Leave',
            icon: 'fas fa-plane-departure',
            expanded: false,
            children: [
              { label: 'Leave Management', route: '/leave/list', icon: 'fas fa-list-alt' },
            ]
          },
        ];
        break;

      case 'NayabTehsildar':
        this.menuItems = [
          { label: 'Dashboard', route: '/dashboard', icon: 'fas fa-tachometer-alt' },
          { label: 'Employees', route: '/employees', icon: 'fas fa-users' },
          {
            label: 'Leave',
            icon: 'fas fa-plane-departure',
            expanded: false,
            children: [
              { label: 'Leave Management', route: '/leave/list', icon: 'fas fa-list-alt' },
            ]
          },
        ];
        break;

      // ── Employee: minimal access ────────────────────────────
      case 'Employee':
        this.menuItems = [
          { label: 'Dashboard', route: '/dashboard', icon: 'fas fa-tachometer-alt' },
          {
            label: 'Leave',
            icon: 'fas fa-plane-departure',
            expanded: false,
            children: [
              { label: 'My Leaves', route: '/my-leaves', icon: 'fas fa-list-alt' },
            ]
          },
        ];
        break;

      // ── Fallback ────────────────────────────────────────────
      default:
        this.menuItems = [
          { label: 'Dashboard', route: '/dashboard', icon: 'fas fa-tachometer-alt' },
        ];
        break;
    }
  }

  // ── Navigation helpers ────────────────────────────────────────

  private updateExpandedStates(): void {
    this.menuItems.forEach(item => {
      if (item.children) {
        item.expanded = item.children.some(c => c.route && this.isActive(c.route));
      }
    });
  }

  isActive(route: string): boolean {
    const curr = this.activeRoute.replace(/\/$/, '');
    const compare = route.replace(/\/$/, '');
    return curr === compare;
  }

  isParentActive(item: NavItem): boolean {
    if (item.children) {
      return item.children.some(c => c.route && this.isActive(c.route));
    }
    return false;
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  toggleSubmenu(item: NavItem): void {
    if (item.children) item.expanded = !item.expanded;
  }

  trackByRoute(_index: number, item: NavItem): string {
    return item.route || item.label;
  }

  // ── Sidebar expand / collapse ─────────────────────────────────

  togglePin(): void {
    this.isPinned = !this.isPinned;
    this.isUserInteraction = this.isPinned;
    if (this.isBrowser) localStorage.setItem('sidebarPinned', String(this.isPinned));
    if (this.isPinned) {
      this.sidebarService.expand();
    } else if (!this.isExpanded) {
      this.sidebarService.collapse();
    }
  }

  toggleSidebar(): void {
    this.isUserInteraction = true;
    this.sidebarService.toggle();
  }

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

  // ── Misc ──────────────────────────────────────────────────────

  onImageError(event: any): void {
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNDEyIDRTMTQuMjEgNiAxNiA4UzEyIDEwLjIxIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDQgMTUuMzQgNCAyMFYyMkgyMFYyMEMxNiAxNS4zNCAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
  }

  openSettings(): void {
    this.router.navigate(['/settings']);
  }

  logout(): void {
    sessionStorage.removeItem('UserId');
    sessionStorage.removeItem('EmployeeId');
    sessionStorage.removeItem('SiteName');
    sessionStorage.removeItem('RoleName');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('deviceId');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('Email');
    sessionStorage.removeItem('FirstName');
    sessionStorage.removeItem('LastName');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.router.navigate(['/login']);
  }
}