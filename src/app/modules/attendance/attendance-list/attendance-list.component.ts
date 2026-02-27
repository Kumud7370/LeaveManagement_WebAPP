// attendance-list.component.ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  OnInit,
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
import Swal from 'sweetalert2';

import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  AttendanceResponseDto,
  AttendanceFilterDto,
  AttendanceStatus
} from '../../../core/Models/attendance.model';
import { AttendanceDetailsComponent } from '../attendance-details/attendance-details.component';
import { ManualAttendanceFormComponent } from '../manual-attendance-form/manual-attendance-form.component';
import {
  dateTimeFormatter,
  exportToCsv,
  clearAllFilters,
  refreshGrid,
  getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Same themeQuartz pattern as Holiday List ──
const attendanceGridTheme = themeQuartz.withParams({
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
  selector: 'app-attendance-list',
  standalone: true,
  templateUrl: './attendance-list.component.html',
  styleUrls: ['./attendance-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    AttendanceDetailsComponent,
    ManualAttendanceFormComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AttendanceListComponent implements OnInit {

  @ViewChild('agGrid', { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;

  readonly gridTheme = attendanceGridTheme;

  // ─── Grid state ───────────
  rowData: AttendanceResponseDto[] = [];
  gridApi!: GridApi;
  searchEmployeeId: string = '';

  // ─── Sidebar / Modal state ──
  showDetails = false;
  showForm = false;
  selectedAttendanceId: string | null = null;
  editingRecord: AttendanceResponseDto | null = null;

  // ─── Filters ────────────

  // ─── Pagination ─────────
  currentPage: number = 1;
  pageSize: number = 20;
  totalItems: number = 0;
  totalPages: number = 0;
  private isLoadingData: boolean = false;
  private searchDebounceTimer: any = null;
  Math = Math;

  // ─── Lookup ───────────
  statistics: { [key: string]: number } = {};

  stats = { present: 0, absent: 0, halfDay: 0, leave: 0 };

  activeFilters = {
    hasActiveFilters: false,
    filters: [] as string[],
    count: 0
  };

  context = { componentParent: this };

  // ─── Grid config ──────────────
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
      suppressSizeToFit: true,
      cellRenderer: (params: any) => {
        if (!params.data) return '';
        const isApproved = !!params.data.approvedBy;
        const approveBtn = !isApproved
          ? `<button class="btn-icon btn-approve" data-action="approve" title="Approve">
               <i class="fas fa-check" style="pointer-events:none"></i>
             </button>`
          : '';
        return `<div class="action-buttons">
          <button class="btn-icon btn-view"   data-action="view"   title="View">
            <i class="fas fa-eye"    style="pointer-events:none"></i>
          </button>
          <button class="btn-icon btn-edit"   data-action="edit"   title="Edit">
            <i class="fas fa-pencil-alt" style="pointer-events:none"></i>
          </button>
          ${approveBtn}
          <button class="btn-icon btn-delete" data-action="delete" title="Delete">
            <i class="fas fa-trash"  style="pointer-events:none"></i>
          </button>
        </div>`;
      },
      onCellClicked: (event: any) => {
        const target = event.event?.target as HTMLElement;
        const action = (target?.closest('[data-action]') as HTMLElement)?.getAttribute('data-action');
        if (!action || !event.data) return;
        switch (action) {
          case 'view':    this.viewDetails(event.data);     break;
          case 'edit':    this.openEditForm(event.data);    break;
          case 'approve': this.approveRecord(event.data);   break;
          case 'delete':  this.deleteRecord(event.data);    break;
        }
      }
    },
    {
      headerName: 'Emp Code',
      field: 'employeeCode',
      width: 110,
      minWidth: 90,
      cellRenderer: (params: any) => {
        const val    = params.value || '';
        const search = params.context?.componentParent?.searchEmployeeId || '';
        const hl     = params.context?.componentParent?.highlightText(val, search) || val;
        return `<span style="font-weight:600;color:#1f2937;">${hl}</span>`;
      }
    },
    {
      headerName: 'Employee',
      field: 'employeeName',
      flex: 1,
      minWidth: 150,
      cellRenderer: (params: any) => {
        const val    = params.value || '';
        const search = params.context?.componentParent?.searchEmployeeId || '';
        const hl     = params.context?.componentParent?.highlightText(val, search) || val;
        return `<span style="font-weight:500;color:#1f2937;">${hl}</span>`;
      }
    },
    {
      headerName: 'Date',
      field: 'attendanceDate',
      width: 140,
      minWidth: 120,
      valueFormatter: (params: any) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      },
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Check In',
      field: 'checkInTime',
      width: 110,
      minWidth: 90,
      valueFormatter: (params: any) =>
        params.value
          ? new Date(params.value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '—',
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Check Out',
      field: 'checkOutTime',
      width: 110,
      minWidth: 90,
      valueFormatter: (params: any) =>
        params.value
          ? new Date(params.value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '—',
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Hours',
      field: 'workingHours',
      width: 90,
      minWidth: 80,
      valueFormatter: (params: any) =>
        params.value != null ? `${(+params.value).toFixed(1)}h` : '—',
      cellStyle: { textAlign: 'center', color: '#374151' }
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 130,
      minWidth: 110,
      cellRenderer: (params: any) => {
        const status: AttendanceStatus = params.value;
        const label: string = params.data?.statusName ?? '';
        const styleMap: Record<number, { bg: string; color: string; border: string }> = {
          [AttendanceStatus.Present]:      { bg: '#dcfce7', color: '#14532d', border: '#86efac' },
          [AttendanceStatus.Absent]:       { bg: '#fee2e2', color: '#7f1d1d', border: '#fca5a5' },
          [AttendanceStatus.HalfDay]:      { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
          [AttendanceStatus.Leave]:        { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
          [AttendanceStatus.Holiday]:      { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
          [AttendanceStatus.WeekOff]:      { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
          [AttendanceStatus.WorkFromHome]: { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
          [AttendanceStatus.OnDuty]:       { bg: '#fff7ed', color: '#9a3412', border: '#fdba74' }
        };
        const s = styleMap[status] ?? styleMap[AttendanceStatus.Absent];
        return `<span style="display:inline-flex;align-items:center;padding:3px 10px;
                             border-radius:9999px;font-size:12px;font-weight:600;
                             background:${s.bg};color:${s.color};border:1px solid ${s.border};">
                  ${label}
                </span>`;
      }
    },
    {
      headerName: 'Late',
      field: 'isLate',
      width: 90,
      minWidth: 75,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (params: any) =>
        params.value
          ? `<span style="color:#d97706;font-weight:700;font-size:12px;">+${params.data?.lateMinutes ?? 0}m</span>`
          : `<span style="color:#9ca3af;font-size:12px;">—</span>`
    },
    {
      headerName: 'Method',
      field: 'checkInMethodName',
      width: 120,
      minWidth: 100,
      cellStyle: { color: '#64748b', fontSize: '12px' }
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
    private attendanceService: AttendanceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadAttendance();
  }

  // ─── Grid Ready ──────────
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('sortChanged',   this.onSortChanged.bind(this));
    this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
  }

  onSortChanged(_event: SortChangedEvent): void {
    this.currentPage = 1;
    this.loadAttendance();
  }

  onFilterChanged(_event: FilterChangedEvent): void {
    this.currentPage = 1;
    this.loadAttendance();
    this.updateActiveFilters();
  }

  // ─── Data Loading ──────
  loadAttendance(): void {
    if (this.isLoadingData) return;
    this.isLoadingData = true;

    const filter: AttendanceFilterDto = {
      employeeId:     this.searchEmployeeId || undefined,
      pageNumber:     this.currentPage,
      pageSize:       this.pageSize,
      sortBy:         'AttendanceDate',
      sortDescending: true
    };

    this.attendanceService.getFilteredAttendance(filter).subscribe({
      next: (r: any) => {
        this.isLoadingData = false;
        if (r.success) {
          this.rowData    = r.data.items;
          this.totalItems = r.data.totalCount;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);

          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            refreshGrid(this.gridApi);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        this.isLoadingData = false;
        if (error.status !== 401) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load attendance records.' });
        }
      }
    });
  }

  loadStats(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.attendanceService.getStatistics(
      thirtyDaysAgo.toISOString().substring(0, 10),
      today.toISOString().substring(0, 10)
    ).subscribe({
      next: (r: any) => {
        if (r.success) {
          this.statistics    = r.data;
          this.stats.present = r.data['Present']  ?? 0;
          this.stats.absent  = r.data['Absent']   ?? 0;
          this.stats.halfDay = r.data['HalfDay']  ?? 0;
          this.stats.leave   = r.data['Leave']    ?? 0;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  getStatCount(key: string): number {
    return this.statistics[key] ?? 0;
  }

  // ─── Search / Filters ──
  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadAttendance();
      this.updateActiveFilters();
    }, 350);
  }

  onFilterSelect(): void {
    this.currentPage = 1;
    this.loadAttendance();
    this.updateActiveFilters();
  }

  clearSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchEmployeeId = '';
    this.currentPage = 1;
    this.loadAttendance();
    this.updateActiveFilters();
  }

  onClearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchEmployeeId = '';
    this.currentPage      = 1;
    clearAllFilters(this.gridApi);
    this.loadAttendance();
    this.updateActiveFilters();
  }

  updateActiveFilters(): void {
    const columnFilterCount = this.gridApi
      ? Object.keys(this.gridApi.getFilterModel()).length
      : 0;
    const additionalFilters: Record<string, any> = {};
    if (columnFilterCount > 0) additionalFilters['Column filters'] = `${columnFilterCount} active`;

    const filters = getActiveFiltersSummary(this.searchEmployeeId, undefined, additionalFilters);
    this.activeFilters = { hasActiveFilters: filters.length > 0, filters, count: filters.length };
  }

  highlightText(text: string, term: string): string {
    if (!term || !term.trim() || !text) return String(text);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex   = new RegExp(`(${escaped})`, 'gi');
    return String(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // ─── Pagination ─────────
  onPageSizeChanged(newPageSize: number): void {
    this.pageSize    = newPageSize;
    this.currentPage = 1;
    this.loadAttendance();
  }

  goToPage(page: number | string): void {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(pageNum) || pageNum < 1 || pageNum > this.totalPages || pageNum === this.currentPage) return;
    this.currentPage = pageNum;
    this.loadAttendance();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  // ─── Sidebar / Modal ────
  viewDetails(record: AttendanceResponseDto): void {
    this.selectedAttendanceId = record.id;
    this.showDetails          = true;
    this.showForm             = false;
  }

  openEditForm(record: AttendanceResponseDto): void {
    this.editingRecord = record;
    this.showForm      = true;
    this.showDetails   = false;
  }

  openCreateForm(): void {
    this.editingRecord = null;
    this.showForm      = true;
    this.showDetails   = false;
  }

  onSidebarClose(): void {
    this.showDetails          = false;
    this.showForm             = false;
    this.selectedAttendanceId = null;
    this.editingRecord        = null;
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.onSidebarClose();
  }

  onRecordSaved(): void {
    this.onSidebarClose();
    this.loadAttendance();
    this.loadStats();
  }

  onRecordUpdated(): void {
    this.loadAttendance();
    this.loadStats();
  }

  // ─── Actions ────────────
  async approveRecord(record: AttendanceResponseDto): Promise<void> {
    const res = await Swal.fire({
      title: 'Approve Attendance?',
      html: `Approve <strong>${record.employeeName}</strong>'s attendance for
             ${new Date(record.attendanceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  'Approve'
    });
    if (!res.isConfirmed) return;

    this.attendanceService.approveAttendance(record.id).subscribe({
      next: (r: any) => {
        if (r.success) {
          Swal.fire({ title: 'Approved!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadAttendance();
          this.loadStats();
        } else {
          Swal.fire('Error!', r.message, 'error');
        }
      },
      error: (e: any) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async deleteRecord(record: AttendanceResponseDto): Promise<void> {
    const res = await Swal.fire({
      title: 'Delete Attendance?',
      html: `<div style="text-align:left;padding:10px;">
               <p>Delete <strong>${record.employeeName}</strong>'s record for
               ${new Date(record.attendanceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}?</p>
               <p style="color:#ef4444;margin-top:15px;padding:10px;background:#fee2e2;border-radius:6px;">
                 <strong>Warning:</strong> This action cannot be undone.
               </p>
             </div>`,
      icon: 'warning',
      showCancelButton:    true,
      confirmButtonColor:  '#ef4444',
      cancelButtonColor:   '#6b7280',
      confirmButtonText:   'Yes, delete!'
    });
    if (!res.isConfirmed) return;

    this.attendanceService.deleteAttendance(record.id).subscribe({
      next: (r: any) => {
        if (r.success) {
          const idx = this.rowData.findIndex(row => row.id === record.id);
          if (idx !== -1) {
            this.rowData.splice(idx, 1);
            this.gridApi.setGridOption('rowData', [...this.rowData]);
            refreshGrid(this.gridApi);
          }
          this.totalItems = Math.max(0, this.totalItems - 1);
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          if (this.rowData.length === 0 && this.currentPage > 1) {
            this.currentPage--;
            this.loadAttendance();
          }
          this.loadStats();
          this.cdr.detectChanges();
          Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Record has been deleted.', timer: 2000, showConfirmButton: false });
        }
      },
      error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete record.' })
    });
  }

  // ─── Export ───────────
  exportData(): void {
    exportToCsv(this.gridApi, 'attendance');
    Swal.fire({ icon: 'success', title: 'Exported!', text: 'Attendance data exported as CSV.', timer: 2000, showConfirmButton: false });
  }
}