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

  isExpanded = true
  isMobile = false
  activeRoute = ""
  manualOpened = false

  userProfile: UserProfile = {
    name: sessionStorage.getItem('username') || 'Guest User',
    role:  sessionStorage.getItem('RoleName') || 'Guest',
    avatar:
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAxMkM5Ljc5IDEyIDggMTAuMjEgOCA4UzkuNzkgNDEyIDRTMTQuMjEgNiAxNiA4UzEyIDEwLjIxIDEyIDEyWk0xMiAxNEM5LjMzIDE0IDQgMTUuMzQgNCAyMFYyMkgyMFYyMEMxNiAxNS4zNCAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K",
    isOnline: true,
  }

  navItems: NavItem[] = [
    { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
   { label: "Dashboard Overview", route: "/dashboard2", icon: "fas fa-tachometer-alt" },
    { label: "Search Report", route: "/search-report", icon: "fas fa-search" },
    //{ label: "Export to Excel", route: "/export", icon: "fas fa-file-excel" },
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
    // { label: "Remarks & Correction", route: "/remarks", icon: "fas fa-clipboard-check" },


    { label: "Billing Report", route: "/billing-report", icon: "fas fa-file-invoice-dollar" },
    { label: "Verification", route: "/verifications", icon: "fas fa-check-circle" },
  ]

  menuItems = this.navItems
  private autoExpandedByHover = false
  private subscriptions: Subscription[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  private getRoleName(roleId: string | number): string {
    const roles: Record<string | number, string> = {
      1: 'Admin',
      2: 'General User',

    };
    return roles[roleId] || 'Unknown';
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.checkScreenSize()
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
        }
      }),
    );

    const storedUsername = sessionStorage.getItem('username');
    const storedRole = sessionStorage.getItem('role');
    const uRoleName = sessionStorage.getItem('RoleName');

    if (storedUsername) {
      this.userProfile.name = storedUsername;
    }

    if (storedRole) {
      this.userProfile.role =  sessionStorage.getItem('RoleName') || 'Genenral User';
    }

    this.activeRoute = this.router.url;

    // 🌟 Hide modules based on username
    if (uRoleName === 'SE' || uRoleName === 'AE') {
      this.menuItems = this.navItems.filter(item => item.label !== 'Billing Report' && item.label !== 'Vehicles' && item.label !== 'Agency' && item.label !== 'Dashboard Overview');
    } else if (uRoleName === 'CO') {
      this.menuItems = this.navItems.filter(item => item.label !== 'Verification' && item.label !== 'Vehicles' && item.label !== 'Agency' && item.label !== 'Dashboard Overview');
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
    }
    else if (uRoleName?.toLowerCase() === 'admin') {
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
      
      }
      else if (uRoleName?.toLowerCase() === 'jo') {
        this.menuItems = [
          { label: "Dashboard", route: "/dashboard", icon: "fas fa-tachometer-alt" },
          { label: "Logsheet Report", route: "/logsheet/logsheetlist", icon: "fas fa-chart-line" },
        ]
       
      }
      else {
        this.menuItems = this.navItems;
      }

      this.updateExpandedStates();
    }

    ngOnDestroy() {
      this.subscriptions.forEach((sub) => sub.unsubscribe())
    }

    // @HostListener("window:resize")
    // onResize() {
    //   if (this.isBrowser) {
    //     this.checkScreenSize()
    //   }
    // }
    @HostListener("window:scroll", [])
    onScroll() {
      // only auto-expand on scroll if user hasn't manually opened it
      if (!this.manualOpened && !this.isExpanded && this.isSidebarInView()) {
        this.sidebarService.expand();
        this.autoExpandedByHover = true; // so leaving/collapse logic can be consistent
      }
    }

  private isSidebarInView(): boolean {
    const sidebarEl = document.querySelector('.sidebar');
    if (!sidebarEl) return false;
    const rect = sidebarEl.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom >= 0;
  }

  private checkScreenSize() {
    if (this.isBrowser && typeof window !== "undefined") {
      this.isMobile = window.innerWidth < 768
      if (this.isMobile) {
        this.sidebarService.collapse()
      } else {
        this.sidebarService.expand()
      }
    }
  }

  private updateExpandedStates() {
    this.menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => child.route && this.activeRoute.startsWith(child.route));
        // Only expand if current route is under the item
        item.expanded = hasActiveChild;
      }
    });
  }


  // toggleSidebar() {
  //   this.manualToggle = true;
  //   this.sidebarService.toggle()
  // }
  toggleSidebar() {
    if (this.isExpanded) {
      // user is closing (after toggle it will be closed) => allow hover auto-open again
      this.manualOpened = false
      this.autoExpandedByHover = false
    } else {
      // user is opening (after toggle it will be open) => disable hover auto-open
      this.manualOpened = true
      this.autoExpandedByHover = false
    }
    this.sidebarService.toggle();
  }
  onSidebarPointerEnter() {
    if (this.isMobile) return; // ignore mobile
    if (!this.isExpanded && !this.manualOpened) {
      this.autoExpandedByHover = true;
      this.sidebarService.expand();
    }
  }
  onSidebarPointerLeave() {
    if (this.isMobile) return;
    if (this.autoExpandedByHover && this.isExpanded) {
      this.sidebarService.collapse();
      this.autoExpandedByHover = false;
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
    if (this.isMobile) {
      this.sidebarService.collapse()
    }
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
