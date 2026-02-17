import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, GridOptions } from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import { HolidayService } from '../../../core/services/api/holiday.api';
import { Holiday, HolidayFilterDto, HolidayType } from '../../../core/Models/holiday.model';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import { HolidayFormComponent } from '../holiday-form/holiday-form.component';

@Component({
  selector: 'app-holiday-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, HolidayFormComponent],
  templateUrl: './holiday-list.component.html',
  styleUrls: ['./holiday-list.component.scss']
})
export class HolidayListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private gridApi!: GridApi;

  holidays: Holiday[] = [];
  searchTerm: string = '';

  totalRecords = 0;
  currentPage = 1;
  pageSize = 10;

  isLoading = false;
  showModal = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedHoliday: Holiday | null = null;

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      field: 'actions',
      cellRenderer: ActionCellRendererComponent,
      width: 160,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellRendererParams: {
        onView: (data: Holiday) => this.viewDetails(data),
        onEdit: (data: Holiday) => this.editHoliday(data),
        onDelete: (data: Holiday) => this.deleteHoliday(data)
      }
    },
    {
      headerName: 'Holiday Name',
      field: 'holidayName',
      flex: 1,
      minWidth: 200,
      sortable: true,
      filter: true
    },
    {
      headerName: 'Date',
      field: 'holidayDate',
      width: 160,
      sortable: true,
      valueFormatter: (params) => this.formatDate(params.value)
    },
    {
      headerName: 'Type',
      field: 'holidayTypeName',
      width: 140,
      sortable: true,
      filter: true,
      // ── Badge pill, NOT full-cell background ──
      cellRenderer: (params: any) => {
        const type = params.value;
        if (type === 'National') {
          return '<span class="type-badge type-national">National</span>';
        } else if (type === 'Regional') {
          return '<span class="type-badge type-regional">Regional</span>';
        } else if (type === 'Optional') {
          return '<span class="type-badge type-optional">Optional</span>';
        }
        return `<span class="type-badge type-national">${type}</span>`;
      }
    },
    {
      headerName: 'Optional',
      field: 'isOptional',
      width: 100,
      cellRenderer: (params: any) => {
        return params.value
          ? '<span class="badge badge-warning">Yes</span>'
          : '<span class="badge badge-info">No</span>';
      }
    },
    {
      headerName: 'Departments',
      field: 'applicableDepartments',
      flex: 1,
      minWidth: 100,
      valueFormatter: (params) => {
        if (!params.value || params.value.length === 0) return 'All Departments';
        return `${params.value.length} Department(s)`;
      }
    },
    {
      headerName: 'Days Until',
      field: 'daysUntilHoliday',
      width: 130,
      sortable: true,
      // ── Badge pill for days, NOT full-cell background ──
      cellRenderer: (params: any) => {
        if (params.data.isToday) {
          return '<span class="type-badge type-today">Today</span>';
        }
        if (params.value < 0) {
          return `<span style="color:#6b7280;">Past</span>`;
        }
        if (params.value <= 7) {
          return `<span class="type-badge type-regional">${params.value} days</span>`;
        }
        return `<span>${params.value} days</span>`;
      }
    },
    {
      headerName: 'Status',
      field: 'isUpcoming',
      width: 130,
      cellRenderer: (params: any) => {
        return params.value
          ? '<span class="badge badge-success">Upcoming</span>'
          : '<span class="badge badge-secondary">Past</span>';
      }
    },
    {
      headerName: 'Created',
      field: 'createdAt',
      width: 160,
      sortable: true,
      valueFormatter: (params) => this.formatDate(params.value)
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true
  };

  gridOptions: GridOptions = {
    rowHeight: 60,
    headerHeight: 50,
    suppressCellFocus: true
  };

  context = {
    componentParent: this
  };

  constructor(
    private holidayService: HolidayService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadHolidays();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  loadHolidays(): void {
    this.isLoading = true;

    const filter: HolidayFilterDto = {
      searchTerm: this.searchTerm || undefined,
      year: new Date().getFullYear(),
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      sortBy: 'HolidayDate',
      sortDescending: false
    };

    this.holidayService.getFilteredHolidays(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.holidays = response.data.items;
            this.totalRecords = response.data.totalCount;
            setTimeout(() => {
              if (this.gridApi) this.gridApi.sizeColumnsToFit();
            }, 100);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading holidays:', error);
          this.isLoading = false;
          alert('Failed to load holidays. Please check your API connection.');
        }
      });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadHolidays();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadHolidays();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadHolidays();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadHolidays();
  }

  exportData(): void {
    if (this.gridApi) {
      this.gridApi.exportDataAsCsv({
        fileName: `holidays_${new Date().getTime()}.csv`
      });
    }
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedHoliday = null;
    this.showModal = true;
  }

  viewDetails(holiday: Holiday): void {
    this.modalMode = 'view';
    this.selectedHoliday = holiday;
    this.showModal = true;
  }

  editHoliday(holiday: Holiday): void {
    this.modalMode = 'edit';
    this.selectedHoliday = holiday;
    this.showModal = true;
  }

  deleteHoliday(holiday: Holiday): void {
    if (confirm(`Are you sure you want to delete "${holiday.holidayName}"?`)) {
      this.isLoading = true;
      this.holidayService.deleteHoliday(holiday.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              alert('Holiday deleted successfully');
              this.loadHolidays();
            } else {
              alert('Failed to delete holiday');
              this.isLoading = false;
            }
          },
          error: (error) => {
            console.error('Error deleting holiday:', error);
            alert('Failed to delete holiday');
            this.isLoading = false;
          }
        });
    }
  }

  onModalClose(): void {
    this.showModal = false;
    this.selectedHoliday = null;
  }

  onModalSuccess(): void {
    this.showModal = false;
    this.selectedHoliday = null;
    alert('Holiday saved successfully');
    this.loadHolidays();
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  getMaxRecords(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }
}