import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { EmployeeService } from '../../../../app/core/services/api/employee.api';
import {
    EmployeeResponseDto,
    EmployeeFilterDto,
    PagedResultDto,
    EmployeeStatus,
    EmploymentType,
    Gender
} from '../../../core/Models/employee.model';

@Component({
    selector: 'app-employee-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './employee-list.component.html',
    styles: [`
      .employee-list-container {
        padding: 2rem;
        max-width: 100%;
        margin: 0 auto;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 2px solid #e5e7eb;
      }

      .page-header .header-content .page-title {
        font-size: 2rem;
        font-weight: 700;
        color: #111827;
        margin: 0 0 0.5rem 0;
      }

      .page-header .header-content .page-subtitle {
        font-size: 0.95rem;
        color: #6b7280;
        margin: 0;
      }

      .filters-section {
        display: flex;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .filters-section .search-bar {
        position: relative;
        flex: 1;
        min-width: 300px;
      }

      .filters-section .search-bar i.fas.fa-search {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
        font-size: 1rem;
      }

      .filters-section .search-bar .search-input {
        width: 100%;
        padding: 0.75rem 3rem 0.75rem 2.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        font-size: 0.95rem;
        transition: all 0.2s;
      }

      .filters-section .search-bar .search-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .filters-section .search-bar .clear-btn {
        position: absolute;
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.25rem;
      }

      .filters-section .search-bar .clear-btn:hover {
        background: #f3f4f6;
        color: #6b7280;
      }

      .filter-badge {
        background: #3b82f6;
        color: white;
        font-size: 0.7rem;
        padding: 0.15rem 0.5rem;
        border-radius: 1rem;
        margin-left: 0.5rem;
      }

      .advanced-filters {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .advanced-filters .filter-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .advanced-filters .filter-grid .filter-item label {
        display: block;
        font-size: 0.85rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.5rem;
      }

      .advanced-filters .filter-grid .filter-item .filter-select {
        width: 100%;
        padding: 0.625rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.9rem;
        background: white;
        transition: all 0.2s;
      }

      .advanced-filters .filter-grid .filter-item .filter-select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .btn {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        border: none;
      }

      .btn.btn-primary {
        background: #3b82f6;
        color: white;
      }

      .btn.btn-primary:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      }

      .btn.btn-primary:active {
        transform: translateY(0);
      }

      .btn.btn-outline {
        background: white;
        color: #374151;
        border: 2px solid #e5e7eb;
      }

      .btn.btn-outline:hover {
        border-color: #3b82f6;
        color: #3b82f6;
      }

      .btn.btn-text {
        background: none;
        color: #3b82f6;
        padding: 0.5rem 1rem;
      }

      .btn.btn-text:hover {
        background: #eff6ff;
      }

      .loading-state {
        text-align: center;
        padding: 4rem 2rem;
      }

      .loading-state .spinner {
        width: 3rem;
        height: 3rem;
        border: 3px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        margin: 0 auto 1rem;
        animation: spin 0.8s linear infinite;
      }

      .loading-state p {
        color: #6b7280;
        font-size: 1rem;
        margin-top: 1rem;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .table-container {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        overflow-x: auto;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .employees-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 1400px;
      }

      .employees-table thead {
        background: #f9fafb;
        border-bottom: 2px solid #e5e7eb;
      }

      .employees-table thead th {
        padding: 1rem;
        text-align: left;
        font-size: 0.85rem;
        font-weight: 700;
        color: #374151;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }

      .employees-table thead th.sortable {
        cursor: pointer;
        user-select: none;
      }

      .employees-table thead th.sortable:hover {
        color: #3b82f6;
      }

      .employees-table thead th.sortable i {
        margin-left: 0.25rem;
        font-size: 0.75rem;
        opacity: 0.5;
      }

      .employees-table thead th.text-center {
        text-align: center;
      }

      .employees-table tbody tr {
        border-bottom: 1px solid #e5e7eb;
        transition: background 0.15s;
      }

      .employees-table tbody tr:hover {
        background: #f9fafb;
      }

      .employees-table tbody td {
        padding: 1rem;
        font-size: 0.9rem;
        color: #374151;
        vertical-align: middle;
      }

      .employee-code {
        font-family: 'Monaco', 'Courier New', monospace;
        background: #f3f4f6;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: #1f2937;
      }

      .employee-name-cell {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .avatar {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
      }

      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar.avatar-placeholder {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.9rem;
      }

      .employee-name {
        font-weight: 600;
        color: #111827;
      }

      .email-link {
        color: #3b82f6;
        text-decoration: none;
      }

      .email-link:hover {
        text-decoration: underline;
      }

      .text-regular {
        color: #374151;
      }

      .date-text {
        color: #6b7280;
        font-size: 0.85rem;
      }

      .badge {
        display: inline-block;
        padding: 0.35rem 0.85rem;
        border-radius: 1rem;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .badge.badge-primary {
        background: #dbeafe;
        color: #1e40af;
      }

      .badge.badge-success {
        background: #d1fae5;
        color: #065f46;
      }

      .badge.badge-danger {
        background: #fee2e2;
        color: #991b1b;
      }

      .badge.badge-warning {
        background: #fef3c7;
        color: #92400e;
      }

      .badge.badge-info {
        background: #dbeafe;
        color: #1e40af;
      }

      .badge.badge-secondary {
        background: #f3f4f6;
        color: #4b5563;
      }

      .badge.badge-light {
        background: #f9fafb;
        color: #6b7280;
        border: 1px solid #e5e7eb;
      }

      .status-badge {
        display: inline-block;
        padding: 0.35rem 0.85rem;
        border-radius: 1rem;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .status-badge.badge-success {
        background: #d1fae5;
        color: #065f46;
      }

      .status-badge.badge-danger {
        background: #fee2e2;
        color: #991b1b;
      }

      .status-badge.badge-warning {
        background: #fef3c7;
        color: #92400e;
      }

      .status-badge.badge-info {
        background: #dbeafe;
        color: #1e40af;
      }

      .status-badge.badge-secondary {
        background: #f3f4f6;
        color: #4b5563;
      }

      .actions-cell .action-buttons {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
      }

      .btn-icon {
        width: 2rem;
        height: 2rem;
        border: none;
        background: #f3f4f6;
        border-radius: 0.375rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        transition: all 0.2s;
      }

      .btn-icon:hover {
        background: #3b82f6;
        color: white;
        transform: scale(1.1);
      }

      .btn-icon.btn-danger:hover {
        background: #ef4444;
      }

      .empty-state {
        text-align: center;
        padding: 4rem 2rem;
      }

      .empty-state i {
        font-size: 4rem;
        color: #d1d5db;
        margin-bottom: 1rem;
      }

      .empty-state h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin: 0 0 0.5rem 0;
      }

      .empty-state p {
        color: #6b7280;
        margin: 0 0 1.5rem 0;
      }

      .pagination-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1.5rem;
        padding: 1rem 0;
      }

      .pagination-info {
        font-size: 0.9rem;
        color: #6b7280;
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .page-size-select {
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.85rem;
        background: white;
        cursor: pointer;
      }

      .page-size-select:focus {
        outline: none;
        border-color: #3b82f6;
      }

      .pagination-buttons {
        display: flex;
        gap: 0.25rem;
      }

      .btn-page {
        min-width: 2.25rem;
        height: 2.25rem;
        padding: 0.25rem 0.5rem;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        color: #374151;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-page:hover:not(:disabled) {
        border-color: #3b82f6;
        color: #3b82f6;
        background: #eff6ff;
      }

      .btn-page.active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      .btn-page:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-page.ellipsis {
        border: none;
        background: transparent;
        cursor: default;
      }

      .btn-page.ellipsis:hover {
        background: transparent;
        border: none;
      }

      .text-center {
        text-align: center;
      }

      @media (max-width: 1024px) {
        .employee-list-container {
          padding: 1rem;
        }

        .page-header {
          flex-direction: column;
          gap: 1rem;
          align-items: flex-start;
        }
      }

      @media (max-width: 768px) {
        .pagination-container {
          flex-direction: column;
          gap: 1rem;
          align-items: flex-start !important;
        }
      }
    `]
})
export class EmployeeListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    employees: EmployeeResponseDto[] = [];
    isLoading = false;
    isFilterVisible = false;

    Math = Math;

    // Pagination
    currentPage = 1;
    pageSize = 10;
    totalItems = 0;
    totalPages = 0;

    // Filter model
    filter: EmployeeFilterDto = {
        searchTerm: '',
        departmentId: '',
        designationId: '',
        managerId: '',
        employeeStatus: undefined,
        employmentType: undefined,
        gender: undefined,
        joiningDateFrom: undefined,
        joiningDateTo: undefined,
        pageNumber: 1,
        pageSize: 10,
        sortBy: 'EmployeeCode',
        sortDescending: false
    };

    // Enums for dropdowns
    EmployeeStatus = EmployeeStatus;
    EmploymentType = EmploymentType;
    Gender = Gender;

    // Enum keys for iteration (numeric enums)
    employeeStatusKeys: number[];
    employmentTypeKeys: number[];
    genderKeys: number[];

    constructor(
        private employeeService: EmployeeService,
        private router: Router
    ) {
        // Initialize enum keys (filter out string keys for numeric enums)
        this.employeeStatusKeys = Object.keys(EmployeeStatus)
            .filter(key => !isNaN(Number(key)))
            .map(key => Number(key));
        
        this.employmentTypeKeys = Object.keys(EmploymentType)
            .filter(key => !isNaN(Number(key)))
            .map(key => Number(key));
        
        this.genderKeys = Object.keys(Gender)
            .filter(key => !isNaN(Number(key)))
            .map(key => Number(key));
    }

    ngOnInit(): void {
        console.log('Employee List Component Initialized');
        this.loadEmployees();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadEmployees(): void {
        this.isLoading = true;
        this.filter.pageNumber = this.currentPage;
        this.filter.pageSize = this.pageSize;

        console.log('Loading employees with filter:', this.filter);

        this.employeeService.getFilteredEmployees(this.filter)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (result: PagedResultDto<EmployeeResponseDto>) => {
                    console.log('Employee data received:', result);
                    this.employees = result.items || [];
                    this.totalItems = result.totalCount || 0;
                    this.totalPages = result.totalPages || 0;
                    this.isLoading = false;
                    console.log(`Loaded ${this.employees.length} employees`);
                },
                error: (error) => {
                    console.error('Error loading employees:', error);
                    this.isLoading = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to load employees. Please try again.',
                        confirmButtonColor: '#3b82f6'
                    });
                }
            });
    }

    // Filter operations
    toggleFilter(): void {
        this.isFilterVisible = !this.isFilterVisible;
    }

    applyFilter(): void {
        this.currentPage = 1;
        this.loadEmployees();
    }

    resetFilter(): void {
        this.filter = {
            searchTerm: '',
            departmentId: '',
            designationId: '',
            managerId: '',
            employeeStatus: undefined,
            employmentType: undefined,
            gender: undefined,
            joiningDateFrom: undefined,
            joiningDateTo: undefined,
            pageNumber: 1,
            pageSize: 10,
            sortBy: 'EmployeeCode',
            sortDescending: false
        };
        this.currentPage = 1;
        this.pageSize = 10;
        this.loadEmployees();
    }

    onSearchChange(): void {
        const searchTerm = this.filter.searchTerm || '';
        if (searchTerm.length === 0 || searchTerm.length >= 3) {
            this.currentPage = 1;
            this.loadEmployees();
        }
    }

    // Pagination
    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadEmployees();
        }
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadEmployees();
        }
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadEmployees();
        }
    }

    changePageSize(event: any): void {
        this.pageSize = parseInt(event.target.value);
        this.currentPage = 1;
        this.loadEmployees();
    }

    // Sorting
    sortBy(column: string): void {
        if (this.filter.sortBy === column) {
            this.filter.sortDescending = !this.filter.sortDescending;
        } else {
            this.filter.sortBy = column;
            this.filter.sortDescending = false;
        }
        this.loadEmployees();
    }

    // Navigation
    viewEmployee(id: string): void {
        this.router.navigate(['/employees', id]);
    }

    editEmployee(id: string): void {
        this.router.navigate(['/employees', 'edit', id]);
    }

    addNewEmployee(): void {
        this.router.navigate(['/employees', 'create']);
    }

    // Delete employee
    deleteEmployee(employee: EmployeeResponseDto): void {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete employee "${employee?.fullName || 'this employee'}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed && employee?.id) {
                this.performDelete(employee.id);
            }
        });
    }

    private performDelete(id: string): void {
        this.employeeService.deleteEmployee(id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: 'Employee has been deleted successfully.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    this.loadEmployees();
                },
                error: (error) => {
                    console.error('Error deleting employee:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to delete employee. Please try again.',
                        confirmButtonColor: '#3b82f6'
                    });
                }
            });
    }

    // Helper methods
    getStatusBadgeClass(status: EmployeeStatus): string {
        switch (status) {
            case EmployeeStatus.Active:
                return 'badge-success';
            case EmployeeStatus.Inactive:
                return 'badge-secondary';
            case EmployeeStatus.OnLeave:
                return 'badge-info';
            case EmployeeStatus.Suspended:
                return 'badge-warning';
            case EmployeeStatus.Terminated:
            case EmployeeStatus.Resigned:
                return 'badge-danger';
            default:
                return 'badge-secondary';
        }
    }

    getEmploymentTypeBadgeClass(type: EmploymentType): string {
        switch (type) {
            case EmploymentType.FullTime:
                return 'badge-primary';
            case EmploymentType.PartTime:
                return 'badge-info';
            case EmploymentType.Contract:
                return 'badge-warning';
            case EmploymentType.Intern:
                return 'badge-secondary';
            case EmploymentType.Temporary:
                return 'badge-light';
            default:
                return 'badge-secondary';
        }
    }

    formatDate(date: Date | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getEnumName(key: number, enumType: any): string {
        return enumType[key] || '';
    }

    getPageNumbers(): number[] {
        const pages: number[] = [];
        const maxPagesToShow = 5;
        
        if (this.totalPages <= maxPagesToShow) {
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (this.currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push(-1);
                pages.push(this.totalPages);
            } else if (this.currentPage >= this.totalPages - 2) {
                pages.push(1);
                pages.push(-1);
                for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push(-1);
                for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
                pages.push(-1);
                pages.push(this.totalPages);
            }
        }
        
        return pages;
    }
}