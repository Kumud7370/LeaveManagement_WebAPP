import { Component, HostListener, inject, type OnDestroy, type OnInit, Inject, PLATFORM_ID } from "@angular/core"
import { CommonModule, isPlatformBrowser } from "@angular/common"
import { Router, NavigationEnd, RouterModule } from "@angular/router"
import { SidebarService } from "../sidebar/sidebar.service"
import type { Subscription } from "rxjs"
import { trigger, state, style, transition, animate } from "@angular/animations"
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  label: string
  route?: string
  icon: string
  badge?: number
  children?: NavItem[]
  expanded?: boolean
}

interface UserProfile {
  name: string
  role: string
  avatar: string
  isOnline: boolean
}

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule, RouterModule, MatTooltipModule],
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
  animations: [
    trigger("fadeInOut", [
      state("in", style({ opacity: 1 })),
      transition(":enter", [style({ opacity: 0 }), animate("300ms ease-in", style({ opacity: 1 }))]),
      transition(":leave", [animate("300ms ease-out", style({ opacity: 0 }))]),
    ]),
    trigger("expandCollapse", [
      state("expanded", style({ height: "*", opacity: 1 })),
      state("collapsed", style({ height: "0px", opacity: 0 })),
      transition("expanded <=> collapsed", animate("300ms ease-in-out")),
    ]),
  ],
})
export class SidebarComponent implements OnInit, OnDestroy {
  public router = inject(Router)
  private sidebarService = inject(SidebarService)
  private isBrowser: boolean

  isExpanded = false
  isMobile = false
  activeRoute = ""
  isPinned = false
  private isUserInteraction = false
  private hoverTimeout: any

  userProfile: UserProfile = {
    name: sessionStorage.getItem('username') || 'Guest User',
    role: sessionStorage.getItem('RoleName') || 'Guest',
    avatar:
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNDEyIDRTMTQuMjEgNiAxNiA4UzEyIDEwLjIxIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDQgMTUuMzQgNCAyMFYyMkgyMFYyMEMxNiAxNS4zNCAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K",
    isOnline: true,
  }

  navItems: NavItem[] = [
    { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
    {
      label: "Employees",
      route: "/employees",
      icon: "fas fa-users"
    },
    {
      label: "Attendance",
      icon: "fas fa-calendar-check",
      expanded: false,
      children: [
        { label: "Check In/Out", route: "/attendance/check-in-out", icon: "fas fa-clock" },
        { label: "Attendance List", route: "/attendance/list", icon: "fas fa-list" },
        { label: "My Summary", route: "/attendance/summary", icon: "fas fa-chart-bar" },
        { label: "Regularization", route: "/attendance-regularization/list", icon: "fas fa-edit" }
      ]
    },
    { label: "Dashboard Overview", route: "/dashboard2", icon: "fas fa-chart-pie" },
    { label: "Departments", route: "/departments", icon: "fas fa-sitemap" },
    { label: "Designations", route: "/designations", icon: "fas fa-award" },
    { label: "Holidays", route: "/holidays", icon: "fas fa-calendar-alt" },
    {
      label: "Leave",
      icon: "fas fa-plane-departure",
      expanded: false,
      children: [
        { label: "Leave Management", route: "/leave/list", icon: "fas fa-list-alt" },
        { label: "Leave Types", route: "/leave-types", icon: "fas fa-tags" },
        { label: "Leave Balances",   route: "/leave-balance/list",  icon: "fas fa-wallet" },
      ]
    },
    { label: "Admin Invitations", route: "/admin-invitations", icon: "fas fa-envelope" }
  ]

  menuItems = this.navItems
  private subscriptions: Subscription[] = [];
  userSiteName: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";

    if (this.isBrowser) {
      const savedPinState = localStorage.getItem('sidebarPinned');
      this.isPinned = savedPinState === 'true';
    }
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.checkScreenSize()
      this.setupUserProfile()
      this.setupMenuItems()

      if (this.isPinned && !this.isMobile) {
        this.sidebarService.expand()
      }
    }

