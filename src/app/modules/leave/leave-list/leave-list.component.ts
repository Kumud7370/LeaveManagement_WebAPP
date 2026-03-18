import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
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
  GridApi,
  GridReadyEvent,
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz
} from 'ag-grid-community';
import Swal from 'sweetalert2';
import { LeaveService } from '../../../core/services/api/leave.api';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { Leave, LeaveFilterDto, LeaveStatus } from '../../../core/Models/leave.model';
import { LeaveType } from '../../../core/Models/leave-type.model';
import { LeaveActionCellRendererComponent } from '../leave-action-cell-renderer.component';
import { LeaveFormComponent } from '../leave-form/leave-form.component';
import { LeaveDetailsComponent } from '../leave-details/leave-details.component';
import { AuthService } from '../../../core/services/api/auth.api'

import * as XLSX from 'xlsx';


ModuleRegistry.registerModules([AllCommunityModule]);

const leaveGridTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff',
  foregroundColor: '#374151',
  borderColor: '#e5e7eb',
  headerBackgroundColor: '#ffffff',
  headerTextColor: '#374151',
  oddRowBackgroundColor: '#ffffff',
  rowHoverColor: '#f8faff',
  selectedRowBackgroundColor: '#dbeafe',
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize: 13,
  columnBorder: true,
  headerColumnBorder: true,
  headerColumnBorderHeight: '50%',
  headerColumnResizeHandleColor: '#d1d5db',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth: 2,
  cellHorizontalPaddingScale: 0.75,
  headerFontWeight: 500,
  headerFontSize: 13,
  rowBorder: true,
});

