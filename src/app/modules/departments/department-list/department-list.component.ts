import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewEncapsulation, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridOptions,
  GridReadyEvent,
  GridApi,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz
} from 'ag-grid-community';
import { DepartmentService } from '../../../core/services/api/department.api';
import {
  Department,
  DepartmentFilterRequest
} from '../../../../app/core/Models/department.model';
import Swal from 'sweetalert2';
import { DepartmentFormComponent } from '../department-form/department-form.component';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const deptGridTheme = themeQuartz.withParams({
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

interface StatCard {
  label: string;
  value: number;
  colorClass: string;
}

@Component({
  selector: 'app-department-list',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, AgGridAngular, DepartmentFormComponent],
  templateUrl: './department-list.component.html',
  styleUrls: ['./department-list.component.scss']
})
export class DepartmentListComponent implements OnInit, OnDestroy {

  @ViewChild(AgGridAngular, { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;

  readonly gridTheme = deptGridTheme;

  departments: Department[] = [];
  loading = false;
  error: string | null = null;

  statCards: StatCard[] = [];

  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  totalCount = 0;

  searchTerm = '';
  sortBy = 'DepartmentName';
  sortDirection: 'asc' | 'desc' = 'asc';

  showFormModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedDepartmentId: string | null = null;

  private gridApi!: GridApi;
  columnDefs: ColDef[] = [];
  private resizeObserver: ResizeObserver | null = null;

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    suppressFloatingFilterButton: false,
    flex: 1,
    minWidth: 80,
    suppressSizeToFit: false,
    suppressAutoSize: false
  };

  gridOptions: GridOptions = {
    pagination: false,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    domLayout: 'autoHeight',
    context: { componentParent: this },
    suppressCellFocus: true,
    suppressMovableColumns: false
  };

  Math = Math;

  constructor(
    private departmentService: DepartmentService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.buildColumnDefs();
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadStats();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  // ── Instantly push local array into grid 
  private refreshGrid(): void {
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', [...this.departments]);
      requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
    }
    this.cdr.detectChanges();
  }

  // ── Recalculate stat cards from local array 
  private recalcStats(): void {
    const total    = this.departments.length;
    const active   = this.departments.filter(d => d.isActive).length;
    const inactive = total - active;
    this.statCards = [
      { label: 'Total Departments', value: total,    colorClass: 'card-blue'  },
      { label: 'Active',            value: active,   colorClass: 'card-green' },
      { label: 'Inactive',          value: inactive, colorClass: 'card-red'   }
    ];
    this.cdr.detectChanges();
  }

  buildColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'Actions',
        width: 120,
        minWidth: 120,
        maxWidth: 120,
        sortable: false,
        filter: false,
        floatingFilter: false,
        suppressFloatingFilterButton: true,
        suppressSizeToFit: true,
        headerClass: 'actions-header-cell',
        cellStyle: { borderRight: '2px solid #d1d5db' },
        cellRenderer: (params: any) => {
          const el = document.createElement('div');
          el.className = 'dept-action-cell';
          const isActive = params.data?.isActive;
          el.innerHTML = `
            <button class="dept-act-btn dept-edit-btn" title="Edit" data-action="edit">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="dept-act-btn dept-power-btn ${isActive ? 'power-on' : 'power-off'}"
              title="${isActive ? 'Deactivate' : 'Activate'}" data-action="toggle">
              <i class="bi bi-power"></i>
            </button>
            <button class="dept-act-btn dept-del-btn" title="Delete" data-action="delete">
              <i class="bi bi-trash"></i>
            </button>
          `;
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
        headerName: 'Department Name',
        field: 'departmentName',
        minWidth: 180,
        flex: 2,
        cellRenderer: (p: any) =>
          `<span style="font-weight:600;color:#1f2937;">${p.value ?? ''}</span>`
      },
      {
        headerName: 'Code',
        field: 'departmentCode',
        minWidth: 90,
        flex: 1,
        cellRenderer: (p: any) =>
          `<span style="font-family:'Courier New',monospace;font-size:12px;font-weight:600;color:#475569;background:#f1f5f9;padding:2px 8px;border-radius:4px;">${p.value ?? ''}</span>`
      },
      {
        headerName: 'Employees',
        field: 'employeeCount',
        minWidth: 130,
        flex: 1,
        filter: 'agNumberColumnFilter',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: any) =>
          `<span style="background:#e0e7ff;color:#3730a3;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;white-space:nowrap;">${p.value ?? 0} Employee(s)</span>`
      },
      {
        headerName: 'Description',
        field: 'description',
        minWidth: 170,
        flex: 2,
        cellRenderer: (p: any) =>
          p.value
            ? `<span style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:100%;" title="${p.value}">${p.value}</span>`
            : `<span style="color:#9ca3af;">—</span>`
      },
      {
        headerName: 'Active',
        field: 'isActive',
        minWidth: 100,
        flex: 0.9,
        filter: false,
        floatingFilter: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: any) =>
          p.value
            ? `<span style="background:#dcfce7;color:#166534;font-size:12px;font-weight:600;padding:3px 12px;border-radius:999px;display:inline-block;">Active</span>`
            : `<span style="background:#fee2e2;color:#991b1b;font-size:12px;font-weight:600;padding:3px 12px;border-radius:999px;display:inline-block;">Inactive</span>`
      },
      {
        headerName: 'Created At',
        field: 'createdAt',
        minWidth: 170,
        flex: 1.2,
        filter: 'agDateColumnFilter',
        cellStyle: { color: '#6b7280', fontSize: '12px' },
        valueFormatter: (p) => {
          if (!p.value) return '—';
          const d    = new Date(p.value);
          const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
          return `${date}, ${time}`;
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const hostEl = this.agGridElement?.nativeElement;
    const container = (hostEl?.closest('.grid-card') as HTMLElement) ?? hostEl;

    if (container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.gridApi) {
          requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
        }
      });
      this.resizeObserver.observe(container);
    }
  }

  loadDepartments(): void {
    this.loading = true;
    this.error   = null;

    const filter: DepartmentFilterRequest = {
      searchTerm:    this.searchTerm || undefined,
      sortBy:        this.sortBy,
      sortDirection: this.sortDirection,
      pageNumber:    this.currentPage,
      pageSize:      this.pageSize
    };

    this.departmentService.getFilteredDepartments(filter).subscribe({
      next: (res) => {
        if (res.success) {
          this.departments = res.data.items;
          this.currentPage = res.data.pageNumber;
          this.pageSize    = res.data.pageSize;
          this.totalPages  = res.data.totalPages;
          this.totalCount  = res.data.totalCount;
          this.refreshGrid();
          this.recalcStats();
        } else {
          this.error = res.message || 'Failed to load departments';
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error   = err.error?.message || 'An error occurred';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadStats(): void {
    this.departmentService.getDepartmentStatistics().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const s = res.data;
          this.statCards = [
            { label: 'Total Departments', value: s['TotalDepartments']    ?? 0, colorClass: 'card-blue'  },
            { label: 'Active',            value: s['ActiveDepartments']   ?? 0, colorClass: 'card-green' },
            { label: 'Inactive',          value: s['InactiveDepartments'] ?? 0, colorClass: 'card-red'   }
          ];
          this.cdr.detectChanges();
        }
      },
      error: () => { this.statCards = []; }
    });
  }

  exportDepartments(): void {
    const exportData = this.departments.map(d => ({
      'Department Name': d.departmentName,
      'Code':            d.departmentCode,
      'Employees':       d.employeeCount ?? 0,
      'Description':     d.description   || '—',
      'Status':          d.isActive ? 'Active' : 'Inactive',
      'Created At':      d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB') : '—'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 35 }, { wch: 10 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Departments');
    XLSX.writeFile(wb, `Departments_${new Date().toISOString().slice(0, 10)}.xlsx`);
    Swal.fire({ icon: 'success', title: 'Exported!', text: 'Department data exported.', timer: 2000, showConfirmButton: false });
  }

  onSearch(): void         { this.currentPage = 1; this.loadDepartments(); }
  clearSearch(): void      { this.searchTerm = ''; this.currentPage = 1; this.loadDepartments(); }
  onPageChange(p: number)  { this.currentPage = p; this.loadDepartments(); }
  onPageSizeChange(e: any) { this.pageSize = +e.target.value; this.currentPage = 1; this.loadDepartments(); }

  editDepartment(dept: Department): void {
    this.formMode = 'edit';
    this.selectedDepartmentId = dept.departmentId;
    this.showFormModal = true;
  }

  async toggleStatus(dept: Department): Promise<void> {
    const action = dept.isActive ? 'deactivate' : 'activate';
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${action} "${dept.departmentName}"?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#3b82f6', cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it!`
    });

    if (result.isConfirmed) {
      const idx = this.departments.findIndex(d => d.departmentId === dept.departmentId);
      if (idx !== -1) {
        this.departments[idx] = { ...this.departments[idx], isActive: !dept.isActive };
        this.refreshGrid();
        this.recalcStats();
      }

      this.departmentService.toggleDepartmentStatus(dept.departmentId).subscribe({
        next: (res) => {
          if (res.success) {
            Swal.fire({ title: 'Success!', text: `Department ${action}d.`, icon: 'success', timer: 2000, showConfirmButton: false });
          } else {
            if (idx !== -1) {
              this.departments[idx] = { ...this.departments[idx], isActive: dept.isActive };
              this.refreshGrid();
              this.recalcStats();
            }
            Swal.fire({ title: 'Error!', text: res.message || 'Failed to update status', icon: 'error' });
          }
        },
        error: (err) => {
          if (idx !== -1) {
            this.departments[idx] = { ...this.departments[idx], isActive: dept.isActive };
            this.refreshGrid();
            this.recalcStats();
          }
          Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred', icon: 'error' });
        }
      });
    }
  }

  async deleteDepartment(dept: Department): Promise<void> {
    this.departmentService.canDeleteDepartment(dept.departmentId).subscribe({
      next: async (res) => {
        if (res.success && res.data) {
          const confirm = await Swal.fire({
            title: 'Are you sure?',
            html: `Delete <strong>"${dept.departmentName}"</strong>? This cannot be undone.`,
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
          });

          if (confirm.isConfirmed) {
            const idx = this.departments.findIndex(d => d.departmentId === dept.departmentId);
            if (idx !== -1) {
              this.departments.splice(idx, 1);
              this.totalCount = Math.max(0, this.totalCount - 1);
              this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
              this.refreshGrid();
              this.recalcStats();
            }

            this.departmentService.deleteDepartment(dept.departmentId).subscribe({
              next: (r) => {
                if (r.success) {
                  Swal.fire({ title: 'Deleted!', text: 'Department deleted.', icon: 'success', timer: 2000, showConfirmButton: false });
                } else {
                  if (idx !== -1) this.departments.splice(idx, 0, dept);
                  this.totalCount++;
                  this.totalPages = Math.ceil(this.totalCount / this.pageSize);
                  this.refreshGrid();
                  this.recalcStats();
                  Swal.fire({ title: 'Error!', text: r.message || 'Failed to delete', icon: 'error' });
                }
              },
              error: (err) => {
                if (idx !== -1) this.departments.splice(idx, 0, dept);
                this.totalCount++;
                this.totalPages = Math.ceil(this.totalCount / this.pageSize);
                this.refreshGrid();
                this.recalcStats();
                Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred', icon: 'error' });
              }
            });
          }
        } else {
          Swal.fire({ title: 'Cannot Delete', text: 'This department has employees assigned.', icon: 'warning', confirmButtonColor: '#3b82f6' });
        }
      }
    });
  }

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
      this.refreshGrid();
      this.recalcStats();
    } else {
      this.loadDepartments();
      this.loadStats();
    }
  }

  get pages(): number[] {
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end   = Math.min(this.totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}