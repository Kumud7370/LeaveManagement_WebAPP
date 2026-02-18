import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, GridOptions } from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import { HolidayService } from '../../../core/services/api/holiday.api';
import { Holiday, HolidayFilterDto } from '../../../core/Models/holiday.model';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import { HolidayFormComponent } from '../holiday-form/holiday-form.component';

@Component({
  selector: 'app-holiday-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule, HolidayFormComponent, ActionCellRendererComponent],
  templateUrl: './holiday-list.component.html',
  styleUrls: ['./holiday-list.component.scss']
})
export class HolidayListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private gridApi!: GridApi;

  holidays: Holiday[] = [];
  searchTerm = '';
  totalRecords = 0;
  currentPage = 1;
  pageSize = 10;

  isLoading = false;
  showModal = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedHoliday: Holiday | null = null;

  /**
   * ACTION BUTTONS FIX:
   * The callbacks MUST be arrow functions to capture the correct `this` reference.
   * If written as regular methods or plain function references, `this` inside
   * viewDetails/editHoliday/deleteHoliday would be `undefined` at call time
   * because AG Grid calls them outside the Angular component context.
   *
   * Also: cellRendererParams must be set as a function (params) => ({...})
   * so AG Grid re-evaluates per row, passing the correct row data each time.
   */
  readonly columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      field: 'actions',
      cellRenderer: ActionCellRendererComponent,
      width: 140,
      pinned: 'left',
      sortable: false,
      filter: false,
      // Use a function so params are re-evaluated per row
      cellRendererParams: (params: any) => ({
        onView:   (data: Holiday) => this.viewDetails(data),
        onEdit:   (data: Holiday) => this.editHoliday(data),
        onDelete: (data: Holiday) => this.deleteHoliday(data)
      })
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
      valueFormatter: (p) => this.formatDate(p.value)
    },
    {
      headerName: 'Type',
      field: 'holidayTypeName',
      width: 140,
      sortable: true,
      filter: true,
      cellRenderer: (p: any) => {
        const type: string = p.value ?? '';
        const cls = type === 'National' ? 'type-national'
                  : type === 'Regional' ? 'type-regional'
                  : type === 'Optional' ? 'type-optional'
                  : 'type-national';
        return `<span class="type-badge ${cls}">${type}</span>`;
      }
    },
    {
      headerName: 'Optional',
      field: 'isOptional',
      width: 110,
      cellRenderer: (p: any) =>
        p.value
          ? '<span class="badge badge-warning">Yes</span>'
          : '<span class="badge badge-info">No</span>'
    },
    {
      headerName: 'Departments',
      field: 'applicableDepartments',
      flex: 1,
      minWidth: 140,
      valueFormatter: (p) =>
        !p.value || p.value.length === 0
          ? 'All Departments'
          : `${p.value.length} Department(s)`
    },
    {
      headerName: 'Days Until',
      field: 'daysUntilHoliday',
      width: 130,
      sortable: true,
      cellRenderer: (p: any) => {
        if (p.data?.isToday) return '<span class="type-badge type-today">Today</span>';
        if (p.value < 0)      return '<span style="color:#6b7280;">Past</span>';
        if (p.value <= 7)     return `<span class="type-badge type-regional">${p.value} days</span>`;
        return `<span>${p.value} days</span>`;
      }
    },
    {
      headerName: 'Status',
      field: 'isUpcoming',
      width: 130,
      cellRenderer: (p: any) =>
        p.value
          ? '<span class="badge badge-success">Upcoming</span>'
          : '<span class="badge badge-secondary">Past</span>'
    },
    {
      headerName: 'Created',
      field: 'createdAt',
      width: 160,
      sortable: true,
      valueFormatter: (p) => this.formatDate(p.value)
    }
  ];

  readonly defaultColDef: ColDef = {
    resizable: true,
    suppressMovable: false
  };

  readonly gridOptions: GridOptions = {
    rowHeight: 60,
    headerHeight: 50,
    suppressCellFocus: true,
    // Ensure AG Grid uses the Angular change detection zone
    onCellClicked: () => {}
  };

  context = { componentParent: this };

  constructor(private holidayService: HolidayService) {}

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
          this.isLoading = false;
          if (response.success) {
            this.holidays = response.data.items;
            this.totalRecords = response.data.totalCount;
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
          }
        },
        error: (err) => {
          console.error('Error loading holidays:', err);
          this.isLoading = false;
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

  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.currentPage = 1;
    this.loadHolidays();
  }

  exportData(): void {
    this.gridApi?.exportDataAsCsv({
      fileName: `holidays_${Date.now()}.csv`
    });
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedHoliday = null;
    this.showModal = true;
  }

  viewDetails(holiday: Holiday): void {
    this.modalMode = 'view';
    this.selectedHoliday = { ...holiday }; // shallow clone to avoid reference issues
    this.showModal = true;
  }

  editHoliday(holiday: Holiday): void {
    this.modalMode = 'edit';
    this.selectedHoliday = { ...holiday };
    this.showModal = true;
  }

  deleteHoliday(holiday: Holiday): void {
    if (!confirm(`Are you sure you want to delete "${holiday.holidayName}"?`)) return;

    this.isLoading = true;
    this.holidayService.deleteHoliday(holiday.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loadHolidays();
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Error deleting holiday:', err);
          this.isLoading = false;
        }
      });
  }

  onModalClose(): void {
    this.showModal = false;
    this.selectedHoliday = null;
  }

  onModalSuccess(): void {
    this.showModal = false;
    this.selectedHoliday = null;
    this.loadHolidays();
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
  }

  getMaxRecords(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }
}