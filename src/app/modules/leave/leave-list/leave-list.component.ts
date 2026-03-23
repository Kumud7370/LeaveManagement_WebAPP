import {
  Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, OnDestroy,
  ChangeDetectorRef, ViewEncapsulation, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi, GridReadyEvent, ColDef,
  ModuleRegistry, AllCommunityModule, themeQuartz
} from 'ag-grid-community';
import Swal from 'sweetalert2';
import { LeaveService } from '../../../core/services/api/leave.api';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { Leave, LeaveFilterDto, LeaveStatus } from '../../../core/Models/leave.model';
import { LeaveType } from '../../../core/Models/leave-type.model';
import { LeaveActionCellRendererComponent } from '../leave-action-cell-renderer.component';
import { LeaveFormComponent } from '../leave-form/leave-form.component';
import { LeaveDetailsComponent } from '../leave-details/leave-details.component';
import { AuthService } from '../../../core/services/api/auth.api';
import { LanguageService } from '../../../core/services/api/language.api';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const leaveGridTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff', foregroundColor: '#374151',
  borderColor: '#e5e7eb', headerBackgroundColor: '#ffffff', headerTextColor: '#374151',
  oddRowBackgroundColor: '#ffffff', rowHoverColor: '#f8faff',
  selectedRowBackgroundColor: '#dbeafe',
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize: 13, columnBorder: true, headerColumnBorder: true,
  headerColumnBorderHeight: '50%', headerColumnResizeHandleColor: '#d1d5db',
  headerColumnResizeHandleHeight: '50%', headerColumnResizeHandleWidth: 2,
  cellHorizontalPaddingScale: 0.75, headerFontWeight: 500, headerFontSize: 13, rowBorder: true,
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
  private destroy$ = new Subject<void>();

  leaves: Leave[] = [];
  gridApi!: GridApi;
  searchTerm = '';
  context = { componentParent: this };

  showFormModal    = false;
  showDetailsModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedLeaveId: string | null = null;

  leaveTypes: LeaveType[] = [];
  loading      = false;
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
  pageSize    = 10;
  totalPages  = 0;
  totalCount  = 0;
  Math = Math;
  private searchDebounceTimer: any = null;
  private resizeObserver!: ResizeObserver;
  private sidebarResizeTimer: any = null;

  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80,
    cellStyle: { display: 'flex', alignItems: 'center' }
  };

  columnDefs: ColDef[] = [];

  constructor(
    private leaveService: LeaveService,
    private leaveTypeService: LeaveTypeService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    public  langService: LanguageService
  ) { }

  get currentRole(): string { return this.authService.getRole(); }
  get isAdmin():     boolean { return this.authService.isAdmin(); }
  get isNayab():     boolean { return this.authService.isNayabTehsildar(); }
  get isTehsildar(): boolean { return this.authService.isTehsildar(); }
  get isHR():        boolean { return this.authService.isHR(); }

  ngOnInit(): void {
    if (this.authService.isHR()) {
      this.filters.departmentId = this.authService.getDepartmentId();
    }
    this.buildColumnDefs();
    this.loadLeaveTypes();
    this.loadLeaves();
    this.loadStatistics();

    this.langService.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.buildColumnDefs();
      if (this.gridApi) this.gridApi.setGridOption('columnDefs', this.columnDefs);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(); this.destroy$.complete();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    clearTimeout(this.sidebarResizeTimer);
    clearTimeout(this.searchDebounceTimer);
  }

  @HostListener('window:resize')
  onWindowResize(): void { this.scheduleSizeColumnsToFit(); }

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
      this.resizeObserver = new ResizeObserver(() => this.scheduleSizeColumnsToFit(50));
      this.resizeObserver.observe(gridEl);
    }
  }

  // ── Column Definitions ──────────────────────────────────────────────

  buildColumnDefs(): void {
    const locale = this.langService.currentLang === 'mr' ? 'mr-IN'
                 : this.langService.currentLang === 'hi' ? 'hi-IN' : 'en-GB';

    this.columnDefs = [
      {
        headerName: this.langService.t('leave.col.actions'),
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
        headerName: this.langService.t('leave.col.employee'),
        field: 'employeeName', width: 200, minWidth: 160,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => p.value
          ? `<span style="font-weight:600;font-size:13px;color:#111827;">${p.value}</span>`
          : ''
      },
      {
        headerName: this.langService.t('leave.col.leaveType'),
        field: 'leaveTypeName', width: 155, minWidth: 130,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => {
          if (!p.value) return '';
          const c = p.data?.leaveTypeColor || '#3b82f6';
          return `<span style="display:inline-flex;align-items:center;padding:3px 10px;
            background:${c}18;color:${c};border:1px solid ${c}40;
            border-radius:5px;font-size:12px;font-weight:600;">${p.value}</span>`;
        }
      },
      {
        headerName: this.langService.t('leave.col.startDate'),
        field: 'startDate', width: 135, minWidth: 120,
        cellStyle: { display: 'flex', alignItems: 'center' },
        valueFormatter: (p: any) => p.value
          ? new Date(p.value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      },
      {
        headerName: this.langService.t('leave.col.endDate'),
        field: 'endDate', width: 135, minWidth: 120,
        cellStyle: { display: 'flex', alignItems: 'center' },
        valueFormatter: (p: any) => p.value
          ? new Date(p.value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      },
      {
        headerName: this.langService.t('leave.col.days'),
        field: 'totalDays', width: 85, minWidth: 70,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) =>
          `<span style="display:inline-flex;align-items:center;justify-content:center;
            width:28px;height:24px;background:#f1f5f9;border-radius:5px;
            font-size:12px;font-weight:700;color:#475569;">${p.value ?? 0}</span>`
      },
      {
        headerName: this.langService.t('leave.col.reason'),
        field: 'reason', width: 230, minWidth: 180,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => {
          const txt = p.value?.length > 45 ? p.value.substring(0, 45) + '…' : (p.value || '');
          const em = p.data?.isEmergencyLeave
            ? `<span style="display:inline-flex;align-items:center;background:#fee2e2;color:#991b1b;
                padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;
                margin-left:5px;white-space:nowrap;">${this.langService.t('leave.emergency')}</span>` : '';
          return `<div style="display:flex;align-items:center;font-size:13px;color:#6b7280;">
            <span>${txt}</span>${em}</div>`;
        }
      },
      {
        headerName: this.langService.t('leave.col.status'),
        field: 'leaveStatus', width: 150, minWidth: 130,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => {
          const statusKey = String(p.value);
          const colorMap: Record<string, [string, string]> = {
            '0':             ['#fef9c3', '#92400e'],
            'Pending':       ['#fef9c3', '#92400e'],
            '1':             ['#dbeafe', '#1d4ed8'],
            'AdminApproved': ['#dbeafe', '#1d4ed8'],
            '2':             ['#e0e7ff', '#4338ca'],
            'NayabApproved': ['#e0e7ff', '#4338ca'],
            '3':             ['#dcfce7', '#166534'],
            'FullyApproved': ['#dcfce7', '#166534'],
            '4':             ['#fee2e2', '#991b1b'],
            'Rejected':      ['#fee2e2', '#991b1b'],
            '5':             ['#f1f5f9', '#475569'],
            'Cancelled':     ['#f1f5f9', '#475569'],
          };
          const labelMap: Record<string, string> = {
            '0': 'leave.status.pending',       'Pending':       'leave.status.pending',
            '1': 'leave.status.adminApproved', 'AdminApproved': 'leave.status.adminApproved',
            '2': 'leave.status.nayabApproved', 'NayabApproved': 'leave.status.nayabApproved',
            '3': 'leave.status.fullyApproved', 'FullyApproved': 'leave.status.fullyApproved',
            '4': 'leave.status.rejected',      'Rejected':      'leave.status.rejected',
            '5': 'leave.status.cancelled',     'Cancelled':     'leave.status.cancelled',
          };
          const [bg, color] = colorMap[statusKey] ?? ['#fef9c3', '#92400e'];
          const lbl = this.langService.t(labelMap[statusKey] ?? 'leave.status.pending');
          return `<span style="display:inline-flex;padding:2px 12px;border-radius:9999px;
            font-size:12px;font-weight:600;background:${bg};color:${color};">${lbl}</span>`;
        }
      },
      {
        headerName: this.langService.t('leave.col.appliedOn'),
        field: 'appliedDate', width: 135, minWidth: 120,
        cellStyle: { display: 'flex', alignItems: 'center' },
        valueFormatter: (p: any) => p.value
          ? new Date(p.value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      },
      {
        headerName: this.langService.t('leave.col.approvedBy'),
        field: 'approvedByName', width: 150, minWidth: 130,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => p.value
          ? `<span style="font-size:13px;color:#374151;">${p.value}</span>`
          : `<span style="color:#d1d5db;font-size:13px;">—</span>`
      }
    ];
  }

  // ── Data Loading ──────────────────────────────────────────────────────

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
      pageNumber: this.currentPage, pageSize: this.pageSize
    };
    const request$ = this.authService.isHR()
      ? this.leaveService.getDepartmentLeaves(filter)
      : this.leaveService.getFilteredLeaves(filter);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
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
        } else { this.error = r.message || this.langService.t('leave.loadError'); }
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.loading = false;
        this.error = e.error?.message || this.langService.t('leave.loadError');
        this.cdr.detectChanges();
      }
    });
  }

  loadStatistics(): void {
    this.statsLoading = true;
    this.leaveService.getLeaveStatisticsByStatus().pipe(takeUntil(this.destroy$)).subscribe({
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
    this.currentPage = 1; this.loadLeaves();
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

  createLeave():     void { this.formMode = 'create'; this.selectedLeaveId = null;      this.showFormModal = true; }
  editLeave(l: Leave): void { this.formMode = 'edit';   this.selectedLeaveId = l.id;     this.showFormModal = true; }
  viewDetails(l: Leave):void { this.selectedLeaveId = l.id; this.showDetailsModal = true; }
  closeFormModal():    void { this.showFormModal = false;    this.selectedLeaveId = null; }
  closeDetailsModal(): void { this.showDetailsModal = false; this.selectedLeaveId = null; }
  onFormSuccess():     void { this.closeFormModal();  this.loadLeaves(); this.loadStatistics(); }
  onLeaveUpdated():    void { this.loadLeaves(); this.loadStatistics(); }

  approveLeave(l: Leave): void { this._doApprove(l); }
  rejectLeave(l: Leave):  void { this._doReject(l); }
  cancelLeave(l: Leave):  void { this._doCancel(l); }
  deleteLeave(l: Leave):  void { this._doDelete(l); }

  private async _doApprove(leave: Leave): Promise<void> {
    const role = this.currentRole;
    const statusMap: Record<string, number> = { 'Pending': 0, 'AdminApproved': 1, 'NayabApproved': 2 };
    const s = typeof leave.leaveStatus === 'number' ? leave.leaveStatus : (statusMap[leave.leaveStatus as any] ?? -1);
    const canApprove =
      (role === 'Admin' && s === 0) ||
      (role === 'NayabTehsildar' && s === 1) ||
      (role === 'Tehsildar' && s === 2);

    if (!canApprove) {
      Swal.fire(this.langService.t('leave.swal.cannotApproveTitle'), this.langService.t('leave.swal.cannotApproveText'), 'warning');
      return;
    }

    const stageLabel = role === 'Admin'         ? this.langService.t('leave.swal.adminApproveLabel')
                     : role === 'NayabTehsildar' ? this.langService.t('leave.swal.nayabApproveLabel')
                                                 : this.langService.t('leave.swal.finalApproveLabel');

    const r = await Swal.fire({
      title: `${stageLabel}?`,
      html: `${this.langService.t('leave.swal.approveHtml')} <strong>${leave.employeeName}</strong> (${leave.totalDays} ${this.langService.t('leave.swal.days')})?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: this.langService.t('leave.swal.yesApprove'),
      cancelButtonText: this.langService.t('common.cancel')
    });
    if (!r.isConfirmed) return;

    const approve$ = role === 'Admin'         ? this.leaveService.adminApproveLeave(leave.id)
                   : role === 'NayabTehsildar' ? this.leaveService.nayabApproveLeave(leave.id)
                                               : this.leaveService.tehsildarApproveLeave(leave.id);
    approve$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: this.langService.t('leave.swal.approved'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire(this.langService.t('common.errorTitle'), res.message || this.langService.t('leave.swal.approveFailed'), 'error'); }
      },
      error: (e) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error')
    });
  }

  private async _doReject(leave: Leave): Promise<void> {
    const { value: reason } = await Swal.fire({
      title: this.langService.t('leave.swal.rejectTitle'),
      input: 'textarea',
      inputLabel: this.langService.t('leave.swal.rejectInputLabel'),
      inputPlaceholder: this.langService.t('leave.swal.rejectPlaceholder'),
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: this.langService.t('leave.swal.rejectBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      inputValidator: (v) => !v ? this.langService.t('leave.swal.reasonRequired') : null
    });
    if (!reason) return;
    this.leaveService.rejectLeave(leave.id, reason).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: this.langService.t('leave.swal.rejected'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire(this.langService.t('common.errorTitle'), res.message || this.langService.t('leave.swal.rejectFailed'), 'error'); }
      },
      error: (e) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error')
    });
  }

  private async _doCancel(leave: Leave): Promise<void> {
    const { value: reason } = await Swal.fire({
      title: this.langService.t('leave.swal.cancelTitle'),
      input: 'textarea',
      inputLabel: this.langService.t('leave.swal.cancelInputLabel'),
      inputPlaceholder: this.langService.t('leave.swal.cancelPlaceholder'),
      showCancelButton: true, confirmButtonColor: '#f59e0b', cancelButtonColor: '#6b7280',
      confirmButtonText: this.langService.t('leave.swal.cancelBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      inputValidator: (v) => !v ? this.langService.t('leave.swal.reasonRequired') : null
    });
    if (!reason) return;
    this.leaveService.cancelLeave(leave.id, reason).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: this.langService.t('leave.swal.cancelled'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire(this.langService.t('common.errorTitle'), res.message || this.langService.t('leave.swal.cancelFailed'), 'error'); }
      },
      error: (e) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error')
    });
  }

  private async _doDelete(leave: Leave): Promise<void> {
    const r = await Swal.fire({
      title: this.langService.t('leave.swal.deleteTitle'),
      html: `<p>${this.langService.t('leave.swal.deleteHtml')} <strong>${leave.employeeName}</strong>?</p>
             <p style="color:#ef4444;padding:10px;background:#fee2e2;border-radius:6px;margin-top:10px;">
               <strong>${this.langService.t('common.warning')}:</strong> ${this.langService.t('um.deleteWarning')}</p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: this.langService.t('common.yesDelete'),
      cancelButtonText: this.langService.t('common.cancel')
    });
    if (!r.isConfirmed) return;
    this.leaveService.deleteLeave(leave.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: this.langService.t('common.deleted'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire(this.langService.t('common.errorTitle'), res.message || this.langService.t('leave.swal.deleteFailed'), 'error'); }
      },
      error: (e) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error')
    });
  }

  exportToExcel(): void {
    if (!this.leaves.length) {
      Swal.fire(this.langService.t('leave.swal.noData'), this.langService.t('leave.swal.nothingToExport'), 'info');
      return;
    }
    Swal.fire({ title: this.langService.t('leave.swal.exporting'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const data = this.leaves.map(l => ({
      'Employee Code': l.employeeCode || '', 'Employee Name': l.employeeName || '',
      'Leave Type': l.leaveTypeName || '',
      'Start Date': new Date(l.startDate).toLocaleDateString(),
      'End Date': new Date(l.endDate).toLocaleDateString(),
      'Total Days': l.totalDays, 'Reason': l.reason,
      'Status': l.leaveStatusName, 'Emergency': l.isEmergencyLeave ? 'Yes' : 'No',
      'Applied Date': new Date(l.appliedDate).toLocaleDateString(),
      'Approved By': l.approvedByName || '', 'Rejection Reason': l.rejectionReason || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [10, 20, 15, 12, 12, 10, 30, 12, 10, 12, 18, 20].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leaves');
    const fn = `Leaves_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: this.langService.t('common.done'), text: `${fn} downloaded.`, icon: 'success', timer: 2500, showConfirmButton: false });
  }
}