    this.subscriptions.push(
      this.sidebarService.sidebarState$.subscribe((state) => {
        this.isExpanded = state
      }),
    );

    this.subscriptions.push(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.activeRoute = event.urlAfterRedirects
          this.updateExpandedStates()

          if (this.isMobile && this.isExpanded) {
            this.sidebarService.collapse()
          }
        }
      }),
    );

    this.activeRoute = this.router.url;
    this.updateExpandedStates();
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe())
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout)
    }
  }

  @HostListener("window:resize")
  onResize() {
    if (this.isBrowser) {
      this.checkScreenSize()
    }
  }

  private checkScreenSize() {
    if (this.isBrowser && typeof window !== "undefined") {
      const wasMobile = this.isMobile
      this.isMobile = window.innerWidth < 768

      if (wasMobile !== this.isMobile) {
        if (this.isMobile) {
          this.sidebarService.collapse()
          this.isUserInteraction = false
        } else {
          if (this.isPinned) {
            this.sidebarService.expand()
          } else {
            this.sidebarService.collapse()
            this.isUserInteraction = false
          }
        }
      }
    }
  }

  private setupUserProfile() {
    const storedUsername = sessionStorage.getItem('username');
    const storedRole = sessionStorage.getItem('RoleName');

    if (storedUsername) {
      this.userProfile.name = storedUsername;
    }

    if (storedRole) {
      this.userProfile.role = storedRole;
    }
  }

  private setupMenuItems() {
    const uRoleName = sessionStorage.getItem('RoleName');

    if (uRoleName === 'SE' || uRoleName === 'AE') {
      this.menuItems = [
        { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
        { label: "Search Report", route: "/search-report", icon: "fas fa-search" },
        { label: "Verification", route: "/verifications", icon: "fas fa-check-circle" },
      ]
    } else if (uRoleName === 'CO') {
      this.menuItems = [
        { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
        { label: "Search Report", route: "/search-report", icon: "fas fa-search" },
        { label: "Billing Report", route: "/billing-report", icon: "fas fa-file-invoice-dollar" },
      ]
    } else if (uRoleName?.toLowerCase() === 'generator') {
      this.menuItems = [
        { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
        {
          label: "Logsheet",
          icon: "fas fa-clipboard-list",
          expanded: false,
          children: [
            { label: "Generate Logsheet", route: "/logsheet/generatelogsheet", icon: "fas fa-plus-circle" },
            { label: "Logsheet Report", route: "/logsheet/logsheetlist", icon: "fas fa-chart-line" },
          ],
        },
        { label: "Vehicles", route: "/vehiclelist", icon: "fas fa-truck" },
        { label: "Agency", route: "/agencylist", icon: "fas fa-building" },
      ]
    } else if (uRoleName?.toLowerCase() === 'admin') {
      this.menuItems = [
        { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
        { label: "Employees", route: "/employees", icon: "fas fa-users" },
        {
          label: "Attendance",
          icon: "fas fa-calendar-check",
          expanded: false,
          children: [
            { label: "Check In/Out", route: "/attendance/check-in-out", icon: "fas fa-clock" },
            { label: "Attendance List", route: "/attendance/list", icon: "fas fa-list" },
            { label: "My Summary", route: "/attendance/summary", icon: "fas fa-chart-bar" },
            { label: "Regularization", route: "/attendance-regularization/list", icon: "fas fa-edit" }
          ]
        },
        { label: "Dashboard Overview", route: "/dashboard2", icon: "fas fa-chart-pie" },
        { label: "Departments", route: "/departments", icon: "fas fa-sitemap" },
        { label: "Designations", route: "/designations", icon: "fas fa-award" },
        { label: "Holidays", route: "/holidays", icon: "fas fa-calendar-alt" },
        {
          label: "Leave",
          icon: "fas fa-plane-departure",
          expanded: false,
          children: [
            { label: "Leave Management", route: "/leave/list", icon: "fas fa-list-alt" },
            { label: "Leave Types", route: "/leave-types", icon: "fas fa-tags" },
            { label: "Leave Balances",   route: "/leave-balance/list",  icon: "fas fa-wallet" },
          ]
        },
        { label: "Admin Invitations", route: "/admin-invitations", icon: "fas fa-envelope" },
      ]
    } else if (uRoleName?.toLowerCase() === 'jo') {
      this.menuItems = [
        { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
        { label: "Logsheet Report", route: "/logsheet/logsheetlist", icon: "fas fa-chart-line" },
      ]
    } else if (uRoleName?.toLowerCase() === 'employee') {
      // ✅ Menu for regular employees
      this.menuItems = [
        { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
        {
          label: "Attendance",
          icon: "fas fa-calendar-check",
          expanded: false,
          children: [
            { label: "Check In/Out", route: "/attendance/check-in-out", icon: "fas fa-clock" },
            { label: "My Summary", route: "/attendance/summary", icon: "fas fa-chart-bar" },
            { label: "Request Regularization", route: "/attendance-regularization/create", icon: "fas fa-plus-circle" },
            { label: "My Requests", route: "/attendance-regularization/list", icon: "fas fa-list-alt" }
          ]
        },
      ]
    } else {
      this.menuItems = this.navItems;
    }
  }

  private updateExpandedStates() {
    this.menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => child.route && this.isActive(child.route));
        item.expanded = hasActiveChild;
      }
    });
  }

  togglePin() {
    this.isPinned = !this.isPinned;
    this.isUserInteraction = this.isPinned;

    if (this.isBrowser) {
      localStorage.setItem('sidebarPinned', String(this.isPinned));
    }

    if (this.isPinned) {
      this.sidebarService.expand();
    } else {
      if (!this.isExpanded) {
        this.sidebarService.collapse();
      }
    }
  }

  toggleSidebar() {
    this.isUserInteraction = true
    this.sidebarService.toggle()
  }

  onSidebarPointerEnter() {
    if (this.isMobile) return;

    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout)
    }

    if (!this.isExpanded && !this.isPinned) {
      this.sidebarService.expand()
    }
  }

  onSidebarPointerLeave() {
    if (this.isMobile) return;

    if (this.isExpanded && !this.isPinned) {
      this.hoverTimeout = setTimeout(() => {
        this.sidebarService.collapse()
      }, 300)
    }
  }

  toggleSubmenu(item: NavItem) {
    if (item.children) {
      item.expanded = !item.expanded
    }
  }

  isActive(route: string): boolean {
    const currentRoute = this.activeRoute.replace(/\/$/, '');
    const compareRoute = route.replace(/\/$/, '');
    return currentRoute === compareRoute;
  }

  isParentActive(item: NavItem): boolean {
    if (item.children) {
      return item.children.some((child) => child.route && this.isActive(child.route))
    }
    return false
  }

  navigateTo(route: string) {
    this.router.navigateByUrl(route)
  }

  trackByRoute(index: number, item: NavItem): string {
    return item.route || item.label
  }

  onImageError(event: any) {
    event.target.src =
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNDEyIDRTMTQuMjEgNiAxNiA4UzEyIDEwLjIxIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDQgMTUuMzQgNCAyMFYyMkgyMFYyMEMxNiAxNS4zNCAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K"
  }

  openSettings() {
    console.log("Opening settings...")
  }

  logout() {
    sessionStorage.removeItem("UserId")
    sessionStorage.removeItem("SiteName")
    sessionStorage.removeItem("RoleName")
    sessionStorage.removeItem("token")
    sessionStorage.removeItem('deviceId');
    sessionStorage.removeItem('username');
    this.router.navigate(['/login']);
  }
}