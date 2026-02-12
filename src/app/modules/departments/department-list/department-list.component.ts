import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DepartmentService } from '../../../core/services/api/department.api';
import {
  Department,
  DepartmentFilterRequest,
  PaginatedResponse
} from '../../../../app/core/Models/department.model';

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Make Math available in template
  Math = Math;

  constructor(
    private departmentService: DepartmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
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

  onSearch(): void {
    this.currentPage = 1;
    this.loadDepartments();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadDepartments();
  }

  onSort(column: string): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }
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
    this.router.navigate(['/departments', 'edit', department.departmentId]);
  }

  async toggleStatus(department: Department): Promise<void> {
    if (confirm(`Are you sure you want to ${department.isActive ? 'deactivate' : 'activate'} this department?`)) {
      this.departmentService.toggleDepartmentStatus(department.departmentId).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadDepartments();
          } else {
            alert(response.message || 'Failed to update department status');
          }
        },
        error: (err) => {
          alert(err.error?.message || 'An error occurred');
        }
      });
    }
  }

  async deleteDepartment(department: Department): Promise<void> {
    // First check if can delete
    this.departmentService.canDeleteDepartment(department.departmentId).subscribe({
      next: (canDeleteResponse) => {
        if (canDeleteResponse.success && canDeleteResponse.data) {
          if (confirm(`Are you sure you want to delete "${department.departmentName}"?`)) {
            this.departmentService.deleteDepartment(department.departmentId).subscribe({
              next: (response) => {
                if (response.success) {
                  this.loadDepartments();
                } else {
                  alert(response.message || 'Failed to delete department');
                }
              },
              error: (err) => {
                alert(err.error?.message || 'An error occurred');
              }
            });
          }
        } else {
          alert('Cannot delete this department. It has employees or child departments.');
        }
      },
      error: (err) => {
        alert(err.error?.message || 'An error occurred');
      }
    });
  }

  createDepartment(): void {
    this.router.navigate(['/departments', 'create']);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.isActiveFilter = null;
    this.rootLevelOnly = false;
    this.currentPage = 1;
    this.loadDepartments();
  }

  toggleSelection(departmentId: string): void {
    if (this.selectedDepartments.has(departmentId)) {
      this.selectedDepartments.delete(departmentId);
    } else {
      this.selectedDepartments.add(departmentId);
    }
  }

  selectAll(): void {
    if (this.selectedDepartments.size === this.departments.length) {
      this.selectedDepartments.clear();
    } else {
      this.departments.forEach(dept => this.selectedDepartments.add(dept.departmentId));
    }
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