import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  OnInit,
  OnDestroy,
  ElementRef,
  ChangeDetectorRef,
  ViewEncapsulation
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi,
  GridReadyEvent,
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  SortChangedEvent,
  FilterChangedEvent,
  themeQuartz          
} from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

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

import {
  dateFormatter,
  dateTimeFormatter,
  exportToCsv,
  clearAllFilters,
  refreshGrid,
  getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const employeeGridTheme = themeQuartz.withParams({
  backgroundColor:                '#ffffff',
  foregroundColor:                '#1f2937',
  borderColor:                    '#e5e7eb',
  headerBackgroundColor:          '#ffffff',
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

@Component({
  selector: 'app-employee-list',
  standalone: true,
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AgGridAngular,
    EmployeeFormComponent,
    EmployeeDetailsComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EmployeeListComponent implements OnInit, OnDestroy {

  @ViewChild('agGrid', { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();

  // ── Expose theme to template 
  readonly gridTheme = employeeGridTheme;

  rowData: EmployeeResponseDto[] = [];
  gridApi!: GridApi;
  searchTerm: string = '';

  // ─── Modal State 
  showFormModal    = false;
  showDetailsModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedEmployeeId: string | null = null;
  filter: EmployeeFilterDto = {
    searchTerm:      '',
    departmentId:    '',
    designationId:   '',
    managerId:       '',
    employeeStatus:  undefined,
    employmentType:  undefined,
    gender:          undefined,
    joiningDateFrom: undefined,
    joiningDateTo:   undefined,
    pageNumber:      1,
    pageSize:        20,
    sortBy:          'EmployeeCode',
    sortDescending:  false
  };

  // ─── Pagination 
  currentPage: number = 1;
  pageSize:    number = 20;
  totalItems:  number = 0;
  totalPages:  number = 0;
  private isLoadingData     = false;
  private searchDebounceTimer: any = null;
  Math = Math;

  // ─── Enums 
  EmployeeStatus = EmployeeStatus;
  EmploymentType = EmploymentType;
  Gender         = Gender;

  employeeStatusKeys: number[];
  employmentTypeKeys: number[];
  genderKeys:         number[];

  // ─── Stats 
  stats = { total: 0, active: 0, inactive: 0, onLeave: 0 };

  // ─── Active Filters 
  activeFilters = {
    hasActiveFilters: false,
    filters: [] as string[],
    count: 0
  };

  context = { componentParent: this };

  // ─── Grid config 
  defaultColDef: ColDef = {
    sortable:           true,
    filter:             true,
    floatingFilter:     true,
    resizable:          true,
    minWidth:           80,
    suppressSizeToFit:  false,
    suppressAutoSize:   false
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      field:      'actions',
      width:      155,
      minWidth:   155,
      maxWidth:   155,
      sortable:   false,
      filter:     false,
      floatingFilter: false,
      suppressFloatingFilterButton: true,
      cellClass:  'actions-cell',
      cellRenderer: ActionCellRendererComponent,
      suppressSizeToFit: true
    },
    {
      headerName: 'Employee',
      field:      'fullName',
      width:      240,
      minWidth:   200,
      cellRenderer: (params: any) => {
        if (!params.value) return '';
        const name   = params.value as string;
        const code   = params.data?.employeeCode || '';
        const search = params.context?.componentParent?.searchTerm || '';
        const parts  = name.trim().split(' ');
        let initials = 'NA';
        if (parts.length >= 2) {
          initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        } else if (name.length >= 2) {
          initials = name.substring(0, 2).toUpperCase();
        }
        const hl = (t: string) =>
          params.context?.componentParent?.highlightText(t, search) || t;
        return `
          <div class="emp-name-cell">
            <div class="emp-avatar">${initials}</div>
            <div class="emp-info">
              <div class="emp-name">${hl(name)}</div>
              <div class="emp-code">${hl(code)}</div>
            </div>
          </div>`;
      }
    },
    {
      headerName: 'Email',
      field:      'email',
      width:      230,
      minWidth:   180,
      cellRenderer: (params: any) => {
        if (!params.value) return '';
        const search = params.context?.componentParent?.searchTerm || '';
        const hl = params.context?.componentParent?.highlightText(params.value, search) || params.value;
        return `<span style="color:#3b82f6;">${hl}</span>`;
      }
    },
    {
      headerName: 'Phone',
      field:      'phoneNumber',
      width:      145,
      minWidth:   120,
      cellStyle:  { color: '#6b7280' }
    },
    {
      headerName: 'Department',
      field:      'departmentName',
      width:      170,
      minWidth:   130,
      cellRenderer: (params: any) => {
        const val    = params.value || 'N/A';
        const search = params.context?.componentParent?.searchTerm || '';
        const hl     = params.context?.componentParent?.highlightText(val, search) || val;
        return `<span style="color:#374151;">${hl}</span>`;
      }
    },
    {
      headerName: 'Designation',
      field:      'designationName',
      width:      170,
      minWidth:   130,
      cellStyle:  { color: '#6b7280' }
    },
    {
      headerName: 'Employment Type',
      field:      'employmentTypeName',
      width:      165,
      minWidth:   140,
      cellRenderer: (params: any) => {
        if (!params.value) return '';
        const type = (params.value as string).toLowerCase();
        const cls  = type.includes('full')     ? 'emp-type-badge emp-type-full-time'
                   : type.includes('part')     ? 'emp-type-badge emp-type-part-time'
                   : type.includes('contract') ? 'emp-type-badge emp-type-contract'
                   : type.includes('intern')   ? 'emp-type-badge emp-type-intern'
                   : type.includes('temp')     ? 'emp-type-badge emp-type-temp'
                   : 'emp-type-badge emp-type-full-time';
        return `<span class="${cls}">${params.value}</span>`;
      }
    },
    {
      headerName: 'Status',
      field:      'employeeStatusName',
      width:      130,
      minWidth:   110,
      cellRenderer: (params: any) => {
        if (!params.value) return '';
        const s   = (params.value as string).toLowerCase();
        const cls = (s === 'active')       ? 'emp-status-badge emp-status-active'
                  : (s === 'inactive')     ? 'emp-status-badge emp-status-inactive'
                  : s.includes('leave')    ? 'emp-status-badge emp-status-leave'
                  : s.includes('suspend')  ? 'emp-status-badge emp-status-suspended'
                  : (s.includes('terminat') || s.includes('resign')) ? 'emp-status-badge emp-status-terminated'
                  : 'emp-status-badge emp-status-inactive';
        return `<span class="${cls}">${params.value}</span>`;
      }
    },
    {
      headerName: 'Gender',
      field:      'genderName',
      width:      110,
      minWidth:   90,
      cellStyle:  { color: '#6b7280' }
    },
    {
      headerName: 'Joining Date',
      field:      'dateOfJoining',
      width:      150,
      minWidth:   130,
      valueFormatter: (params: any) => dateFormatter(params),
      cellStyle:  { color: '#6b7280', fontSize: '12px' }
    },
    {
      headerName: 'Created At',
      field:      'createdAt',
      width:      180,
      minWidth:   150,
      valueFormatter: (params: any) => dateTimeFormatter(params),
      cellStyle:  { color: '#6b7280', fontSize: '12px' }
    }
  ];

  constructor(
    private employeeService: EmployeeService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.employeeStatusKeys = Object.keys(EmployeeStatus)
      .filter(k => !isNaN(Number(k))).map(k => Number(k));
    this.employmentTypeKeys = Object.keys(EmploymentType)
      .filter(k => !isNaN(Number(k))).map(k => Number(k));
    this.genderKeys = Object.keys(Gender)
      .filter(k => !isNaN(Number(k))).map(k => Number(k));
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Helper: numeric enum value → string name for backend 
  private enumToString<T extends object>(enumObj: T, value: any): string {
    const numVal = Number(value);
    const name   = enumObj[numVal as keyof T] as string;
    return name || String(value);
  }

  // ─── Stats 
  loadStats(): void {
    const statsFilter: EmployeeFilterDto = {
      searchTerm:     '',
      pageNumber:     1,
      pageSize:       1000,
      sortBy:         'EmployeeCode',
      sortDescending: false
    };

    this.employeeService.getFilteredEmployees(statsFilter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResultDto<EmployeeResponseDto>) => {
          const items = result.items || [];
          this.stats.total    = result.totalCount || 0;
          this.stats.active   = items.filter(e =>
            e.employeeStatus === EmployeeStatus.Active ||
            (e as any).employeeStatusName?.toLowerCase() === 'active'
          ).length;
          this.stats.inactive = items.filter(e =>
            e.employeeStatus === EmployeeStatus.Inactive ||
            (e as any).employeeStatusName?.toLowerCase() === 'inactive'
          ).length;
          this.stats.onLeave  = items.filter(e =>
            e.employeeStatus === EmployeeStatus.OnLeave ||
            (e as any).employeeStatusName?.toLowerCase().includes('leave')
          ).length;
          this.cdr.detectChanges();
        },
        error: () => {}
      });
  }

  // ─── Data Loading 
  loadEmployees(): void {
    if (this.isLoadingData) return;
    this.isLoadingData = true;

    this.filter.searchTerm = this.searchTerm || undefined as any;
    this.filter.pageNumber = this.currentPage;
    this.filter.pageSize   = this.pageSize;

    this.employeeService.getFilteredEmployees(this.filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResultDto<EmployeeResponseDto>) => {
          this.isLoadingData = false;
          this.rowData       = result.items || [];
          this.totalItems    = result.totalCount || 0;
          this.totalPages    = Math.ceil(this.totalItems / this.pageSize);
          this.currentPage   = result.pageNumber || 1;

          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            refreshGrid(this.gridApi);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.isLoadingData = false;
          if (error.status !== 401) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load employees. Please try again.' });
          }
        }
      });
  }

  // ─── Grid 
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('sortChanged',   this.onSortChanged.bind(this));
    this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
  }

  onSortChanged(_event: SortChangedEvent): void {
    this.currentPage = 1;
    this.loadEmployees();
  }

  onFilterChanged(_event: FilterChangedEvent): void {
    this.currentPage = 1;
    this.loadEmployees();
    this.updateActiveFilters();
  }

  highlightText(text: string, term: string): string {
    if (!term || !term.trim() || !text) return String(text);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex   = new RegExp(`(${escaped})`, 'gi');
    return String(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // ─── Pagination 
  onPageSizeChanged(newPageSize: number): void {
    this.pageSize    = newPageSize;
    this.currentPage = 1;
    this.loadEmployees();
  }

  goToPage(page: number | string): void {
    const p = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(p) || p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.loadEmployees();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  // ─── Search & Filters 
  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadEmployees();
      this.updateActiveFilters();
    }, 350);
  }

  clearSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.currentPage = 1;
    this.loadEmployees();
    this.updateActiveFilters();
  }

  handleClearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.currentPage = 1;
    this.filter = {
      searchTerm:      '',
      departmentId:    '',
      designationId:   '',
      managerId:       '',
      employeeStatus:  undefined,
      employmentType:  undefined,
      gender:          undefined,
      joiningDateFrom: undefined,
      joiningDateTo:   undefined,
      pageNumber:      1,
      pageSize:        this.pageSize,
      sortBy:          'EmployeeCode',
      sortDescending:  false
    };
    clearAllFilters(this.gridApi);
    this.loadEmployees();
    this.updateActiveFilters();
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.loadEmployees();
    this.updateActiveFilters();
  }

  updateActiveFilters(): void {
    const colFilterCount = this.gridApi
      ? Object.keys(this.gridApi.getFilterModel()).length : 0;
    const additional = colFilterCount > 0
      ? { 'Column filters': `${colFilterCount} active` } : undefined;
    const filters = getActiveFiltersSummary(this.searchTerm, undefined, additional);
    this.activeFilters = { hasActiveFilters: filters.length > 0, filters, count: filters.length };
  }

  getEnumName(key: number, enumType: any): string {
    return enumType[key] || '';
  }

  // ─── Modal 
  addNewEmployee(): void {
    this.formMode           = 'create';
    this.selectedEmployeeId = null;
    this.showFormModal      = true;
    this.cdr.detectChanges();
  }

  closeFormModal(): void {
    this.showFormModal      = false;
    this.selectedEmployeeId = null;
    this.cdr.detectChanges();
  }

  closeDetailsModal(): void {
    this.showDetailsModal   = false;
    this.selectedEmployeeId = null;
    this.cdr.detectChanges();
  }

  onFormSuccess(): void {
    this.closeFormModal();
    this.loadEmployees();
    this.loadStats();
  }

  onEditFromDetails(employeeId: string): void {
    this.closeDetailsModal();
    this.formMode           = 'edit';
    this.selectedEmployeeId = employeeId;
    this.showFormModal      = true;
    this.cdr.detectChanges();
  }

  onDeleteFromDetails(_employeeId: string): void {
    this.closeDetailsModal();
    this.loadEmployees();
    this.loadStats();
  }

  onOverlayClick(event: Event, modal: 'form' | 'details'): void {
    if (event.target === event.currentTarget) {
      modal === 'form' ? this.closeFormModal() : this.closeDetailsModal();
    }
  }

  // ─── ActionCellRenderer bridge 
  viewDetails(employee: EmployeeResponseDto): void {
    this.selectedEmployeeId = employee.id;
    this.showDetailsModal   = true;
    this.cdr.detectChanges();
  }

  editDepartment(employee: EmployeeResponseDto): void {
    this.formMode           = 'edit';
    this.selectedEmployeeId = employee.id;
    this.showFormModal      = true;
    this.cdr.detectChanges();
  }

  async toggleStatus(employee: EmployeeResponseDto): Promise<void> {
    if (!employee?.id) return;

    const currentStatusName = (employee as any).employeeStatusName?.toLowerCase() || '';
    const isActive = employee.employeeStatus === EmployeeStatus.Active
      || currentStatusName === 'active';

    const newStatus   = isActive ? EmployeeStatus.Inactive : EmployeeStatus.Active;
    const actionText  = isActive ? 'deactivate' : 'activate';
    const statusLabel = isActive ? 'Inactive' : 'Active';

    const result = await Swal.fire({
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Employee?`,
      html: `
        <div style="text-align:left;padding:10px;">
          <p>Do you want to <strong>${actionText}</strong> this employee?</p>
          <p style="margin:10px 0;"><strong>Employee:</strong> ${employee.fullName}</p>
          <p style="margin:10px 0;"><strong>New Status:</strong>
            <span style="color:${isActive ? '#ef4444' : '#10b981'};font-weight:600;">${statusLabel}</span>
          </p>
        </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: isActive ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText}!`
    });

    if (!result.isConfirmed) return;

    const updateDto: any = {
      firstName:            employee.firstName,
      middleName:           employee.middleName,
      lastName:             employee.lastName,
      dateOfBirth:          employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString() : undefined,
      gender:               this.enumToString(Gender, employee.gender),
      email:                employee.email,
      phoneNumber:          employee.phoneNumber,
      alternatePhoneNumber: employee.alternatePhoneNumber,
      address:              employee.address,
      departmentId:         employee.departmentId,
      designationId:        employee.designationId,
      managerId:            employee.managerId,
      dateOfJoining:        employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString() : undefined,
      dateOfLeaving:        employee.dateOfLeaving ? new Date(employee.dateOfLeaving).toISOString() : undefined,
      employmentType:       this.enumToString(EmploymentType, employee.employmentType),
      employeeStatus:       this.enumToString(EmployeeStatus, newStatus),
      profileImageUrl:      employee.profileImageUrl,
      biometricId:          employee.biometricId
    };

    this.employeeService.updateEmployee(employee.id, updateDto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const idx = this.rowData.findIndex(r => r.id === employee.id);
          if (idx !== -1) {
            this.rowData[idx] = {
              ...this.rowData[idx],
              employeeStatus:     newStatus,
              employeeStatusName: statusLabel
            } as any;
            this.gridApi.setGridOption('rowData', [...this.rowData]);
            refreshGrid(this.gridApi);
          }
          this.loadStats();
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'success', title: 'Status Updated!',
            text: `Employee is now ${statusLabel}.`,
            timer: 2000, showConfirmButton: false
          });
        },
        error: (error: any) => {
          Swal.fire({
            icon: 'error', title: 'Error!',
            text: error.error?.message || 'Failed to change employee status.'
          });
        }
      });
  }

  async deleteDepartment(employee: EmployeeResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete Employee?',
      html: `
        <div style="text-align:left;padding:10px;">
          <p>Are you sure you want to delete <strong>"${employee?.fullName || 'this employee'}"</strong>?</p>
          <p style="color:#ef4444;margin-top:15px;padding:10px;background:#fee2e2;border-radius:6px;">
            <strong>Warning:</strong> This action cannot be undone.
          </p>
        </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete!'
    });

    if (!result.isConfirmed || !employee?.id) return;

    this.employeeService.deleteEmployee(employee.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const idx = this.rowData.findIndex(r => r.id === employee.id);
          if (idx !== -1) {
            this.rowData.splice(idx, 1);
            this.gridApi.setGridOption('rowData', [...this.rowData]);
            refreshGrid(this.gridApi);
          }
          this.totalItems = Math.max(0, this.totalItems - 1);
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          if (this.rowData.length === 0 && this.currentPage > 1) {
            this.currentPage--;
            this.loadEmployees();
          }
          this.loadStats();
          this.cdr.detectChanges();
          Swal.fire({
            icon: 'success', title: 'Deleted!',
            text: 'Employee has been deleted.',
            timer: 2500, showConfirmButton: false
          });
        },
        error: (error: any) => {
          Swal.fire({
            icon: 'error', title: 'Error!',
            text: error.error?.message || 'Failed to delete employee.'
          });
        }
      });
  }

  // ─── Grid action dispatcher 
  onGridAction(event: { action: string; data: any }): void {
    switch (event.action) {
      case 'edit':   this.editDepartment(event.data);   break;
      case 'view':   this.viewDetails(event.data);      break;
      case 'toggle': this.toggleStatus(event.data);     break;
      case 'delete': this.deleteDepartment(event.data); break;
    }
  }

  // ─── Export 
  exportData(): void {
    exportToCsv(this.gridApi, 'employees');
    Swal.fire({
      icon: 'success', title: 'Exported!',
      text: 'Employee data exported as CSV.',
      timer: 2000, showConfirmButton: false
    });
  }

  // ─── Date helpers 
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }
}