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
    styles: [] // Changed from styleUrls to inline styles to avoid file not found error
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
                        confirmButtonColor: '#1a2a6c'
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
        this.isFilterVisible = false;
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
            confirmButtonColor: '#b21f1f',
            cancelButtonColor: '#6c757d',
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
                        confirmButtonColor: '#1a2a6c'
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
                pages.push(-1); // Ellipsis
                pages.push(this.totalPages);
            } else if (this.currentPage >= this.totalPages - 2) {
                pages.push(1);
                pages.push(-1); // Ellipsis
                for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push(-1); // Ellipsis
                for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
                pages.push(-1); // Ellipsis
                pages.push(this.totalPages);
            }
        }
        
        return pages;
    }
}