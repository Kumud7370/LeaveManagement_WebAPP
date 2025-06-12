import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { SidebarComponent } from 'src/app/shared/sidebar/sidebar.component';
import { SidebarService } from '../../shared/sidebar/sidebar.service';
import { filter, map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import {
  OffcanvasBodyComponent,
  OffcanvasComponent,
  OffcanvasHeaderComponent,
  OffcanvasTitleDirective
} from '@coreui/angular';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterModule, 
    SidebarComponent,
    OffcanvasComponent,
    OffcanvasHeaderComponent,
    OffcanvasTitleDirective,
    OffcanvasBodyComponent
  ],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private sidebarService = inject(SidebarService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  private destroy$ = new Subject<void>();

  isSidebarExpanded = true;
  currentPageTitle = 'Dashboard';
  isOffcanvasVisible = false;

  // Filter data model
  filterData = {
    fromDate: '',
    toDate: '',
    weighbridge: '',
    ward: '',
    agency: '',
    vehicleNumber: '',
    weightFrom: null,
    weightTo: null,
    wasteType: ''
  };

  ngOnInit(): void {
    // Sidebar state subscription
    this.sidebarService.sidebarState$.subscribe((state) => {
      this.isSidebarExpanded = state;
    });

    // Set initial breadcrumb on first page load
    this.currentPageTitle =
      this.getDeepestChild(this.activatedRoute).snapshot.data['breadcrumb'] ?? 'Dashboard';

    // Update breadcrumb on every route change
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => this.getDeepestChild(this.activatedRoute).snapshot.data['breadcrumb'])
      )
      .subscribe(title => {
        this.currentPageTitle = title ?? 'Dashboard';
      });

    // Initialize default filter dates
    this.initializeDefaultDates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  toggleOffcanvas(): void {
    this.isOffcanvasVisible = !this.isOffcanvasVisible;
  }

  closeOffcanvas(): void {
    this.isOffcanvasVisible = false;
  }

  onOffcanvasVisibilityChange(visible: boolean): void {
    this.isOffcanvasVisible = visible;
  }

  resetFilters(): void {
    this.filterData = {
      fromDate: '',
      toDate: '',
      weighbridge: '',
      ward: '',
      agency: '',
      vehicleNumber: '',
      weightFrom: null,
      weightTo: null,
      wasteType: ''
    };
    this.initializeDefaultDates();
    console.log('Filters reset');
  }

  applyFilters(): void {
    console.log('Applying filters:', this.filterData);
    this.closeOffcanvas();
  }

  private initializeDefaultDates(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filterData.fromDate = this.formatDateForInput(firstDayOfMonth);
    this.filterData.toDate = this.formatDateForInput(today);
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }
}