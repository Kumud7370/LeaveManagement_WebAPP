import {
  Component, CUSTOM_ELEMENTS_SCHEMA, ViewChild, OnInit, OnDestroy,
  ElementRef, ChangeDetectorRef, ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi, GridReadyEvent, ColDef, ModuleRegistry, AllCommunityModule,
  SortChangedEvent, FilterChangedEvent, SelectionChangedEvent, themeQuartz
} from 'ag-grid-community';
import { Subject, takeUntil, skip } from 'rxjs';
import Swal from 'sweetalert2';

import { EmployeeService } from '../../../core/services/api/employee.api';
import { DepartmentService } from '../../../core/services/api/department.api';
import { DesignationService } from '../../../core/services/api/designation.api';
import { LanguageService } from '../../../core/services/api/language.api';
import {
  EmployeeResponseDto, EmployeeFilterDto, PagedResultDto,
  EmployeeStatus, EmploymentType, Gender,
  ReassignEmployeeDto, AssignmentHistoryResponseDto,
  BulkReassignEmployeeDto, BulkReassignResultDto
} from '../../../core/Models/employee.model';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import { EmployeeFormComponent } from '../employee-form/employee-form.component';
import { EmployeeDetailsComponent } from '../employee-details/employee-details.component';
import {
  dateFormatter, dateTimeFormatter, exportToCsv,
  clearAllFilters, refreshGrid, getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const employeeGridTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff', foregroundColor: '#1f2937',
  borderColor: '#e5e7eb', headerBackgroundColor: '#ffffff', headerTextColor: '#374151',
  oddRowBackgroundColor: '#ffffff', rowHoverColor: '#f8faff',
  selectedRowBackgroundColor: '#dbeafe',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize: 13, columnBorder: true, headerColumnBorder: true,
  headerColumnBorderHeight: '50%', headerColumnResizeHandleColor: '#9ca3af',
  headerColumnResizeHandleHeight: '50%', headerColumnResizeHandleWidth: 2,
  cellHorizontalPaddingScale: 0.8,
});

