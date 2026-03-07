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
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { EmployeeShiftService } from '../../../core/services/api/employee-shift.api';
import {
  EmployeeShift,
  EmployeeShiftFilterDto,
  ShiftChangeStatus,
  ShiftChangeStatusLabel,
  ShiftChangeStatusColor,
} from '../../../core/Models/employee-shift.module';
import { EmployeeShiftFormComponent } from '../employee-shift-form/employee-shift-form.component';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import {
  dateTimeFormatter,
  exportToCsv,
  clearAllFilters,
  refreshGrid,
  getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const shiftGridTheme = themeQuartz.withParams({
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
  selector: 'app-employee-shift-list',
  standalone: true,
  templateUrl: './employee-shift-list.component.html',
  styleUrls: ['./employee-shift-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    EmployeeShiftFormComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EmployeeShiftListComponent implements OnInit, OnDestroy {

  @ViewChild('agGrid', { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();

  readonly gridTheme = shiftGridTheme;

  //  Grid state
  rowData: EmployeeShift[] = [];
  gridApi!: GridApi;
  searchTerm: string = '';

  //  Modal state
  showModal: boolean = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedShift: EmployeeShift | null = null;

  //  Reject dialog
  showRejectDialog: boolean = false;
  rejectTarget: EmployeeShift | null = null;
  rejectReason: string = '';

  //  Pagination
  currentPage: number = 1;
  pageSize: number = 20;
  totalItems: number = 0;
  totalPages: number = 0;
  private isLoadingData: boolean = false;
  private searchDebounceTimer: any = null;
  Math = Math;

  ShiftChangeStatus = ShiftChangeStatus;

  //  Stats
  stats: Record<string, number> = {};
  statsLoaded: boolean = false;

  activeFilters = {
    hasActiveFilters: false,
    filters: [] as string[],
    count: 0
  };

  context = { componentParent: this };

  //  Grid config
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 80,
    suppressSizeToFit: false,
    suppressAutoSize: false
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      field: 'actions',
      width: 155,
      minWidth: 155,
      maxWidth: 155,
      sortable: false,
      filter: false,
      floatingFilter: false,
      suppressFloatingFilterButton: true,
      cellClass: 'actions-cell',
      cellRenderer: ActionCellRendererComponent,
      suppressSizeToFit: true
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      minWidth: 100,
      cellRenderer: (params: any) => {
        const statusKey = this.resolveStatus(params.data?.status);
        const c = ShiftChangeStatusColor[statusKey];
        const l = ShiftChangeStatusLabel[statusKey] ?? params.data?.statusName ?? String(params.data?.status);
        return `<span class="es-status-badge" style="background:${c?.bg ?? '#f1f5f9'};color:${c?.color ?? '#475569'};">${l}</span>`;
      }
    },
    {
      headerName: 'Employee',
      field: 'employeeName',
      width: 200,
      minWidth: 160,
      cellRenderer: (params: any) => {
        const s = params.data as EmployeeShift;
        const search = params.context?.componentParent?.searchTerm || '';
        const hl = (t: string) => params.context?.componentParent?.highlightText(t, search) || t;
        return `<div style="line-height:1.35;padding:4px 0">
          <div style="font-weight:600;color:#1e293b;font-size:.84rem">${hl(s.employeeName ?? '—')}</div>
          <div style="font-size:.73rem;color:#94a3b8;font-family:monospace">${s.employeeCode ?? ''}</div>
        </div>`;
      }
    },
    {
      headerName: 'Shift',
      field: 'shiftName',
      width: 180,
      minWidth: 140,
      cellRenderer: (params: any) => {
        const s = params.data as EmployeeShift;
        const dot = s.shiftColor
          ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.shiftColor};margin-right:5px;vertical-align:middle"></span>`
          : '';
        return `<div style="line-height:1.35;padding:4px 0">
          <div style="font-weight:600;color:#334155;font-size:.84rem">${dot}${s.shiftName ?? '—'}</div>
          <div style="font-size:.73rem;color:#94a3b8">${s.shiftTimingDisplay ?? ''}</div>
        </div>`;
      }
    },
    {
      headerName: 'Effective From',
      field: 'effectiveFrom',
      width: 140,
      minWidth: 120,
      valueFormatter: (params: any) => this.fmt(params.value),
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Effective To',
      field: 'effectiveTo',
      width: 130,
      minWidth: 110,
      cellRenderer: (params: any) =>
        params.value
          ? `<span style="font-size:.84rem;color:#374151">${this.fmt(params.value)}</span>`
          : `<span style="color:#94a3b8;font-style:italic;font-size:.8rem">Ongoing</span>`
    },
    {
      headerName: 'Currently Active',
      field: 'isCurrentlyActive',
      width: 140,
      minWidth: 110,
      cellRenderer: (params: any) =>
        params.value
          ? `<span class="badge-status" style="background:#dcfce7;color:#166534;">&#10004; Yes</span>`
          : `<span class="badge-status" style="background:#f1f5f9;color:#475569;">&#8212; No</span>`
    },
    {
      headerName: 'Requested',
      field: 'requestedDate',
      width: 130,
      minWidth: 110,
      valueFormatter: (params: any) => this.fmt(params.value),
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Approved By',
      field: 'approvedByName',
      width: 150,
      minWidth: 120,
      valueFormatter: (params: any) => params.value ?? '—',
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Duration',
      field: 'durationInDays',
      width: 110,
      minWidth: 90,
      cellRenderer: (params: any) =>
        params.value === -1 || params.value == null
          ? `<span style="color:#94a3b8;font-style:italic;font-size:.8rem">Ongoing</span>`
          : `<span style="color:#374151">${params.value} days</span>`
    },
    {
      headerName: 'Created At',
      field: 'createdAt',
      width: 180,
      minWidth: 150,
      valueFormatter: dateTimeFormatter,
      cellStyle: { color: '#6b7280', fontSize: '12px' }
    }
  ];

  constructor(
    private svc: EmployeeShiftService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadShifts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  //  Grid

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('sortChanged',   this.onSortChanged.bind(this));
    this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
  }

  onSortChanged(_event: SortChangedEvent): void {
    this.currentPage = 1;
    this.loadShifts();
  }

  onFilterChanged(_event: FilterChangedEvent): void {
    this.currentPage = 1;
    this.loadShifts();
    this.updateActiveFilters();
  }

  highlightText(text: string, term: string): string {
    if (!term || !term.trim() || !text) return String(text);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex   = new RegExp(`(${escaped})`, 'gi');
    return String(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  //  Data Loading

  loadStats(): void {
    this.svc.getStatisticsByStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.success) {
            this.stats = res.data;
            this.statsLoaded = true;
            this.cdr.detectChanges();
          }
        }
      });
  }

  loadShifts(): void {
    if (this.isLoadingData) return;
    this.isLoadingData = true;

    const filter: EmployeeShiftFilterDto = {
      searchTerm:     this.searchTerm || undefined,
      pageNumber:     this.currentPage,
      pageSize:       this.pageSize,
      sortBy:         'EffectiveFrom',
      sortDescending: true,
    };

    this.svc.getFilteredEmployeeShifts(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.isLoadingData = false;
          if (res.success) {
            this.rowData    = res.data.items;
            this.totalItems = res.data.totalCount;
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);

            if (this.gridApi) {
              this.gridApi.setGridOption('rowData', this.rowData);
              refreshGrid(this.gridApi);
              setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
            }
            this.cdr.detectChanges();
          }
        },
        error: err => {
          this.isLoadingData = false;
          if (err.status !== 401) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load shift assignments. Please try again.' });
          }
        }
      });
  }

  //  Pagination

  onPageSizeChanged(newPageSize: number): void {
    this.pageSize    = newPageSize;
    this.currentPage = 1;
    this.loadShifts();
  }

  goToPage(page: number | string): void {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(pageNum) || pageNum < 1 || pageNum > this.totalPages || pageNum === this.currentPage) return;
    this.currentPage = pageNum;
    this.loadShifts();
  }

  nextPage(): void     { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }
  previousPage(): void { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }

  //  Search

  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadShifts();
      this.updateActiveFilters();
    }, 350);
  }

  clearSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.currentPage = 1;
    this.loadShifts();
    this.updateActiveFilters();
  }

  handleClearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.currentPage = 1;
    clearAllFilters(this.gridApi);
    this.loadShifts();
    this.updateActiveFilters();
  }

  updateActiveFilters(): void {
    const columnFilterCount = this.gridApi
      ? Object.keys(this.gridApi.getFilterModel()).length
      : 0;
    const additionalFilters: Record<string, any> = {};
    if (columnFilterCount > 0) additionalFilters['Column filters'] = `${columnFilterCount} active`;

    const filters = getActiveFiltersSummary(this.searchTerm, undefined, additionalFilters);
    this.activeFilters = { hasActiveFilters: filters.length > 0, filters, count: filters.length };
  }

  //  Modal

  openCreateModal(): void {
    this.modalMode     = 'create';
    this.selectedShift = null;
    this.showModal     = true;
    this.cdr.detectChanges();
  }

  viewDetails(shift: EmployeeShift): void {
    this.modalMode     = 'view';
    this.selectedShift = shift;
    this.showModal     = true;
    this.cdr.detectChanges();
  }

  editDepartment(shift: EmployeeShift): void {
    if (!shift.canBeModified) {
      Swal.fire({ icon: 'info', title: 'Cannot Edit', text: 'Only Pending assignments with a future effective date can be modified.', confirmButtonColor: '#3b82f6' });
      return;
    }
    this.modalMode     = 'edit';
    this.selectedShift = shift;
    this.showModal     = true;
    this.cdr.detectChanges();
  }

  onModalClose(): void   { this.showModal = false; this.selectedShift = null; }
  onModalSuccess(): void { this.showModal = false; this.selectedShift = null; this.loadShifts(); this.loadStats(); }

  //  Toggle (Approve)
  toggleStatus(shift: EmployeeShift): void {
    if (!this.isPending(shift)) {
      Swal.fire({ icon: 'info', title: 'Not Applicable', text: `Assignment is already ${shift.statusName}. Only Pending can be approved.`, confirmButtonColor: '#3b82f6' });
      return;
    }
    Swal.fire({
      title: 'Approve Assignment?',
      html: `Approve <b>${shift.employeeName}</b> → <b>${shift.shiftName}</b><br>
             <small style="color:#64748b">Effective: ${this.fmt(shift.effectiveFrom)}</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.approveShiftChange(shift.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: res => {
            if (res.success) {
              this.toast('Approved!', `${shift.employeeName}'s shift has been approved.`);
              this.loadShifts();
              this.loadStats();
            } else {
              Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Approval failed.', confirmButtonColor: '#ef4444' });
            }
          },
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Approval failed.', confirmButtonColor: '#ef4444' })
        });
    });
  }

  //  Delete
  deleteDepartment(shift: EmployeeShift): void {
    if (this.isPending(shift)) {
      Swal.fire({
        title: 'What would you like to do?',
        html: `<b>${shift.employeeName}</b> → <b>${shift.shiftName}</b>`,
        icon: 'warning',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        denyButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
        confirmButtonText: shift.canBeModified ? '🗑 Delete' : '✖ Reject',
        denyButtonText: '🚫 Cancel Request',
        cancelButtonText: 'Back'
      }).then(r => {
        if (r.isConfirmed) { shift.canBeModified ? this.doDelete(shift) : this.openRejectDialog(shift); }
        else if (r.isDenied) { this.doCancel(shift); }
      });
      return;
    }
    Swal.fire({ icon: 'info', title: 'Cannot Delete', text: 'Only Pending assignments can be removed.', confirmButtonColor: '#3b82f6' });
  }

  openRejectDialog(shift: EmployeeShift): void {
    this.rejectTarget     = shift;
    this.rejectReason     = '';
    this.showRejectDialog = true;
  }

  confirmReject(): void {
    if (!this.rejectTarget || !this.rejectReason.trim()) return;
    const target = this.rejectTarget;
    this.showRejectDialog = false;
    this.svc.rejectShiftChange(target.id, this.rejectReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.success) { this.toast('Rejected', `${target.employeeName}'s request was rejected.`); this.loadShifts(); this.loadStats(); }
          else { Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Rejection failed.', confirmButtonColor: '#ef4444' }); }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Rejection failed.', confirmButtonColor: '#ef4444' })
      });
  }

  private doCancel(shift: EmployeeShift): void {
    this.svc.cancelShiftChange(shift.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => { if (res.success) { this.toast('Cancelled', 'Shift request cancelled.'); this.loadShifts(); this.loadStats(); } },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Cancel failed.', confirmButtonColor: '#ef4444' })
      });
  }

  private doDelete(shift: EmployeeShift): void {
    this.svc.deleteEmployeeShift(shift.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.success) {
            const idx = this.rowData.findIndex(r => r.id === shift.id);
            if (idx !== -1) { this.rowData.splice(idx, 1); this.gridApi.setGridOption('rowData', [...this.rowData]); refreshGrid(this.gridApi); }
            this.totalItems = Math.max(0, this.totalItems - 1);
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            if (this.rowData.length === 0 && this.currentPage > 1) { this.currentPage--; this.loadShifts(); }
            this.loadStats();
            this.cdr.detectChanges();
            this.toast('Deleted!', 'Assignment deleted.');
          } else { Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Delete failed.', confirmButtonColor: '#ef4444' }); }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Delete failed.', confirmButtonColor: '#ef4444' })
      });
  }

  //  Export
  exportData(): void {
    exportToCsv(this.gridApi, 'employee_shifts');
    Swal.fire({ icon: 'success', title: 'Exported!', text: 'Shift data exported as CSV.', timer: 2000, showConfirmButton: false });
  }

  //  Helpers
  private resolveStatus(status: any): ShiftChangeStatus {
    if (typeof status === 'string') {
      const map: Record<string, ShiftChangeStatus> = {
        'Pending':   ShiftChangeStatus.Pending,
        'Approved':  ShiftChangeStatus.Approved,
        'Rejected':  ShiftChangeStatus.Rejected,
        'Cancelled': ShiftChangeStatus.Cancelled,
      };
      return map[status] ?? ShiftChangeStatus.Pending;
    }
    return status as ShiftChangeStatus;
  }

  private isPending(shift: EmployeeShift): boolean {
    return this.resolveStatus(shift.status) === ShiftChangeStatus.Pending;
  }

  fmt(val: any): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Returns the CSS class for each stat card based on its key */
  getStatCardClass(key: string): string {
    const map: Record<string, string> = {
      Pending:   'es-stat-card-pending',
      Approved:  'es-stat-card-approved',
      Rejected:  'es-stat-card-rejected',
      Cancelled: 'es-stat-card-cancelled',
    };
    return map[key] ?? '';
  }

  getStatColor(key: string): { bg: string; color: string } {
    const map: Record<string, { bg: string; color: string }> = {
      Pending:   { bg: '#eff6ff', color: '#1d4ed8' },
      Approved:  { bg: '#f0fdf4', color: '#15803d' },
      Rejected:  { bg: '#fef2f2', color: '#dc2626' },
      Cancelled: { bg: '#fefce8', color: '#b45309' },
    };
    return map[key] ?? { bg: '#f1f5f9', color: '#475569' };
  }

  private toast(title: string, text: string): void {
    Swal.fire({ icon: 'success', title, text, timer: 2000, timerProgressBar: true, showConfirmButton: false });
  }
}