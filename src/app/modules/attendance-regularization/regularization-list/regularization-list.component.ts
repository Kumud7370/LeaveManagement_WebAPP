import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { AttendanceRegularizationService } from '../../../core/services/api/attendance-regularization.api';
import {
  RegularizationResponseDto,
  RegularizationFilterDto,
  RegularizationType,
  RegularizationStatus
} from '../../../core/Models/attendance-regularization.model';
import Swal from 'sweetalert2';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import { StatusCellRendererComponent } from '../../../shared/status-cell-renderer.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-regularization-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './regularization-list.component.html',
  styleUrls: ['./regularization-list.component.scss']
})
export class RegularizationListComponent implements OnInit {
  regularizations: RegularizationResponseDto[] = [];
  loading = false;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;

  // Filters
  searchTerm = '';
  employeeIdFilter = '';
  regularizationTypeFilter: RegularizationType | null = null;
  statusFilter: RegularizationStatus | null = null;
  startDateFilter: Date | null = null;
  endDateFilter: Date | null = null;
  sortBy = 'RequestedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // UI States
  showFilters = false;
  showApprovalModal = false;
  selectedRegularization: RegularizationResponseDto | null = null;
  approvalReason = '';

  // Enums for template
  RegularizationType = RegularizationType;
  RegularizationStatus = RegularizationStatus;

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
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    domLayout: 'autoHeight',
    context: { componentParent: this }
  };

  Math = Math;

  constructor(
    private regularizationService: AttendanceRegularizationService,
    private router: Router
  ) {
    this.initializeColumnDefs();
  }

  ngOnInit(): void {
    this.setDefaultDateFilters();
    this.loadRegularizations();
  }

  initializeColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'ACTIONS',
        width: 150,
        cellRenderer: ActionCellRendererComponent,
        sortable: false,
        filter: false,
        pinned: 'left',
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'EMPLOYEE CODE',
        field: 'employeeCode',
        width: 140,
        cellClass: 'emp-code-cell',
        cellStyle: {
          fontFamily: 'Monaco, Courier New, monospace',
          fontWeight: '600'
        }
      },
      {
        headerName: 'EMPLOYEE NAME',
        field: 'employeeName',
        width: 200
      },
      {
        headerName: 'DATE',
        field: 'attendanceDate',
        width: 130,
        valueFormatter: (params) => {
          if (!params.value) return '—';
          const date = new Date(params.value);
          return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        }
      },
      {
        headerName: 'TYPE',
        field: 'regularizationTypeName',
        width: 180,
        cellRenderer: (params: any) => {
          const type = params.value;
          let colorClass = '';
          
          switch(params.data.regularizationType) {
            case RegularizationType.MissedPunch:
              colorClass = 'type-missed';
              break;
            case RegularizationType.LateEntry:
              colorClass = 'type-late';
              break;
            case RegularizationType.EarlyExit:
              colorClass = 'type-early';
              break;
            case RegularizationType.FullDayRegularization:
              colorClass = 'type-fullday';
              break;
          }
          
          return `<span class="type-badge ${colorClass}">${type}</span>`;
        }
      },
      {
        headerName: 'REQUESTED CHECK-IN',
        field: 'requestedCheckIn',
        width: 160,
        valueFormatter: (params) => {
          if (!params.value) return '—';
          const date = new Date(params.value);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      },
      {
        headerName: 'REQUESTED CHECK-OUT',
        field: 'requestedCheckOut',
        width: 160,
        valueFormatter: (params) => {
          if (!params.value) return '—';
          const date = new Date(params.value);
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      },
      {
        headerName: 'STATUS',
        field: 'statusName',
        width: 130,
        cellRenderer: StatusCellRendererComponent,
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'REQUESTED AT',
        field: 'requestedAt',
        width: 150,
        valueFormatter: (params) => {
          if (!params.value) return '—';
          const date = new Date(params.value);
          return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      },
      {
        headerName: 'APPROVED BY',
        field: 'approvedByName',
        width: 150,
        valueFormatter: (params) => params.value || '—'
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }

  setDefaultDateFilters(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDateFilter = firstDayOfMonth;
    this.endDateFilter = today;
  }

  loadRegularizations(): void {
    this.loading = true;
    this.error = null;

    const filter: RegularizationFilterDto = {
      employeeId: this.employeeIdFilter || undefined,
      startDate: this.startDateFilter || undefined,
      endDate: this.endDateFilter || undefined,
      regularizationType: this.regularizationTypeFilter ?? undefined,
      status: this.statusFilter ?? undefined,
      sortBy: this.sortBy,
      sortDescending: this.sortDirection === 'desc',
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    this.regularizationService.getFiltered(filter).subscribe({
      next: (response) => {
        if (response.success) {
          this.regularizations = response.data.items;
          this.currentPage = response.data.pageNumber;
          this.pageSize = response.data.pageSize;
          this.totalPages = response.data.totalPages;
          this.totalCount = response.data.totalCount;
        } else {
          this.error = response.message || 'Failed to load regularization requests';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'An error occurred while loading regularization requests';
        this.loading = false;
      }
    });
  }

  exportToExcel(): void {
    if (this.regularizations.length === 0) {
      Swal.fire({
        title: 'No Data',
        text: 'There are no regularization requests to export.',
        icon: 'info',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    Swal.fire({
      title: 'Exporting...',
      text: 'Please wait while we prepare your file.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const exportData = this.regularizations.map(reg => ({
      'Employee Code': reg.employeeCode,
      'Employee Name': reg.employeeName,
      'Date': reg.attendanceDate ? new Date(reg.attendanceDate).toLocaleDateString() : '—',
      'Type': reg.regularizationTypeName,
      'Requested Check-In': reg.requestedCheckIn ? new Date(reg.requestedCheckIn).toLocaleTimeString() : '—',
      'Requested Check-Out': reg.requestedCheckOut ? new Date(reg.requestedCheckOut).toLocaleTimeString() : '—',
      'Original Check-In': reg.originalCheckIn ? new Date(reg.originalCheckIn).toLocaleTimeString() : '—',
      'Original Check-Out': reg.originalCheckOut ? new Date(reg.originalCheckOut).toLocaleTimeString() : '—',
      'Reason': reg.reason,
      'Status': reg.statusName,
      'Approved By': reg.approvedByName || '—',
      'Approved At': reg.approvedAt ? new Date(reg.approvedAt).toLocaleString() : '—',
      'Rejection Reason': reg.rejectionReason || '—',
      'Requested At': new Date(reg.requestedAt).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Regularizations');

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `Regularizations_Export_${timestamp}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    Swal.fire({
      title: 'Export Successful!',
      text: `File "${fileName}" has been downloaded.`,
      icon: 'success',
      confirmButtonColor: '#3b82f6',
      timer: 3000
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadRegularizations();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.employeeIdFilter = '';
    this.currentPage = 1;
    this.loadRegularizations();
  }

  clearFilters(): void {
    this.regularizationTypeFilter = null;
    this.statusFilter = null;
    this.setDefaultDateFilters();
    this.currentPage = 1;
    this.loadRegularizations();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadRegularizations();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadRegularizations();
  }

  onPageSizeChange(event: any): void {
    this.pageSize = parseInt(event.target.value, 10);
    this.currentPage = 1;
    this.loadRegularizations();
  }

  viewDetails(regularization: RegularizationResponseDto): void {
    this.router.navigate(['/regularization', regularization.id]);
  }

  openApprovalModal(regularization: RegularizationResponseDto, approve: boolean): void {
    this.selectedRegularization = regularization;
    this.approvalReason = '';
    
    if (approve) {
      this.approveRegularization(regularization);
    } else {
      this.showApprovalModal = true;
    }
  }

  async approveRegularization(regularization: RegularizationResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Approve Request?',
      text: `Approve regularization request for ${regularization.employeeName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, approve it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      this.regularizationService.approveRegularization(regularization.id, {
        isApproved: true
      }).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire({
              title: 'Success!',
              text: 'Regularization request has been approved successfully.',
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              timer: 2000
            });
            this.loadRegularizations();
          } else {
            Swal.fire({
              title: 'Error!',
              text: response.message || 'Failed to approve request',
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error!',
            text: err.error?.message || 'An error occurred',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
  }

  submitRejection(): void {
    if (!this.selectedRegularization || !this.approvalReason.trim()) {
      Swal.fire({
        title: 'Error!',
        text: 'Please provide a reason for rejection',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    this.regularizationService.approveRegularization(this.selectedRegularization.id, {
      isApproved: false,
      rejectionReason: this.approvalReason
    }).subscribe({
      next: (response) => {
        if (response.success) {
          Swal.fire({
            title: 'Success!',
            text: 'Regularization request has been rejected.',
            icon: 'success',
            confirmButtonColor: '#3b82f6',
            timer: 2000
          });
          this.closeApprovalModal();
          this.loadRegularizations();
        } else {
          Swal.fire({
            title: 'Error!',
            text: response.message || 'Failed to reject request',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      },
      error: (err) => {
        Swal.fire({
          title: 'Error!',
          text: err.error?.message || 'An error occurred',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedRegularization = null;
    this.approvalReason = '';
  }

  async cancelRegularization(regularization: RegularizationResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Cancel Request?',
      text: `Cancel this regularization request?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No'
    });

    if (result.isConfirmed) {
      this.regularizationService.cancelRegularization(regularization.id).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire({
              title: 'Success!',
              text: 'Regularization request has been cancelled.',
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              timer: 2000
            });
            this.loadRegularizations();
          } else {
            Swal.fire({
              title: 'Error!',
              text: response.message || 'Failed to cancel request',
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error!',
            text: err.error?.message || 'An error occurred',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
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

  getTypeOptions(): { value: RegularizationType | null; label: string }[] {
    return [
      { value: null, label: 'All Types' },
      { value: RegularizationType.MissedPunch, label: 'Missed Punch' },
      { value: RegularizationType.LateEntry, label: 'Late Entry' },
      { value: RegularizationType.EarlyExit, label: 'Early Exit' },
      { value: RegularizationType.FullDayRegularization, label: 'Full Day Regularization' }
    ];
  }

  getStatusOptions(): { value: RegularizationStatus | null; label: string }[] {
    return [
      { value: null, label: 'All Statuses' },
      { value: RegularizationStatus.Pending, label: 'Pending' },
      { value: RegularizationStatus.Approved, label: 'Approved' },
      { value: RegularizationStatus.Rejected, label: 'Rejected' },
      { value: RegularizationStatus.Cancelled, label: 'Cancelled' }
    ];
  }
}