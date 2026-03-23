import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  ViewEncapsulation, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef, GridOptions, GridReadyEvent, GridApi,
  ModuleRegistry, AllCommunityModule, themeQuartz
} from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import { DepartmentService } from '../../../core/services/api/department.api';
import { LanguageService } from '../../../core/services/api/language.api';
import { Department, DepartmentFilterRequest } from '../../../../app/core/Models/department.model';
import Swal from 'sweetalert2';
import { DepartmentFormComponent } from '../department-form/department-form.component';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const deptGridTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff', foregroundColor: '#1f2937',
  borderColor: '#e5e7eb', headerBackgroundColor: '#f9fafb', headerTextColor: '#374151',
  oddRowBackgroundColor: '#ffffff', rowHoverColor: '#f8faff',
  selectedRowBackgroundColor: '#dbeafe',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize: 13, columnBorder: true, headerColumnBorder: true,
  headerColumnBorderHeight: '50%', headerColumnResizeHandleColor: '#9ca3af',
  headerColumnResizeHandleHeight: '50%', headerColumnResizeHandleWidth: 2,
  cellHorizontalPaddingScale: 0.8,
});

interface StatCard { label: string; value: number; colorClass: string; }

@Component({
  selector: 'app-department-list',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, AgGridAngular, DepartmentFormComponent],
  templateUrl: './department-list.component.html',
  styleUrls: ['./department-list.component.scss']
})
export class DepartmentListComponent implements OnInit, OnDestroy {

  @ViewChild(AgGridAngular, { read: ElementRef }) agGridElement!: ElementRef<HTMLElement>;

  readonly gridTheme = deptGridTheme;

  departments: Department[] = [];
  loading  = false;
  error: string | null = null;

  statCards: StatCard[] = [];

  currentPage = 1;
  pageSize    = 20;
  totalPages  = 0;
  totalCount  = 0;

  searchTerm     = '';
  sortBy         = 'DepartmentName';
  sortDirection: 'asc' | 'desc' = 'asc';

  showFormModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedDepartmentId: string | null = null;

  private gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private destroy$ = new Subject<void>();

  defaultColDef: ColDef = {
    sortable: true, resizable: true, filter: 'agTextColumnFilter',
    floatingFilter: true, flex: 1, minWidth: 80
  };

  gridOptions: GridOptions = {
    pagination: false, rowSelection: 'multiple',
    suppressRowClickSelection: true, domLayout: 'autoHeight',
    context: { componentParent: this }, suppressCellFocus: true
  };

  Math = Math;

  constructor(
    private departmentService: DepartmentService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public  langService: LanguageService
  ) {
    this.buildColumnDefs();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadDepartments();
    this.loadStats();

    // Rebuild column defs + refresh grid when language switches
    this.langService.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.buildColumnDefs();
      if (this.gridApi) this.gridApi.setGridOption('columnDefs', this.columnDefs);
      this.refreshGrid();
      this.recalcStats();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Returns the department name in the currently active language */
  private getDeptName(dept: any): string {
    if (!dept) return '';
    const lang = this.langService.currentLang;
    if (lang === 'en' && dept.departmentName)   return dept.departmentName;
    if (lang === 'hi' && dept.departmentNameHi) return dept.departmentNameHi;
    return dept.departmentNameMr || dept.departmentName || '';
  }

  /** Push local array into the grid without a full reload */
  private refreshGrid(): void {
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', [...this.departments]);
      requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
    }
    this.cdr.detectChanges();
  }

  /** Recalculate stat cards from local departments array */
  private recalcStats(): void {
    const total    = this.departments.length;
    const active   = this.departments.filter(d => d.isActive).length;
    const inactive = total - active;
    this.statCards = [
      { label: this.langService.t('dept.stats.total'),    value: total,    colorClass: 'card-blue'  },
      { label: this.langService.t('dept.stats.active'),   value: active,   colorClass: 'card-green' },
      { label: this.langService.t('dept.stats.inactive'), value: inactive, colorClass: 'card-red'   }
    ];
    this.cdr.detectChanges();
  }

  // ── Column Definitions ───────────────────────────────────────────────────────

  buildColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: this.langService.t('dept.col.actions'),
        width: 120, minWidth: 120, maxWidth: 120,
        sortable: false, filter: false, floatingFilter: false,
        suppressFloatingFilterButton: true, suppressSizeToFit: true,
        headerClass: 'actions-header-cell',
        cellStyle: { borderRight: '2px solid #d1d5db' },
        cellRenderer: (params: any) => {
          const el = document.createElement('div');
          el.className = 'dept-action-cell';
          const isActive = params.data?.isActive;
          el.innerHTML = `
            <button class="dept-act-btn dept-edit-btn" title="${this.langService.t('common.edit')}" data-action="edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="dept-act-btn dept-power-btn ${isActive ? 'power-on' : 'power-off'}"
              title="${isActive ? this.langService.t('common.deactivate') : this.langService.t('common.activate')}"
              data-action="toggle">
              <i class="bi bi-power"></i>
            </button>
            <button class="dept-act-btn dept-del-btn" title="${this.langService.t('common.delete')}" data-action="delete">
              <i class="bi bi-trash"></i>
            </button>`;
          el.addEventListener('click', (e: MouseEvent) => {
            const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
            if (!btn) return;
            const dept = params.data as Department;
            switch (btn.getAttribute('data-action')) {
              case 'edit':   this.editDepartment(dept);   break;
              case 'toggle': this.toggleStatus(dept);     break;
              case 'delete': this.deleteDepartment(dept); break;
            }
          });
          return el;
        }
      },
      {
        headerName: this.langService.t('dept.col.name'),
        field: 'departmentNameMr', minWidth: 180, flex: 2,
        cellRenderer: (p: any) => {
          const name   = this.getDeptName(p.data);
          const nameEn = p.data?.departmentName;
          return `<div>
            <span style="font-weight:600;color:#1f2937;">${name}</span>
            ${nameEn && name !== nameEn
              ? `<span style="font-size:11px;color:#9ca3af;margin-left:6px;">(${nameEn})</span>`
              : ''}
          </div>`;
        }
      },
      {
        headerName: this.langService.t('dept.col.code'),
        field: 'departmentCode', minWidth: 90, flex: 1,
        cellRenderer: (p: any) =>
          `<span style="font-family:'Courier New',monospace;font-size:12px;font-weight:600;
           color:#475569;background:#f1f5f9;padding:2px 8px;border-radius:4px;">${p.value ?? ''}</span>`
      },
      {
        headerName: this.langService.t('dept.col.employees'),
        field: 'employeeCount', minWidth: 130, flex: 1,
        filter: 'agNumberColumnFilter',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: any) =>
          `<span style="background:#e0e7ff;color:#3730a3;font-size:11px;font-weight:600;
           padding:3px 10px;border-radius:999px;white-space:nowrap;">
           ${p.value ?? 0} ${this.langService.t('dept.emp.count')}</span>`
      },
      {
        headerName: this.langService.t('dept.col.active'),
        field: 'isActive', minWidth: 100, flex: 0.9,
        filter: false, floatingFilter: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: any) => p.value
          ? `<span style="background:#dcfce7;color:#166534;font-size:12px;font-weight:600;
             padding:3px 12px;border-radius:999px;">${this.langService.t('dept.status.active')}</span>`
          : `<span style="background:#fee2e2;color:#991b1b;font-size:12px;font-weight:600;
             padding:3px 12px;border-radius:999px;">${this.langService.t('dept.status.inactive')}</span>`
      },
      {
        headerName: this.langService.t('dept.col.createdAt'),
        field: 'createdAt', minWidth: 170, flex: 1.2,
        cellStyle: { color: '#6b7280', fontSize: '12px' },
        valueFormatter: (p) => {
          if (!p.value) return '—';
          const locale = this.langService.currentLang === 'mr' ? 'mr-IN'
                       : this.langService.currentLang === 'hi' ? 'hi-IN' : 'en-GB';
          return new Date(p.value).toLocaleDateString(locale,
            { day: 'numeric', month: 'short', year: 'numeric' });
        }
      }
    ];
  }

  // ── Grid ─────────────────────────────────────────────────────────────────────

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
    const hostEl    = this.agGridElement?.nativeElement;
    const container = (hostEl?.closest('.grid-card') as HTMLElement) ?? hostEl;
    if (container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.gridApi) requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
      });
      this.resizeObserver.observe(container);
    }
  }

  // ── Data Loading ─────────────────────────────────────────────────────────────

  loadDepartments(): void {
    this.loading = true; this.error = null;
    const filter: DepartmentFilterRequest = {
      searchTerm: this.searchTerm || undefined, sortBy: this.sortBy,
      sortDirection: this.sortDirection, pageNumber: this.currentPage, pageSize: this.pageSize
    };
    this.departmentService.getFilteredDepartments(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.departments = res.data.items;
            this.currentPage = res.data.pageNumber;
            this.pageSize    = res.data.pageSize;
            this.totalPages  = res.data.totalPages;
            this.totalCount  = res.data.totalCount;
            this.refreshGrid();
            this.recalcStats();
          } else { this.error = res.message || this.langService.t('dept.msg.loadError'); }
          this.loading = false; this.cdr.detectChanges();
        },
        error: (err) => {
          this.error   = err.error?.message || this.langService.t('common.error');
          this.loading = false; this.cdr.detectChanges();
        }
      });
  }

  loadStats(): void {
    this.departmentService.getDepartmentStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const s = res.data;
            this.statCards = [
              { label: this.langService.t('dept.stats.total'),    value: s['TotalDepartments']    ?? 0, colorClass: 'card-blue'  },
              { label: this.langService.t('dept.stats.active'),   value: s['ActiveDepartments']   ?? 0, colorClass: 'card-green' },
              { label: this.langService.t('dept.stats.inactive'), value: s['InactiveDepartments'] ?? 0, colorClass: 'card-red'   }
            ];
            this.cdr.detectChanges();
          }
        },
        error: () => { this.statCards = []; }
      });
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  exportDepartments(): void {
    const exportData = this.departments.map(d => ({
      'विभागाचे नाव (मराठी)':      (d as any).departmentNameMr || '',
      'Department Name (English)': d.departmentName            || '',
      'Department Name (Hindi)':   (d as any).departmentNameHi || '',
      'कोड':       d.departmentCode,
      'कर्मचारी':  d.employeeCount ?? 0,
      'स्थिती':    d.isActive ? this.langService.t('dept.status.active') : this.langService.t('dept.status.inactive'),
      'तयार केले': d.createdAt ? new Date(d.createdAt).toLocaleDateString('mr-IN') : '—'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Departments');
    XLSX.writeFile(wb, `Departments_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Swal.fire({ icon: 'success', title: this.langService.t('common.exported'), text: this.langService.t('dept.msg.exported'), timer: 2000, showConfirmButton: false });
  }

  // ── Pagination & Search ───────────────────────────────────────────────────────

  onSearch(): void         { this.currentPage = 1; this.loadDepartments(); }
  clearSearch(): void      { this.searchTerm = ''; this.currentPage = 1; this.loadDepartments(); }
  onPageChange(p: number)  { this.currentPage = p; this.loadDepartments(); }
  onPageSizeChange(e: any) { this.pageSize = +e.target.value; this.currentPage = 1; this.loadDepartments(); }

  // ── CRUD Actions ─────────────────────────────────────────────────────────────

  editDepartment(dept: Department): void {
    this.formMode = 'edit'; this.selectedDepartmentId = dept.departmentId; this.showFormModal = true;
  }

  async toggleStatus(dept: Department): Promise<void> {
    const action = dept.isActive
      ? this.langService.t('common.deactivate')
      : this.langService.t('common.activate');

    const result = await Swal.fire({
      title: this.langService.t('common.confirmTitle'),
      text: `"${this.getDeptName(dept)}" ${action}?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#3b82f6', cancelButtonColor: '#6b7280',
      confirmButtonText: `${this.langService.t('common.yes')}, ${action}!`,
      cancelButtonText: this.langService.t('common.cancel')
    });
    if (!result.isConfirmed) return;

    const idx = this.departments.findIndex(d => d.departmentId === dept.departmentId);
    if (idx !== -1) {
      this.departments[idx] = { ...this.departments[idx], isActive: !dept.isActive };
      this.refreshGrid(); this.recalcStats();
    }

    this.departmentService.toggleDepartmentStatus(dept.departmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            Swal.fire({ title: this.langService.t('common.success'), text: this.langService.t('dept.msg.updated'), icon: 'success', timer: 2000, showConfirmButton: false });
          } else {
            if (idx !== -1) { this.departments[idx] = { ...this.departments[idx], isActive: dept.isActive }; this.refreshGrid(); this.recalcStats(); }
            Swal.fire({ title: this.langService.t('common.errorTitle'), text: res.message || this.langService.t('common.error'), icon: 'error' });
          }
        },
        error: (err) => {
          if (idx !== -1) { this.departments[idx] = { ...this.departments[idx], isActive: dept.isActive }; this.refreshGrid(); this.recalcStats(); }
          Swal.fire({ title: this.langService.t('common.errorTitle'), text: err.error?.message || this.langService.t('common.error'), icon: 'error' });
        }
      });
  }

  async deleteDepartment(dept: Department): Promise<void> {
    this.departmentService.canDeleteDepartment(dept.departmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (res) => {
          if (res.success && res.data) {
            const confirm = await Swal.fire({
              title: this.langService.t('common.deleteTitle'),
              html: `<strong>"${this.getDeptName(dept)}"</strong> ${this.langService.t('dept.msg.deleteConfirm')}`,
              icon: 'warning', showCancelButton: true,
              confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
              confirmButtonText: this.langService.t('common.yesDelete'),
              cancelButtonText: this.langService.t('common.cancel')
            });
            if (!confirm.isConfirmed) return;

            const idx = this.departments.findIndex(d => d.departmentId === dept.departmentId);
            if (idx !== -1) {
              this.departments.splice(idx, 1);
              this.totalCount = Math.max(0, this.totalCount - 1);
              this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
              this.refreshGrid(); this.recalcStats();
            }

            this.departmentService.deleteDepartment(dept.departmentId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (r) => {
                  if (r.success) {
                    Swal.fire({ title: this.langService.t('common.deleted'), text: this.langService.t('dept.msg.deleted'), icon: 'success', timer: 2000, showConfirmButton: false });
                  } else {
                    if (idx !== -1) this.departments.splice(idx, 0, dept);
                    this.totalCount++; this.totalPages = Math.ceil(this.totalCount / this.pageSize);
                    this.refreshGrid(); this.recalcStats();
                    Swal.fire({ title: this.langService.t('common.errorTitle'), text: r.message || this.langService.t('common.error'), icon: 'error' });
                  }
                },
                error: (err) => {
                  if (idx !== -1) this.departments.splice(idx, 0, dept);
                  this.totalCount++; this.totalPages = Math.ceil(this.totalCount / this.pageSize);
                  this.refreshGrid(); this.recalcStats();
                  Swal.fire({ title: this.langService.t('common.errorTitle'), text: err.error?.message || this.langService.t('common.error'), icon: 'error' });
                }
              });
          } else {
            Swal.fire({ title: this.langService.t('dept.msg.cannotDeleteTitle'), text: this.langService.t('dept.msg.cannotDelete'), icon: 'warning', confirmButtonColor: '#3b82f6' });
          }
        }
      });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────────

  createDepartment(): void { this.formMode = 'create'; this.selectedDepartmentId = null; this.showFormModal = true; }
  closeFormModal(): void   { this.showFormModal = false; this.selectedDepartmentId = null; }

  onFormSuccess(savedDept?: Department): void {
    this.closeFormModal();
    if (savedDept) {
      if (this.formMode === 'edit') {
        const idx = this.departments.findIndex(d => d.departmentId === savedDept.departmentId);
        if (idx !== -1) this.departments[idx] = savedDept;
      } else {
        this.departments.unshift(savedDept);
        this.totalCount++;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);
      }
      this.refreshGrid(); this.recalcStats();
    } else {
      this.loadDepartments(); this.loadStats();
    }
  }

  get pages(): number[] {
    const max = 5;
    let s = Math.max(1, this.currentPage - Math.floor(max / 2));
    const e = Math.min(this.totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }
}