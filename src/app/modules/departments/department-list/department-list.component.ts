import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { DepartmentService } from '../../../core/services/api/department.api';
import {
  Department,
  DepartmentFilterRequest,
  PaginatedResponse
} from '../../../../app/core/Models/department.model';
import Swal from 'sweetalert2';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import { StatusCellRendererComponent } from '../../../shared/status-cell-renderer.component';
import { DepartmentFormComponent } from '../department-form/department-form.component';
import * as XLSX from 'xlsx';

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
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;
  
  
  // Filters
  searchTerm = '';
  isActiveFilter: boolean | null = null;
  rootLevelOnly = false;
  sortBy = 'DepartmentName';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // UI States
  showFilters = false;
  selectedDepartments: Set<string> = new Set();

  // Modal States
  showFormModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedDepartmentId: string | null = null;

  // AG Grid
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 100,
  };
  gridOptions: GridOptions = {
    pagination: false,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    domLayout: 'autoHeight',
    context: { componentParent: this }
  };

  // Make Math available in template
  Math = Math;

  constructor(
    private departmentService: DepartmentService,
    private router: Router
  ) {
    this.initializeColumnDefs();
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadStats();
  }

  initializeColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'ACTIONS',
        width: 150,
        cellRenderer: ActionCellRendererComponent,
        sortable: false,
        filter: false,
        pinned: 'left',
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'CODE',
        field: 'departmentCode',
        width: 140,
        cellClass: 'dept-code-cell',
        cellStyle: { 
          fontFamily: 'Monaco, Courier New, monospace',
          fontWeight: '600'
        }
      },
      {
        headerName: 'DEPARTMENT NAME',
        field: 'departmentName',
        width: 280,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const description = params.data.description 
            ? `<span class="dept-description">${params.data.description}</span>` 
            : '';
          return `
            <div class="dept-name-cell">
              <span class="dept-name">${params.value}</span>
              ${description}
            </div>
          `;
        }
      },
      {
        headerName: 'PARENT DEPARTMENT',
        field: 'parentDepartmentName',
        width: 200,
        valueFormatter: (params) => params.value || '—'
      },
      {
        headerName: 'HEAD OF DEPARTMENT',
        field: 'headOfDepartmentName',
        width: 220,
        valueFormatter: (params) => params.value || '—'
      },
      {
        headerName: 'EMPLOYEES',
        field: 'employeeCount',
        width: 120,
        type: 'numericColumn',
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: any) => {
          return `<span class="badge badge-info">${params.value || 0}</span>`;
        }
      },
      {
        headerName: 'SUB-DEPTS',
        field: 'childDepartmentCount',
        width: 120,
        type: 'numericColumn',
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: any) => {
          return `<span class="badge badge-secondary">${params.value || 0}</span>`;
        }
      },
      {
        headerName: 'STATUS',
        field: 'isActive',
        width: 120,
        cellRenderer: StatusCellRendererComponent,
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'CREATED',
        field: 'createdAt',
        width: 140,
        valueFormatter: (params) => {
          if (!params.value) return '—';
          const date = new Date(params.value);
          return date.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          });
        }
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    params.api.sizeColumnsToFit();
  }

  loadDepartments(): void {
    this.loading = true;
    this.error = null;

    const filter: DepartmentFilterRequest = {
      searchTerm: this.searchTerm || undefined,
      isActive: this.isActiveFilter ?? undefined,
      rootLevelOnly: this.rootLevelOnly || undefined,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    this.departmentService.getFilteredDepartments(filter).subscribe({
      next: (response) => {
        if (response.success) {
          this.departments = response.data.items;
          this.currentPage = response.data.pageNumber;
          this.pageSize = response.data.pageSize;
          this.totalPages = response.data.totalPages;
          this.totalCount = response.data.totalCount;
        } else {
          this.error = response.message || 'Failed to load departments';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'An error occurred while loading departments';
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    const statsFilter: DepartmentFilterRequest = {
      pageNumber: 1,
      pageSize: 10000, 
      sortBy: 'DepartmentName',
      sortDirection: 'asc'
    };

  }
  exportToExcel(): void {
    if (this.departments.length === 0) {
      Swal.fire({
        title: 'No Data',
        text: 'There are no departments to export.',
        icon: 'info',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    // Show loading
    Swal.fire({
      title: 'Exporting...',
      text: 'Please wait while we prepare your file.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Prepare data for export
    const exportData = this.departments.map(dept => ({
      'Department Code': dept.departmentCode,
      'Department Name': dept.departmentName,
      'Description': dept.description || '—',
      'Parent Department': dept.parentDepartmentName || '—',
      'Head of Department': dept.headOfDepartmentName || '—',
      'Employees': dept.employeeCount || 0,
      'Sub-Departments': dept.childDepartmentCount || 0,
      'Status': dept.isActive ? 'Active' : 'Inactive',
      'Display Order': dept.displayOrder || 0,
      'Created At': dept.createdAt ? new Date(dept.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '—',
      'Updated At': dept.updatedAt ? new Date(dept.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '—'
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const columnWidths = [
      { wch: 18 }, 
      { wch: 30 }, 
      { wch: 40 }, 
      { wch: 25 }, 
      { wch: 25 }, 
      { wch: 12 }, 
      { wch: 15 }, 
      { wch: 10 }, 
      { wch: 14 }, 
      { wch: 25 }, 
      { wch: 25 }  
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Departments');

    // Generate file name with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `Departments_Export_${timestamp}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, fileName);

    // Close loading and show success
    Swal.fire({
      title: 'Export Successful!',
      text: `File "${fileName}" has been downloaded.`,
      icon: 'success',
      confirmButtonColor: '#3b82f6',
      timer: 3000
    });
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadDepartments();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadDepartments();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadDepartments();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadDepartments();
  }

  onPageSizeChange(event: any): void {
    this.pageSize = parseInt(event.target.value, 10);
    this.currentPage = 1;
    this.loadDepartments();
  }

  viewDetails(department: Department): void {
    this.router.navigate(['/departments', department.departmentId]);
  }

  editDepartment(department: Department): void {
    this.formMode = 'edit';
    this.selectedDepartmentId = department.departmentId;
    this.showFormModal = true;
  }

  async toggleStatus(department: Department): Promise<void> {
    const action = department.isActive ? 'deactivate' : 'activate';
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to ${action} "${department.departmentName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it!`,
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      this.departmentService.toggleDepartmentStatus(department.departmentId).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire({
              title: 'Success!',
              text: `Department has been ${action}d successfully.`,
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              timer: 2000
            });
            this.loadDepartments();
            this.loadStats();
          } else {
            Swal.fire({
              title: 'Error!',
              text: response.message || 'Failed to update department status',
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: (err) => {
          Swal.fire({
            title: 'Error!',
            text: err.error?.message || 'An error occurred',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
  }

  async deleteDepartment(department: Department): Promise<void> {
    this.departmentService.canDeleteDepartment(department.departmentId).subscribe({
      next: async (canDeleteResponse) => {
        if (canDeleteResponse.success && canDeleteResponse.data) {
          const result = await Swal.fire({
            title: 'Are you sure?',
            html: `You are about to delete <strong>"${department.departmentName}"</strong>.<br>This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
          });

          if (result.isConfirmed) {
            this.departmentService.deleteDepartment(department.departmentId).subscribe({
              next: (response) => {
                if (response.success) {
                  Swal.fire({
                    title: 'Deleted!',
                    text: 'Department has been deleted successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 2000
                  });
                  this.loadDepartments();
                  this.loadStats();
                } else {
                  Swal.fire({
                    title: 'Error!',
                    text: response.message || 'Failed to delete department',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                  });
                }
              },
              error: (err) => {
                Swal.fire({
                  title: 'Error!',
                  text: err.error?.message || 'An error occurred',
                  icon: 'error',
                  confirmButtonColor: '#ef4444'
                });
              }
            });
          }
        } else {
          Swal.fire({
            title: 'Cannot Delete',
            text: 'This department cannot be deleted. It has employees or child departments assigned.',
            icon: 'warning',
            confirmButtonColor: '#3b82f6'
          });
        }
      },
      error: (err) => {
        Swal.fire({
          title: 'Error!',
          text: err.error?.message || 'An error occurred',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  createDepartment(): void {
    this.formMode = 'create';
    this.selectedDepartmentId = null;
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.selectedDepartmentId = null;
  }

  onFormSuccess(): void {
    this.closeFormModal();
    this.loadDepartments();
    this.loadStats();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.isActiveFilter = null;
    this.rootLevelOnly = false;
    this.currentPage = 1;
    this.loadDepartments();
  }

  get hasSelection(): boolean {
    return this.selectedDepartments.size > 0;
  }

  get pages(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }
}