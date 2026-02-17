import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';

import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  AttendanceResponseDto,
  AttendanceFilterDto,
  PagedResultDto,
  AttendanceStatus,
  CheckInMethod,
  createEmptyAttendanceFilter,
  getStatusBadgeClass,
  formatTime,
  formatDate,
  formatWorkingHours,
  AttendanceStatusOptions,
  CheckInMethodOptions
} from '../../../core/Models/attendance.model';

import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './attendance-list.component.html',
  styleUrls: ['./attendance-list.component.scss']
})
export class AttendanceListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  rowData: AttendanceResponseDto[] = [];
  isLoading = false;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  totalItems = 0;

  // Filters
  isFilterVisible = false;
  filter: AttendanceFilterDto = createEmptyAttendanceFilter();

  // Enums
  AttendanceStatus = AttendanceStatus;
  CheckInMethod = CheckInMethod;
  attendanceStatusOptions = AttendanceStatusOptions;
  checkInMethodOptions = CheckInMethodOptions;

  // Make Math available
  Math = Math;

  // Helper functions
  formatTime = formatTime;
  formatDate = formatDate;
  formatWorkingHours = formatWorkingHours;
  getStatusBadgeClass = getStatusBadgeClass;

  // AG Grid
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 100,
  };
  gridOptions: GridOptions = {
    pagination: false,
    rowSelection: undefined,
    suppressRowClickSelection: true,
    domLayout: 'autoHeight',
    context: { componentParent: this }
  };

  constructor(
    private attendanceService: AttendanceService,
    private router: Router
  ) {
    this.initializeColumnDefs();
  }

  ngOnInit(): void {
    console.log('Attendance List Component Initialized');
    this.loadAttendance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'Actions',
        width: 150,
        minWidth: 150,
        maxWidth: 150,
        cellRenderer: ActionCellRendererComponent,
        sortable: false,
        filter: false,
        pinned: 'left',
        cellStyle: {
          textAlign: 'center',
          justifyContent: 'center',
          padding: '0 8px'
        }
      },
      {
        headerName: 'Employee',
        field: 'employeeName',
        width: 250,
        minWidth: 200,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const name = params.value;
          const code = params.data.employeeCode || '';
          
          return `
            <div class="employee-cell">
              <div class="employee-name">${name}</div>
              <div class="employee-code">${code}</div>
            </div>
          `;
        }
      },
      {
        headerName: 'Date',
        field: 'attendanceDate',
        width: 130,
        minWidth: 120,
        valueFormatter: (params) => this.formatDate(params.value),
        cellStyle: { fontSize: '12px' }
      },
      {
        headerName: 'Check In',
        field: 'checkInTime',
        width: 120,
        minWidth: 100,
        valueFormatter: (params) => this.formatTime(params.value),
        cellStyle: { fontWeight: '600' }
      },
      {
        headerName: 'Check Out',
        field: 'checkOutTime',
        width: 120,
        minWidth: 100,
        valueFormatter: (params) => this.formatTime(params.value),
        cellStyle: { fontWeight: '600' }
      },
      {
        headerName: 'Working Hours',
        field: 'workingHours',
        width: 140,
        minWidth: 120,
        valueFormatter: (params) => this.formatWorkingHours(params.value),
        cellStyle: { color: '#3b82f6', fontWeight: '600' }
      },
      {
        headerName: 'Status',
        field: 'statusName',
        width: 130,
        minWidth: 120,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const badgeClass = this.getStatusBadgeClass(params.data.status);
          return `<span class="badge ${badgeClass}">${params.value}</span>`;
        },
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'Late',
        field: 'isLate',
        width: 100,
        minWidth: 80,
        cellRenderer: (params: any) => {
          if (params.value) {
            const minutes = params.data.lateMinutes || 0;
            return `<span class="badge badge-warning">${minutes}m</span>`;
          }
          return '<i class="fas fa-check text-success"></i>';
        },
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'Early Leave',
        field: 'isEarlyLeave',
        width: 120,
        minWidth: 100,
        cellRenderer: (params: any) => {
          if (params.value) {
            const minutes = params.data.earlyLeaveMinutes || 0;
            return `<span class="badge badge-warning">${minutes}m</span>`;
          }
          return '<i class="fas fa-check text-success"></i>';
        },
        cellStyle: { textAlign: 'center' }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }

  loadAttendance(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.error = null;
    this.filter.pageNumber = this.currentPage;
    this.filter.pageSize = this.pageSize;

    console.log('Loading attendance with filter:', this.filter);

    this.attendanceService.getFilteredAttendance(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResultDto<AttendanceResponseDto>) => {
          console.log('Attendance data received:', result);
          this.rowData = result.items || [];
          this.totalItems = result.totalCount || 0;
          this.totalPages = result.totalPages || 0;
          this.currentPage = result.pageNumber || 1;
          this.isLoading = false;
          console.log(`Loaded ${this.rowData.length} attendance records`);
        },
        error: (error: any) => {
          console.error('Error loading attendance:', error);
          this.error = error.error?.message || 'Failed to load attendance. Please try again.';
          this.isLoading = false;
        }
      });
  }

  toggleFilter(): void {
    this.isFilterVisible = !this.isFilterVisible;
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.loadAttendance();
  }

  resetFilter(): void {
    this.filter = createEmptyAttendanceFilter();
    this.currentPage = 1;
    this.pageSize = 20;
    this.loadAttendance();
  }

  onSearchChange(): void {
    const searchTerm = this.filter.employeeId || '';
    if (searchTerm.length === 0 || searchTerm.length >= 3) {
      this.currentPage = 1;
      this.loadAttendance();
    }
  }

  clearSearch(): void {
    this.filter.employeeId = '';
    this.currentPage = 1;
    this.loadAttendance();
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadAttendance();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadAttendance();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadAttendance();
    }
  }

  onPageSizeChanged(newPageSize: number): void {
    this.pageSize = newPageSize;
    this.currentPage = 1;
    this.loadAttendance();
  }

  get pages(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Navigation methods
  viewDetails(attendance: AttendanceResponseDto): void {
    console.log('View attendance:', attendance);
    // Navigate to details or show modal
  }

  editAttendance(attendance: AttendanceResponseDto): void {
    console.log('Edit attendance:', attendance);
    // Navigate to edit form or show modal
  }

  async deleteAttendance(attendance: AttendanceResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `You are about to delete attendance for <strong>"${attendance.employeeName}"</strong> on ${this.formatDate(attendance.attendanceDate)}.<br>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed && attendance?.id) {
      this.attendanceService.deleteAttendance(attendance.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            Swal.fire({
              title: 'Deleted!',
              text: 'Attendance record has been deleted successfully.',
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              timer: 2000
            });
            this.loadAttendance();
          },
          error: (error: any) => {
            console.error('Error deleting attendance:', error);
            Swal.fire({
              title: 'Error!',
              text: error.error?.message || 'Failed to delete attendance. Please try again.',
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        });
    }
  }
}