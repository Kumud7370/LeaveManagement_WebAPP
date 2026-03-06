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
  FilterChangedEvent,
  themeQuartz
} from 'ag-grid-community';

import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  AttendanceSummaryDto,
  AttendanceResponseDto,
  AttendanceStatus
} from '../../../core/Models/attendance.model';
import {
  exportToCsv,
  clearAllFilters,
  refreshGrid,
  getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const summaryGridTheme = themeQuartz.withParams({
  backgroundColor:                '#ffffff',
  foregroundColor:                '#1f2937',
  borderColor:                    '#e5e7eb',
  headerBackgroundColor:          '#f8faff',
  headerTextColor:                '#374151',
  oddRowBackgroundColor:          '#ffffff',
  rowHoverColor:                  '#f0f7ff',
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
  selector: 'app-attendance-summary',
  standalone: true,
  templateUrl: './attendance-summary.component.html',
  styleUrls: ['./attendance-summary.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, AgGridAngular],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AttendanceSummaryComponent implements OnInit {

  @ViewChild('agGrid', { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;

  readonly gridTheme = summaryGridTheme;

  // ── Role / identity ─────────────────────────────────────────
  get isAdmin(): boolean {
    const role = (sessionStorage.getItem('RoleName') || '').toLowerCase();
    return role === 'admin' || role === 'superadmin' || role === 'manager';
  }

  get selfEmployeeId(): string {
    return sessionStorage.getItem('EmployeeId') || '';
  }

  // ── State ────────────────────────────────────────────────────
  summary: AttendanceSummaryDto | null = null;
  summaryLoading = false;
  recordsLoading = false;
  errorMsg       = '';
  hasSearched    = false;

  allRecords: AttendanceResponseDto[] = [];
  rowData:    AttendanceResponseDto[] = [];
  gridApi!:   GridApi;

  // ── Form fields ──────────────────────────────────────────────
  lookupEmployeeId = '';
  startDate        = '';
  endDate          = '';
  searchTerm       = '';

  private searchDebounceTimer: any = null;

  // ── Pagination ───────────────────────────────────────────────
  currentPage = 1;
  pageSize    = 20;
  totalItems  = 0;
  totalPages  = 0;
  Math        = Math;

  activeFilters = { hasActiveFilters: false, filters: [] as string[], count: 0 };
  context = { componentParent: this };

  // ── Column definitions (Method & Approved removed) ───────────
  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true, resizable: true, minWidth: 80
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Date',
      field: 'attendanceDate',
      width: 160, minWidth: 130, sort: 'asc',
      valueFormatter: (p: any) =>
        p.value ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      cellStyle: { color: '#374151', fontWeight: '600' }
    },
    {
      headerName: 'Day',
      field: 'attendanceDate',
      colId: 'dayOfWeek',
      width: 90, minWidth: 80,
      filter: false, floatingFilter: false, suppressFloatingFilterButton: true,
      valueFormatter: (p: any) =>
        p.value ? new Date(p.value).toLocaleDateString('en-GB', { weekday: 'short' }) : '',
      cellStyle: (p: any) => {
        const day = p.value ? new Date(p.value).getDay() : -1;
        const isWeekend = day === 0 || day === 6;
        return { color: isWeekend ? '#ef4444' : '#6b7280', fontSize: '12px', fontWeight: isWeekend ? '700' : '400' };
      }
    },
    {
      headerName: 'Check In',
      field: 'checkInTime',
      width: 120, minWidth: 100,
      valueFormatter: (p: any) =>
        p.value ? new Date(p.value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
      cellStyle: (p: any) => ({
        color: p.data?.isLate ? '#d97706' : '#374151',
        fontWeight: p.data?.isLate ? '700' : '400'
      })
    },
    {
      headerName: 'Check Out',
      field: 'checkOutTime',
      width: 120, minWidth: 100,
      valueFormatter: (p: any) =>
        p.value ? new Date(p.value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
      cellStyle: (p: any) => ({
        color: p.data?.isEarlyLeave ? '#ef4444' : '#374151',
        fontWeight: p.data?.isEarlyLeave ? '700' : '400'
      })
    },
    {
      headerName: 'Hours',
      field: 'workingHours',
      width: 100, minWidth: 85,
      valueFormatter: (p: any) => p.value != null ? `${(+p.value).toFixed(1)}h` : '—',
      cellStyle: (p: any) => {
        const h = p.value ?? 0;
        return {
          textAlign: 'center',
          color: h >= 8 ? '#059669' : h >= 4 ? '#d97706' : '#ef4444',
          fontWeight: '600'
        };
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 150, minWidth: 120,
      cellRenderer: (p: any) => {
        const status: AttendanceStatus = p.value;
        const label: string = p.data?.statusName ?? '';
        const map: Record<number, { bg: string; color: string; border: string }> = {
          [AttendanceStatus.Present]:      { bg: '#dcfce7', color: '#14532d', border: '#86efac' },
          [AttendanceStatus.Absent]:       { bg: '#fee2e2', color: '#7f1d1d', border: '#fca5a5' },
          [AttendanceStatus.HalfDay]:      { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
          [AttendanceStatus.Leave]:        { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
          [AttendanceStatus.Holiday]:      { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
          [AttendanceStatus.WeekOff]:      { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
          [AttendanceStatus.WorkFromHome]: { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
          [AttendanceStatus.OnDuty]:       { bg: '#fff7ed', color: '#9a3412', border: '#fdba74' }
        };
        const s = map[status] ?? map[AttendanceStatus.Absent];
        return `<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:9999px;
                             font-size:11px;font-weight:600;background:${s.bg};color:${s.color};
                             border:1px solid ${s.border};">${label}</span>`;
      }
    },
    {
      headerName: 'Late',
      field: 'isLate',
      width: 100, minWidth: 85,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) =>
        p.value
          ? `<span style="color:#d97706;font-weight:700;font-size:12px;">+${p.data?.lateMinutes ?? 0}m</span>`
          : `<span style="color:#9ca3af;font-size:12px;">—</span>`
    },
    {
      headerName: 'Early Exit',
      field: 'isEarlyLeave',
      width: 110, minWidth: 90,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: any) =>
        p.value
          ? `<span style="color:#ef4444;font-weight:700;font-size:12px;">-${p.data?.earlyLeaveMinutes ?? 0}m</span>`
          : `<span style="color:#9ca3af;font-size:12px;">—</span>`
    },
    {
      headerName: 'Overtime',
      field: 'overtimeHours',
      width: 110, minWidth: 90,
      valueFormatter: (p: any) =>
        p.value != null && p.value > 0 ? `${(+p.value).toFixed(1)}h` : '—',
      cellStyle: { textAlign: 'center', color: '#6366f1', fontWeight: '600' }
    }
    // ── Method and Approved columns intentionally removed ──────
  ];

  constructor(
    private attendanceService: AttendanceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setCurrentMonth();

    if (this.isAdmin) {
      this.lookupEmployeeId = '';
    } else {
      this.lookupEmployeeId = this.selfEmployeeId;
      if (this.selfEmployeeId) {
        this.loadAll();
      }
    }
  }

  private resolveEid(): string {
    return this.isAdmin ? this.lookupEmployeeId.trim() : this.selfEmployeeId;
  }

  loadAll(): void {
    this.errorMsg = '';

    const eid = this.resolveEid();
    if (!eid) {
      this.errorMsg = 'Please enter an Employee ID to search.';
      return;
    }
    if (!this.startDate || !this.endDate) {
      this.errorMsg = 'Please select both From and To dates.';
      return;
    }
    if (this.startDate > this.endDate) {
      this.errorMsg = 'From date cannot be after To date.';
      return;
    }

    this.hasSearched = true;
    this.summary     = null;
    this.allRecords  = [];
    this.rowData     = [];

    this.doLoadSummary(eid);
    this.doLoadRecords(eid);
  }

  private doLoadSummary(eid: string): void {
    this.summaryLoading = true;
    this.cdr.detectChanges();

    this.attendanceService.getAttendanceSummary(eid, this.startDate, this.endDate).subscribe({
      next: (r) => {
        this.summaryLoading = false;
        if (r.success && r.data) {
          this.summary = r.data;
        } else {
          this.errorMsg = r.message || 'No summary data found. Check the employee ID.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.summaryLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load summary. Check the employee ID and try again.';
        this.cdr.detectChanges();
      }
    });
  }

  private doLoadRecords(eid: string): void {
    this.recordsLoading = true;
    this.cdr.detectChanges();

    this.attendanceService.getEmployeeHistory(eid, this.startDate, this.endDate).subscribe({
      next: (r: any) => {
        this.recordsLoading = false;
        if (r.success) {
          this.allRecords  = r.data ?? [];
          this.currentPage = 1;
          this.applySearchAndPage();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.recordsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  refreshRecords(): void {
    const eid = this.resolveEid();
    if (eid && this.startDate && this.endDate) this.doLoadRecords(eid);
  }

  private applySearchAndPage(): void {
    const term = this.searchTerm.toLowerCase().trim();
    const filtered = term
      ? this.allRecords.filter(i =>
          (i.statusName        || '').toLowerCase().includes(term) ||
          (i.attendanceDate?.toString() || '').includes(term)
        )
      : [...this.allRecords];

    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;

    const start  = (this.currentPage - 1) * this.pageSize;
    this.rowData = filtered.slice(start, start + this.pageSize);

    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
      refreshGrid(this.gridApi);
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
    }
    this.cdr.detectChanges();
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('filterChanged', (_e: FilterChangedEvent) => this.updateActiveFilters());
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
  }

  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.applySearchAndPage();
      this.updateActiveFilters();
    }, 350);
  }

  onClearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.currentPage = 1;
    if (this.gridApi) clearAllFilters(this.gridApi);
    this.applySearchAndPage();
    this.updateActiveFilters();
  }

  updateActiveFilters(): void {
    const n = this.gridApi ? Object.keys(this.gridApi.getFilterModel()).length : 0;
    const extra: Record<string, any> = {};
    if (n > 0) extra['Column filters'] = `${n} active`;
    const filters = getActiveFiltersSummary(this.searchTerm, undefined, extra);
    this.activeFilters = { hasActiveFilters: filters.length > 0, filters, count: filters.length };
  }

  onPageSizeChanged(size: number): void { this.pageSize = +size; this.currentPage = 1; this.applySearchAndPage(); }
  goToPage(page: number | string): void {
    const p = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(p) || p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p; this.applySearchAndPage();
  }
  nextPage():     void { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }
  previousPage(): void { if (this.currentPage > 1)              this.goToPage(this.currentPage - 1); }

  setCurrentMonth(): void {
    const t = new Date();
    this.startDate = this.toDateStr(new Date(t.getFullYear(), t.getMonth(), 1));
    this.endDate   = this.toDateStr(t);
  }
  setCurrentMonthAndLoad(): void { this.setCurrentMonth(); this.loadAll(); }
  setLastMonth(): void {
    const t = new Date();
    this.startDate = this.toDateStr(new Date(t.getFullYear(), t.getMonth() - 1, 1));
    this.endDate   = this.toDateStr(new Date(t.getFullYear(), t.getMonth(), 0));
    this.loadAll();
  }
  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  exportData(): void {
    exportToCsv(this.gridApi, `attendance_${this.resolveEid()}_${this.startDate}_to_${this.endDate}`);
  }

  getAttendanceArc(): string {
    const pct   = Math.min(Math.max((this.summary?.attendancePercentage ?? 0) / 100, 0), 1);
    const angle = pct * Math.PI;
    const x     = 50 + 40 * Math.cos(Math.PI + angle);
    const y     = 50 + 40 * Math.sin(Math.PI + angle);
    return `M 10 50 A 40 40 0 ${angle > Math.PI / 2 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  getGaugeColor(): string {
    const p = this.summary?.attendancePercentage ?? 0;
    return p >= 90 ? '#059669' : p >= 75 ? '#d97706' : '#ef4444';
  }
  safePercent(value: number, total: number): number {
    return total ? Math.min((value / total) * 100, 100) : 0;
  }
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}