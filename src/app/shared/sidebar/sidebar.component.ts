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
    { label: "Dashboard Overview", route: "/dashboard2", icon: "fas fa-tachometer-alt" },
    { label: "Search Report", route: "/search-report", icon: "fas fa-search" },
    { label: "WardWise Report", route: "/ward-report", icon: "fas fa-map-marker-alt" },
    { label: "Shiftwise Report", route: "/shift-report", icon: "fas fa-clock" },
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
    { label: "Agency", route: "/agencylist", icon: "fas fa-truck" },
    { label: "Billing Report", route: "/billing-report", icon: "fas fa-file-invoice-dollar" },
    { label: "Verification", route: "/verifications", icon: "fas fa-check-circle" },
  ]

  menuItems = this.navItems
  private subscriptions: Subscription[] = [];
  userSiteName: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.checkScreenSize()
      this.setupUserProfile()
      this.setupMenuItems()
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
          
          // Close mobile sidebar on navigation
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
      
      // Handle transition between mobile and desktop
      if (wasMobile !== this.isMobile) {
        if (this.isMobile) {
          this.sidebarService.collapse()
          this.isUserInteraction = false
        } else {
          // On desktop, start collapsed for hover-to-expand behavior
          this.sidebarService.collapse()
          this.isUserInteraction = false
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
        { label: "Agency", route: "/agencylist", icon: "fas fa-truck" },
      ]
    } else if (uRoleName?.toLowerCase() === 'admin') {
      this.menuItems = [
        { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
        { label: "Dashboard Overview", route: "/dashboard2", icon: "fas fa-tachometer-alt" },
        { label: "Search Report", route: "/search-report", icon: "fas fa-search" },
        { label: "WardWise Report", route: "/ward-report", icon: "fas fa-map-marker-alt" },
        { label: "Shiftwise Report", route: "/shift-report", icon: "fas fa-clock" },
        { label: "Logsheet Report", route: "/logsheet/logsheetlist", icon: "fas fa-chart-line" },
        { label: "Vehicles", route: "/vehiclelist", icon: "fas fa-truck" },
        { label: "Agency", route: "/agencylist", icon: "fas fa-truck" },
      ]
    } else if (uRoleName?.toLowerCase() === 'jo') {
      this.menuItems = [
        { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
        { label: "Logsheet Report", route: "/logsheet/logsheetlist", icon: "fas fa-chart-line" },
      ]
    } else {
      this.menuItems = this.navItems;
    }
  }

  private updateExpandedStates() {
    this.menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => child.route && this.activeRoute.startsWith(child.route));
        item.expanded = hasActiveChild;
      }
    });
  }

  toggleSidebar() {
    this.isUserInteraction = true
    this.sidebarService.toggle()
  }

  onSidebarPointerEnter() {
    if (this.isMobile) return;
    
    // Clear any pending collapse
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout)
    }
    
    // Only expand on hover if user hasn't manually interacted
    if (!this.isExpanded && !this.isUserInteraction) {
      this.sidebarService.expand()
    }
  }

  onSidebarPointerLeave() {
    if (this.isMobile) return;
    
    // Only collapse if user hasn't manually expanded
    if (this.isExpanded && !this.isUserInteraction) {
      // Add small delay to prevent flickering
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
    return this.activeRoute.startsWith(route)
  }

  isParentActive(item: NavItem): boolean {
    if (item.children) {
      return item.children.some((child) => child.route && this.activeRoute.startsWith(child.route))
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
    this.router.navigate(['/login']);
  }
}