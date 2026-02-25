import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  ChangeDetectorRef,
  ViewEncapsulation
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
import { Leave, LeaveFilterDto } from '../../../core/Models/leave.model';
import { LeaveType } from '../../../core/Models/leave-type.model';
import { LeaveActionCellRendererComponent } from '../leave-action-cell-renderer.component';
import { LeaveFormComponent } from '../leave-form/leave-form.component';
import { LeaveDetailsComponent } from '../leave-details/leave-details.component';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const leaveGridTheme = themeQuartz.withParams({
  backgroundColor:              '#ffffff',
  foregroundColor:              '#1f2937',
  borderColor:                  '#e5e7eb',
  headerBackgroundColor:        '#ffffff',
  headerTextColor:              '#374151',
  oddRowBackgroundColor:        '#ffffff',
  rowHoverColor:                '#f8faff',
  selectedRowBackgroundColor:   '#dbeafe',
  fontFamily:                   '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize:                     13,
  // ── Column separator lines (v32+ param names) ─────────────────
  columnBorder:                 true,
  headerColumnBorder:           true,
  headerColumnBorderHeight:     '50%',
  // ── Resize handle ─────────────────────────────────────────────
  headerColumnResizeHandleColor:  '#9ca3af',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth:  2,
  // ── Spacing ───────────────────────────────────────────────────
  cellHorizontalPaddingScale:   0.8,
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
export class LeaveListComponent implements OnInit {

  // ── Expose theme to template ─────────────────────────────────────────
  readonly gridTheme = leaveGridTheme;

  // ── Grid state ───────────────────────────────────────────────────────
  leaves: Leave[] = [];
  gridApi!: GridApi;
  searchTerm = '';
  context = { componentParent: this };

  // ── Modal state ──────────────────────────────────────────────────────
  showFormModal    = false;
  showDetailsModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedLeaveId: string | null = null;

  // ── Data / loading ───────────────────────────────────────────────────
  leaveTypes: LeaveType[] = [];
  loading      = false;
  statsLoading = false;
  error: string | null = null;
  statistics: { [key: string]: number } = {};

  get statsTotal(): number {
    return Object.values(this.statistics).reduce((sum, v) => sum + v, 0);
  }

  // ── Filters ──────────────────────────────────────────────────────────
  showFilters = false;
  filters: LeaveFilterDto = {
    pageNumber: 1, pageSize: 10,
    sortBy: 'AppliedDate', sortDescending: true
  };

  // ── Pagination ────────────────────────────────────────────────────────
  currentPage = 1;
  pageSize    = 10;
  totalPages  = 0;
  totalCount  = 0;
  Math = Math;
  private searchDebounceTimer: any = null;

  // ── Grid config ───────────────────────────────────────────────────────
  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80,
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions', field: 'actions',
      width: 155, minWidth: 155, maxWidth: 155,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      cellClass: 'actions-cell',
      cellRenderer: LeaveActionCellRendererComponent,
      suppressSizeToFit: true
    },
    {
      headerName: 'Employee', field: 'employeeName', width: 200, minWidth: 160,
      cellRenderer: (p: any) => p.value
        ? `<span style="font-weight:600;color:#1f2937;">${p.value}</span>` : ''
    },
    {
      headerName: 'Leave Type', field: 'leaveTypeName', width: 160, minWidth: 130,
      cellRenderer: (p: any) => {
        if (!p.value) return '';
        const c = p.data?.leaveTypeColor || '#3b82f6';
        return `<span class="hl-type-badge" style="background:${c}22;color:${c};border:1px solid ${c}44;">${p.value}</span>`;
      }
    },
    {
      headerName: 'Start Date', field: 'startDate', width: 140, minWidth: 120,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    },
    {
      headerName: 'End Date', field: 'endDate', width: 140, minWidth: 120,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    },
    {
      headerName: 'Days', field: 'totalDays', width: 90, minWidth: 70,
      cellRenderer: (p: any) => `<span style="font-weight:600;color:#374151;">${p.value ?? 0}</span>`
    },
    {
      headerName: 'Reason', field: 'reason', width: 240, minWidth: 180,
      cellRenderer: (p: any) => {
        const txt = p.value?.length > 50 ? p.value.substring(0, 50) + '…' : (p.value || '');
        const em  = p.data?.isEmergencyLeave
          ? '<span class="hl-emergency-tag">Emergency</span>' : '';
        return `<div style="display:flex;align-items:center;gap:4px;">${txt}${em}</div>`;
      }
    },
    {
      headerName: 'Status', field: 'leaveStatus', width: 130, minWidth: 110,
      cellRenderer: (p: any) => {
        const map: Record<string, [string, string]> = {
          '0': ['pending','Pending'], '1': ['approved','Approved'],
          '2': ['rejected','Rejected'], '3': ['cancelled','Cancelled'],
          'Pending': ['pending','Pending'], 'Approved': ['approved','Approved'],
          'Rejected': ['rejected','Rejected'], 'Cancelled': ['cancelled','Cancelled']
        };
        const [cls, lbl] = map[String(p.value)] ?? ['pending','Pending'];
        return `<span class="hl-status-chip ${cls}">${lbl}</span>`;
      }
    },
    {
      headerName: 'Applied On', field: 'appliedDate', width: 150, minWidth: 130,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
    {
      headerName: 'Approved By', field: 'approvedByName', width: 160, minWidth: 130,
      valueFormatter: (p: any) => p.value || '—',
    }
  ];

  constructor(
    private leaveService: LeaveService,
    private leaveTypeService: LeaveTypeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLeaveTypes();
    this.loadLeaves();
    this.loadStatistics();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
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
      pageSize:   this.pageSize
    };
    this.leaveService.getFilteredLeaves(filter).subscribe({
      next: (r) => {
        this.loading = false;
        if (r.success) {
          this.leaves     = r.data.items;
          this.totalPages = r.data.totalPages;
          this.totalCount = r.data.totalCount;
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.leaves);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
        } else { this.error = r.message || 'Failed to load leaves'; }
        this.cdr.detectChanges();
      },
      error: (e) => { this.loading = false; this.error = e.error?.message || 'Error loading leaves'; this.cdr.detectChanges(); }
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
    this.filters    = { pageNumber: 1, pageSize: 10, sortBy: 'AppliedDate', sortDescending: true };
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
    this.pageSize = +(e.target as HTMLSelectElement).value; this.currentPage = 1; this.loadLeaves();
  }

  get pages(): number[] {
    const max = 5;
    let s = Math.max(1, this.currentPage - Math.floor(max / 2));
    const e = Math.min(this.totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }

  createLeave(): void  { this.formMode = 'create'; this.selectedLeaveId = null; this.showFormModal = true; }
  editLeave(leave: Leave): void { this.formMode = 'edit'; this.selectedLeaveId = leave.id; this.showFormModal = true; }
  viewDetails(leave: Leave): void { this.selectedLeaveId = leave.id; this.showDetailsModal = true; }
  closeFormModal():    void { this.showFormModal    = false; this.selectedLeaveId = null; }
  closeDetailsModal(): void { this.showDetailsModal = false; this.selectedLeaveId = null; }
  onFormSuccess():  void { this.closeFormModal(); this.loadLeaves(); this.loadStatistics(); }
  onLeaveUpdated(): void { this.loadLeaves(); this.loadStatistics(); }

  approveLeave(leave: Leave): void { this._doApprove(leave); }
  rejectLeave(leave: Leave):  void { this._doReject(leave); }
  cancelLeave(leave: Leave):  void { this._doCancel(leave); }
  deleteLeave(leave: Leave):  void { this._doDelete(leave); }

  private async _doApprove(leave: Leave): Promise<void> {
    const r = await Swal.fire({
      title: 'Approve Leave?',
      html: `Approve <strong>${leave.employeeName}</strong>'s leave (${leave.totalDays} days)?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Approve'
    });
    if (!r.isConfirmed) return;
    this.leaveService.approveLeave(leave.id).subscribe({
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
    ws['!cols'] = [10,20,15,12,12,10,30,12,10,12,18,20].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leaves');
    const fn = `Leaves_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: 'Done!', text: `${fn} downloaded.`, icon: 'success', timer: 2500, showConfirmButton: false });
  }
}