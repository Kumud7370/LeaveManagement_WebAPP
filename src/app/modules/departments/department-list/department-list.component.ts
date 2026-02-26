import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import { DepartmentService } from '../../../core/services/api/department.api';
import {
  Department,
  DepartmentFilterRequest
} from '../../../../app/core/Models/department.model';
import Swal from 'sweetalert2';
import { DepartmentFormComponent } from '../department-form/department-form.component';
import * as XLSX from 'xlsx';

interface StatCard {
  label: string;
  value: number;
  colorClass: string;
}

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, DepartmentFormComponent],
  templateUrl: './department-list.component.html',
  styleUrls: ['./department-list.component.scss']
})
export class DepartmentListComponent implements OnInit {

  departments: Department[] = [];
  loading = false;
  error: string | null = null;

  // Stat cards
  statCards: StatCard[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;

  // Filters
  searchTerm = '';
  sortBy = 'DepartmentName';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Modal
  showFormModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedDepartmentId: string | null = null;

  // Grid
  private gridApi!: GridApi;
  columnDefs: ColDef[] = [];

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    filter: 'agTextColumnFilter',
    floatingFilter: true,
    suppressFloatingFilterButton: false,
    flex: 1,
    minWidth: 80
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
    private router: Router
  ) {
    this.buildColumnDefs();
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadStats();
  }

  buildColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'Actions',
        width: 155,
        minWidth: 155,
        maxWidth: 155,
        sortable: false,
        filter: false,
        floatingFilter: false,
        pinned: 'left',
        cellRenderer: (params: any) => {
          const el = document.createElement('div');
          el.className = 'action-cell';
          const isActive = params.data?.isActive;
          el.innerHTML = `
            <button class="act-btn view-btn"   title="View"   data-action="view"><i class="bi bi-eye"></i></button>
            <button class="act-btn edit-btn"   title="Edit"   data-action="edit"><i class="bi bi-pencil"></i></button>
            <button class="act-btn power-btn ${isActive ? 'power-on' : 'power-off'}" title="${isActive ? 'Deactivate' : 'Activate'}" data-action="toggle"><i class="bi bi-power"></i></button>
            <button class="act-btn del-btn"    title="Delete" data-action="delete"><i class="bi bi-trash"></i></button>
          `;
          el.addEventListener('click', (e: MouseEvent) => {
            const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
            if (!btn) return;
            const dept = params.data as Department;
            switch (btn.getAttribute('data-action')) {
              case 'view':   this.viewDetails(dept); break;
              case 'edit':   this.editDepartment(dept); break;
              case 'toggle': this.toggleStatus(dept); break;
              case 'delete': this.deleteDepartment(dept); break;
            }
          });
          return el;
        }
      },
      {
        headerName: 'Department Name',
        field: 'departmentName',
        minWidth: 200,
        flex: 2,
        cellRenderer: (p: any) => `<span class="cell-name">${p.value ?? ''}</span>`
      },
      {
        headerName: 'Code',
        field: 'departmentCode',
        minWidth: 100,
        flex: 1,
        cellRenderer: (p: any) => `<span class="cell-code">${p.value ?? ''}</span>`
      },
      {
        headerName: 'Parent Dept',
        field: 'parentDepartmentName',
        minWidth: 140,
        flex: 1.5,
        valueFormatter: (p) => p.value || '—'
      },
      {
        headerName: 'Head of Dept',
        field: 'headOfDepartmentName',
        minWidth: 150,
        flex: 1.5,
        valueFormatter: (p) => p.value || '—'
      },
      {
        headerName: 'Employees',
        field: 'employeeCount',
        minWidth: 120,
        flex: 1,
        filter: 'agNumberColumnFilter',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: any) => `<span class="cell-emp">${p.value ?? 0} Employee(s)</span>`
      },
      {
        headerName: 'Description',
        field: 'description',
        minWidth: 180,
        flex: 2,
        cellRenderer: (p: any) =>
          p.value
            ? `<span class="cell-desc" title="${p.value}">${p.value}</span>`
            : `<span class="cell-dash">—</span>`
      },
      {
        headerName: 'Active',
        field: 'isActive',
        minWidth: 90,
        flex: 0.9,
        filter: false,
        floatingFilter: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (p: any) =>
          `<span class="cell-status ${p.value ? 'is-active' : 'is-inactive'}">${p.value ? 'Active' : 'Inactive'}</span>`
      },
      {
        headerName: 'Created At',
        field: 'createdAt',
        minWidth: 170,
        flex: 1.2,
        filter: 'agDateColumnFilter',
        valueFormatter: (p) => {
          if (!p.value) return '—';
          const d = new Date(p.value);
          const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
          return `${date}, ${time}`;
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  loadDepartments(): void {
    this.loading = true;
    this.error = null;

    const filter: DepartmentFilterRequest = {
      searchTerm: this.searchTerm || undefined,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    this.departmentService.getFilteredDepartments(filter).subscribe({
      next: (res) => {
        if (res.success) {
          this.departments = res.data.items;
          this.currentPage = res.data.pageNumber;
          this.pageSize    = res.data.pageSize;
          this.totalPages  = res.data.totalPages;
          this.totalCount  = res.data.totalCount;
        } else {
          this.error = res.message || 'Failed to load departments';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'An error occurred';
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    this.departmentService.getDepartmentStatistics().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const stats = res.data;
          this.statCards = [
            { label: 'TOTAL DEPARTMENTS', value: stats['TotalDepartments'] ?? 0, colorClass: 'card-blue'  },
            { label: 'ACTIVE',            value: stats['ActiveDepartments'] ?? 0, colorClass: 'card-green' },
            { label: 'INACTIVE',          value: stats['InactiveDepartments'] ?? 0, colorClass: 'card-red' }
          ];
        }
      },
      error: () => { this.statCards = []; }
    });
  }

  // ── Export to Excel ────────────────────────────────────────────────────────
  exportDepartments(): void {
    const exportData = this.departments.map(d => ({
      'Department Name': d.departmentName,
      'Code':            d.departmentCode,
      'Parent Dept':     d.parentDepartmentName || '—',
      'Head of Dept':    d.headOfDepartmentName || '—',
      'Employees':       d.employeeCount ?? 0,
      'Description':     d.description || '—',
      'Status':          d.isActive ? 'Active' : 'Inactive',
      'Created At':      d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB') : '—'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 20 },
      { wch: 20 }, { wch: 12 }, { wch: 35 },
      { wch: 10 }, { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Departments');

    const fileName = `Departments_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  onSearch(): void { this.currentPage = 1; this.loadDepartments(); }
  clearSearch(): void { this.searchTerm = ''; this.currentPage = 1; this.loadDepartments(); }
  onPageChange(p: number): void { this.currentPage = p; this.loadDepartments(); }
  onPageSizeChange(e: any): void { this.pageSize = +e.target.value; this.currentPage = 1; this.loadDepartments(); }

  viewDetails(dept: Department): void {
    this.router.navigate(['/departments', dept.departmentId]);
  }

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
      this.departmentService.toggleDepartmentStatus(dept.departmentId).subscribe({
        next: (res) => {
          if (res.success) {
            Swal.fire({ title: 'Success!', text: `Department ${action}d.`, icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
            this.loadDepartments(); this.loadStats();
          }
        },
        error: (err) => Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred', icon: 'error', confirmButtonColor: '#ef4444' })
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
            this.departmentService.deleteDepartment(dept.departmentId).subscribe({
              next: (r) => {
                if (r.success) {
                  Swal.fire({ title: 'Deleted!', text: 'Department deleted.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
                  this.loadDepartments(); this.loadStats();
                }
              }
            });
          }
        } else {
          Swal.fire({ title: 'Cannot Delete', text: 'This department has employees or sub-departments.', icon: 'warning', confirmButtonColor: '#3b82f6' });
        }
      }
    });
  }

  createDepartment(): void {
    this.formMode = 'create';
    this.selectedDepartmentId = null;
    this.showFormModal = true;
  }

  closeFormModal(): void { this.showFormModal = false; this.selectedDepartmentId = null; }
  onFormSuccess(): void { this.closeFormModal(); this.loadDepartments(); this.loadStats(); }

  get pages(): number[] {
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    let end   = Math.min(this.totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}