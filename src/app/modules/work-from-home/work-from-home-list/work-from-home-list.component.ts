import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  GridOptions
} from 'ag-grid-community';
import Swal from 'sweetalert2';

import { WfhRequestService } from '../../../core/services/api/work-from-home.api';
import {
  WfhRequest,
  WfhRequestFilterDto,
  ApprovalStatus,
  ApproveRejectWfhRequestDto
} from '../../../core/Models/work-from-home.model';
import { WfhActionCellRendererComponent } from '../wfh-action-cell-renderer.component';
import { WfhStatusCellRendererComponent } from '../wfh-status-cell-renderer.component';
import { WfhRequestDetailsComponent } from '../work-from-home-details/work-from-home-details.component';
import { WfhRequestFormComponent } from '../work-from-home-form/work-from-home-form.component';

@Component({
  selector: 'app-wfh-request-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    WfhRequestDetailsComponent,
    WfhRequestFormComponent
  ],
 templateUrl: './work-from-home-list.component.html',
styleUrls: ['./work-from-home-list.component.scss']
})
export class WfhRequestListComponent implements OnInit {
  // Grid
  private gridApi!: GridApi;
  rowData: WfhRequest[] = [];
  loading = false;

  // Sidebar / Modal state
  showDetails = false;
  showForm = false;
  selectedRequestId: string | null = null;
  editingRequest: WfhRequest | null = null;

  // Filters
  filter: WfhRequestFilterDto = {
    pageNumber: 1,
    pageSize: 1000,
    sortBy: 'StartDate',
    sortDescending: true
  };
  searchTerm = '';
  selectedStatus: ApprovalStatus | '' = '';
  ApprovalStatus = ApprovalStatus;

  // Statistics
  statistics: { [key: string]: number } = {};

