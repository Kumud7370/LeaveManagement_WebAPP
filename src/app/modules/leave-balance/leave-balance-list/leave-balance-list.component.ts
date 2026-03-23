import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi, GridReadyEvent, ColDef,
  ModuleRegistry, AllCommunityModule, themeQuartz
} from 'ag-grid-community';
import { Subject, takeUntil, skip } from 'rxjs';
import Swal from 'sweetalert2';
import { LeaveBalanceService } from '../../../core/services/api/leave-balance.api';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { LeaveBalance, LeaveBalanceFilterDto, AdjustLeaveBalanceDto } from '../../../core/Models/leave-balance.model';
import { LeaveType } from '../../../core/Models/leave-type.model';
import { LeaveBalanceActionCellRendererComponent } from '../leave-balance-action-cell-renderer.component';
import { LeaveBalanceFormComponent } from '../leave-balance-form/leave-balance-form.component';
import { CollectiveLeaveBalanceFormComponent } from '../collective-leave-balance/collective-leave-balance-form.component';
import { LanguageService } from '../../../core/services/api/language.api';

import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const balanceGridTheme = themeQuartz.withParams({
  backgroundColor:               '#ffffff',
  foregroundColor:               '#374151',
  borderColor:                   '#e5e7eb',
  headerBackgroundColor:         '#f9fafb',
  headerTextColor:               '#374151',
  oddRowBackgroundColor:         '#ffffff',
  rowHoverColor:                 '#f8faff',
  selectedRowBackgroundColor:    '#dbeafe',
  fontFamily:                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize:                      13,
  columnBorder:                  true,
  headerColumnBorder:            true,
  headerColumnBorderHeight:      '50%',
  headerColumnResizeHandleColor: '#9ca3af',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth: 2,
  cellHorizontalPaddingScale:    0.75,
  headerFontWeight:              500,
  headerFontSize:                13,
  rowBorder:                     true,
});

@Component({
  selector: 'app-leave-balance-list',
  standalone: true,
  templateUrl: './leave-balance-list.component.html',
  styleUrls: ['./leave-balance-list.component.scss'],
  imports: [CommonModule, FormsModule, AgGridAngular, LeaveBalanceFormComponent, CollectiveLeaveBalanceFormComponent]
})
export class LeaveBalanceListComponent implements OnInit, OnDestroy {

  readonly gridTheme = balanceGridTheme;

  balances:   LeaveBalance[] = [];
  leaveTypes: LeaveType[]    = [];
  gridApi!:   GridApi;
  context = { componentParent: this };

  loading = false;
  error:  string | null = null;

  // Form modal
  showFormModal     = false;
  formMode: 'create' | 'edit' = 'create';
  selectedBalanceId: string | null = null;

  // Collective modal
  showCollectiveModal = false;

  // ── Adjust Balance modal ──────────────────────────────────────────
  showAdjustModal       = false;
  adjustingBalance:     LeaveBalance | null = null;
  adjustDays:           number = 0;
  adjustReason:         string = '';
  adjustLoading         = false;
  adjustValidationError: string | null = null;

  // Pagination
  currentPage  = 1;
  pageSize     = 10;
  totalPages   = 0;
  totalCount   = 0;
  Math         = Math;
  showFilters  = false;
  selectedYear = new Date().getFullYear();
  yearOptions: number[] = [];

  // Stats
  totalEmployees  = 0;
  totalAvailable  = 0;
  avgUtilization  = 0;
  lowBalanceCount = 0;

  filters: LeaveBalanceFilterDto = {
    pageNumber: 1, pageSize: 10, sortBy: 'year', sortDescending: true
  };

  columnDefs: ColDef[] = [];

