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
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { LanguageService }  from '../../../core/services/api/language.api';
import { LeaveType, LeaveTypeFilterDto } from '../../../core/Models/leave-type.model';
import { PaginationManager, PagedResultDto } from '../../../core/Models/pagination.model';
import { LeaveTypeActionCellRendererComponent } from '../leave-type-action-cell-renderer.component';
import { LeaveTypeFormComponent } from '../leave-type-form/leave-type-form.component';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const leaveTypeGridTheme = themeQuartz.withParams({
  backgroundColor:                '#ffffff',
  foregroundColor:                '#374151',
  borderColor:                    '#e5e7eb',
  headerBackgroundColor:          '#ffffff',
  headerTextColor:                '#374151',
  oddRowBackgroundColor:          '#ffffff',
  rowHoverColor:                  '#f8faff',
  selectedRowBackgroundColor:     '#dbeafe',
  fontFamily:                     '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize:                       13,
  columnBorder:                   true,
  headerColumnBorder:             true,
  headerColumnBorderHeight:       '50%',
  headerColumnResizeHandleColor:  '#d1d5db',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth:  2,
  cellHorizontalPaddingScale:     0.75,
  headerFontWeight:               500,
  headerFontSize:                 13,
  rowBorder:                      true,
});

@Component({
  selector: 'app-leave-type-list',
  standalone: true,
  templateUrl: './leave-type-list.component.html',
  styleUrls: ['./leave-type-list.component.scss'],
  imports: [CommonModule, FormsModule, AgGridAngular, LeaveTypeFormComponent]
})
export class LeaveTypeListComponent implements OnInit, OnDestroy {

  readonly gridTheme = leaveTypeGridTheme;

  leaveTypes: LeaveType[] = [];
  gridApi!: GridApi;
  context = { componentParent: this };

  loading = false;
  error: string | null = null;

  paginationManager = new PaginationManager(1, 10);
  pagedResult: PagedResultDto<LeaveType> | null = null;
  pageSizeOptions = [5, 10, 20, 50, 100];

  activeCount       = 0;
  carryForwardCount = 0;
  requiresDocCount  = 0;

  searchTerm  = '';
  showFilters = false;
  filters: LeaveTypeFilterDto = {
    pageNumber: 1, pageSize: 10, sortBy: 'DisplayOrder', sortDescending: false
  };

