import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi,
  GridReadyEvent,
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from 'ag-grid-community';

import { EmployeeShiftService } from '../../core/services/api/employee-shift.api';
import {
  EmployeeShift,
  ShiftChangeStatus,
  ShiftChangeStatusColor,
  ShiftChangeStatusLabel,
} from '../../core/Models/employee-shift.module';
import { refreshGrid } from '../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

/* ── Grid Theme identical to Holiday Management ── */
const shiftGridTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff',
  foregroundColor: '#1f2937',
  borderColor: '#e5e7eb',
  headerBackgroundColor: '#f9fafb',
  headerTextColor: '#374151',
  oddRowBackgroundColor: '#ffffff',
  rowHoverColor: '#f8faff',
  selectedRowBackgroundColor: '#dbeafe',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize: 13,
  columnBorder: true,
  headerColumnBorder: true,
  headerColumnBorderHeight: '50%',
  headerColumnResizeHandleColor: '#9ca3af',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth: 2,
  cellHorizontalPaddingScale: 0.8,
});

@Component({
  selector: 'app-my-shifts',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './my-shifts.component.html',
  styleUrls: ['./my-shifts.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MyShiftsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('agGrid', { read: ElementRef }) agGridElement!: ElementRef<HTMLElement>;
  readonly gridTheme = shiftGridTheme;
  Math = Math;

  /* ── Employee ── */
  employeeId   = '';
  employeeName = '';

  /* ── Employee popup ── */
  showEmpDialog      = false;
  newEmployeeIdInput = '';

  /* ── Data ── */
  shifts:         EmployeeShift[] = [];
  filteredShifts: EmployeeShift[] = [];
  isLoading  = false;
  searchTerm = '';
  activeTab: 'all' | 'pending' | 'approved' | 'rejected' = 'all';

  /* ── Reject dialog ── */
  showRejectDialog = false;
  rejectTarget: EmployeeShift | null = null;
  rejectReason = '';

  /* ── Detail modal ── */
  showDetailModal = false;
  selectedShift: EmployeeShift | null = null;

  /* ── Pagination ── */
  currentPage = 1;
  pageSize    = 20;
  totalItems  = 0;
  totalPages  = 0;

  /* ── AG-Grid ── */
  gridApi!: GridApi;
  context = { componentParent: this };
  private resizeObserver: ResizeObserver | null = null;

  loadingOverlay = `
    <div style="display:flex;align-items:center;gap:10px;color:#64748b;font-size:14px;">
      <div style="width:20px;height:20px;border:3px solid #e2e8f0;border-top-color:#3b82f6;
                  border-radius:50%;animation:spin .6s linear infinite;"></div>
      Loading shifts...
    </div>`;

  noRowsOverlay = `
    <div style="text-align:center;padding:40px;color:#94a3b8;">
      <div style="font-size:40px;margin-bottom:12px;"></div>
      <div style="font-size:16px;font-weight:600;color:#475569;margin-bottom:4px;">No shift assignments found</div>
      <div style="font-size:13px;">Click the employee button to load shifts for an employee.</div>
    </div>`;

  /* ── Column definitions ── */
  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80, suppressSizeToFit: false,
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      field: 'actions',
      width: 120, minWidth: 120, maxWidth: 120,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      cellClass: 'actions-cell',
      suppressSizeToFit: true,
      cellRenderer: (params: any) => {
        const shift: EmployeeShift = params.data;
        const pending = params.context?.componentParent?.isPending(shift);
        const confirmBtn = pending
          ? `<button class="btn-icon btn-confirm" title="Confirm Shift"><i class="bi bi-check-lg"></i></button>` : '';
        const declineBtn = pending
          ? `<button class="btn-icon btn-decline" title="Decline Shift"><i class="bi bi-x-lg"></i></button>` : '';
        return `<div class="action-buttons">
          <button class="btn-icon btn-view" title="View Details"><i class="bi bi-eye"></i></button>
          ${confirmBtn}${declineBtn}
        </div>`;
      },
      onCellClicked: (params: any) => {
        const btn = (params.event?.target as HTMLElement)?.closest('button');
        if (!btn) return;
        const p: MyShiftsComponent = params.context?.componentParent;
        if (btn.classList.contains('btn-view'))    p.viewDetail(params.data);
        if (btn.classList.contains('btn-confirm')) p.confirmShift(params.data);
        if (btn.classList.contains('btn-decline')) p.openRejectDialog(params.data);
      },
    },
    {
      headerName: 'Shift Name', field: 'shiftName', width: 200, minWidth: 150,
      cellRenderer: (p: any) => {
        const color = p.data?.shiftColor || '#3b82f6';
        return `<div style="display:flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block;"></span>
          <span style="font-weight:600;color:#1f2937;">${p.value || '—'}</span>
        </div>`;
      },
    },
    {
      headerName: 'Timing', field: 'shiftTimingDisplay', width: 160, minWidth: 130,
      cellRenderer: (p: any) =>
        `<span><i class="bi bi-clock" style="color:#94a3b8;margin-right:4px;"></i>${p.value || '—'}</span>`,
    },
    {
      headerName: 'Status', field: 'status', width: 130, minWidth: 110,
      cellRenderer: (p: any) => {
        const parent: MyShiftsComponent = p.context?.componentParent;
        const style = parent?.getStatusStyle(p.value);
        const label = parent?.getStatusLabel(p.value);
        return `<span class="ms-status-badge" style="background:${style?.bg ?? '#f1f5f9'};color:${style?.color ?? '#475569'};">${label}</span>`;
      },
    },
    {
      headerName: 'Effective From', field: 'effectiveFrom', width: 150, minWidth: 130,
      valueFormatter: (p: any) =>
        p.value ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      cellStyle: { color: '#374151' },
    },
    {
      headerName: 'Effective To', field: 'effectiveTo', width: 150, minWidth: 130,
      cellRenderer: (p: any) =>
        p.value
          ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : `<span style="color:#94a3b8;font-style:italic;font-size:12px;">Ongoing</span>`,
    },
    {
      headerName: 'Duration', field: 'durationInDays', width: 120, minWidth: 100,
      cellRenderer: (p: any) =>
        p.value === -1 || !p.value
          ? `<span style="color:#94a3b8;font-style:italic;font-size:12px;">Ongoing</span>`
          : `<span>${p.value} days</span>`,
    },
    {
      headerName: 'Active Now', field: 'isCurrentlyActive', width: 120, minWidth: 100,
      cellRenderer: (p: any) =>
        p.value
          ? `<span class="ms-status-badge" style="background:#dcfce7;color:#166534;">✔ Yes</span>`
          : `<span class="ms-status-badge" style="background:#f1f5f9;color:#475569;">— No</span>`,
    },
    {
      headerName: 'Admin Reason', field: 'changeReason', width: 200, minWidth: 150,
      cellRenderer: (p: any) =>
        `<span style="font-style:italic;color:#475569;font-size:12px;">${p.value || '—'}</span>`,
    },
    {
      headerName: 'Requested On', field: 'requestedDate', width: 170, minWidth: 140,
      valueFormatter: (p: any) =>
        p.value
          ? new Date(p.value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—',
      cellStyle: { color: '#6b7280', fontSize: '12px' },
    },
  ];

  /* ── Computed counts ── */
  get pendingCount():  number { return this.shifts.filter(s => this.resolveStatus(s.status) === ShiftChangeStatus.Pending).length; }
  get approvedCount(): number { return this.shifts.filter(s => this.resolveStatus(s.status) === ShiftChangeStatus.Approved).length; }
  get rejectedCount(): number { return this.shifts.filter(s => this.resolveStatus(s.status) === ShiftChangeStatus.Rejected).length; }

  /* ── Current page slice ── */
  get pagedShifts(): EmployeeShift[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredShifts.slice(start, start + this.pageSize);
  }

  constructor(private svc: EmployeeShiftService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    /* Try getMyShifts first (uses auth token — no ID needed) */
    this.loadMyShifts();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ── Grid Ready ── */
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const hostEl    = this.agGridElement?.nativeElement;
    const container = (hostEl?.closest('.ms-grid-container') as HTMLElement) ?? hostEl;
    if (container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.gridApi) requestAnimationFrame(() => this.gridApi.sizeColumnsToFit());
      });
      this.resizeObserver.observe(container);
    }

    /* Show empty state on first load if no employee set */
    if (!this.employeeId) {
      setTimeout(() => this.gridApi?.showNoRowsOverlay(), 150);
    }
  }

  /* ── Employee ID Popup ── */
  openEmpDialog(): void {
    this.newEmployeeIdInput = this.employeeId;
    this.showEmpDialog = true;
    this.cdr.detectChanges();
  }

  closeEmpDialog(): void {
    this.showEmpDialog = false;
    this.newEmployeeIdInput = '';
  }

  applyNewEmployeeId(): void {
    const id = this.newEmployeeIdInput.trim();
    if (!id) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter an Employee ID.', confirmButtonColor: '#3b82f6' });
      return;
    }
    this.showEmpDialog      = false;
    this.newEmployeeIdInput = '';
    this.employeeId         = id;
    this.employeeName       = '';
    this.activeTab          = 'all';
    this.searchTerm         = '';
    sessionStorage.setItem('employeeId', id);
    this.loadShifts();
  }

  /* ── Load own shifts via auth token (on page init) ── */
  loadMyShifts(): void {
    this.isLoading = true;
    if (this.gridApi) this.gridApi.showLoadingOverlay();

    this.svc.getMyShifts().pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.success) {
          this.shifts = res.data;
          if (this.shifts.length) {
            this.employeeId   = this.shifts[0].employeeId;
            this.employeeName = this.shifts[0].employeeName || '';
          }
          this.applyFilter();
        } else {
          if (this.gridApi) this.gridApi.showNoRowsOverlay();
        }
        this.cdr.detectChanges();
      },
      error: err => {
        this.isLoading = false;
        if (this.gridApi) this.gridApi.showNoRowsOverlay();
        if (err.status !== 401) {
          console.error('loadMyShifts error:', err);
        }
        this.cdr.detectChanges();
      },
    });
  }

  /* ── Load shifts by a specific employee ID (from popup) ── */
  loadShifts(): void {
    if (!this.employeeId) return;
    this.isLoading = true;
    if (this.gridApi) this.gridApi.showLoadingOverlay();

    this.svc.getShiftsByEmployee(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.isLoading = false;
          if (res.success) {
            this.shifts = res.data;
            if (this.shifts.length && this.shifts[0].employeeName) {
              this.employeeName = this.shifts[0].employeeName;
            }
            this.applyFilter();
          } else {
            if (this.gridApi) this.gridApi.showNoRowsOverlay();
            Swal.fire({ icon: 'error', title: 'Not Found', text: 'No employee found with this ID.', confirmButtonColor: '#ef4444' });
          }
          this.cdr.detectChanges();
        },
        error: err => {
          this.isLoading = false;
          if (this.gridApi) this.gridApi.showNoRowsOverlay();
          if (err.status === 404) {
            Swal.fire({ icon: 'error', title: 'Not Found', text: 'Employee ID not found.', confirmButtonColor: '#ef4444' });
          } else if (err.status !== 401) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load shifts.', confirmButtonColor: '#ef4444' });
          }
          this.cdr.detectChanges();
        },
      });
  }

  /* ── Filter + Search ── */
  applyFilter(): void {
    let result = [...this.shifts];
    if (this.activeTab !== 'all') {
      const map: Record<string, ShiftChangeStatus> = {
        pending: ShiftChangeStatus.Pending, approved: ShiftChangeStatus.Approved, rejected: ShiftChangeStatus.Rejected,
      };
      result = result.filter(s => this.resolveStatus(s.status) === map[this.activeTab]);
    }
    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      result = result.filter(s =>
        s.shiftName?.toLowerCase().includes(t) ||
        s.shiftTimingDisplay?.toLowerCase().includes(t) ||
        s.changeReason?.toLowerCase().includes(t)
      );
    }
    this.filteredShifts = result;
    this.totalItems     = result.length;
    this.currentPage    = 1;
    this.totalPages     = Math.ceil(this.totalItems / this.pageSize);
    this.pushToGrid();
  }

  private pushToGrid(): void {
    if (!this.gridApi) return;
    this.gridApi.setGridOption('rowData', this.pagedShifts);
    refreshGrid(this.gridApi);
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
    if (this.filteredShifts.length === 0) this.gridApi.showNoRowsOverlay();
    else this.gridApi.hideOverlay();
  }

  setTab(tab: 'all' | 'pending' | 'approved' | 'rejected'): void { this.activeTab = tab; this.applyFilter(); }
  onSearchChange(): void { this.applyFilter(); }

  /* ── Pagination ── */
  onPageSizeChanged(n: number): void {
    this.pageSize = n; this.currentPage = 1;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize); this.pushToGrid();
  }
  goToPage(page: number | string): void {
    const p = Number(page);
    if (!p || p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p; this.pushToGrid();
  }
  nextPage():     void { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }
  previousPage(): void { if (this.currentPage > 1)               this.goToPage(this.currentPage - 1); }

  /* ── Detail modal ── */
  viewDetail(shift: EmployeeShift): void { this.selectedShift = shift; this.showDetailModal = true; this.cdr.detectChanges(); }
  closeDetail(): void { this.showDetailModal = false; this.selectedShift = null; }

  /* ── Confirm ── */
  confirmShift(shift: EmployeeShift): void {
    if (this.resolveStatus(shift.status) !== ShiftChangeStatus.Pending) return;
    Swal.fire({
      title: 'Confirm Shift Assignment?',
      html: `<div style="text-align:left;font-size:14px;line-height:1.9">
               <b>Shift:</b> ${shift.shiftName}<br>
               <b>Timing:</b> ${shift.shiftTimingDisplay}<br>
               <b>From:</b> ${this.fmt(shift.effectiveFrom)}<br>
               <b>To:</b> ${shift.effectiveTo ? this.fmt(shift.effectiveTo) : 'Ongoing'}
             </div>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280', confirmButtonText: '✅ Yes, Confirm',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.employeeApproveShift(shift.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: res => {
          if (res.success) {
            this.toast('Confirmed!', 'Shift confirmed.');
            this.loadShifts();
          } else {
            Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Could not confirm shift.', confirmButtonColor: '#ef4444' });
          }
        },
        error: (err) => {
          console.error('Approve error full details:', err);
          const msg = err?.error?.message || err?.error?.title || err?.message || 'Could not confirm shift.';
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#ef4444' });
        },
      });
    });
  }

  /* ── Decline ── */
  openRejectDialog(shift: EmployeeShift): void {
    if (this.resolveStatus(shift.status) !== ShiftChangeStatus.Pending) return;
    this.rejectTarget = shift; this.rejectReason = ''; this.showRejectDialog = true; this.cdr.detectChanges();
  }
  confirmReject(): void {
    if (!this.rejectTarget || this.rejectReason.trim().length < 5) return;
    const target = this.rejectTarget;
    this.showRejectDialog = false;
    this.svc.employeeRejectShift(target.id, this.rejectReason).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        if (res.success) {
          this.toast('Declined', 'Admin will be notified.');
          this.loadShifts();
        } else {
          Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Decline failed.', confirmButtonColor: '#ef4444' });
        }
      },
      error: (err) => {
        console.error('Reject error full details:', err);
        const msg = err?.error?.message || err?.error?.title || err?.message || 'Decline failed.';
        Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#ef4444' });
      },
    });
  }
  cancelReject(): void { this.showRejectDialog = false; this.rejectTarget = null; this.rejectReason = ''; }

  /* ── Helpers ── */
  resolveStatus(status: any): ShiftChangeStatus {
    if (typeof status === 'string') {
      const map: Record<string, ShiftChangeStatus> = {
        Pending: ShiftChangeStatus.Pending, Approved: ShiftChangeStatus.Approved,
        Rejected: ShiftChangeStatus.Rejected, Cancelled: ShiftChangeStatus.Cancelled,
      };
      return map[status] ?? ShiftChangeStatus.Pending;
    }
    return status as ShiftChangeStatus;
  }
  getStatusStyle(status: any): { bg: string; color: string } {
    return ShiftChangeStatusColor[this.resolveStatus(status)] ?? { bg: '#f1f5f9', color: '#475569' };
  }
  getStatusLabel(status: any): string {
    return ShiftChangeStatusLabel[this.resolveStatus(status)] ?? String(status);
  }
  isPending(s: EmployeeShift):  boolean { return this.resolveStatus(s.status) === ShiftChangeStatus.Pending; }
  isApproved(s: EmployeeShift): boolean { return this.resolveStatus(s.status) === ShiftChangeStatus.Approved; }
  isRejected(s: EmployeeShift): boolean { return this.resolveStatus(s.status) === ShiftChangeStatus.Rejected; }

  fmt(val: any): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  private toast(title: string, text: string): void {
    Swal.fire({ icon: 'success', title, text, timer: 2500, timerProgressBar: true, showConfirmButton: false });
  }
}