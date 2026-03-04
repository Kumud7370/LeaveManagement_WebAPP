import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  ViewEncapsulation, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi, GridReadyEvent, ColDef,
  ModuleRegistry, AllCommunityModule, themeQuartz
} from 'ag-grid-community';
import Swal from 'sweetalert2';
import { LeaveService } from '../../../core/services/api/leave.api';
import { LeaveBalanceService } from '../../../core/services/api/leave-balance.api';
import { Leave, LeaveFilterDto } from '../../../core/Models/leave.model';
import { LeaveBalance } from '../../../core/Models/leave-balance.model';
import { LeaveFormComponent } from '../leave-form/leave-form.component';
import { LeaveDetailsComponent } from '../leave-details/leave-details.component';
import { LeaveActionCellRendererComponent } from '../leave-action-cell-renderer.component';

ModuleRegistry.registerModules([AllCommunityModule]);

const myLeavesGridTheme = themeQuartz.withParams({
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
  selector: 'app-my-leaves',
  standalone: true,
  templateUrl: './my-leaves.component.html',
  styleUrls: ['./my-leaves.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, AgGridAngular, LeaveFormComponent, LeaveDetailsComponent]
})
export class MyLeavesComponent implements OnInit, OnDestroy {

  readonly gridTheme = myLeavesGridTheme;
  Math = Math;

  // ── data
  currentYear = new Date().getFullYear();
  employeeId: string = '';
  allLeaves: Leave[] = [];
  filteredLeaves: Leave[] = [];
  balances: LeaveBalance[] = [];
  gridApi!: GridApi;
  context = { componentParent: this, isEmployee: true };

  // ── state
  loading = false;
  balancesLoading = false;
  error: string | null = null;
  searchTerm = '';
  showFilters = false;
  activeStatusFilter: string | null = null;

  // ── modals
  showFormModal = false;
  showDetailsModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedLeaveId: string | null = null;

  // ── pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;

  // ── filters
  filters: LeaveFilterDto = {
    pageNumber: 1, pageSize: 10,
    sortBy: 'AppliedDate', sortDescending: true
  };
  selectedStatus: string = '';

  private searchDebounceTimer: any = null;
  private resizeObserver!: ResizeObserver;
  private sidebarResizeTimer: any = null;

  // ── computed stats from loaded data
  get statTotal(): number { return this.allLeaves.length; }
  get statPending(): number { return this.allLeaves.filter(l => this.statusLabel(l) === 'Pending').length; }
  get statApproved(): number { return this.allLeaves.filter(l => this.statusLabel(l) === 'Approved').length; }
  get statRejected(): number { return this.allLeaves.filter(l => this.statusLabel(l) === 'Rejected').length; }
  get statCancelled(): number { return this.allLeaves.filter(l => this.statusLabel(l) === 'Cancelled').length; }

  get activeFilterCount(): number {
    return [this.selectedStatus, this.filters.leaveTypeId].filter(Boolean).length;
  }

  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80,
    cellStyle: { display: 'flex', alignItems: 'center' }
  };

  columnDefs: ColDef[] = [
    {
      headerName: '',
      width: 100, minWidth: 100, maxWidth: 120,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      headerClass: 'ml-action-col',
      cellClass: 'ml-action-cell ml-action-col',
      cellStyle: { display: 'flex', alignItems: 'center', padding: '0', overflow: 'visible' },
      suppressSizeToFit: true,
      cellRenderer: LeaveActionCellRendererComponent 
    },

    {
      headerName: 'Leave Type',
      field: 'leaveTypeName',
      width: 150, minWidth: 130,
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
      width: 130, minWidth: 110,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    },
    {
      headerName: 'End Date',
      field: 'endDate',
      width: 130, minWidth: 110,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    },
    {
      headerName: 'Days',
      field: 'totalDays',
      width: 80, minWidth: 70,
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
      width: 220, minWidth: 180,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => {
        const txt = p.value?.length > 40 ? p.value.substring(0, 40) + '…' : (p.value || '');
        const em = p.data?.isEmergencyLeave
          ? `<span style="display:inline-flex;align-items:center;background:#fee2e2;color:#991b1b;
              padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;
              margin-left:5px;white-space:nowrap;">Emergency</span>` : '';
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
        const lbl = this.statusLabel(p.data);
        const map: Record<string, [string, string]> = {
          'Pending': ['#fef9c3', '#92400e'],
          'Approved': ['#dcfce7', '#166534'],
          'Rejected': ['#fee2e2', '#991b1b'],
          'Cancelled': ['#f1f5f9', '#475569'],
        };
        const [bg, color] = map[lbl] ?? ['#fef9c3', '#92400e'];
        return `<span style="display:inline-flex;padding:2px 12px;border-radius:9999px;
          font-size:12px;font-weight:600;background:${bg};color:${color};
          font-family:'Inter',-apple-system,sans-serif;">${lbl}</span>`;
      }
    },
    {
      headerName: 'Applied On',
      field: 'appliedDate',
      width: 130, minWidth: 110,
      cellStyle: { display: 'flex', alignItems: 'center' },
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
    }
  ];

  constructor(
    private leaveService: LeaveService,
    private leaveBalanceService: LeaveBalanceService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Resolve Employee ID — tries dedicated key first, falls back to UserId.
    // Your login service must store 'EmployeeId' in sessionStorage for filtering to work.
    this.employeeId = sessionStorage.getItem('EmployeeId')
      || sessionStorage.getItem('employeeId')
      || sessionStorage.getItem('UserId')
      || '';
    console.debug('[MyLeaves] resolved employeeId →', this.employeeId);
    this.loadLeaves();
    this.loadBalances();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    clearTimeout(this.sidebarResizeTimer);
    clearTimeout(this.searchDebounceTimer);
  }

  @HostListener('window:resize')
  onWindowResize(): void { this.scheduleSizeColumnsToFit(320); }

  private scheduleSizeColumnsToFit(delay = 320): void {
    clearTimeout(this.sidebarResizeTimer);
    this.sidebarResizeTimer = setTimeout(() => {
      if (this.gridApi) this.gridApi.sizeColumnsToFit();
    }, delay);
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
    const gridEl = document.querySelector('app-my-leaves ag-grid-angular') as HTMLElement;
    if (gridEl && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleSizeColumnsToFit(50));
      this.resizeObserver.observe(gridEl);
    }
  }

  loadLeaves(): void {
    this.loading = true; this.error = null;
    const filter: LeaveFilterDto = {
      ...this.filters,
      searchTerm: this.searchTerm || undefined,
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      leaveStatus: this.selectedStatus !== '' ? Number(this.selectedStatus) : undefined,
      employeeId: this.employeeId || undefined
    };
    this.leaveService.getMyLeaves(filter).subscribe({
      next: (r) => {
        this.loading = false;
        if (r.success) {
          this.allLeaves = r.data.items;
          this.filteredLeaves = r.data.items;
          this.totalPages = r.data.totalPages;
          this.totalCount = r.data.totalCount;
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.filteredLeaves);
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

  loadBalances(): void {
    this.balancesLoading = true;
    const year = new Date().getFullYear();
    this.leaveBalanceService.getFilteredLeaveBalances({
      pageNumber: 1, pageSize: 50,
      year,
      employeeId: this.employeeId || undefined
    } as any).subscribe({
      next: (r) => {
        this.balancesLoading = false;
        if (r.success) { this.balances = r.data.items; }
        this.cdr.detectChanges();
      },
      error: () => { this.balancesLoading = false; this.cdr.detectChanges(); }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => { this.currentPage = 1; this.loadLeaves(); }, 350);
  }

  onStatusFilterChange(): void { this.currentPage = 1; this.loadLeaves(); }

  filterByStat(status: string | null): void {
    this.activeStatusFilter = status;
    if (!status) {
      this.filteredLeaves = this.allLeaves;
    } else {
      this.filteredLeaves = this.allLeaves.filter(l => this.statusLabel(l) === status);
    }
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.filteredLeaves);
    }
  }

  clearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm = '';
    this.selectedStatus = '';
    this.activeStatusFilter = null;
    this.filters = { pageNumber: 1, pageSize: 10, sortBy: 'AppliedDate', sortDescending: true };
    this.currentPage = 1;
    this.loadLeaves();
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

  // ── Modal helpers
  applyLeave(): void { this.formMode = 'create'; this.selectedLeaveId = null; this.showFormModal = true; }
  viewDetails(leave: Leave): void { this.selectedLeaveId = leave.id; this.showDetailsModal = true; }
  editLeave(leave: Leave): void { this.selectedLeaveId = leave.id; this.formMode = 'edit'; this.showFormModal = true; }
  closeFormModal(): void { this.showFormModal = false; this.selectedLeaveId = null; }
  closeDetailsModal(): void { this.showDetailsModal = false; this.selectedLeaveId = null; }
  onFormSuccess(): void { this.closeFormModal(); this.loadLeaves(); this.loadBalances(); }
  onLeaveUpdated(): void { this.loadLeaves(); this.loadBalances(); }

  async cancelLeave(leave: Leave): Promise<void> {
    const { value: reason } = await Swal.fire({
      title: 'Cancel Leave Request',
      input: 'textarea',
      inputLabel: 'Reason for cancellation',
      inputPlaceholder: 'Enter reason...',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Cancel Request',
      inputValidator: (v) => !v ? 'Reason is required!' : null
    });
    if (!reason) return;
    this.leaveService.cancelLeave(leave.id, reason).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Cancelled!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaves(); this.loadBalances();
        } else { Swal.fire('Error!', res.message || 'Failed to cancel', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  // ── Helpers
  statusLabel(leave: Leave): string {
    const map: Record<string, string> = {
      '0': 'Pending', '1': 'Approved', '2': 'Rejected', '3': 'Cancelled',
      'pending': 'Pending', 'approved': 'Approved', 'rejected': 'Rejected', 'cancelled': 'Cancelled'
    };
    const byNum = map[String(leave.leaveStatus)];
    const byName = map[(leave as any).leaveStatusName?.toLowerCase() ?? ''];
    return byNum ?? byName ?? 'Pending';
  }

  utilizationColor(pct: number): string {
    if (pct >= 90) return '#ef4444';
    if (pct >= 70) return '#f59e0b';
    return '#10b981';
  }
}