  private destroy$          = new Subject<void>();
  private resizeObserver!:  ResizeObserver;
  private sidebarResizeTimer: any = null;

  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80,
    cellStyle: { display: 'flex', alignItems: 'center' }
  };

  constructor(
    private leaveBalanceService: LeaveBalanceService,
    private leaveTypeService:    LeaveTypeService,
    private cdr:                 ChangeDetectorRef,
    public  langService:         LanguageService
  ) {
    const cur = new Date().getFullYear();
    for (let y = cur + 1; y >= cur - 3; y--) this.yearOptions.push(y);
  }

  ngOnInit(): void {
    this.buildColumnDefs();
    this.loadLeaveTypes();
    this.loadBalances();

    this.langService.lang$.pipe(skip(1), takeUntil(this.destroy$)).subscribe(() => {
      this.buildColumnDefs();
      if (this.gridApi) this.gridApi.setGridOption('columnDefs', this.columnDefs);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    clearTimeout(this.sidebarResizeTimer);
  }

  buildColumnDefs(): void {
    const t = (k: string) => this.langService.t(k);
    const locale = this.langService.currentLang === 'mr' ? 'mr-IN'
                 : this.langService.currentLang === 'hi' ? 'hi-IN' : 'en-GB';

    this.columnDefs = [
      {
        headerName: t('lb.col.actions'),
        width: 160, minWidth: 160, maxWidth: 160,
        sortable: false, filter: false, floatingFilter: false,
        suppressFloatingFilterButton: true,
        headerClass: 'lb-action-col',
        cellClass: 'lb-action-cell lb-action-col',
        cellStyle: { display: 'flex', alignItems: 'center', padding: '0', overflow: 'visible' },
        cellRenderer: LeaveBalanceActionCellRendererComponent,
        suppressSizeToFit: true
      },
      {
        headerName: t('lb.col.employee'),
        field: 'employeeName',
        width: 200, minWidth: 160,
        cellRenderer: (p: any) => p.value
          ? `<div style="display:flex;flex-direction:column;gap:2px;justify-content:center;height:100%;">
               <span style="font-weight:600;color:#111827;font-size:13px;">${p.value}</span>
               <span style="font-size:11px;color:#9ca3af;font-family:monospace;">${p.data?.employeeCode || ''}</span>
             </div>` : ''
      },
      {
        headerName: t('lb.col.leaveType'),
        field: 'leaveTypeName',
        width: 160, minWidth: 130,
        cellRenderer: (p: any) => {
          if (!p.value) return '';
          const c = p.data?.leaveTypeColor || '#3b82f6';
          return `<span style="display:inline-flex;align-items:center;padding:3px 10px;
            background:${c}18;color:${c};border:1px solid ${c}40;
            border-radius:5px;font-size:12px;font-weight:600;">${p.value}</span>`;
        }
      },
      {
        headerName: t('lb.col.year'),
        field: 'year',
        width: 90, minWidth: 80,
        cellRenderer: (p: any) => p.data?.isCurrentYear
          ? `<span style="display:inline-flex;padding:2px 10px;border-radius:9999px;
              font-size:12px;font-weight:700;background:#dbeafe;color:#1d4ed8;">${p.value}</span>`
          : `<span style="font-size:13px;color:#6b7280;">${p.value}</span>`
      },
      {
        headerName: t('lb.col.allocated'),
        field: 'totalAllocated',
        width: 115, minWidth: 100,
        cellRenderer: (p: any) => {
          const total = (p.value || 0) + (p.data?.carriedForward || 0);
          return `<span style="display:inline-flex;padding:2px 10px;border-radius:9999px;
            font-size:12px;font-weight:600;background:#f1f5f9;color:#374151;">${total} ${t('lb.days')}</span>`;
        }
      },
      {
        headerName: t('lb.col.consumed'),
        field: 'consumed',
        width: 115, minWidth: 100,
        cellRenderer: (p: any) =>
          `<span style="display:inline-flex;padding:2px 10px;border-radius:9999px;
            font-size:12px;font-weight:600;background:#fef3c7;color:#92400e;">${p.value ?? 0} ${t('lb.days')}</span>`
      },
      {
        headerName: t('lb.col.carryFwd'),
        field: 'carriedForward',
        width: 110, minWidth: 100,
        cellRenderer: (p: any) => p.value > 0
          ? `<span style="display:inline-flex;padding:2px 10px;border-radius:9999px;
              font-size:12px;font-weight:600;background:#f0fdf4;color:#15803d;">${p.value} ${t('lb.days')}</span>`
          : `<span style="color:#d1d5db;font-size:13px;">—</span>`
      },
      {
        headerName: t('lb.col.available'),
        field: 'available',
        width: 115, minWidth: 100,
        cellRenderer: (p: any) => {
          const low   = p.data?.isLowBalance;
          const bg    = low ? '#fee2e2' : '#dcfce7';
          const color = low ? '#991b1b' : '#166534';
          const icon  = low ? ` <i class="bi bi-exclamation-triangle-fill" style="font-size:10px;"></i>` : '';
          return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;
            border-radius:9999px;font-size:12px;font-weight:600;background:${bg};color:${color};">
            ${p.value ?? 0} ${t('lb.days')}${icon}</span>`;
        }
      },
      {
        headerName: t('lb.col.utilization'),
        field: 'utilizationPercentage',
        width: 160, minWidth: 140,
        cellRenderer: (p: any) => {
          const pct   = Math.round(p.value ?? 0);
          const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
          return `<div style="display:flex;align-items:center;gap:8px;width:100%;">
            <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
              <div style="width:${Math.min(pct,100)}%;height:100%;background:${color};border-radius:3px;"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${color};min-width:36px;text-align:right;">${pct}%</span>
          </div>`;
        }
      },
      {
        headerName: t('lb.col.lastUpdated'),
        field: 'lastUpdated',
        width: 140, minWidth: 120,
        valueFormatter: (p: any) => p.value
          ? new Date(p.value).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        cellStyle: { color: '#6b7280', fontSize: '12px' }
      }
    ];
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
    const gridEl = document.querySelector('app-leave-balance-list ag-grid-angular') as HTMLElement;
    if (gridEl && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleSizeColumnsToFit(50));
      this.resizeObserver.observe(gridEl);
    }
  }

  loadLeaveTypes(): void {
    this.leaveTypeService.getActiveLeaveTypes().subscribe({
      next: (r) => { if (r.success) this.leaveTypes = r.data; }
    });
  }

  loadBalances(): void {
    this.loading = true; this.error = null;
    const filter: LeaveBalanceFilterDto = {
      ...this.filters,
      year:       this.selectedYear || undefined,
      pageNumber: this.currentPage,
      pageSize:   this.pageSize
    };
    this.leaveBalanceService.getFilteredLeaveBalances(filter).subscribe({
      next: (r) => {
        this.loading = false;
        if (r.success) {
          this.balances   = r.data.items;
          this.totalPages = r.data.totalPages;
          this.totalCount = r.data.totalCount;
          this.computeStats();
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.balances);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
        } else { this.error = r.message || this.langService.t('lb.msg.loadError'); }
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.loading = false;
        this.error = e.error?.message || this.langService.t('lb.msg.loadError');
        this.cdr.detectChanges();
      }
    });
  }

  private computeStats(): void {
    this.totalEmployees  = new Set(this.balances.map(b => b.employeeId)).size;
    this.totalAvailable  = this.balances.reduce((s, b) => s + (b.available ?? 0), 0);
    this.lowBalanceCount = this.balances.filter(b => b.isLowBalance).length;
    const totalUtil = this.balances.reduce((s, b) => s + (b.utilizationPercentage ?? 0), 0);
    this.avgUtilization  = this.balances.length ? Math.round(totalUtil / this.balances.length) : 0;
  }

  onYearChange():   void { this.currentPage = 1; this.loadBalances(); }
  onFilterChange(): void { this.currentPage = 1; this.loadBalances(); }

  clearFilters(): void {
    this.filters      = { pageNumber: 1, pageSize: 10, sortBy: 'year', sortDescending: true };
    this.selectedYear = new Date().getFullYear();
    this.currentPage  = 1;
    this.loadBalances();
  }

  get activeFilterCount(): number {
    return [
      this.filters.leaveTypeId,
      this.filters.isLowBalance !== undefined && this.filters.isLowBalance !== null,
      this.filters.minAvailableBalance != null,
      this.filters.maxAvailableBalance != null
    ].filter(Boolean).length;
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page; this.loadBalances();
  }

  onPageSizeChange(e: Event): void {
    this.pageSize    = +(e.target as HTMLSelectElement).value;
    this.currentPage = 1; this.loadBalances();
  }

  get pages(): number[] {
    const max = 5;
    let s = Math.max(1, this.currentPage - Math.floor(max / 2));
    const e = Math.min(this.totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }

  // ── Form modal ────────────────────────────────────────────────────
  createBalance(): void { this.formMode = 'create'; this.selectedBalanceId = null; this.showFormModal = true; }
  editBalance(b: LeaveBalance): void { this.formMode = 'edit'; this.selectedBalanceId = b.id; this.showFormModal = true; }
  closeFormModal(): void { this.showFormModal = false; this.selectedBalanceId = null; }
  onFormSuccess(): void { this.closeFormModal(); this.loadBalances(); }

  // ── Collective modal ──────────────────────────────────────────────
  openCollectiveModal():  void { this.showCollectiveModal = true; }
  closeCollectiveModal(): void { this.showCollectiveModal = false; }
  onCollectiveSuccess():  void { this.closeCollectiveModal(); this.loadBalances(); }

  // ── Adjust Balance modal ──────────────────────────────────────────
  adjustBalance(balance: LeaveBalance): void {
    this.adjustingBalance      = balance;
    this.adjustDays            = 0;
    this.adjustReason          = '';
    this.adjustLoading         = false;
    this.adjustValidationError = null;
    this.showAdjustModal       = true;
  }

  closeAdjustModal(): void {
    if (this.adjustLoading) return;
    this.showAdjustModal       = false;
    this.adjustingBalance      = null;
    this.adjustValidationError = null;
  }

  submitAdjustBalance(): void {
    this.adjustValidationError = null;
    const t = (k: string) => this.langService.t(k);

    if (!this.adjustDays || this.adjustDays === 0) {
      this.adjustValidationError = t('lb.adjust.errorZero');
      return;
    }
    if (!this.adjustReason?.trim()) {
      this.adjustValidationError = t('lb.adjust.errorReason');
      return;
    }
    if (this.adjustReason.trim().length < 5) {
      this.adjustValidationError = t('lb.adjust.errorReasonMin');
      return;
    }

    this.adjustLoading = true;
    const dto: AdjustLeaveBalanceDto = {
      adjustmentAmount: this.adjustDays,
      adjustmentReason: this.adjustReason.trim(),
      adjustmentType:   'Manual'
    };

    this.leaveBalanceService.adjustLeaveBalance(this.adjustingBalance!.id, dto).subscribe({
      next: (r) => {
        this.adjustLoading = false;
        if (r.success) {
          this.showAdjustModal  = false;
          this.adjustingBalance = null;
          Swal.fire({ title: t('lb.msg.adjusted'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadBalances();
        } else {
          this.adjustValidationError = r.message || t('lb.msg.adjustFailed');
        }
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.adjustLoading = false;
        this.adjustValidationError = e.error?.message || t('common.error');
        this.cdr.detectChanges();
      }
    });
  }

  // ── Recalculate ───────────────────────────────────────────────────
  async recalculateBalance(balance: LeaveBalance): Promise<void> {
    const t  = (k: string) => this.langService.t(k);
    const r  = await Swal.fire({
      title: t('lb.swal.recalcTitle'),
      html:  `${t('lb.swal.recalcHtml')} <strong>${balance.employeeName}</strong> — ${balance.leaveTypeName} (${balance.year})?`,
      icon:  'question', showCancelButton: true,
      confirmButtonColor: '#3b82f6', cancelButtonColor: '#6b7280',
      confirmButtonText: t('lb.swal.recalcBtn'),
      cancelButtonText:  t('common.no')
    });
    if (!r.isConfirmed) return;
    this.leaveBalanceService.recalculateBalance(balance.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: t('common.done'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadBalances();
        } else { Swal.fire(t('common.errorTitle'), res.message || t('lb.msg.recalcFailed'), 'error'); }
      },
      error: (e) => Swal.fire(t('common.errorTitle'), e.error?.message || t('common.error'), 'error')
    });
  }

  // ── Delete ────────────────────────────────────────────────────────
  async deleteBalance(balance: LeaveBalance): Promise<void> {
    const t  = (k: string) => this.langService.t(k);
    const r  = await Swal.fire({
      title: t('lb.swal.deleteTitle'),
      html:  `${t('lb.swal.deleteHtml')} <strong>${balance.employeeName}</strong> — ${balance.leaveTypeName} (${balance.year})?`,
      icon:  'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: t('common.yesDelete'),
      cancelButtonText:  t('common.no')
    });
    if (!r.isConfirmed) return;
    this.leaveBalanceService.deleteLeaveBalance(balance.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: t('common.deleted'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadBalances();
        } else { Swal.fire(t('common.errorTitle'), res.message || t('lb.msg.deleteFailed'), 'error'); }
      },
      error: (e) => Swal.fire(t('common.errorTitle'), e.error?.message || t('common.error'), 'error')
    });
  }

  // ── Init Employee ─────────────────────────────────────────────────
  async initializeEmployee(): Promise<void> {
    const t = (k: string) => this.langService.t(k);
    const { value: employeeId } = await Swal.fire({
      title:          t('lb.swal.initTitle'),
      input:          'text',
      inputLabel:     t('lb.swal.initInputLabel'),
      inputPlaceholder: t('lb.swal.initPlaceholder'),
      showCancelButton:  true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: t('lb.swal.initBtn'),
      cancelButtonText:  t('common.no'),
      inputValidator: (v) => !v ? t('lb.swal.initRequired') : null
    });
    if (!employeeId) return;
    this.leaveBalanceService.initializeBalanceForEmployee(employeeId, this.selectedYear).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: t('common.done'), text: t('lb.msg.initialized'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadBalances();
        } else { Swal.fire(t('common.errorTitle'), res.message || t('lb.msg.initFailed'), 'error'); }
      },
      error: (e) => Swal.fire(t('common.errorTitle'), e.error?.message || t('common.error'), 'error')
    });
  }

  // ── Export ────────────────────────────────────────────────────────
  exportToExcel(): void {
    const t = (k: string) => this.langService.t(k);
    if (!this.balances.length) {
      Swal.fire(t('lb.swal.noData'), t('lb.swal.nothingToExport'), 'info'); return;
    }
    Swal.fire({ title: t('lb.swal.exporting'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const data = this.balances.map(b => ({
      [t('lb.export.code')]:        b.employeeCode  || '',
      [t('lb.export.name')]:        b.employeeName  || '',
      [t('lb.export.leaveType')]:   b.leaveTypeName || '',
      [t('lb.export.year')]:        b.year,
      [t('lb.export.allocated')]:   b.totalAllocated,
      [t('lb.export.carried')]:     b.carriedForward,
      [t('lb.export.consumed')]:    b.consumed,
      [t('lb.export.available')]:   b.available,
      [t('lb.export.utilization')]: Math.round(b.utilizationPercentage),
      [t('lb.export.lowBalance')]:  b.isLowBalance ? t('common.yes') : t('common.no'),
      [t('lb.export.lastUpdated')]: new Date(b.lastUpdated).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [12, 22, 16, 8, 14, 14, 12, 12, 14, 12, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('lb.export.sheetName'));
    const fn = `LeaveBalances_${this.selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: t('common.done'), text: `${fn} downloaded.`, icon: 'success', timer: 2500, showConfirmButton: false });
  }
}