@Component({
  selector: 'app-leave-list',
  standalone: true,
  templateUrl: './leave-list.component.html',
  styleUrls: ['./leave-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, AgGridAngular, LeaveFormComponent, LeaveDetailsComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LeaveListComponent implements OnInit, OnDestroy {

  readonly gridTheme = leaveGridTheme;

  leaves: Leave[] = [];
  gridApi!: GridApi;
  searchTerm = '';
  context = { componentParent: this };

  showFormModal = false;
  showDetailsModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedLeaveId: string | null = null;

  leaveTypes: LeaveType[] = [];
  loading = false;
  statsLoading = false;
  error: string | null = null;
  statistics: { [key: string]: number } = {};

  get statsTotal(): number {
    return Object.values(this.statistics).reduce((sum, v) => sum + v, 0);
  }

  showFilters = false;
  filters: LeaveFilterDto = {
    pageNumber: 1, pageSize: 10,
    sortBy: 'AppliedDate', sortDescending: true
  };

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;
  Math = Math;
  private searchDebounceTimer: any = null;
  private resizeObserver!: ResizeObserver;
  private sidebarResizeTimer: any = null;


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
      headerClass: 'll-action-col',
      cellClass: 'll-action-cell ll-action-col',
      cellStyle: { display: 'flex', alignItems: 'center', padding: '0', overflow: 'visible' },
      cellRenderer: LeaveActionCellRendererComponent,
      suppressSizeToFit: true
    },
    {
      headerName: 'Employee',
      field: 'employeeName',
      width: 200, minWidth: 160,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => p.value
        ? `<span style="font-weight:600;font-size:13px;color:#111827;font-family:'Inter',-apple-system,sans-serif;">${p.value}</span>`
        : ''
    },
    {
      headerName: 'Leave Type',
      field: 'leaveTypeName',
      width: 155, minWidth: 130,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => {
        if (!p.value) return '';
        const c = p.data?.leaveTypeColor || '#3b82f6';
        return `<span style="display:inline-flex;align-items:center;padding:3px 10px;
          background:${c}18;color:${c};border:1px solid ${c}40;
          border-radius:5px;font-size:12px;font-weight:600;
          font-family:'Inter',-apple-system,sans-serif;">${p.value}</span>`;
      }
    },
    {
      headerName: 'Start Date',
      field: 'startDate',
      width: 135, minWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    },
    {
      headerName: 'End Date',
      field: 'endDate',
      width: 135, minWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    },
    {
      headerName: 'Days',
      field: 'totalDays',
      width: 85, minWidth: 70,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;
          width:28px;height:24px;background:#f1f5f9;border-radius:5px;
          font-size:12px;font-weight:700;color:#475569;
          font-family:'Inter',-apple-system,sans-serif;">${p.value ?? 0}</span>`
    },
    {
      headerName: 'Reason',
      field: 'reason',
      width: 230, minWidth: 180,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => {
        const txt = p.value?.length > 45 ? p.value.substring(0, 45) + '…' : (p.value || '');
        const em = p.data?.isEmergencyLeave
          ? `<span style="display:inline-flex;align-items:center;background:#fee2e2;color:#991b1b;
              padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;
              margin-left:5px;white-space:nowrap;font-family:'Inter',-apple-system,sans-serif;">Emergency</span>` : '';
        return `<div style="display:flex;align-items:center;font-size:13px;color:#6b7280;
          font-family:'Inter',-apple-system,sans-serif;"><span>${txt}</span>${em}</div>`;
      }
    },
    {
      headerName: 'Status',
      field: 'leaveStatus',
      width: 120, minWidth: 110,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => {
        const map: Record<string, [string, string, string]> = {
          '0': ['#fef9c3', '#92400e', 'Pending'],
          '1': ['#dbeafe', '#1d4ed8', 'Admin Approved'],
          '2': ['#e0e7ff', '#4338ca', 'Nayab Approved'],
          '3': ['#dcfce7', '#166534', 'Fully Approved'],
          '4': ['#fee2e2', '#991b1b', 'Rejected'],
          '5': ['#f1f5f9', '#475569', 'Cancelled'],
          'Pending': ['#fef9c3', '#92400e', 'Pending'],
          'AdminApproved': ['#dbeafe', '#1d4ed8', 'Admin Approved'],
          'NayabApproved': ['#e0e7ff', '#4338ca', 'Nayab Approved'],
          'FullyApproved': ['#dcfce7', '#166534', 'Fully Approved'],
          'Rejected': ['#fee2e2', '#991b1b', 'Rejected'],
          'Cancelled': ['#f1f5f9', '#475569', 'Cancelled'],
        };
        const [bg, color, lbl] = map[String(p.value)] ?? ['#fef9c3', '#92400e', 'Pending'];
        return `<span style="display:inline-flex;padding:2px 12px;border-radius:9999px;
          font-size:12px;font-weight:600;background:${bg};color:${color};
          font-family:'Inter',-apple-system,sans-serif;">${lbl}</span>`;
      }
    },
    {
      headerName: 'Applied On',
      field: 'appliedDate',
      width: 135, minWidth: 120,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
    {
      headerName: 'Approved By',
      field: 'approvedByName',
      width: 150, minWidth: 130,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => p.value
        ? `<span style="font-size:13px;color:#374151;font-family:'Inter',-apple-system,sans-serif;">${p.value}</span>`
        : `<span style="color:#d1d5db;font-size:13px;font-family:'Inter',-apple-system,sans-serif;">—</span>`
    }
  ];

  constructor(
    private leaveService: LeaveService,
    private leaveTypeService: LeaveTypeService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  get currentRole(): string { return this.authService.getRole(); }
  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isNayab(): boolean { return this.authService.isNayabTehsildar(); }
  get isTehsildar(): boolean { return this.authService.isTehsildar(); }
  get isHR(): boolean { return this.authService.isHR(); }

  ngOnInit(): void {

    if (this.authService.isHR()) {
      this.filters.departmentId = this.authService.getDepartmentId();
    }

    this.loadLeaveTypes();
    this.loadLeaves();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    clearTimeout(this.sidebarResizeTimer);
    clearTimeout(this.searchDebounceTimer);
  }

  // ── Respond to window resize (also catches sidebar toggle via layout reflow) ──
  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleSizeColumnsToFit();
  }

  private scheduleSizeColumnsToFit(delay = 320): void {
    clearTimeout(this.sidebarResizeTimer);
    this.sidebarResizeTimer = setTimeout(() => {
      if (this.gridApi) this.gridApi.sizeColumnsToFit();
    }, delay);
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
    const gridEl = document.querySelector('app-leave-list ag-grid-angular') as HTMLElement;
    if (gridEl && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleSizeColumnsToFit(50);
      });
      this.resizeObserver.observe(gridEl);
    }
  }

  loadLeaveTypes(): void {
    this.leaveTypeService.getActiveLeaveTypes().subscribe({
      next: (r) => { if (r.success) this.leaveTypes = r.data; }
    });
  }

  loadLeaves(): void {
    this.loading = true; this.error = null;
    const filter: LeaveFilterDto = {
      ...this.filters,
      searchTerm: this.searchTerm || undefined,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    const request$ = this.authService.isHR()
      ? this.leaveService.getDepartmentLeaves(filter)
      : this.leaveService.getFilteredLeaves(filter);

    request$.subscribe({
      next: (r) => {
        this.loading = false;
        if (r.success) {
          this.leaves = r.data.items;
          this.totalPages = r.data.totalPages;
          this.totalCount = r.data.totalCount;
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.leaves);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
        } else { this.error = r.message || 'Failed to load leaves'; }
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.loading = false;
        this.error = e.error?.message || 'Error loading leaves';
        this.cdr.detectChanges();
      }
    });
  }

  loadStatistics(): void {
    this.statsLoading = true;
    this.leaveService.getLeaveStatisticsByStatus().subscribe({
      next: (r) => {
        this.statsLoading = false;
        if (r.success) { this.statistics = r.data; this.cdr.detectChanges(); }
      },
      error: () => { this.statsLoading = false; this.cdr.detectChanges(); }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => { this.currentPage = 1; this.loadLeaves(); }, 350);
  }

  onFilterChange(): void { this.currentPage = 1; this.loadLeaves(); }

  clearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm = '';
    this.filters = { pageNumber: 1, pageSize: 10, sortBy: 'AppliedDate', sortDescending: true };
    this.currentPage = 1;
    this.loadLeaves();
  }

  get activeFilterCount(): number {
    return [
      this.filters.leaveTypeId,
      this.filters.leaveStatus !== undefined && this.filters.leaveStatus !== null,
      this.filters.startDateFrom, this.filters.startDateTo,
      this.filters.appliedDateFrom, this.filters.isEmergencyLeave
    ].filter(Boolean).length;
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page; this.loadLeaves();
  }

  onPageSizeChange(e: Event): void {
    this.pageSize = +(e.target as HTMLSelectElement).value;
    this.currentPage = 1; this.loadLeaves();
  }

  get pages(): number[] {
    const max = 5;
    let s = Math.max(1, this.currentPage - Math.floor(max / 2));
    const e = Math.min(this.totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }

  createLeave(): void { this.formMode = 'create'; this.selectedLeaveId = null; this.showFormModal = true; }
  editLeave(leave: Leave): void { this.formMode = 'edit'; this.selectedLeaveId = leave.id; this.showFormModal = true; }
  viewDetails(leave: Leave): void { this.selectedLeaveId = leave.id; this.showDetailsModal = true; }
  closeFormModal(): void { this.showFormModal = false; this.selectedLeaveId = null; }
  closeDetailsModal(): void { this.showDetailsModal = false; this.selectedLeaveId = null; }
  onFormSuccess(): void { this.closeFormModal(); this.loadLeaves(); this.loadStatistics(); }
  onLeaveUpdated(): void { this.loadLeaves(); this.loadStatistics(); }

  approveLeave(leave: Leave): void { this._doApprove(leave); }
  rejectLeave(leave: Leave): void { this._doReject(leave); }
  cancelLeave(leave: Leave): void { this._doCancel(leave); }
  deleteLeave(leave: Leave): void { this._doDelete(leave); }

  private async _doApprove(leave: Leave): Promise<void> {
    const role = this.currentRole;
    const statusMap: Record<string, number> = {
      'Pending': 0, 'AdminApproved': 1, 'NayabApproved': 2
    };
    const s = typeof leave.leaveStatus === 'number'
      ? leave.leaveStatus
      : statusMap[leave.leaveStatus as any] ?? -1;

    const canApprove =
      (role === 'Admin' && s === 0) ||
      (role === 'NayabTehsildar' && s === 1) ||
      (role === 'Tehsildar' && s === 2);

    if (!canApprove) {
      Swal.fire('Cannot Approve',
        'This leave is not at the correct stage for your role to approve.', 'warning');
      return;
    }

    const stageLabel =
      role === 'Admin' ? 'Admin Approve (forward to Nayab Tehsildar)' :
        role === 'NayabTehsildar' ? 'Nayab Approve (forward to Tehsildar)' :
          'Final Approve';

    const r = await Swal.fire({
      title: `${stageLabel}?`,
      html: `Approve <strong>${leave.employeeName}</strong>'s leave (${leave.totalDays} days)?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });
    if (!r.isConfirmed) return;

    const approve$ =
      role === 'Admin' ? this.leaveService.adminApproveLeave(leave.id) :
        role === 'NayabTehsildar' ? this.leaveService.nayabApproveLeave(leave.id) :
          this.leaveService.tehsildarApproveLeave(leave.id);

    approve$.subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Approved!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to approve', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  private async _doReject(leave: Leave): Promise<void> {
    const { value: reason } = await Swal.fire({
      title: 'Reject Leave', input: 'textarea',
      inputLabel: 'Reason for rejection', inputPlaceholder: 'Enter reason...',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject', inputValidator: (v) => !v ? 'Reason is required!' : null
    });
    if (!reason) return;
    this.leaveService.rejectLeave(leave.id, reason).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Rejected!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to reject', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  private async _doCancel(leave: Leave): Promise<void> {
    const { value: reason } = await Swal.fire({
      title: 'Cancel Leave', input: 'textarea',
      inputLabel: 'Reason for cancellation', inputPlaceholder: 'Enter reason...',
      showCancelButton: true, confirmButtonColor: '#f59e0b', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Cancel Leave', inputValidator: (v) => !v ? 'Reason is required!' : null
    });
    if (!reason) return;
    this.leaveService.cancelLeave(leave.id, reason).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Cancelled!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to cancel', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  private async _doDelete(leave: Leave): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete Leave?',
      html: `<p>Delete <strong>${leave.employeeName}'s</strong> leave?</p>
             <p style="color:#ef4444;padding:10px;background:#fee2e2;border-radius:6px;margin-top:10px;">
               <strong>Warning:</strong> This cannot be undone.</p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete'
    });
    if (!r.isConfirmed) return;
    this.leaveService.deleteLeave(leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Deleted!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to delete', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  exportToExcel(): void {
    if (!this.leaves.length) { Swal.fire('No Data', 'Nothing to export.', 'info'); return; }
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const data = this.leaves.map(l => ({
      'Employee Code': l.employeeCode || '', 'Employee Name': l.employeeName || '',
      'Leave Type': l.leaveTypeName || '', 'Start Date': new Date(l.startDate).toLocaleDateString(),
      'End Date': new Date(l.endDate).toLocaleDateString(), 'Total Days': l.totalDays,
      'Reason': l.reason, 'Status': l.leaveStatusName, 'Emergency': l.isEmergencyLeave ? 'Yes' : 'No',
      'Applied Date': new Date(l.appliedDate).toLocaleDateString(),
      'Approved By': l.approvedByName || '', 'Rejection Reason': l.rejectionReason || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [10, 20, 15, 12, 12, 10, 30, 12, 10, 12, 18, 20].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leaves');
    const fn = `Leaves_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: 'Done!', text: `${fn} downloaded.`, icon: 'success', timer: 2500, showConfirmButton: false });
  }
}