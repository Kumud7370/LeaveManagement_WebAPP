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
import { AttendanceFormComponent } from '../attendance-form/attendance-form.component';
import { AttendanceDetailsComponent } from '../attendance-details/attendance-details.component';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    AttendanceFormComponent,
    AttendanceDetailsComponent
  ],
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

  // Modal States
  showFormModal = false;
  showDetailsModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedAttendanceId: string | null = null;

  // Enums
  AttendanceStatus = AttendanceStatus;
  CheckInMethod = CheckInMethod;
  attendanceStatusOptions = AttendanceStatusOptions;
  checkInMethodOptions = CheckInMethodOptions;

  // Make Math available in template
  Math = Math;

  // Helper functions exposed to template
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
    this.loadAttendance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── AG Grid Setup ────────────────────────────────────────────────────────

  initializeColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'Actions',
        width: 160,
        minWidth: 160,
        maxWidth: 160,
       cellRenderer: ActionCellRendererComponent,
        sortable: false,
        filter: false,
        pinned: 'left',
        cellStyle: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px'
        }
      },
      {
        headerName: 'Employee',
        field: 'employeeName',
        width: 220,
        minWidth: 180,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const name = params.value;
          const code = params.data?.employeeCode || '';
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
        cellStyle: { fontSize: '12px', color: '#374151' }
      },
      {
        headerName: 'Check In',
        field: 'checkInTime',
        width: 110,
        minWidth: 100,
        valueFormatter: (params) => this.formatTime(params.value),
        cellStyle: { fontWeight: '600', color: '#059669' }
      },
      {
        headerName: 'Check Out',
        field: 'checkOutTime',
        width: 110,
        minWidth: 100,
        valueFormatter: (params) => this.formatTime(params.value),
        cellStyle: { fontWeight: '600', color: '#dc2626' }
      },
      {
        headerName: 'Working Hrs',
        field: 'workingHours',
        width: 130,
        minWidth: 110,
        valueFormatter: (params) => this.formatWorkingHours(params.value),
        cellStyle: { color: '#3b82f6', fontWeight: '600' }
      },
      {
        headerName: 'Status',
        field: 'statusName',
        width: 130,
        minWidth: 110,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const badgeClass = this.getStatusBadgeClass(params.data?.status);
          return `<span class="badge ${badgeClass}">${params.value}</span>`;
        },
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
      },
      {
        headerName: 'Late',
        field: 'isLate',
        width: 90,
        minWidth: 80,
        cellRenderer: (params: any) => {
          if (params.value) {
            const minutes = params.data?.lateMinutes || 0;
            return `<span class="badge badge-warning">${minutes}m late</span>`;
          }
          return `<i class="fas fa-check" style="color:#10b981"></i>`;
        },
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
      },
      {
        headerName: 'Early Leave',
        field: 'isEarlyLeave',
        width: 110,
        minWidth: 100,
        cellRenderer: (params: any) => {
          if (params.value) {
            const minutes = params.data?.earlyLeaveMinutes || 0;
            return `<span class="badge badge-warning">${minutes}m early</span>`;
          }
          return `<i class="fas fa-check" style="color:#10b981"></i>`;
        },
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
      },
      {
        headerName: 'Approved',
        field: 'approvedBy',
        width: 110,
        minWidth: 100,
        cellRenderer: (params: any) => {
          if (params.value) {
            return `<span class="badge badge-success"><i class="fas fa-check-circle"></i> Yes</span>`;
          }
          return `<span class="badge badge-secondary">Pending</span>`;
        },
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────

  loadAttendance(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.error = null;
    this.filter.pageNumber = this.currentPage;
    this.filter.pageSize = this.pageSize;

    this.attendanceService.getFilteredAttendance(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResultDto<AttendanceResponseDto>) => {
          this.rowData = result.items || [];
          this.totalItems = result.totalCount || 0;
          this.totalPages = result.totalPages || 0;
          this.currentPage = result.pageNumber || 1;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading attendance:', error);
          this.error = error.error?.message || 'Failed to load attendance records. Please try again.';
          this.isLoading = false;
        }
      });
  }

  // ─── Filter Operations ────────────────────────────────────────────────────

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

  // ─── Pagination ───────────────────────────────────────────────────────────

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

  // ─── Action Handlers (called by AttendanceActionCellRendererComponent) ────

  viewDetails(attendance: AttendanceResponseDto): void {
    this.selectedAttendanceId = attendance.id;
    this.showDetailsModal = true;
  }

  editAttendance(attendance: AttendanceResponseDto): void {
    this.formMode = 'edit';
    this.selectedAttendanceId = attendance.id;
    this.showFormModal = true;
  }

  async approveAttendance(attendance: AttendanceResponseDto): Promise<void> {
    if (!attendance?.id) return;

    const result = await Swal.fire({
      title: 'Approve Attendance?',
      html: `Approve attendance for <strong>${attendance.employeeName}</strong> on ${this.formatDate(attendance.attendanceDate)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      this.attendanceService.approveAttendance(attendance.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Approved!',
              text: 'Attendance has been approved successfully.',
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAttendance();
          },
          error: (error: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to approve attendance.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
    }
  }

  async deleteAttendance(attendance: AttendanceResponseDto): Promise<void> {
    if (!attendance?.id) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      html: `Delete attendance for <strong>${attendance.employeeName}</strong> on ${this.formatDate(attendance.attendanceDate)}?<br>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      this.attendanceService.deleteAttendance(attendance.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Attendance record has been deleted successfully.',
              timer: 2000,
              showConfirmButton: false
            });
            this.loadAttendance();
          },
          error: (error: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to delete attendance.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
    }
  }

  // ─── Modal Management ─────────────────────────────────────────────────────

  addManualAttendance(): void {
    this.formMode = 'create';
    this.selectedAttendanceId = null;
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.selectedAttendanceId = null;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedAttendanceId = null;
  }

  onFormSuccess(): void {
    this.closeFormModal();
    this.loadAttendance();
  }

  onEditFromDetails(attendanceId: string): void {
    this.closeDetailsModal();
    this.formMode = 'edit';
    this.selectedAttendanceId = attendanceId;
    this.showFormModal = true;
  }

  onDeleteFromDetails(attendanceId: string): void {
    this.closeDetailsModal();
    this.loadAttendance();
  }
}