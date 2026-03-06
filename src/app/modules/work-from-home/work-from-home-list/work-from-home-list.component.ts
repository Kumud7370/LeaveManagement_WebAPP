import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewEncapsulation,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz
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
import { WfhActionCellRendererComponent } from '../wfh-action-cell-renderer';

ModuleRegistry.registerModules([AllCommunityModule]);

const wfhGridTheme = themeQuartz.withParams({
  backgroundColor:                '#ffffff',
  foregroundColor:                '#1f2937',
  borderColor:                    '#e5e7eb',
  headerBackgroundColor:          '#f9fafb',
  headerTextColor:                '#374151',
  oddRowBackgroundColor:          '#ffffff',
  rowHoverColor:                  '#f8faff',
  selectedRowBackgroundColor:     '#dbeafe',
  fontFamily:                     '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize:                       13,
  columnBorder:                   true,
  headerColumnBorder:             true,
  headerColumnBorderHeight:       '50%',
  headerColumnResizeHandleColor:  '#9ca3af',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth:  2,
  cellHorizontalPaddingScale:     0.8,
});

@Component({
  selector: 'app-wfh-request-list',
  standalone: true,
  templateUrl: './work-from-home-list.component.html',
  styleUrls: ['./work-from-home-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    WfhRequestDetailsComponent,
    WfhRequestFormComponent,
    WfhActionCellRendererComponent
  ]
})
export class WfhRequestListComponent implements OnInit, OnDestroy {

  readonly gridTheme = wfhGridTheme;

  rowData: WfhRequest[] = [];
  private gridApi!: GridApi;
  loading   = false;
  refreshing = false;
  error: string | null = null;
  context   = { componentParent: this };

  // Modal state
  showForm    = false;
  showDetails = false;
  selectedRequestId: string | null = null;
  editingRequest: WfhRequest | null = null;

  // Filters
  showFilters    = false;
  searchTerm     = '';
  selectedStatus: ApprovalStatus | '' = '';
  ApprovalStatus = ApprovalStatus;
  filters: { startDateFrom?: string; startDateTo?: string; appliedDateFrom?: string } = {};

  // Pagination
  currentPage = 1;
  pageSize    = 10;
  totalPages  = 0;
  totalCount  = 0;
  Math = Math;

  // Statistics
  statistics: { [key: string]: number } = {};

  get statsTotal(): number {
    return Object.values(this.statistics).reduce((sum, v) => sum + v, 0);
  }

  get activeFilterCount(): number {
    return [
      this.selectedStatus !== '',
      this.filters.startDateFrom,
      this.filters.startDateTo,
      this.filters.appliedDateFrom
    ].filter(Boolean).length;
  }