@Component({
  selector: 'app-employee-list',
  standalone: true,
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    AgGridAngular, EmployeeFormComponent, EmployeeDetailsComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EmployeeListComponent implements OnInit, OnDestroy {

  @ViewChild('agGrid', { read: ElementRef }) agGridElement!: ElementRef<HTMLElement>;
  private destroy$ = new Subject<void>();

  readonly gridTheme = employeeGridTheme;

  rowData: EmployeeResponseDto[] = [];
  gridApi!: GridApi;
  searchTerm = '';

  // ── Modal state ───────────────────────────────────────────────────────────
  showFormModal = false;
  showDetailsModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedEmployeeId: string | null = null;

  // ── Single Reassign / History ─────────────────────────────────────────────
  showReassignModal = false;
  showHistoryModal = false;
  reassignEmployee: EmployeeResponseDto | null = null;
  assignmentHistory: AssignmentHistoryResponseDto[] = [];
  historyLoading = false;
  reassignForm!: FormGroup;
  departments: any[] = [];
  designations: any[] = [];
  designationsLoading = false;

  // ── Bulk Reassign ─────────────────────────────────────────────────────────
  showBulkReassignModal = false;
  selectedEmployees: EmployeeResponseDto[] = [];
  bulkReassignForm!: FormGroup;
  bulkReassigning = false;
  bulkDesignations: any[] = [];
  bulkDesignationsLoading = false;

  // ── Filter / Pagination ───────────────────────────────────────────────────
  filter: EmployeeFilterDto = {
    searchTerm: '', departmentId: '', designationId: '', managerId: '',
    employeeStatus: undefined, employmentType: undefined, gender: undefined,
    joiningDateFrom: undefined, joiningDateTo: undefined,
    pageNumber: 1, pageSize: 20, sortBy: 'EmployeeCode', sortDescending: false
  };
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 0;
  private isLoadingData = false;
  private searchDebounceTimer: any = null;
  Math = Math;

  // ── Enums ─────────────────────────────────────────────────────────────────
  EmployeeStatus = EmployeeStatus;
  EmploymentType = EmploymentType;
  Gender = Gender;
  employeeStatusKeys: number[];
  employmentTypeKeys: number[];
  genderKeys: number[];

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats = { total: 0, active: 0, inactive: 0, onLeave: 0 };

  activeFilters = { hasActiveFilters: false, filters: [] as string[], count: 0 };
  context = { componentParent: this };

  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80
  };

  columnDefs: ColDef[] = [];

  constructor(
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private designationService: DesignationService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public langService: LanguageService
  ) {
    this.employeeStatusKeys = Object.keys(EmployeeStatus).filter(k => !isNaN(Number(k))).map(k => Number(k));
    this.employmentTypeKeys = Object.keys(EmploymentType).filter(k => !isNaN(Number(k))).map(k => Number(k));
    this.genderKeys = Object.keys(Gender).filter(k => !isNaN(Number(k))).map(k => Number(k));
  }

  // ── Employment type badge CSS class ──────────────────────────────────────
  private getEmpTypeCls(val: string): string {
    const t = (val || '').toLowerCase();
    return t.includes('full') ? 'emp-type-full-time'
      : t.includes('part') ? 'emp-type-part-time'
        : t.includes('contract') ? 'emp-type-contract'
          : t.includes('intern') ? 'emp-type-intern'
            : 'emp-type-temp';
  }

  private getStatusCls(val: string): string {
    const s = (val || '').toLowerCase();
    return s === 'active' ? 'emp-status-active'
      : s === 'inactive' ? 'emp-status-inactive'
        : s.includes('leave') ? 'emp-status-leave'
          : s.includes('suspend') ? 'emp-status-suspended'
            : 'emp-status-terminated';
  }

  // ── Translate employment type label ──────────────────────────────────────
  private translateEmpType(val: string): string {
    const t = (val || '').toLowerCase();
    if (t.includes('full')) return this.langService.t('employee.empType.fullTime');
    if (t.includes('part')) return this.langService.t('employee.empType.partTime');
    if (t.includes('contract')) return this.langService.t('employee.empType.contract');
    if (t.includes('intern')) return this.langService.t('employee.empType.intern');
    return this.langService.t('employee.empType.temporary');
  }

  private translateStatus(val: string): string {
    const s = (val || '').toLowerCase();
    if (s === 'active') return this.langService.t('employee.status.active');
    if (s === 'inactive') return this.langService.t('employee.status.inactive');
    if (s.includes('leave')) return this.langService.t('employee.status.onLeave');
    if (s.includes('suspend')) return this.langService.t('employee.status.suspended');
    if (s.includes('terminat')) return this.langService.t('employee.status.terminated');
    return val;
  }

  buildColumnDefs(): void {
    const t = (k: string) => this.langService.t(k);
    const locale = this.langService.currentLang === 'mr' ? 'mr-IN'
      : this.langService.currentLang === 'hi' ? 'hi-IN' : 'en-GB';

    this.columnDefs = [
      {
        headerName: '', colId: 'sel',
        headerClass: 'sel-header-cell',
        width: 40, minWidth: 40, maxWidth: 40,
        sortable: false, filter: false, floatingFilter: false,
        suppressFloatingFilterButton: true, suppressSizeToFit: true, resizable: false,
        cellRenderer: (params: any) => {
          const checked = params.node.isSelected();
          return `<div class="emp-custom-checkbox ${checked ? 'emp-custom-checkbox--checked' : ''}" data-row-id="${params.node.id}">
            ${checked
              ? '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10.5" fill="#2563eb" stroke="#2563eb" stroke-width="1.5"/><path d="M7.5 12.5l3 3 6-6.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10.5" fill="white" stroke="#d1d5db" stroke-width="1.5"/></svg>'
            }</div>`;
        },
        onCellClicked: (params: any) => { params.node.setSelected(!params.node.isSelected()); },
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '0' }
      },
      {
        headerName: t('employee.col.actions'),
        field: 'actions',
        width: 175, minWidth: 175, maxWidth: 175,
        sortable: false, filter: false, floatingFilter: false,
        suppressFloatingFilterButton: true,
        cellClass: 'actions-cell',
        cellRenderer: ActionCellRendererComponent,
        suppressSizeToFit: true
      },
      {
        headerName: t('employee.col.employee'),
        field: 'fullName',
        width: 240, minWidth: 200,
        cellRenderer: (params: any) => {
          if (!params.data) return '';
          // In buildColumnDefs(), replace the name resolution logic:
          const lang = this.langService.currentLang;
          const name = (lang === 'en' && params.data.fullNameEn) ? params.data.fullNameEn
            : (lang === 'hi' && params.data.fullNameHi) ? params.data.fullNameHi
              : params.data.fullName                       
              || params.data.fullNameEn                
              || [params.data.firstNameMr, params.data.middleNameMr, params.data.lastNameMr]
                .filter(Boolean).join(' ')          
              || [params.data.firstName, params.data.lastName]
                .filter(Boolean).join(' ')              
              || '';
          const code = params.data.employeeCode || '';
          const search = this.searchTerm || '';
          const parts = (name || '').trim().split(' ');
          let initials = 'NA';
          if (parts.length >= 2) initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          else if (name?.length >= 2) initials = name.substring(0, 2).toUpperCase();
          const hl = (txt: string) => this.highlightText(txt, search);
          return `<div class="emp-name-cell">
            <div class="emp-avatar">${initials}</div>
            <div class="emp-info">
              <div class="emp-name">${hl(name || '')}</div>
              <div class="emp-code">${hl(code)}</div>
            </div>
          </div>`;
        }
      },
      {
        headerName: t('employee.col.email'),
        field: 'email', width: 230, minWidth: 180,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          return `<span style="color:#3b82f6;">${this.highlightText(params.value, this.searchTerm)}</span>`;
        }
      },
      {
        headerName: t('employee.col.phone'),
        field: 'phoneNumber', width: 145, minWidth: 120,
        cellStyle: { color: '#6b7280' }
      },
      {
        headerName: t('employee.col.department'),
        field: 'departmentName', width: 170, minWidth: 130,
        cellRenderer: (params: any) => {
          const val = params.value || 'N/A';
          return `<span style="color:#374151;">${this.highlightText(val, this.searchTerm)}</span>`;
        }
      },
      {
        headerName: t('employee.col.designation'),
        field: 'designationName', width: 170, minWidth: 130,
        cellStyle: { color: '#6b7280' }
      },
      {
        headerName: t('employee.col.empType'),
        field: 'employmentTypeName', width: 165, minWidth: 140,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const cls = this.getEmpTypeCls(params.value);
          const label = this.translateEmpType(params.value);
          return `<span class="emp-type-badge ${cls}">${label}</span>`;
        }
      },
      {
        headerName: t('employee.col.status'),
        field: 'employeeStatusName', width: 130, minWidth: 110,
        cellRenderer: (params: any) => {
          if (!params.value) return '';
          const cls = this.getStatusCls(params.value);
          const label = this.translateStatus(params.value);
          return `<span class="emp-status-badge ${cls}">${label}</span>`;
        }
      },
      {
        headerName: t('employee.col.gender'),
        field: 'genderName', width: 100, minWidth: 90,
        cellStyle: { color: '#6b7280' }
      },
      {
        headerName: t('employee.col.joinDate'),
        field: 'dateOfJoining', width: 150, minWidth: 130,
        valueFormatter: (params: any) => dateFormatter(params),
        cellStyle: { color: '#6b7280', fontSize: '12px' }
      },
      {
        headerName: t('employee.col.createdAt'),
        field: 'createdAt', width: 180, minWidth: 150,
        valueFormatter: (params: any) => dateTimeFormatter(params),
        cellStyle: { color: '#6b7280', fontSize: '12px' }
      }
    ];
  }

  ngOnInit(): void {
    this.reassignForm = this.fb.group({
      toDepartmentId: ['', Validators.required],
      toDesignationId: ['', Validators.required],
      reason: ['']
    });
    this.bulkReassignForm = this.fb.group({
      toDepartmentId: ['', Validators.required],
      toDesignationId: ['', Validators.required],
      reason: ['']
    });

    this.buildColumnDefs();
    this.loadDepartments();
    this.loadStats();
    this.loadEmployees();

    // Rebuild column defs + re-render on language switch
    this.langService.lang$.pipe(skip(1), takeUntil(this.destroy$)).subscribe(() => {
      this.buildColumnDefs();
      if (this.gridApi) {
        this.gridApi.setGridOption('columnDefs', this.columnDefs);
        refreshGrid(this.gridApi);
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  asSelect(t: EventTarget | null): HTMLSelectElement { return t as HTMLSelectElement; }

  private enumToString<T extends object>(enumObj: T, value: any): string {
    const numVal = Number(value);
    const name = enumObj[numVal as keyof T] as string;
    return name || String(value);
  }

  // ── Departments ───────────────────────────────────────────────────────────
  loadDepartments(): void {
    this.departmentService.getActiveDepartments().subscribe({
      next: (r: any) => {
        const raw = r?.data || r;
        this.departments = (Array.isArray(raw) ? raw : []).map((d: any) => ({
          id: d.departmentId ?? d.id,
          name: d.departmentNameMr ?? d.departmentName ?? d.name
        }));
      }
    });
  }

  onDepartmentChange(departmentId: string): void {
    this.designations = [];
    this.reassignForm.get('toDesignationId')?.setValue('');
    if (!departmentId) return;
    this.designationsLoading = true;
    this.designationService.getDesignationsByDepartment(departmentId).subscribe({
      next: (r: any) => {
        const raw = r?.data ?? r;
        const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        this.designations = arr.map((d: any) => ({ id: d.designationId ?? d.id ?? '', name: d.designationName ?? d.name ?? '' }));
        this.designationsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.designationsLoading = false; this.cdr.detectChanges(); }
    });
  }

  onBulkDepartmentChange(departmentId: string): void {
    this.bulkDesignations = [];
    this.bulkReassignForm.get('toDesignationId')?.setValue('');
    if (!departmentId) return;
    this.bulkDesignationsLoading = true;
    this.designationService.getDesignationsByDepartment(departmentId).subscribe({
      next: (r: any) => {
        const raw = r?.data ?? r;
        const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        this.bulkDesignations = arr.map((d: any) => ({ id: d.designationId ?? d.id ?? '', name: d.designationName ?? d.name ?? '' }));
        this.bulkDesignationsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.bulkDesignationsLoading = false; }
    });
  }

  openReassignModal(employee: EmployeeResponseDto): void {
    this.reassignEmployee = employee;
    this.reassignForm.reset({ toDepartmentId: '', toDesignationId: '', reason: '' });
    this.designations = [];
    this.showReassignModal = true;
    this.cdr.detectChanges();
  }

  closeReassignModal(): void { this.showReassignModal = false; this.reassignEmployee = null; this.cdr.detectChanges(); }

  submitReassign(): void {
    if (this.reassignForm.invalid || !this.reassignEmployee) return;
    const dto: ReassignEmployeeDto = this.reassignForm.value;
    this.employeeService.reassignEmployee(this.reassignEmployee.id, dto).subscribe({
      next: (r: any) => {
        if (r?.success !== false) {
          Swal.fire({ icon: 'success', title: this.langService.t('employee.swal.reassigned'), text: this.langService.t('employee.swal.reassignedText'), timer: 2000, showConfirmButton: false });
          this.closeReassignModal(); this.loadEmployees();
        } else Swal.fire(this.langService.t('common.errorTitle'), r.message || this.langService.t('employee.swal.reassignFailed'), 'error');
      },
      error: (e: any) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('employee.swal.reassignFailed'), 'error')
    });
  }

  openBulkReassignModal(): void {
    if (this.selectedEmployees.length === 0) return;
    this.bulkReassignForm.reset({ toDepartmentId: '', toDesignationId: '', reason: '' });
    this.bulkDesignations = [];
    this.showBulkReassignModal = true;
    this.cdr.detectChanges();
  }

  closeBulkReassignModal(): void { this.showBulkReassignModal = false; this.bulkReassigning = false; this.cdr.detectChanges(); }

  submitBulkReassign(): void {
    if (this.bulkReassignForm.invalid || this.selectedEmployees.length === 0) return;
    this.bulkReassigning = true;
    const dto: BulkReassignEmployeeDto = {
      employeeIds: this.selectedEmployees.map(e => e.id),
      toDepartmentId: this.bulkReassignForm.value.toDepartmentId,
      toDesignationId: this.bulkReassignForm.value.toDesignationId,
      reason: this.bulkReassignForm.value.reason || undefined
    };
    this.employeeService.bulkReassignEmployees(dto).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result: BulkReassignResultDto) => {
        this.bulkReassigning = false;
        if (result.failed > 0 && result.succeeded > 0)
          Swal.fire({ icon: 'warning', title: this.langService.t('employee.swal.partialComplete'), text: result.message, confirmButtonColor: '#3b82f6' });
        else
          Swal.fire({ icon: 'success', title: this.langService.t('common.done'), text: result.message, timer: 2500, showConfirmButton: false });
        this.closeBulkReassignModal();
        this.gridApi?.deselectAll();
        this.selectedEmployees = [];
        this.loadEmployees();
      },
      error: (e: any) => {
        this.bulkReassigning = false;
        Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error');
      }
    });
  }

  openHistoryModal(employee: EmployeeResponseDto): void {
    this.reassignEmployee = employee;
    this.historyLoading = true;
    this.assignmentHistory = [];
    this.showHistoryModal = true;
    this.employeeService.getAssignmentHistory(employee.id).subscribe({
      next: (data: AssignmentHistoryResponseDto[]) => { this.assignmentHistory = data || []; this.historyLoading = false; this.cdr.detectChanges(); },
      error: () => { this.historyLoading = false; this.cdr.detectChanges(); }
    });
  }

  closeHistoryModal(): void { this.showHistoryModal = false; this.reassignEmployee = null; this.cdr.detectChanges(); }

  loadStats(): void {
    const statsFilter: EmployeeFilterDto = { searchTerm: '', pageNumber: 1, pageSize: 1000, sortBy: 'EmployeeCode', sortDescending: false };
    this.employeeService.getFilteredEmployees(statsFilter).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result: PagedResultDto<EmployeeResponseDto>) => {
        const items = result.items || [];
        this.stats.total = result.totalCount || 0;
        this.stats.active = items.filter(e => e.employeeStatus === EmployeeStatus.Active || (e as any).employeeStatusName?.toLowerCase() === 'active').length;
        this.stats.inactive = items.filter(e => e.employeeStatus === EmployeeStatus.Inactive || (e as any).employeeStatusName?.toLowerCase() === 'inactive').length;
        this.stats.onLeave = items.filter(e => e.employeeStatus === EmployeeStatus.OnLeave || (e as any).employeeStatusName?.toLowerCase().includes('leave')).length;
        this.cdr.detectChanges();
      },
      error: () => { }
    });
  }

  loadEmployees(): void {
    if (this.isLoadingData) return;
    this.isLoadingData = true;
    this.filter.searchTerm = this.searchTerm || undefined as any;
    this.filter.pageNumber = this.currentPage;
    this.filter.pageSize = this.pageSize;

    this.employeeService.getFilteredEmployees(this.filter).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result: PagedResultDto<EmployeeResponseDto>) => {
        this.isLoadingData = false;
        this.rowData = result.items || [];
        this.totalItems = result.totalCount || 0;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.currentPage = result.pageNumber || 1;
        if (this.gridApi) { this.gridApi.setGridOption('rowData', this.rowData); refreshGrid(this.gridApi); setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50); }
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.isLoadingData = false;
        if (error.status !== 401) Swal.fire({ icon: 'error', title: this.langService.t('common.errorTitle'), text: this.langService.t('employee.msg.loadError') });
      }
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('sortChanged', this.onSortChanged.bind(this));
    this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));
    this.gridApi.addEventListener('selectionChanged', this.onSelectionChanged.bind(this));
    setTimeout(() => { this.gridApi?.sizeColumnsToFit(); this.injectHeaderCheckbox(); }, 150);
  }

  private injectHeaderCheckbox(): void {
    const headerCell = document.querySelector('.el-grid-container .ag-header-cell[col-id="sel"]');
    if (!headerCell) return;
    const existing = headerCell.querySelector('.emp-header-checkbox');
    if (existing) existing.remove();
    const wrapper = document.createElement('div');
    wrapper.className = 'emp-header-checkbox';
    wrapper.innerHTML = this.getHeaderCheckboxSvg();
    wrapper.addEventListener('click', () => this.toggleSelectAll());
    headerCell.appendChild(wrapper);
  }

  private getHeaderCheckboxSvg(): string {
    if (this.allSelected)
      return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10.5" fill="#2563eb" stroke="#2563eb" stroke-width="1.5"/><path d="M7.5 12.5l3 3 6-6.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    if (this.someSelected)
      return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10.5" fill="white" stroke="#2563eb" stroke-width="1.5"/><line x1="7" y1="12" x2="17" y2="12" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/></svg>`;
    return `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10.5" fill="white" stroke="#d1d5db" stroke-width="1.5"/></svg>`;
  }

  onSortChanged(_e: SortChangedEvent): void { this.currentPage = 1; this.loadEmployees(); }
  onFilterChanged(_e: FilterChangedEvent): void { this.currentPage = 1; this.loadEmployees(); this.updateActiveFilters(); }

  onSelectionChanged(_e: SelectionChangedEvent): void {
    this.selectedEmployees = this.gridApi?.getSelectedRows() || [];
    this.gridApi?.refreshCells({ columns: ['sel'], force: true });
    const hdr = document.querySelector('.el-grid-container .ag-header-cell[col-id="sel"] .emp-header-checkbox');
    if (hdr) hdr.innerHTML = this.getHeaderCheckboxSvg();
    this.cdr.detectChanges();
  }

  toggleSelectAll(): void {
    if (this.allSelected) this.gridApi?.deselectAll();
    else this.gridApi?.selectAll();
  }

  get allSelected(): boolean { return this.rowData.length > 0 && this.selectedEmployees.length === this.rowData.length; }
  get someSelected(): boolean { return this.selectedEmployees.length > 0 && this.selectedEmployees.length < this.rowData.length; }

  highlightText(text: string, term: string): string {
    if (!term || !text) return String(text);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="search-highlight">$1</mark>');
  }

  onPageSizeChanged(newPageSize: number): void { this.pageSize = newPageSize; this.currentPage = 1; this.loadEmployees(); }
  goToPage(page: number | string): void {
    const p = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(p) || p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p; this.loadEmployees();
  }
  nextPage(): void { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }
  previousPage(): void { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }

  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => { this.currentPage = 1; this.loadEmployees(); this.updateActiveFilters(); }, 350);
  }

  handleClearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm = ''; this.currentPage = 1;
    this.filter = { searchTerm: '', departmentId: '', designationId: '', managerId: '', employeeStatus: undefined, employmentType: undefined, gender: undefined, joiningDateFrom: undefined, joiningDateTo: undefined, pageNumber: 1, pageSize: this.pageSize, sortBy: 'EmployeeCode', sortDescending: false };
    clearAllFilters(this.gridApi); this.loadEmployees(); this.updateActiveFilters();
  }

  updateActiveFilters(): void {
    const colFilterCount = this.gridApi ? Object.keys(this.gridApi.getFilterModel()).length : 0;
    const additional = colFilterCount > 0 ? { 'Column filters': `${colFilterCount} active` } : undefined;
    const filters = getActiveFiltersSummary(this.searchTerm, undefined, additional);
    this.activeFilters = { hasActiveFilters: filters.length > 0, filters, count: filters.length };
  }

  addNewEmployee(): void { this.formMode = 'create'; this.selectedEmployeeId = null; this.showFormModal = true; this.cdr.detectChanges(); }
  closeFormModal(): void { this.showFormModal = false; this.selectedEmployeeId = null; this.cdr.detectChanges(); }
  closeDetailsModal(): void { this.showDetailsModal = false; this.selectedEmployeeId = null; this.cdr.detectChanges(); }
  onFormSuccess(): void { this.closeFormModal(); this.loadEmployees(); this.loadStats(); }

  onEditFromDetails(employeeId: string): void {
    this.closeDetailsModal(); this.formMode = 'edit'; this.selectedEmployeeId = employeeId; this.showFormModal = true; this.cdr.detectChanges();
  }
  onDeleteFromDetails(_id: string): void { this.closeDetailsModal(); this.loadEmployees(); this.loadStats(); }

  onOverlayClick(event: Event, modal: 'form' | 'details'): void {
    if (event.target === event.currentTarget) modal === 'form' ? this.closeFormModal() : this.closeDetailsModal();
  }

  viewDetails(employee: EmployeeResponseDto): void { this.selectedEmployeeId = employee.id; this.showDetailsModal = true; this.cdr.detectChanges(); }
  editDepartment(employee: EmployeeResponseDto): void { this.formMode = 'edit'; this.selectedEmployeeId = employee.id; this.showFormModal = true; this.cdr.detectChanges(); }

  async toggleStatus(employee: EmployeeResponseDto): Promise<void> {
    if (!employee?.id) return;
    const t = (k: string) => this.langService.t(k);
    const isActive = employee.employeeStatus === EmployeeStatus.Active || (employee as any).employeeStatusName?.toLowerCase() === 'active';
    const newStatus = isActive ? EmployeeStatus.Inactive : EmployeeStatus.Active;
    const actionText = isActive ? t('common.deactivate') : t('common.activate');

    const result = await Swal.fire({
      title: `${actionText}?`,
      html: `<p><strong>${employee.fullName}</strong></p>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: isActive ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `${t('common.yes')}, ${actionText}!`,
      cancelButtonText: t('common.no')
    });
    if (!result.isConfirmed) return;

    const updateDto: any = {
      firstNameMr: employee.firstNameMr, middleNameMr: employee.middleNameMr, lastNameMr: employee.lastNameMr,
      firstName: employee.firstName, lastName: employee.lastName,
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString() : undefined,
      gender: this.enumToString(Gender, employee.gender),
      email: employee.email, phoneNumber: employee.phoneNumber,
      address: employee.address, departmentId: employee.departmentId,
      designationId: employee.designationId,
      dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString() : undefined,
      employmentType: this.enumToString(EmploymentType, employee.employmentType),
      employeeStatus: this.enumToString(EmployeeStatus, newStatus)
    };

    this.employeeService.updateEmployee(employee.id, updateDto).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const statusLabel = isActive ? 'Inactive' : 'Active';
        const idx = this.rowData.findIndex(r => r.id === employee.id);
        if (idx !== -1) { this.rowData[idx] = { ...this.rowData[idx], employeeStatus: newStatus, employeeStatusName: statusLabel } as any; this.gridApi.setGridOption('rowData', [...this.rowData]); refreshGrid(this.gridApi); }
        this.loadStats(); this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: t('common.success'), timer: 2000, showConfirmButton: false });
      },
      error: (e: any) => Swal.fire({ icon: 'error', title: t('common.errorTitle'), text: e.error?.message || t('common.error') })
    });
  }

  async deleteDepartment(employee: EmployeeResponseDto): Promise<void> {
    const t = (k: string) => this.langService.t(k);
    const result = await Swal.fire({
      title: t('employee.swal.deleteTitle'),
      html: `<p><strong>"${employee?.fullName}"</strong></p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: t('common.yesDelete'),
      cancelButtonText: t('common.no')
    });
    if (!result.isConfirmed || !employee?.id) return;

    this.employeeService.deleteEmployee(employee.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const idx = this.rowData.findIndex(r => r.id === employee.id);
        if (idx !== -1) { this.rowData.splice(idx, 1); this.gridApi.setGridOption('rowData', [...this.rowData]); refreshGrid(this.gridApi); }
        this.totalItems = Math.max(0, this.totalItems - 1);
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        if (this.rowData.length === 0 && this.currentPage > 1) { this.currentPage--; this.loadEmployees(); }
        this.loadStats(); this.cdr.detectChanges();
        Swal.fire({ icon: 'success', title: t('common.deleted'), timer: 2500, showConfirmButton: false });
      },
      error: (e: any) => Swal.fire({ icon: 'error', title: t('common.errorTitle'), text: e.error?.message || t('common.error') })
    });
  }

  onGridAction(event: { action: string; data: any }): void {
    switch (event.action) {
      case 'edit': this.editDepartment(event.data); break;
      case 'view': this.viewDetails(event.data); break;
      case 'toggle': this.toggleStatus(event.data); break;
      case 'delete': this.deleteDepartment(event.data); break;
      case 'reassign': this.openReassignModal(event.data); break;
      case 'history': this.openHistoryModal(event.data); break;
    }
  }

  exportData(): void {
    exportToCsv(this.gridApi, 'employees');
    Swal.fire({ icon: 'success', title: this.langService.t('common.exported'), timer: 2000, showConfirmButton: false });
  }

  getEnumName(key: number, enumType: any): string { return enumType[key] || ''; }
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    const locale = this.langService.currentLang === 'mr' ? 'mr-IN'
      : this.langService.currentLang === 'hi' ? 'hi-IN' : 'en-GB';
    return new Date(date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}