// src/app/modules/dashboard/employees/employee-list/employee-list.component.ts

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi,
  GridReadyEvent,
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  SortChangedEvent,
  FilterChangedEvent
} from 'ag-grid-community';

import { EmployeeService } from '../../../core/services/api/employee.api';
import {
    EmployeeResponseDto,
    EmployeeFilterDto,
    PagedResultDto,
    EmployeeStatus,
    EmploymentType,
    Gender
} from '../../../core/Models/employee.model';

import { EmployeeNameCellRendererComponent } from '../renderers/employee-name-cell-renderer.component';
import { StatusCellRendererComponent } from '../renderers/status-cell-renderer.component';
import { EmploymentTypeCellRendererComponent } from '../renderers/employment-type-cell-renderer.component';
import { ActionsCellRendererComponent } from '../renderers/actions-cell-renderer.component';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
    selector: 'app-employee-list',
    standalone: true,
    imports: [
        CommonModule, 
        FormsModule,
        AgGridAngular
    ],
    templateUrl: './employee-list.component.html',
    styleUrl: './employee-list.components.scss',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EmployeeListComponent implements OnInit, OnDestroy {
    @ViewChild('agGrid', { read: ElementRef })
    agGridElement!: ElementRef<HTMLElement>;

    private destroy$ = new Subject<void>();

    // AG Grid properties
    rowData: EmployeeResponseDto[] = [];
    gridApi!: GridApi;
    
    isLoading = false;
    isFilterVisible = false;

    Math = Math;

    // Pagination
    currentPage = 1;
    pageSize = 20;
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
        pageSize: 20,
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

    // AG Grid context
    context = {
        componentParent: this
    };

    // Default column definition
    defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        floatingFilter: true,
        resizable: true,
        minWidth: 100,
        suppressSizeToFit: false,
        suppressAutoSize: false
    };

    // Column definitions
    columnDefs: ColDef[] = [
        {
            headerName: 'Actions',
            field: 'actions',
            pinned: 'left',
            width: 140,
            minWidth: 130,
            maxWidth: 140,
            sortable: false,
            filter: false,
            cellClass: 'actions-cell',
            cellRenderer: ActionsCellRendererComponent,
            suppressSizeToFit: true,
            lockPosition: true
        },
        {
            headerName: 'Employee',
            field: 'fullName',
            width: 280,
            minWidth: 250,
            cellRenderer: EmployeeNameCellRendererComponent
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
            cellRenderer: EmploymentTypeCellRendererComponent
        },
        {
            headerName: 'Status',
            field: 'employeeStatusName',
            width: 130,
            minWidth: 120,
            cellRenderer: StatusCellRendererComponent
        },
        {
            headerName: 'Joining Date',
            field: 'dateOfJoining',
            width: 150,
            minWidth: 140,
            valueFormatter: (params) => this.formatDate(params.value),
            cellStyle: { color: '#6b7280', fontSize: '12px' }
        }
    ];

    // Active filters
    activeFilters = {
        hasActiveFilters: false,
        filters: [] as string[],
        count: 0
    };

    constructor(
        private employeeService: EmployeeService,
        private router: Router,
        private cdr: ChangeDetectorRef
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

    onGridReady(params: GridReadyEvent) {
        this.gridApi = params.api;

        // Set up event listeners
        this.gridApi.addEventListener('sortChanged', this.onSortChanged.bind(this));
        this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));

        // Size columns to fit
        setTimeout(() => {
            if (this.gridApi) {
                this.gridApi.sizeColumnsToFit();
            }
        }, 100);
    }

    loadEmployees(): void {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
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
                    this.isLoading = false;

                    // Update grid
                    if (this.gridApi) {
                        this.gridApi.setGridOption('rowData', this.rowData);
                        this.gridApi.refreshCells({ force: true });

                        setTimeout(() => {
                            if (this.gridApi) {
                                this.gridApi.sizeColumnsToFit();
                            }
                        }, 50);
                    }

                    this.updateActiveFilters();
                    this.cdr.detectChanges();
                    console.log(`Loaded ${this.rowData.length} employees`);
                },
                error: (error: any) => {
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

    // Handle sort changes
    onSortChanged(event: SortChangedEvent) {
        const sortModel = this.gridApi.getColumnState()
            .filter(col => col.sort != null)
            .map(col => ({
                colId: col.colId,
                sort: col.sort
            }));

        if (sortModel.length > 0) {
            const sortCol = sortModel[0];
            this.filter.sortBy = sortCol.colId;
            this.filter.sortDescending = sortCol.sort === 'desc';
        } else {
            this.filter.sortBy = 'EmployeeCode';
            this.filter.sortDescending = false;
        }

        this.currentPage = 1;
        this.loadEmployees();
    }

    // Handle filter changes
    onFilterChanged(event: FilterChangedEvent) {
        this.currentPage = 1;
        this.loadEmployees();
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
        
        if (this.gridApi) {
            this.gridApi.setFilterModel(null);
        }
        
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

    updateActiveFilters() {
        const filters: string[] = [];

        if (this.filter.searchTerm?.trim()) {
            filters.push(`Search: "${this.filter.searchTerm.trim()}"`);
        }

        if (this.filter.employeeStatus !== undefined) {
            filters.push(`Status: ${EmployeeStatus[this.filter.employeeStatus]}`);
        }

        if (this.filter.employmentType !== undefined) {
            filters.push(`Type: ${EmploymentType[this.filter.employmentType]}`);
        }

        if (this.filter.gender !== undefined) {
            filters.push(`Gender: ${Gender[this.filter.gender]}`);
        }

        if (this.filter.joiningDateFrom) {
            filters.push(`From: ${this.filter.joiningDateFrom}`);
        }

        if (this.filter.joiningDateTo) {
            filters.push(`To: ${this.filter.joiningDateTo}`);
        }

        if (this.gridApi) {
            const filterModel = this.gridApi.getFilterModel();
            const filterCount = Object.keys(filterModel).length;
            if (filterCount > 0) {
                filters.push(`${filterCount} column filter(s)`);
            }
        }

        this.activeFilters = {
            hasActiveFilters: filters.length > 0,
            filters,
            count: filters.length
        };
    }

    handleClearFilters(): void {
        this.resetFilter();
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
                error: (error: any) => {
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
}