  showFormModal        = false;
  formMode: 'create' | 'edit' = 'create';
  selectedLeaveTypeId: string | null = null;

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
    private leaveTypeService: LeaveTypeService,
    private cdr:              ChangeDetectorRef,
    public  langService:      LanguageService
  ) {}

  ngOnInit(): void {
    this.buildColumnDefs();
    this.loadLeaveTypes();

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
    const t      = (k: string) => this.langService.t(k);
    const locale = this.langService.currentLang === 'mr' ? 'mr-IN'
                 : this.langService.currentLang === 'hi' ? 'hi-IN' : 'en-GB';

    this.columnDefs = [
      {
        headerName: t('lt.col.actions'),
        width: 120, minWidth: 120, maxWidth: 130,
        sortable: false, filter: false, floatingFilter: false,
        suppressFloatingFilterButton: true,
        headerClass: 'lt-action-col',
        cellClass: 'lt-action-cell lt-action-col',
        cellStyle: { display: 'flex', alignItems: 'center', padding: '0' },
        cellRenderer: LeaveTypeActionCellRendererComponent,
        suppressSizeToFit: true
      },
      {
        headerName: t('lt.col.displayOrder'),
        field: 'displayOrder',
        width: 88, minWidth: 80,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' },
        cellRenderer: (p: any) =>
          `<span style="display:inline-flex;align-items:center;justify-content:center;
            width:26px;height:26px;background:#f1f5f9;border-radius:5px;
            font-size:12px;font-weight:600;color:#475569;font-family:inherit;">${p.value}</span>`
      },
      {
        headerName: t('lt.col.name'),
        field: 'name',
        width: 200, minWidth: 160,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => {
          const color = p.data?.color || '#3b82f6';
          const code  = p.data?.code  || '';
          return `<div style="display:flex;align-items:center;gap:8px;height:100%;">
            <span style="width:9px;height:9px;border-radius:50%;background:${color};
              flex-shrink:0;display:inline-block;"></span>
            <div style="display:flex;flex-direction:column;justify-content:center;gap:1px;">
              <span style="font-weight:600;font-size:13px;color:#111827;line-height:1.2;">${p.value}</span>
              <span style="font-size:11px;color:#9ca3af;font-family:monospace;letter-spacing:0.3px;">${code}</span>
            </div>
          </div>`;
        }
      },
      {
        headerName: t('lt.col.description'),
        field: 'description',
        width: 260, minWidth: 180,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => {
          if (!p.value) return '<span style="color:#d1d5db;font-size:13px;">—</span>';
          const txt = p.value.length > 55 ? p.value.substring(0, 55) + '…' : p.value;
          return `<span style="font-size:13px;color:#6b7280;">${txt}</span>`;
        }
      },
      {
        headerName: t('lt.col.maxDays'),
        field: 'maxDaysPerYear',
        width: 140, minWidth: 110,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) =>
          `<span style="display:inline-flex;align-items:center;padding:2px 10px;
            background:#dbeafe;color:#1d4ed8;border-radius:9999px;
            font-size:12px;font-weight:600;">${p.value} ${t('lt.form.daysUnit')}</span>`
      },
      {
        headerName: t('lt.col.carryForward'),
        field: 'isCarryForward',
        width: 115, minWidth: 100,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => !p.value
          ? `<span style="display:inline-flex;padding:2px 10px;background:#f3f4f6;color:#6b7280;
              border-radius:9999px;font-size:12px;font-weight:500;">${t('lt.status.no')}</span>`
          : `<span style="display:inline-flex;padding:2px 10px;background:#dcfce7;color:#15803d;
              border-radius:9999px;font-size:12px;font-weight:600;">${p.data?.maxCarryForwardDays} ${t('lt.form.daysUnit')}</span>`
      },
      {
        headerName: t('lt.col.requiresApproval'),
        field: 'requiresApproval',
        width: 115, minWidth: 100,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => p.value
          ? `<span style="display:inline-flex;padding:2px 10px;background:#dcfce7;color:#15803d;
              border-radius:9999px;font-size:12px;font-weight:600;">${t('lt.cell.required')}</span>`
          : `<span style="display:inline-flex;padding:2px 10px;background:#f3f4f6;color:#6b7280;
              border-radius:9999px;font-size:12px;font-weight:500;">${t('lt.cell.auto')}</span>`
      },
      {
        headerName: t('lt.col.requiresDocument'),
        field: 'requiresDocument',
        width: 115, minWidth: 100,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => p.value
          ? `<span style="display:inline-flex;padding:2px 10px;background:#dcfce7;color:#15803d;
              border-radius:9999px;font-size:12px;font-weight:600;">${t('lt.cell.required')}</span>`
          : `<span style="display:inline-flex;padding:2px 10px;background:#fef9c3;color:#854d0e;
              border-radius:9999px;font-size:12px;font-weight:500;">${t('lt.cell.optional')}</span>`
      },
      {
        headerName: t('lt.col.noticeDays'),
        field: 'minimumNoticeDays',
        width: 115, minWidth: 100,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => p.value > 0
          ? `<span style="display:inline-flex;padding:2px 10px;background:#dbeafe;color:#1d4ed8;
              border-radius:9999px;font-size:12px;font-weight:600;">${p.value} ${t('lt.form.daysUnit')}</span>`
          : `<span style="color:#d1d5db;font-size:13px;">${t('lt.cell.none')}</span>`
      },
      {
        headerName: t('lt.col.status'),
        field: 'isActive',
        width: 105, minWidth: 90,
        cellStyle: { display: 'flex', alignItems: 'center' },
        cellRenderer: (p: any) => p.value
          ? `<span style="display:inline-flex;padding:2px 12px;background:#dcfce7;color:#15803d;
              border-radius:9999px;font-size:12px;font-weight:600;">${t('lt.status.active')}</span>`
          : `<span style="display:inline-flex;padding:2px 12px;background:#fee2e2;color:#b91c1c;
              border-radius:9999px;font-size:12px;font-weight:600;">${t('lt.status.inactive')}</span>`
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
    const gridEl = document.querySelector('app-leave-type-list ag-grid-angular') as HTMLElement;
    if (gridEl && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleSizeColumnsToFit(50));
      this.resizeObserver.observe(gridEl);
    }
  }

  /* ── Pagination getters ── */
  get currentPage(): number  { return this.paginationManager.pageNumber; }
  get pageSize(): number     { return this.paginationManager.pageSize; }
  get totalPages(): number   { return this.pagedResult?.totalPages    ?? 0; }
  get totalCount(): number   { return this.pagedResult?.totalCount    ?? 0; }
  get hasNextPage(): boolean { return this.pagedResult?.hasNextPage   ?? false; }
  get hasPrevPage(): boolean { return this.pagedResult?.hasPreviousPage ?? false; }
  get showingFrom(): number  { return this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get showingTo(): number    { return Math.min(this.currentPage * this.pageSize, this.totalCount); }

  loadLeaveTypes(): void {
    this.loading = true; this.error = null;
    const filter: LeaveTypeFilterDto = {
      ...this.filters,
      searchTerm: this.searchTerm || undefined,
      pageNumber: this.paginationManager.pageNumber,
      pageSize:   this.paginationManager.pageSize
    };
    this.leaveTypeService.getFilteredLeaveTypes(filter).subscribe({
      next: (r) => {
        this.loading = false;
        if (r.success) {
          this.pagedResult = new PagedResultDto<LeaveType>({
            items: r.data.items, totalCount: r.data.totalCount,
            pageNumber: this.paginationManager.pageNumber,
            pageSize:   this.paginationManager.pageSize
          });
          this.leaveTypes = this.pagedResult.items;
          this.computeStats();
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.leaveTypes);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
        } else { this.error = r.message || this.langService.t('lt.msg.loadError'); }
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.loading = false;
        this.error = e.error?.message || this.langService.t('lt.msg.loadError');
        this.cdr.detectChanges();
      }
    });
  }

  computeStats(): void {
    this.activeCount       = this.leaveTypes.filter(lt => lt.isActive).length;
    this.carryForwardCount = this.leaveTypes.filter(lt => lt.isCarryForward).length;
    this.requiresDocCount  = this.leaveTypes.filter(lt => lt.requiresDocument).length;
  }

  onSearch(): void       { this.paginationManager.goToPage(1); this.loadLeaveTypes(); }
  onFilterChange(): void { this.paginationManager.goToPage(1); this.loadLeaveTypes(); }

  clearFilters(): void {
    this.searchTerm = '';
    this.filters    = { pageNumber: 1, pageSize: 10, sortBy: 'DisplayOrder', sortDescending: false };
    this.paginationManager.goToPage(1);
    this.loadLeaveTypes();
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.paginationManager.goToPage(page);
    this.loadLeaveTypes();
  }

  onPageSizeChange(size: number): void {
    this.paginationManager.setPageSize(Number(size));
    this.loadLeaveTypes();
  }

  createLeaveType():  void { this.formMode = 'create'; this.selectedLeaveTypeId = null; this.showFormModal = true; }
  editLeaveType(lt: LeaveType): void { this.formMode = 'edit'; this.selectedLeaveTypeId = lt.id; this.showFormModal = true; }
  closeFormModal():   void { this.showFormModal = false; this.selectedLeaveTypeId = null; }
  onFormSuccess():    void { this.closeFormModal(); this.loadLeaveTypes(); }

  async toggleStatus(lt: LeaveType): Promise<void> {
    const t      = (k: string) => this.langService.t(k);
    const action = lt.isActive ? t('lt.action.deactivate') : t('lt.action.activate');
    const r      = await Swal.fire({
      title: `${action}?`,
      html:  `${action} <strong>${lt.name}</strong>?`,
      icon:  'question', showCancelButton: true,
      confirmButtonColor: lt.isActive ? '#6366f1' : '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: `${t('common.yes')}, ${action}!`,
      cancelButtonText:  t('common.no')
    });
    if (!r.isConfirmed) return;
    this.leaveTypeService.toggleLeaveTypeStatus(lt.id, !lt.isActive).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: t('common.done'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaveTypes();
        } else { Swal.fire(t('common.errorTitle'), res.message || t('lt.swal.toggleFailed'), 'error'); }
      },
      error: (e) => Swal.fire(t('common.errorTitle'), e.error?.message || t('common.error'), 'error')
    });
  }

  async deleteLeaveType(lt: LeaveType): Promise<void> {
    const t = (k: string) => this.langService.t(k);
    const r = await Swal.fire({
      title: t('lt.swal.deleteTitle'),
      html:  `${t('lt.swal.deleteHtml')} <strong>${lt.name}</strong>?`,
      icon:  'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: t('common.yesDelete'),
      cancelButtonText:  t('common.no')
    });
    if (!r.isConfirmed) return;
    this.leaveTypeService.deleteLeaveType(lt.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: t('common.deleted'), icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaveTypes();
        } else { Swal.fire(t('common.errorTitle'), res.message || t('lt.swal.deleteFailed'), 'error'); }
      },
      error: (e) => Swal.fire(t('common.errorTitle'), e.error?.message || t('common.error'), 'error')
    });
  }

  exportToExcel(): void {
    const t = (k: string) => this.langService.t(k);
    if (!this.leaveTypes.length) {
      Swal.fire(t('lt.swal.noData'), t('lt.swal.nothingToExport'), 'info'); return;
    }
    Swal.fire({ title: t('lt.swal.exporting'), allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const data = this.leaveTypes.map(lt => ({
      [t('lt.col.displayOrder')]:       lt.displayOrder,
      [t('lt.col.name')]:               lt.name,
      [t('lt.col.code')]:               lt.code,
      [t('lt.col.description')]:        lt.description,
      [t('lt.col.maxDays')]:            lt.maxDaysPerYear,
      [t('lt.col.carryForward')]:       lt.isCarryForward ? t('common.yes') : t('common.no'),
      'Max Carry Forward Days':          lt.maxCarryForwardDays,
      [t('lt.col.requiresApproval')]:   lt.requiresApproval ? t('common.yes') : t('common.no'),
      [t('lt.col.requiresDocument')]:   lt.requiresDocument ? t('common.yes') : t('common.no'),
      [t('lt.col.noticeDays')]:         lt.minimumNoticeDays,
      [t('lt.col.status')]:             lt.isActive ? t('lt.status.active') : t('lt.status.inactive'),
      'Created': new Date(lt.createdAt).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [8, 20, 12, 35, 14, 14, 20, 16, 16, 14, 10, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('lt.title'));
    const fn = `LeaveTypes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: t('common.done'), text: `${fn} downloaded.`, icon: 'success', timer: 2500, showConfirmButton: false });
  }
}