  // AG Grid column definitions
  columnDefs: ColDef[] = [
    {
      field: 'employeeCode',
      headerName: 'Emp Code',
      width: 110,
      sortable: true,
      filter: true
    },
    {
      field: 'employeeName',
      headerName: 'Employee',
      flex: 1,
      minWidth: 150,
      sortable: true,
      filter: true
    },
    {
      field: 'startDate',
      headerName: 'Start Date',
      width: 130,
      sortable: true,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
    },
    {
      field: 'endDate',
      headerName: 'End Date',
      width: 130,
      sortable: true,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
    },
    {
      field: 'totalDays',
      headerName: 'Days',
      width: 80,
      sortable: true,
      cellStyle: { textAlign: 'center' }
    },
    {
      field: 'reason',
      headerName: 'Reason',
      flex: 2,
      minWidth: 180,
      tooltipField: 'reason',
      cellStyle: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      sortable: true,
      cellRenderer: WfhStatusCellRendererComponent
    },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 90,
      sortable: true,
      cellRenderer: (params: any) => params.value
        ? `<span style="color:#14532d;font-weight:600;">● Yes</span>`
        : `<span style="color:#64748b;">—</span>`
    },
    {
      field: 'createdAt',
      headerName: 'Applied On',
      width: 130,
      sortable: true,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
    },
    {
      headerName: 'Actions',
      width: 210,
      pinned: 'left',
      sortable: false,
      filter: false,
      cellRenderer: WfhActionCellRendererComponent,
      cellRendererParams: { context: { componentParent: this } }
    }
  ];

  gridOptions: GridOptions = {
    rowHeight: 52,
    headerHeight: 44,
    defaultColDef: {
      resizable: true,
      suppressMovable: false
    },
    animateRows: true,
    context: { componentParent: this }
  };

  constructor(private wfhRequestService: WfhRequestService) {}

  ngOnInit(): void {
    this.loadRequests();
    this.loadStatistics();
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  loadRequests(): void {
    this.loading = true;
    const f: WfhRequestFilterDto = {
      ...this.filter,
      searchTerm: this.searchTerm || undefined,
      status: this.selectedStatus !== '' ? this.selectedStatus : undefined
    };

    this.wfhRequestService.getFilteredWfhRequests(f).subscribe({
      next: (r) => {
        if (r.success) this.rowData = r.data.items;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadStatistics(): void {
    this.wfhRequestService.getWfhRequestStatisticsByStatus().subscribe({
      next: (r) => { if (r.success) this.statistics = r.data; }
    });
  }

  onSearch(): void {
    this.filter.pageNumber = 1;
    this.loadRequests();
  }

  onStatusFilterChange(): void {
    this.filter.pageNumber = 1;
    this.loadRequests();
  }

  onClearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.filter.pageNumber = 1;
    this.loadRequests();
  }

  // ---- CRUD actions called from cell renderer ----

  viewDetails(request: WfhRequest): void {
    this.selectedRequestId = request.id;
    this.showDetails = true;
    this.showForm = false;
  }

  editWfhRequest(request: WfhRequest): void {
    this.editingRequest = request;
    this.showForm = true;
    this.showDetails = false;
  }

  openCreateForm(): void {
    this.editingRequest = null;
    this.showForm = true;
    this.showDetails = false;
  }

  async approveWfhRequest(request: WfhRequest): Promise<void> {
    const result = await Swal.fire({
      title: 'Approve WFH Request?',
      html: `Approve <strong>${request.employeeName}'s</strong> WFH request (${request.totalDays} day${request.totalDays !== 1 ? 's' : ''})?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });
    if (!result.isConfirmed) return;

    const dto: ApproveRejectWfhRequestDto = { status: ApprovalStatus.Approved };
    this.wfhRequestService.approveRejectWfhRequest(request.id, dto).subscribe({
      next: (r) => {
        if (r.success) {
          Swal.fire({ title: 'Approved!', text: 'WFH request approved.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadRequests();
          this.loadStatistics();
        } else {
          Swal.fire('Error!', r.message || 'Failed to approve', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async rejectWfhRequest(request: WfhRequest): Promise<void> {
    const { value: reason } = await Swal.fire({
      title: 'Reject WFH Request',
      input: 'textarea',
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Enter reason (min 10 characters)...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject',
      inputValidator: (v) => !v || v.length < 10 ? 'Reason must be at least 10 characters!' : null
    });
    if (!reason) return;

    const dto: ApproveRejectWfhRequestDto = { status: ApprovalStatus.Rejected, rejectionReason: reason };
    this.wfhRequestService.approveRejectWfhRequest(request.id, dto).subscribe({
      next: (r) => {
        if (r.success) {
          Swal.fire({ title: 'Rejected!', text: 'WFH request rejected.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadRequests();
          this.loadStatistics();
        } else {
          Swal.fire('Error!', r.message || 'Failed to reject', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async cancelWfhRequest(request: WfhRequest): Promise<void> {
    const result = await Swal.fire({
      title: 'Cancel WFH Request?',
      html: `Cancel <strong>${request.employeeName}'s</strong> WFH request?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Cancel It'
    });
    if (!result.isConfirmed) return;

    this.wfhRequestService.cancelWfhRequest(request.id).subscribe({
      next: (r) => {
        if (r.success) {
          Swal.fire({ title: 'Cancelled!', text: 'WFH request cancelled.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadRequests();
          this.loadStatistics();
        } else {
          Swal.fire('Error!', r.message || 'Failed to cancel', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async deleteWfhRequest(request: WfhRequest): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete WFH Request?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });
    if (!result.isConfirmed) return;

    this.wfhRequestService.deleteWfhRequest(request.id).subscribe({
      next: (r) => {
        if (r.success) {
          Swal.fire({ title: 'Deleted!', text: 'WFH request deleted.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadRequests();
          this.loadStatistics();
        } else {
          Swal.fire('Error!', r.message || 'Failed to delete', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  onRequestSaved(): void {
    this.showForm = false;
    this.editingRequest = null;
    this.loadRequests();
    this.loadStatistics();
  }

  onSidebarClose(): void {
    this.showDetails = false;
    this.showForm = false;
    this.selectedRequestId = null;
    this.editingRequest = null;
  }

  onRequestUpdated(): void {
    this.loadRequests();
    this.loadStatistics();
  }

  getStatCount(key: string): number {
    return this.statistics[key] ?? 0;
  }
}