  private resizeObserver!: ResizeObserver;
  private sidebarResizeTimer: any = null;
  private searchDebounceTimer: any = null;

  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80,
    cellStyle: { display: 'flex', alignItems: 'center' }
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      width: 190, minWidth: 190, maxWidth: 190,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      // Matches holiday list: 'actions-cell' class for right border
      cellClass: 'actions-cell',
      cellStyle: { display: 'flex', alignItems: 'center', padding: '0', overflow: 'visible' },
      cellRenderer: WfhActionCellRendererComponent,
      suppressSizeToFit: true
    },
    {
      headerName: 'Employee',
      field: 'employeeName',
      width: 200, minWidth: 160,
      cellRenderer: (p: any) => p.value
        ? `<span style="font-weight:600;color:#1f2937;">${p.value}</span>`
        : ''
    },
    {
      headerName: 'Emp Code',
      field: 'employeeCode',
      width: 120, minWidth: 100,
    },
    {
      headerName: 'Start Date',
      field: 'startDate',
      width: 135, minWidth: 120,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    },
    {
      headerName: 'End Date',
      field: 'endDate',
      width: 135, minWidth: 120,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    },
    {
      headerName: 'Days',
      field: 'totalDays',
      width: 85, minWidth: 70,
      cellRenderer: (p: any) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;
          width:28px;height:24px;background:#f1f5f9;border-radius:5px;
          font-size:12px;font-weight:700;color:#475569;">${p.value ?? 0}</span>`
    },
    {
      headerName: 'Reason',
      field: 'reason',
      width: 230, minWidth: 180,
      cellRenderer: (p: any) => {
        const txt = p.value?.length > 45 ? p.value.substring(0, 45) + '…' : (p.value || '');
        return `<span style="font-size:13px;color:#6b7280;">${txt}</span>`;
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 130, minWidth: 110,
      cellRenderer: (p: any) => {
        const numMap: Record<number, [string, string, string]> = {
          [ApprovalStatus.Pending]:   ['#fef9c3', '#92400e', 'Pending'],
          [ApprovalStatus.Approved]:  ['#dcfce7', '#166534', 'Approved'],
          [ApprovalStatus.Rejected]:  ['#fee2e2', '#991b1b', 'Rejected'],
          [ApprovalStatus.Cancelled]: ['#f1f5f9', '#475569', 'Cancelled'],
        };
        const strMap: Record<string, [string, string, string]> = {
          'pending':   ['#fef9c3', '#92400e', 'Pending'],
          'approved':  ['#dcfce7', '#166534', 'Approved'],
          'rejected':  ['#fee2e2', '#991b1b', 'Rejected'],
          'cancelled': ['#f1f5f9', '#475569', 'Cancelled'],
        };
        const byNum  = numMap[Number(p.value)];
        const byStr  = strMap[String(p.value).toLowerCase()];
        const byName = strMap[String(p.data?.statusName ?? '').toLowerCase()];
        const [bg, color, lbl] = byNum ?? byStr ?? byName ?? ['#fef9c3', '#92400e', String(p.data?.statusName ?? p.value ?? 'Unknown')];
        return `<span style="display:inline-flex;padding:2px 12px;border-radius:9999px;
          font-size:12px;font-weight:600;background:${bg};color:${color};">${lbl}</span>`;
      }
    },
    {
      headerName: 'Applied On',
      field: 'createdAt',
      width: 135, minWidth: 120,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      cellStyle: { color: '#6b7280', fontSize: '12px' }
    }
  ];

  constructor(
    private wfhRequestService: WfhRequestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRequests();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    clearTimeout(this.sidebarResizeTimer);
    clearTimeout(this.searchDebounceTimer);
  }

  @HostListener('window:resize')
  onWindowResize(): void { this.scheduleSizeColumnsToFit(); }

  private scheduleSizeColumnsToFit(delay = 320): void {
    clearTimeout(this.sidebarResizeTimer);
    this.sidebarResizeTimer = setTimeout(() => {
      if (this.gridApi && !this.gridApi.isDestroyed()) this.gridApi.sizeColumnsToFit();
    }, delay);
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const gridEl = document.querySelector('app-wfh-request-list ag-grid-angular') as HTMLElement;
    if (gridEl && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleSizeColumnsToFit(50));
      this.resizeObserver.observe(gridEl);
    }
  }

  loadRequests(): void {
    const isFirstLoad = this.rowData.length === 0 && !this.error;
    if (isFirstLoad) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }
    this.error = null;

    const f: WfhRequestFilterDto = {
      pageNumber:     this.currentPage,
      pageSize:       this.pageSize,
      sortBy:         'StartDate',
      sortDescending: true,
      searchTerm:     this.searchTerm || undefined,
      status:         this.selectedStatus !== '' ? this.selectedStatus : undefined,
      ...(this.filters.startDateFrom   && { startDateFrom:   new Date(this.filters.startDateFrom) }),
      ...(this.filters.startDateTo     && { startDateTo:     new Date(this.filters.startDateTo) }),
      ...(this.filters.appliedDateFrom && { appliedDateFrom: new Date(this.filters.appliedDateFrom) }),
    };

    this.wfhRequestService.getFilteredWfhRequests(f).subscribe({
      next: (r) => {
        this.loading    = false;
        this.refreshing = false;
        if (r.success) {
          this.rowData    = r.data.items;
          this.totalPages = r.data.totalPages;
          this.totalCount = r.data.totalCount;
          if (this.gridApi && !this.gridApi.isDestroyed()) {
            this.gridApi.setGridOption('rowData', this.rowData);
            setTimeout(() => {
              if (this.gridApi && !this.gridApi.isDestroyed()) this.gridApi.sizeColumnsToFit();
            }, 50);
          }
        } else { this.error = r.message || 'Failed to load requests'; }
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.loading    = false;
        this.refreshing = false;
        this.error = e.error?.message || 'Error loading requests';
        this.cdr.detectChanges();
      }
    });
  }

  loadStatistics(): void {
    this.wfhRequestService.getWfhRequestStatisticsByStatus().subscribe({
      next: (r) => { if (r.success) { this.statistics = r.data; this.cdr.detectChanges(); } }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => { this.currentPage = 1; this.loadRequests(); }, 350);
  }

  onStatusFilterChange(): void { this.currentPage = 1; this.loadRequests(); }
  onFilterChange():       void { this.currentPage = 1; this.loadRequests(); }

  clearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm     = '';
    this.selectedStatus = '';
    this.filters        = {};
    this.currentPage    = 1;
    this.loadRequests();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page; this.loadRequests();
  }

  onPageSizeChange(e: Event): void {
    this.pageSize = +(e.target as HTMLSelectElement).value;
    this.currentPage = 1; this.loadRequests();
  }

  get pages(): number[] {
    const max = 5;
    let s = Math.max(1, this.currentPage - Math.floor(max / 2));
    const e = Math.min(this.totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }

  getStatCount(key: string): number { return this.statistics[key] ?? 0; }

  viewDetails(request: WfhRequest): void {
    this.selectedRequestId = request.id;
    this.showDetails = true;
    this.showForm    = false;
  }

  editWfhRequest(request: WfhRequest): void {
    this.editingRequest = request;
    this.showForm    = true;
    this.showDetails = false;
  }

  openCreateForm(): void {
    this.editingRequest = null;
    this.showForm    = true;
    this.showDetails = false;
  }

  onSidebarClose(): void {
    this.showDetails       = false;
    this.showForm          = false;
    this.selectedRequestId = null;
    this.editingRequest    = null;
  }

  onRequestSaved():   void { this.onSidebarClose(); this.loadRequests(); this.loadStatistics(); }
  onRequestUpdated(): void { this.loadRequests(); this.loadStatistics(); }

  async approveWfhRequest(request: WfhRequest): Promise<void> {
    const r = await Swal.fire({
      title: 'Approve WFH Request?',
      html: `Approve <strong>${request.employeeName}'s</strong> WFH request (${request.totalDays} day${request.totalDays !== 1 ? 's' : ''})?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Approve'
    });
    if (!r.isConfirmed) return;
    const dto: ApproveRejectWfhRequestDto = { status: ApprovalStatus.Approved };
    this.wfhRequestService.approveRejectWfhRequest(request.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Approved!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadRequests(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to approve', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async rejectWfhRequest(request: WfhRequest): Promise<void> {
    const { value: reason } = await Swal.fire({
      title: 'Reject WFH Request', input: 'textarea',
      inputLabel: 'Reason for rejection', inputPlaceholder: 'Enter reason (min 10 characters)...',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject',
      inputValidator: (v) => !v || v.length < 10 ? 'Reason must be at least 10 characters!' : null
    });
    if (!reason) return;
    const dto: ApproveRejectWfhRequestDto = { status: ApprovalStatus.Rejected, rejectionReason: reason };
    this.wfhRequestService.approveRejectWfhRequest(request.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Rejected!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadRequests(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to reject', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async cancelWfhRequest(request: WfhRequest): Promise<void> {
    const r = await Swal.fire({
      title: 'Cancel WFH Request?',
      html: `Cancel <strong>${request.employeeName}'s</strong> WFH request?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#f59e0b', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Cancel It'
    });
    if (!r.isConfirmed) return;
    this.wfhRequestService.cancelWfhRequest(request.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Cancelled!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadRequests(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to cancel', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async deleteWfhRequest(request: WfhRequest): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete WFH Request?',
      html: `<p>Delete <strong>${request.employeeName}'s</strong> WFH request?</p>
             <p style="color:#ef4444;padding:10px;background:#fee2e2;border-radius:6px;margin-top:10px;">
               <strong>Warning:</strong> This cannot be undone.</p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete'
    });
    if (!r.isConfirmed) return;
    this.wfhRequestService.deleteWfhRequest(request.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Deleted!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadRequests(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to delete', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  exportData(): void {
    if (!this.rowData.length) { Swal.fire('No Data', 'Nothing to export.', 'info'); return; }
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const headers = ['Emp Code', 'Employee', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Applied On'];
    const rows = this.rowData.map(r => [
      r.employeeCode ?? '',
      r.employeeName ?? '',
      r.startDate  ? new Date(r.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      r.endDate    ? new Date(r.endDate).toLocaleDateString('en-GB',   { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      r.totalDays ?? '',
      r.reason ?? '',
      r.statusName ?? '',
      r.createdAt  ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `wfh_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    Swal.fire({ title: 'Done!', icon: 'success', timer: 2000, showConfirmButton: false });
  }
}