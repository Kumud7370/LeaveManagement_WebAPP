import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  GridOptions,
  ICellRendererParams
} from 'ag-grid-community';
import Swal from 'sweetalert2';

import { WfhRequestService } from '../../../core/services/api/work-from-home.api';
import {
  WfhRequest,
  WfhRequestFilterDto,
  ApprovalStatus,
  ApproveRejectWfhRequestDto
} from '../../../core/Models/work-from-home.model';
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
      valueFormatter: p => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—'
    },
    {
      field: 'endDate',
      headerName: 'End Date',
      width: 130,
      sortable: true,
      valueFormatter: p => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—'
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
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams) => {
        const status: ApprovalStatus = params.value;
        const label = params.data?.statusName ?? ApprovalStatus[status] ?? '';

        const styleMap: Record<number, { bg: string; color: string; border: string; icon: string }> = {
          [ApprovalStatus.Pending]:   { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', icon: 'bi-clock-history' },
          [ApprovalStatus.Approved]:  { bg: '#dcfce7', color: '#14532d', border: '#86efac', icon: 'bi-check-circle' },
          [ApprovalStatus.Rejected]:  { bg: '#fee2e2', color: '#7f1d1d', border: '#fca5a5', icon: 'bi-x-circle' },
          [ApprovalStatus.Cancelled]: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: 'bi-slash-circle' }
        };

        const s = styleMap[status] ?? styleMap[ApprovalStatus.Pending];

        return `<span style="display:inline-flex;align-items:center;gap:0.35rem;
                              padding:0.35rem 0.85rem;border-radius:2rem;font-size:0.78rem;
                              font-weight:600;background:${s.bg};color:${s.color};
                              border:1px solid ${s.border};">
                  <i class="bi ${s.icon}" style="pointer-events:none;"></i>
                  ${label}
                </span>`;
      }
    },
    {
      field: 'createdAt',
      headerName: 'Applied On',
      width: 130,
      sortable: true,
      valueFormatter: p => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—'
    },
    {
      headerName: 'Actions',
      width: 210,
      pinned: 'left',
      sortable: false,
      filter: false,
      suppressKeyboardEvent: () => true,
      cellStyle: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible'
      },
      cellRenderer: (params: ICellRendererParams) => {
        if (!params.data) return '';

        const status: ApprovalStatus = params.data.status;
        const isPending = status === ApprovalStatus.Pending;
        const canBeCancelled = params.data.canBeCancelled && !isPending;

        const viewBtn = `
          <button data-action="view" title="View Details"
            style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;
                   cursor:pointer;display:flex;align-items:center;justify-content:center;
                   background:#dbeafe;color:#1e40af;font-size:0.85rem;pointer-events:all;">
            <i class="bi bi-eye" style="pointer-events:none;"></i>
          </button>`;

        const editBtn = isPending ? `
          <button data-action="edit" title="Edit"
            style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;
                   cursor:pointer;display:flex;align-items:center;justify-content:center;
                   background:#fef3c7;color:#92400e;font-size:0.85rem;pointer-events:all;">
            <i class="bi bi-pencil" style="pointer-events:none;"></i>
          </button>` : '';

        const approveBtn = isPending ? `
          <button data-action="approve" title="Approve"
            style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;
                   cursor:pointer;display:flex;align-items:center;justify-content:center;
                   background:#d1fae5;color:#065f46;font-size:0.85rem;pointer-events:all;">
            <i class="bi bi-check-lg" style="pointer-events:none;"></i>
          </button>` : '';

        const rejectBtn = isPending ? `
          <button data-action="reject" title="Reject"
            style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;
                   cursor:pointer;display:flex;align-items:center;justify-content:center;
                   background:#fee2e2;color:#991b1b;font-size:0.85rem;pointer-events:all;">
            <i class="bi bi-x-lg" style="pointer-events:none;"></i>
          </button>` : '';

        const cancelBtn = canBeCancelled ? `
          <button data-action="cancel" title="Cancel"
            style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;
                   cursor:pointer;display:flex;align-items:center;justify-content:center;
                   background:#fef3c7;color:#92400e;font-size:0.85rem;pointer-events:all;">
            <i class="bi bi-slash-circle" style="pointer-events:none;"></i>
          </button>` : '';

        const deleteBtn = isPending ? `
          <button data-action="delete" title="Delete"
            style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;
                   cursor:pointer;display:flex;align-items:center;justify-content:center;
                   background:#fee2e2;color:#991b1b;font-size:0.85rem;pointer-events:all;">
            <i class="bi bi-trash" style="pointer-events:none;"></i>
          </button>` : '';

        return `<div style="display:flex;gap:0.4rem;align-items:center;height:100%;
                             flex-wrap:wrap;pointer-events:all;">
                  ${viewBtn}${editBtn}${approveBtn}${rejectBtn}${cancelBtn}${deleteBtn}
                </div>`;
      }
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
    rowSelection: 'single',
    suppressRowClickSelection: true,
    suppressCellFocus: true,
    onCellClicked: (event: any) => {
      const target = event.event?.target as HTMLElement;
      if (!target) return;

      const actionBtn = target.closest
        ? target.closest('[data-action]') as HTMLElement | null
        : null;

      const action = actionBtn?.getAttribute('data-action');
      if (!action || !event.data) return;

      const request: WfhRequest = event.data;

      switch (action) {
        case 'view':    this.viewDetails(request);       break;
        case 'edit':    this.editWfhRequest(request);    break;
        case 'approve': this.approveWfhRequest(request); break;
        case 'reject':  this.rejectWfhRequest(request);  break;
        case 'cancel':  this.cancelWfhRequest(request);  break;
        case 'delete':  this.deleteWfhRequest(request);  break;
      }
    }
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

  exportData(): void {
    if (this.rowData.length === 0) {
      Swal.fire('No Data', 'There are no records to export.', 'info');
      return;
    }

    const headers = ['Emp Code', 'Employee', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Applied On'];
    const rows = this.rowData.map(r => [
      r.employeeCode ?? '',
      r.employeeName ?? '',
      r.startDate ? new Date(r.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      r.endDate   ? new Date(r.endDate).toLocaleDateString('en-GB',   { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      r.totalDays ?? '',
      r.reason ?? '',
      r.statusName ?? '',
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `wfh_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          Swal.fire({ title: 'Approved!', text: 'WFH request approved.', icon: 'success', timer: 2000, showConfirmButton: false });
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
          Swal.fire({ title: 'Rejected!', text: 'WFH request rejected.', icon: 'success', timer: 2000, showConfirmButton: false });
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
          Swal.fire({ title: 'Cancelled!', text: 'WFH request cancelled.', icon: 'success', timer: 2000, showConfirmButton: false });
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
          Swal.fire({ title: 'Deleted!', text: 'WFH request deleted.', icon: 'success', timer: 2000, showConfirmButton: false });
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