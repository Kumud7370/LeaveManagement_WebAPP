import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  OnInit,
  OnDestroy,
  ElementRef,
  ChangeDetectorRef,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi,
  GridReadyEvent,
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  SortChangedEvent,
  FilterChangedEvent,
  themeQuartz
} from 'ag-grid-community';
import { AttendanceRegularizationService } from '../../../core/services/api/attendance-regularization.api';
import {
  RegularizationResponseDto,
  RegularizationFilterDto,
  RegularizationType,
  RegularizationStatus
} from '../../../core/Models/attendance-regularization.model';
import Swal from 'sweetalert2';

import { RegularizationActionCellRendererComponent } from '../regularization-action-cell-renderer.component';
import * as XLSX from 'xlsx';
import { RegularizationFormComponent } from '../regularization-form/regularization-form.component';
import {
  dateTimeFormatter,
  clearAllFilters,
  refreshGrid,
  getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const regularizationGridTheme = themeQuartz.withParams({
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
  selector: 'app-regularization-list',
  standalone: true,
  templateUrl: './regularization-list.component.html',
  styleUrls: ['./regularization-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    RegularizationFormComponent,
    RegularizationActionCellRendererComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegularizationListComponent implements OnInit, OnDestroy {

  @ViewChild('agGrid', { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;

  readonly gridTheme = regularizationGridTheme;

  rowData: RegularizationResponseDto[] = [];
  gridApi!: GridApi;
  searchTerm = '';

  currentPage = 1;
  pageSize    = 20;
  totalItems  = 0;
  totalPages  = 0;
  private isLoadingData        = false;
  private searchDebounceTimer: any = null;
  Math = Math;

  employeeIdFilter            = '';
  regularizationTypeFilter: RegularizationType | null = null;
  statusFilter: RegularizationStatus | null           = null;
  startDateFilter: Date | null = null;
  endDateFilter:   Date | null = null;
  sortBy         = 'RequestedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  showAddModal      = false;
  showEditModal     = false;
  showViewModal     = false;
  showApprovalModal = false;

  selectedRegularization: RegularizationResponseDto | null = null;
  editRegularizationData: RegularizationResponseDto | null = null;
  viewRegularizationData: RegularizationResponseDto | null = null;
  approvalReason = '';

  RegularizationType   = RegularizationType;
  RegularizationStatus = RegularizationStatus;

  stats = { total: 0, pending: 0, approved: 0, rejected: 0 };

  // ── Resize tracking ──────────────────────────────────────────────────────────
  // Observes document.body width changes (sidebar open/close) only.
  private sidebarResizeObserver: ResizeObserver | null = null;
  private resizeDebounceTimer: any = null;

  // Once the user manually drags a column resize handle, we stop calling
  // sizeColumnsToFit() so their custom widths are preserved.
  // This flag is reset only when a genuine layout-width change is detected
  // (e.g. sidebar toggled), because at that point the old widths are stale.
  private userHasResizedColumn = false;

  // Whether a column-resize drag is currently in progress.
  // We must NOT call sizeColumnsToFit() while a drag is active.
  private isColumnResizeDragActive = false;

  // Track last known body width so we only react to width changes.
  private lastBodyWidth = 0;
  // ─────────────────────────────────────────────────────────────────────────────

  activeFilters = {
    hasActiveFilters: false,
    filters: [] as string[],
    count: 0
  };

  private get rawRole(): string {
    return (sessionStorage.getItem('RoleName') ?? '').trim();
  }

  private get normalisedRole(): string {
    return this.rawRole.toLowerCase().replace(/\s+/g, '');
  }

  get isAdminOrManager(): boolean {
    return (
      this.normalisedRole === 'admin'      ||
      this.normalisedRole === 'superadmin' ||
      this.normalisedRole === 'manager'
    );
  }

  get context() {
    return { componentParent: this, userRole: this.rawRole };
  }

  private get actionsColWidth(): number {
    return this.isAdminOrManager ? 210 : 120;
  }

  defaultColDef: ColDef = {
    sortable:          true,
    filter:            true,
    floatingFilter:    true,
    resizable:         true,
    minWidth:          80,
    // Do NOT set suppressSizeToFit globally — it prevents sizeColumnsToFit()
    // from working on any column and is the primary cause of resize-handle issues.
    suppressSizeToFit: false,
    suppressAutoSize:  false
  };

  get columnDefs(): ColDef[] {
    return [
      {
        headerName: 'Actions',
        field:      'actions',
        width:    this.actionsColWidth,
        minWidth: this.actionsColWidth,
        maxWidth: this.actionsColWidth,
        sortable:       false,
        filter:         false,
        floatingFilter: false,
        suppressFloatingFilterButton: true,
        cellClass:   'actions-cell',
        cellRenderer: RegularizationActionCellRendererComponent,
        // This column has a fixed width — exclude it from sizeColumnsToFit
        // calculations so it never shrinks/grows and disrupts the layout.
        suppressSizeToFit: true,
        pinned: 'left'
      },
      {
        headerName: 'Employee Code',
        field:      'employeeCode',
        width: 150, minWidth: 120,
        cellRenderer: (params: any) => {
          const val         = params.value || '';
          const search      = params.context?.componentParent?.searchTerm || '';
          const highlighted = params.context?.componentParent?.highlightText(val, search) || val;
          return `<span style="font-family:Monaco,monospace;font-weight:600;background:#f1f5f9;padding:2px 8px;border-radius:4px;">${highlighted}</span>`;
        }
      },
      {
        headerName: 'Employee Name',
        field:      'employeeName',
        width: 200, minWidth: 160,
        cellRenderer: (params: any) => {
          const val         = params.value || '';
          const search      = params.context?.componentParent?.searchTerm || '';
          const highlighted = params.context?.componentParent?.highlightText(val, search) || val;
          return `<span style="font-weight:600;color:#1f2937;">${highlighted}</span>`;
        }
      },
      {
        headerName: 'Date',
        field:      'attendanceDate',
        width: 140, minWidth: 120,
        valueFormatter: (params: any) => {
          if (!params.value) return '—';
          return new Date(params.value).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
          });
        },
        cellStyle: { color: '#374151' }
      },
      {
        headerName: 'Type',
        field:      'regularizationTypeName',
        width: 190, minWidth: 150,
        cellRenderer: (params: any) => {
          const type = params.data?.regularizationType;
          let cls = '';
          switch (type) {
            case RegularizationType.MissedPunch:           cls = 'reg-type-missed';  break;
            case RegularizationType.LateEntry:             cls = 'reg-type-late';    break;
            case RegularizationType.EarlyExit:             cls = 'reg-type-early';   break;
            case RegularizationType.FullDayRegularization: cls = 'reg-type-fullday'; break;
            default:                                        cls = 'reg-type-missed';  break;
          }
          const val         = params.value || '';
          const search      = params.context?.componentParent?.searchTerm || '';
          const highlighted = params.context?.componentParent?.highlightText(val, search) || val;
          return `<span class="reg-type-badge ${cls}">${highlighted}</span>`;
        }
      },
      {
        headerName: 'Check-In',
        field:      'requestedCheckIn',
        width: 130, minWidth: 110,
        valueFormatter: (params: any) => {
          if (!params.value) return '—';
          return new Date(params.value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        },
        cellStyle: { color: '#374151' }
      },
      {
        headerName: 'Check-Out',
        field:      'requestedCheckOut',
        width: 130, minWidth: 110,
        valueFormatter: (params: any) => {
          if (!params.value) return '—';
          return new Date(params.value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        },
        cellStyle: { color: '#374151' }
      },
      {
        headerName: 'Status',
        field:      'statusName',
        width: 130, minWidth: 110,
        cellRenderer: (params: any) => {
          const status = params.data?.status;
          let style = '';
          switch (status) {
            case RegularizationStatus.Pending:   style = 'background:#fef3c7;color:#92400e;'; break;
            case RegularizationStatus.Approved:  style = 'background:#dcfce7;color:#166534;'; break;
            case RegularizationStatus.Rejected:  style = 'background:#fee2e2;color:#991b1b;'; break;
            case RegularizationStatus.Cancelled: style = 'background:#f1f5f9;color:#475569;'; break;
            default:                              style = 'background:#f1f5f9;color:#475569;'; break;
          }
          return `<span class="badge-status" style="${style}">${params.value || ''}</span>`;
        }
      },
      {
        headerName: 'Requested At',
        field:      'requestedAt',
        width: 180, minWidth: 150,
        valueFormatter: dateTimeFormatter,
        cellStyle: { color: '#6b7280', fontSize: '12px' }
      }
    ];
  }

  constructor(
    private regularizationService: AttendanceRegularizationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setDefaultDateFilters();
    this.loadRegularizations();

    if (typeof ResizeObserver !== 'undefined') {
      this.lastBodyWidth = document.body.clientWidth;

      this.sidebarResizeObserver = new ResizeObserver(() => {
        const newWidth = document.body.clientWidth;
        // Only react to genuine layout-width changes (sidebar open/close).
        // Ignore height-only changes (scrollbar appearing, content growing, etc.)
        if (Math.abs(newWidth - this.lastBodyWidth) > 5) {
          this.lastBodyWidth = newWidth;
          // A layout-width change means the user's manual column widths are
          // stale — safe to auto-fit once more.
          this.userHasResizedColumn = false;
          this.debouncedGridResize();
        }
      });

      this.sidebarResizeObserver.observe(document.body);
    }
  }

  ngOnDestroy(): void {
    if (this.sidebarResizeObserver) { this.sidebarResizeObserver.disconnect(); this.sidebarResizeObserver = null; }
    if (this.searchDebounceTimer)   { clearTimeout(this.searchDebounceTimer); }
    if (this.resizeDebounceTimer)   { clearTimeout(this.resizeDebounceTimer); }
  }

  // ── Safe sizeColumnsToFit wrapper ─────────────────────────────────────────
  // Never calls sizeColumnsToFit() while a drag is in progress or after the
  // user has set custom widths (unless a layout-width change reset the flag).
  private safeAutoFit(): void {
    if (!this.gridApi) return;
    if (this.userHasResizedColumn) return;
    if (this.isColumnResizeDragActive) return;
    requestAnimationFrame(() => {
      // Double-check inside rAF — drag state may have changed.
      if (!this.isColumnResizeDragActive && !this.userHasResizedColumn) {
        this.gridApi?.sizeColumnsToFit();
      }
    });
  }

  private debouncedGridResize(): void {
    clearTimeout(this.resizeDebounceTimer);
    this.resizeDebounceTimer = setTimeout(() => this.safeAutoFit(), 200);
  }
  // ─────────────────────────────────────────────────────────────────────────

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    // ── Column resize listeners ──────────────────────────────────────────────
    // `columnResized` fires continuously during a drag (source = 'uiColumnDragged')
    // AND once more when the drag ends (finished = true).
    //
    // We track drag-active state so safeAutoFit() is never called mid-drag,
    // which was the root cause of resize handles appearing non-functional.
    this.gridApi.addEventListener('columnResized', (e: any) => {
      if (e.source === 'uiColumnDragged') {
        if (!e.finished) {
          // Drag started or ongoing — block any auto-fit calls.
          this.isColumnResizeDragActive = true;
        } else {
          // Drag completed — record user intent and unblock auto-fit.
          this.isColumnResizeDragActive = false;
          this.userHasResizedColumn     = true;
        }
      }
    });
    // ────────────────────────────────────────────────────────────────────────

    this.gridApi.addEventListener('sortChanged',   this.onSortChanged.bind(this));
    this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));

    // Initial fit — only on first render when no user widths exist yet.
    setTimeout(() => this.safeAutoFit(), 150);
  }

  onSortChanged(_e: SortChangedEvent):     void { this.currentPage = 1; this.loadRegularizations(); }
  onFilterChanged(_e: FilterChangedEvent): void { this.currentPage = 1; this.loadRegularizations(); this.updateActiveFilters(); }

  highlightText(text: string, term: string): string {
    if (!term?.trim() || !text) return String(text);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="search-highlight">$1</mark>');
  }

  setDefaultDateFilters(): void {
    const today = new Date();
    this.startDateFilter = new Date(today.getFullYear(), today.getMonth(), 1);
    this.endDateFilter   = today;
  }

  loadRegularizations(): void {
    if (this.isLoadingData) return;
    this.isLoadingData = true;

    const filter: RegularizationFilterDto = {
      employeeId:         this.employeeIdFilter || undefined,
      startDate:          this.startDateFilter  || undefined,
      endDate:            this.endDateFilter     || undefined,
      regularizationType: this.regularizationTypeFilter ?? undefined,
      status:             this.statusFilter      ?? undefined,
      sortBy:             this.sortBy,
      sortDescending:     this.sortDirection === 'desc',
      pageNumber:         this.currentPage,
      pageSize:           this.pageSize
    };

    this.regularizationService.getFiltered(filter).subscribe({
      next: (response) => {
        this.isLoadingData = false;
        if (response.success) {
          this.rowData     = response.data.items;
          this.totalItems  = response.data.totalCount;
          this.totalPages  = Math.ceil(this.totalItems / this.pageSize);
          this.currentPage = response.data.pageNumber;
          this.computeStats(this.rowData);
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            refreshGrid(this.gridApi);
            // After a data reload, only auto-fit if the user has not set
            // custom column widths. Never call sizeColumnsToFit() immediately
            // here — defer to safeAutoFit() which guards against drag-active state.
            setTimeout(() => this.safeAutoFit(), 50);
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isLoadingData = false;
        if (err.status !== 401) {
          Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || 'Failed to load regularization requests.' });
        }
      }
    });
  }

  private computeStats(items: RegularizationResponseDto[]): void {
    this.stats.total    = this.totalItems;
    this.stats.pending  = items.filter(r => r.status === RegularizationStatus.Pending).length;
    this.stats.approved = items.filter(r => r.status === RegularizationStatus.Approved).length;
    this.stats.rejected = items.filter(r => r.status === RegularizationStatus.Rejected).length;
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadRegularizations();
      this.updateActiveFilters();
    }, 350);
  }

  clearSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm = this.employeeIdFilter = '';
    this.currentPage = 1;
    this.loadRegularizations();
    this.updateActiveFilters();
  }

  handleClearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm = this.employeeIdFilter = '';
    this.currentPage = 1;
    clearAllFilters(this.gridApi);
    this.loadRegularizations();
    this.updateActiveFilters();
  }

  updateActiveFilters(): void {
    const colCount = this.gridApi ? Object.keys(this.gridApi.getFilterModel()).length : 0;
    const extra    = colCount > 0 ? { 'Column filters': `${colCount} active` } : undefined;
    const filters  = getActiveFiltersSummary(this.searchTerm, undefined, extra);
    this.activeFilters = { hasActiveFilters: filters.length > 0, filters, count: filters.length };
  }

  onPageSizeChanged(newSize: number): void {
    this.pageSize    = newSize;
    this.currentPage = 1;
    this.loadRegularizations();
  }

  goToPage(page: number | string): void {
    const p = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(p) || p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.loadRegularizations();
  }
  nextPage():     void { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }
  previousPage(): void { if (this.currentPage > 1)               this.goToPage(this.currentPage - 1); }

  openAddModal():  void { this.editRegularizationData = null; this.showAddModal = true; }
  closeAddModal(): void { this.showAddModal = false; this.editRegularizationData = null; }

  onFormSubmitted(): void {
    this.showAddModal  = false;
    this.showEditModal = false;
    this.editRegularizationData = null;
    this.isLoadingData = false;
    this.loadRegularizations();
  }

  openEditModal(reg: RegularizationResponseDto):  void { this.editRegularizationData = reg; this.showEditModal = true; }
  closeEditModal(): void { this.showEditModal = false; this.editRegularizationData = null; }

  openViewModal(reg: RegularizationResponseDto):  void { this.viewRegularizationData = reg; this.showViewModal = true; }
  closeViewModal(): void { this.showViewModal = false; this.viewRegularizationData = null; }

  viewDetails(reg: RegularizationResponseDto):      void { this.openViewModal(reg); }
  editDepartment(reg: RegularizationResponseDto):   void { this.openEditModal(reg); }
  deleteDepartment(reg: RegularizationResponseDto): void { this.cancelRegularization(reg); }

  openApprovalModal(reg: RegularizationResponseDto, approve: boolean): void {
    this.selectedRegularization = reg;
    this.approvalReason         = '';
    if (approve) {
      this.approveRegularization(reg);
    } else {
      this.showApprovalModal = true;
    }
  }

  async approveRegularization(reg: RegularizationResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Approve Request?',
      html:  `Approve regularization for <strong>${reg.employeeName}</strong>?`,
      icon:  'question',
      showCancelButton:   true,
      confirmButtonColor: '#10b981',
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  'Yes, Approve!',
      cancelButtonText:   'Cancel'
    });

    if (result.isConfirmed) {
      this.regularizationService.approveRegularization(reg.id, { isApproved: true }).subscribe({
        next: (res) => {
          if (res.success) {
            Swal.fire({ title: 'Approved!', text: 'Request approved successfully.', icon: 'success',
              confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false });
            this.loadRegularizations();
          } else {
            Swal.fire({ title: 'Error!', text: res.message || 'Failed to approve.', icon: 'error', confirmButtonColor: '#ef4444' });
          }
        },
        error: (err) => {
          Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred.', icon: 'error', confirmButtonColor: '#ef4444' });
        }
      });
    }
  }

  submitRejection(): void {
    if (!this.selectedRegularization || !this.approvalReason.trim()) return;
    this.regularizationService.approveRegularization(this.selectedRegularization.id, {
      isApproved: false,
      rejectionReason: this.approvalReason
    }).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Rejected!', text: 'Request has been rejected.', icon: 'success',
            confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false });
          this.closeApprovalModal();
          this.loadRegularizations();
        } else {
          Swal.fire({ title: 'Error!', text: res.message || 'Failed to reject.', icon: 'error', confirmButtonColor: '#ef4444' });
        }
      },
      error: (err) => {
        Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred.', icon: 'error', confirmButtonColor: '#ef4444' });
      }
    });
  }

  closeApprovalModal(): void {
    this.showApprovalModal      = false;
    this.selectedRegularization = null;
    this.approvalReason         = '';
  }

  async cancelRegularization(reg: RegularizationResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Cancel Request?',
      text:  'Cancel this regularization request?',
      icon:  'warning',
      showCancelButton:   true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  'Yes, cancel it!',
      cancelButtonText:   'No'
    });

    if (result.isConfirmed) {
      this.regularizationService.cancelRegularization(reg.id).subscribe({
        next: (res) => {
          if (res.success) {
            Swal.fire({ title: 'Cancelled!', text: 'Request cancelled.', icon: 'success',
              confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false });
            this.loadRegularizations();
          } else {
            Swal.fire({ title: 'Error!', text: res.message || 'Failed to cancel.', icon: 'error', confirmButtonColor: '#ef4444' });
          }
        },
        error: (err) => {
          Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred.', icon: 'error', confirmButtonColor: '#ef4444' });
        }
      });
    }
  }

  async deleteRegularization(reg: RegularizationResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete Request?',
      html:  `Permanently delete the regularization request for <strong>${reg.employeeName}</strong>?<br>
              <small style="color:#6b7280;">This action cannot be undone.</small>`,
      icon:  'warning',
      showCancelButton:   true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  'Yes, delete it!',
      cancelButtonText:   'No'
    });

    if (!result.isConfirmed) return;

    this.regularizationService.deleteRegularization(reg.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Deleted!', text: 'Regularization request deleted successfully.', icon: 'success',
            confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false });
          this.loadRegularizations();
        } else {
          Swal.fire({ title: 'Error!', text: res.message || 'Failed to delete the request.', icon: 'error', confirmButtonColor: '#ef4444' });
        }
      },
      error: (err) => {
        Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred while deleting.', icon: 'error', confirmButtonColor: '#ef4444' });
      }
    });
  }

  exportToExcel(): void {
    if (!this.rowData.length) {
      Swal.fire({ title: 'No Data', text: 'No requests to export.', icon: 'info', confirmButtonColor: '#3b82f6' });
      return;
    }
    const exportData = this.rowData.map(reg => ({
      'Employee Code':       reg.employeeCode,
      'Employee Name':       reg.employeeName,
      'Date':                reg.attendanceDate  ? new Date(reg.attendanceDate).toLocaleDateString()  : '—',
      'Type':                reg.regularizationTypeName,
      'Requested Check-In':  reg.requestedCheckIn  ? new Date(reg.requestedCheckIn).toLocaleTimeString()  : '—',
      'Requested Check-Out': reg.requestedCheckOut ? new Date(reg.requestedCheckOut).toLocaleTimeString() : '—',
      'Original Check-In':   reg.originalCheckIn   ? new Date(reg.originalCheckIn).toLocaleTimeString()   : '—',
      'Original Check-Out':  reg.originalCheckOut  ? new Date(reg.originalCheckOut).toLocaleTimeString()  : '—',
      'Reason':              reg.reason,
      'Status':              reg.statusName,
      'Approved By':         reg.approvedByName    || '—',
      'Approved At':         reg.approvedAt ? new Date(reg.approvedAt).toLocaleString() : '—',
      'Rejection Reason':    reg.rejectionReason   || '—',
      'Requested At':        new Date(reg.requestedAt).toLocaleString()
    }));
    const ws       = XLSX.utils.json_to_sheet(exportData);
    const wb       = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Regularizations');
    const fileName = `Regularizations_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    Swal.fire({ title: 'Exported!', text: `"${fileName}" downloaded.`, icon: 'success',
      confirmButtonColor: '#3b82f6', timer: 3000, showConfirmButton: false });
  }

  formatViewTime(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  formatViewDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  formatViewDateTime(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}