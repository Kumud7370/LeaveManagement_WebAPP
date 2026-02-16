import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';

import { EmployeeService } from '../../../core/services/api/employee.api';
import {
    EmployeeResponseDto,
    EmployeeFilterDto,
    PagedResultDto,
    EmployeeStatus,
    EmploymentType,
    Gender
} from '../../../core/Models/employee.model';

import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import { EmployeeFormComponent } from '../employee-form/employee-form.component';
import { EmployeeDetailsComponent } from '../employee-details/employee-details.component';

@Component({
    selector: 'app-employee-list',
    standalone: true,
    imports: [CommonModule, FormsModule, AgGridAngular, EmployeeFormComponent, EmployeeDetailsComponent],
    templateUrl: './employee-list.component.html',
    styleUrl: './employee-list.component.scss'
})
export class EmployeeListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    rowData: EmployeeResponseDto[] = [];
    isLoading = false;
    error: string | null = null;
    
    // Pagination
    currentPage = 1;
    pageSize = 20;
    totalPages = 0;
    totalItems = 0;
    
    // Filters
    isFilterVisible = false;
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
        pageSize: 20,
        sortBy: 'EmployeeCode',
        sortDescending: false
    };

    // Modal States
    showFormModal = false;
    showDetailsModal = false;
    formMode: 'create' | 'edit' = 'create';
    selectedEmployeeId: string | null = null;

    // Enums for dropdowns
    EmployeeStatus = EmployeeStatus;
    EmploymentType = EmploymentType;
    Gender = Gender;

    // Enum keys for iteration
    employeeStatusKeys: number[];
    employmentTypeKeys: number[];
    genderKeys: number[];

    // Make Math available in template
    Math = Math;

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

    constructor(
        private employeeService: EmployeeService,
        private router: Router
    ) {
        // Initialize enum keys
        this.employeeStatusKeys = Object.keys(EmployeeStatus)
            .filter(key => !isNaN(Number(key)))
            .map(key => Number(key));
        
        this.employmentTypeKeys = Object.keys(EmploymentType)
            .filter(key => !isNaN(Number(key)))
            .map(key => Number(key));
        
        this.genderKeys = Object.keys(Gender)
            .filter(key => !isNaN(Number(key)))
            .map(key => Number(key));

        this.initializeColumnDefs();
    }

    ngOnInit(): void {
        console.log('Employee List Component Initialized');
        this.loadEmployees();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    initializeColumnDefs(): void {
        this.columnDefs = [
            {
                headerName: '',
                checkboxSelection: true,
                headerCheckboxSelection: true,
                width: 50,
                minWidth: 50,
                maxWidth: 50,
                pinned: 'left',
                lockPosition: true,
                sortable: false,
                filter: false,
                resizable: false
            },
            {
                headerName: 'Employee',
                field: 'fullName',
                width: 280,
                minWidth: 250,
                cellRenderer: (params: any) => {
                    if (!params.value) return '';
                    const code = params.data.employeeCode || '';
                    const name = params.value;
                    const nameParts = name.trim().split(' ');
                    let initials = 'NA';
                    if (nameParts.length >= 2) {
                        initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
                    } else if (name.length >= 2) {
                        initials = name.substring(0, 2).toUpperCase();
                    }
                    
                    return `
                        <div class="employee-name-cell">
                            <div class="employee-avatar">${initials}</div>
                            <div class="employee-info">
                                <div class="employee-name">${name}</div>
                                <div class="employee-code">${code}</div>
                            </div>
                        </div>
                    `;
                }
            },
            {
                headerName: 'Email',
                field: 'email',
                width: 250,
                minWidth: 200,
                cellStyle: { color: '#3b82f6' }
            },
            {
                headerName: 'Phone',
                field: 'phoneNumber',
                width: 150,
                minWidth: 130,
                cellStyle: { color: '#6b7280' }
            },
            {
                headerName: 'Department',
                field: 'departmentName',
                width: 180,
                minWidth: 150,
                cellStyle: { color: '#6b7280' }
            },
            {
                headerName: 'Designation',
                field: 'designationName',
                width: 180,
                minWidth: 150,
                cellStyle: { color: '#6b7280' }
            },
            {
                headerName: 'Employment Type',
                field: 'employmentTypeName',
                width: 160,
                minWidth: 150,
                cellRenderer: (params: any) => {
                    if (!params.value) return '';
                    const type = params.value.toLowerCase();
                    let badgeClass = 'badge-info';
                    
                    if (type.includes('full')) {
                        badgeClass = 'badge-full-time';
                    } else if (type.includes('part')) {
                        badgeClass = 'badge-part-time';
                    } else if (type.includes('contract')) {
                        badgeClass = 'badge-contract';
                    } else if (type.includes('intern')) {
                        badgeClass = 'badge-intern';
                    }
                    
                    return `<span class="badge ${badgeClass}">${params.value}</span>`;
                }
            },
            {
                headerName: 'Status',
                field: 'employeeStatusName',
                width: 130,
                minWidth: 120,
                cellRenderer: (params: any) => {
                    if (!params.value) return '';
                    const status = params.value.toLowerCase();
                    let badgeClass = 'badge-info';
                    
                    if (status.includes('active')) {
                        badgeClass = 'badge-active';
                    } else if (status.includes('inactive')) {
                        badgeClass = 'badge-inactive';
                    } else if (status.includes('pending')) {
                        badgeClass = 'badge-pending';
                    } else if (status.includes('leave')) {
                        badgeClass = 'badge-on-leave';
                    }
                    
                    return `<span class="badge ${badgeClass}">${params.value}</span>`;
                },
                cellStyle: { textAlign: 'center' }
            },
            {
                headerName: 'Joining Date',
                field: 'dateOfJoining',
                width: 150,
                minWidth: 140,
                valueFormatter: (params) => this.formatDate(params.value),
                cellStyle: { color: '#6b7280', fontSize: '12px' }
            },
            {
                headerName: 'Actions',
                width: 150,
                minWidth: 150,
                maxWidth: 150,
                cellRenderer: ActionCellRendererComponent,
                sortable: false,
                filter: false,
                pinned: 'right',
                cellStyle: { 
                    textAlign: 'center',
                    justifyContent: 'center',
                    padding: '0 8px'
                }
            }
        ];
    }

    onGridReady(params: GridReadyEvent): void {
        params.api.sizeColumnsToFit();
    }

    loadEmployees(): void {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.error = null;
        this.filter.pageNumber = this.currentPage;
        this.filter.pageSize = this.pageSize;

        console.log('Loading employees with filter:', this.filter);

        this.employeeService.getFilteredEmployees(this.filter)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (result: PagedResultDto<EmployeeResponseDto>) => {
                    console.log('Employee data received:', result);
                    this.rowData = result.items || [];
                    this.totalItems = result.totalCount || 0;
                    this.totalPages = result.totalPages || 0;
                    this.currentPage = result.pageNumber || 1;
                    this.isLoading = false;
                    console.log(`Loaded ${this.rowData.length} employees`);
                },
                error: (error: any) => {
                    console.error('Error loading employees:', error);
                    this.error = error.error?.message || 'Failed to load employees. Please try again.';
                    this.isLoading = false;
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
            pageSize: 20,
            sortBy: 'EmployeeCode',
            sortDescending: false
        };
        this.currentPage = 1;
        this.pageSize = 20;
        this.loadEmployees();
    }

    onSearchChange(): void {
        const searchTerm = this.filter.searchTerm || '';
        if (searchTerm.length === 0 || searchTerm.length >= 3) {
            this.currentPage = 1;
            this.loadEmployees();
        }
    }

    clearSearch(): void {
        this.filter.searchTerm = '';
        this.currentPage = 1;
        this.loadEmployees();
    }

    // Pagination
    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
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

    onPageSizeChanged(newPageSize: number): void {
        this.pageSize = newPageSize;
        this.currentPage = 1;
        this.loadEmployees();
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

    // Navigation methods called by ActionCellRendererComponent
    viewDetails(employee: EmployeeResponseDto): void {
        this.selectedEmployeeId = employee.id;
        this.showDetailsModal = true;
    }

    editDepartment(employee: EmployeeResponseDto): void {
        this.formMode = 'edit';
        this.selectedEmployeeId = employee.id;
        this.showFormModal = true;
    }

    async deleteDepartment(employee: EmployeeResponseDto): Promise<void> {
        const result = await Swal.fire({
            title: 'Are you sure?',
            html: `You are about to delete <strong>"${employee?.fullName || 'this employee'}"</strong>.<br>This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed && employee?.id) {
            this.employeeService.deleteEmployee(employee.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        Swal.fire({
                            title: 'Deleted!',
                            text: 'Employee has been deleted successfully.',
                            icon: 'success',
                            confirmButtonColor: '#3b82f6',
                            timer: 2000
                        });
                        this.loadEmployees();
                    },
                    error: (error: any) => {
                        console.error('Error deleting employee:', error);
                        Swal.fire({
                            title: 'Error!',
                            text: error.error?.message || 'Failed to delete employee. Please try again.',
                            icon: 'error',
                            confirmButtonColor: '#ef4444'
                        });
                    }
                });
        }
    }

    // Helper methods
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

    // Additional method for backward compatibility
    viewEmployee(employee: EmployeeResponseDto): void {
        this.viewDetails(employee);
    }

    editEmployee(employee: EmployeeResponseDto): void {
        this.editDepartment(employee);
    }

    deleteEmployee(employee: EmployeeResponseDto): void {
        this.deleteDepartment(employee);
    }

    addNewEmployee(): void {
        this.formMode = 'create';
        this.selectedEmployeeId = null;
        this.showFormModal = true;
    }

    closeFormModal(): void {
        this.showFormModal = false;
        this.selectedEmployeeId = null;
    }

    closeDetailsModal(): void {
        this.showDetailsModal = false;
        this.selectedEmployeeId = null;
    }

    onFormSuccess(): void {
        this.closeFormModal();
        this.loadEmployees();
    }

    onEditFromDetails(employeeId: string): void {
        this.closeDetailsModal();
        this.formMode = 'edit';
        this.selectedEmployeeId = employeeId;
        this.showFormModal = true;
    }

    onDeleteFromDetails(employeeId: string): void {
        this.closeDetailsModal();
        this.loadEmployees();
    }
}