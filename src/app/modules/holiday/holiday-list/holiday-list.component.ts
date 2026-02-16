import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
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
  selectedType: string = '';
  selectedOptional: string = '';
  selectedYear: number = new Date().getFullYear();
  
  totalRecords = 0;
  currentPage = 1;
  pageSize = 10;
  
  holidayTypes = Object.values(HolidayType);
  years: number[] = [];
  
  isLoading = false;
  showModal = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedHoliday: Holiday | null = null;

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      field: 'actions',
      cellRenderer: ActionCellRendererComponent,
      width: 180,
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
      width: 150,
      sortable: true,
      valueFormatter: (params) => this.formatDate(params.value)
    },
    {
      headerName: 'Type',
      field: 'holidayTypeName',
      width: 130,
      sortable: true,
      filter: true,
      cellStyle: (params) => this.getTypeCellStyle(params.value)
    },
    {
      headerName: 'Optional',
      field: 'isOptional',
      width: 120,
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
      minWidth: 150,
      valueFormatter: (params) => {
        if (!params.value || params.value.length === 0) {
          return 'All Departments';
        }
        return `${params.value.length} Department(s)`;
      }
    },
    {
      headerName: 'Days Until',
      field: 'daysUntilHoliday',
      width: 120,
      sortable: true,
      cellStyle: (params) => this.getDaysUntilCellStyle(params.value),
      valueFormatter: (params) => {
        if (params.data.isToday) return 'Today';
        if (params.value < 0) return 'Past';
        return `${params.value} days`;
      }
    },
    {
      headerName: 'Status',
      field: 'isUpcoming',
      width: 120,
      cellRenderer: (params: any) => {
        return params.value 
          ? '<span class="badge badge-success">Upcoming</span>' 
          : '<span class="badge badge-secondary">Past</span>';
      }
    },
    {
      headerName: 'Created',
      field: 'createdAt',
      width: 150,
      sortable: true,
      valueFormatter: (params) => this.formatDate(params.value)
    }
  ];

  defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true
  };

  context = {
    componentParent: this
  };

  constructor(
    private holidayService: HolidayService,
    private router: Router
  ) {
    this.initializeYears();
  }

  ngOnInit(): void {
    this.loadHolidays();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 2; i <= currentYear + 5; i++) {
      this.years.push(i);
    }
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  loadHolidays(): void {
    this.isLoading = true;

    const filter: HolidayFilterDto = {
      searchTerm: this.searchTerm || undefined,
      holidayType: this.selectedType ? (this.selectedType as HolidayType) : undefined,
      isOptional: this.selectedOptional ? this.selectedOptional === 'true' : undefined,
      year: this.selectedYear,
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
            
            // Auto-resize columns after data is loaded
            setTimeout(() => {
              if (this.gridApi) {
                this.gridApi.sizeColumnsToFit();
              }
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
    this.selectedType = '';
    this.selectedOptional = '';
    this.selectedYear = new Date().getFullYear();
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

  getTypeCellStyle(type: string): any {
    const styles: any = {
      'National': { backgroundColor: '#dbeafe', color: '#1e40af', fontWeight: '600', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' },
      'Regional': { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' },
      'Optional': { backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: '600', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }
    };
    return styles[type] || {};
  }

  getDaysUntilCellStyle(days: number): any {
    if (days < 0) return { color: '#6b7280' };
    if (days === 0) return { backgroundColor: '#dcfce7', color: '#166534', fontWeight: '600', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' };
    if (days <= 7) return { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' };
    return {};
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  getMaxRecords(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }
}