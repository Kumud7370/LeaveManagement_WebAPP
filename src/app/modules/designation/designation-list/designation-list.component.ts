
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridReadyEvent,
  GridApi,
  ICellRendererParams,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz
} from 'ag-grid-community';
import Swal from 'sweetalert2';
import { DesignationService } from '../../../core/services/api/designation.api';
import { DepartmentService } from '../../../core/services/api/department.api';
import { DesignationResponseDto, DesignationFilterDto } from '../../../core/Models/designation.model';
import { LanguageService } from '../../../core/services/api/language.api';
import {
  applyQuickFilter,
  clearAllFilters,
  exportToCsv,
  refreshGrid,
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const designationGridTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff',
  foregroundColor: '#1f2937',
  borderColor: '#e5e7eb',
  headerBackgroundColor: '#f9fafb',
  headerTextColor: '#374151',
  oddRowBackgroundColor: '#ffffff',
  rowHoverColor: '#f8faff',
  selectedRowBackgroundColor: '#dbeafe',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize: 13,
  columnBorder: true,
  headerColumnBorder: true,
  headerColumnBorderHeight: '50%',
  headerColumnResizeHandleColor: '#9ca3af',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth: 2,
  cellHorizontalPaddingScale: 0.8,
});

@Component({
  selector: 'app-designation-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AgGridAngular,
  ],
  templateUrl: './designation-list.component.html',
  styleUrls: ['./designation-list.component.scss'],
})
export class DesignationListComponent implements OnInit, OnDestroy {
  @ViewChild(AgGridAngular, { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;
  readonly gridTheme = designationGridTheme;

  rowData: DesignationResponseDto[] = [];
  columnDefs: ColDef[] = [];
  private gridApi: GridApi | undefined;
  private resizeObserver: ResizeObserver | null = null;

  defaultColDef: ColDef = {
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
    minWidth: 80,
    floatingFilter: true,
    suppressFloatingFilterButton: false,
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  activeCount = 0;
  inactiveCount = 0;

  // ─── Filters ──────────────────────────────────────────────────────────────
  searchTerm = '';
  selectedDepartmentId = '';
  departments: { id: string; name: string }[] = [];
  departmentsLoading = false;

  // ─── Pagination ───────────────────────────────────────────────────────────
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  isLoading = false;

  // ─── Modal ────────────────────────────────────────────────────────────────
  isModalOpen = false;
  isEditMode = false;
  isLoadingForm = false;
  isSubmitting = false;
  designationForm!: FormGroup;
  selectedDesignationId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private designationService: DesignationService,
    private departmentService: DepartmentService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public langService: LanguageService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.initializeGrid();
    this.loadDepartments();
    this.loadDesignations();

    this.langService.lang$.subscribe(() => {
      this.initializeGrid();
      if (this.gridApi) this.gridApi.setGridOption('columnDefs', this.columnDefs);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.gridApi = undefined;
  }

  // ─── Departments ──────────────────────────────────────────────────────────
  loadDepartments(): void {
    this.departmentsLoading = true;
    this.departmentService.getActiveDepartments().subscribe({
      next: (r: any) => {
        const raw = r?.data || r;
        this.departments = (Array.isArray(raw) ? raw : []).map((d: any) => ({
          id: d.departmentId ?? d.id ?? '',
          name: this.langService.currentLang === 'mr' ? (d.departmentNameMr ?? d.departmentName ?? d.name ?? '')
            : this.langService.currentLang === 'hi' ? (d.departmentNameHi ?? d.departmentName ?? d.name ?? '')
              : (d.departmentNameEn ?? d.departmentName ?? d.name ?? '')
        }));
        this.departmentsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.departmentsLoading = false; }
    });
  }

  onDepartmentFilterChange(departmentId: string): void {
    this.selectedDepartmentId = departmentId;
    this.currentPage = 1;
    this.loadDesignations();
  }

  asSelect(t: EventTarget | null): HTMLSelectElement {
    return t as HTMLSelectElement;
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  initializeForm(): void {
    this.designationForm = this.fb.group({
      designationCode: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Z0-9\-_]+$/)]],
      // Trilingual name fields — all required
      designationNameMr: ['', [Validators.required, Validators.maxLength(100)]],
      designationNameEn: ['', [Validators.required, Validators.maxLength(100)]],
      designationNameHi: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      level: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      isActive: [true],
      departmentId: [''],
    });
  }

  // ─── Grid ─────────────────────────────────────────────────────────────────
  initializeGrid(): void {
    this.columnDefs = [
      {
        headerName: this.langService.t('designation.col.actions'),
        width: 120, minWidth: 110, maxWidth: 120,
        sortable: false, filter: false, floatingFilter: false,
        suppressFloatingFilterButton: true,
        pinned: 'left', suppressSizeToFit: true,
        suppressKeyboardEvent: () => true,
        cellRenderer: (params: ICellRendererParams) => {
          const isActive = params.data?.isActive;
          const toggleColor = isActive ? '#22c55e' : '#94a3b8';
          const toggleTitle = isActive
            ? this.langService.t('common.deactivate')
            : this.langService.t('common.activate');
          return `
            <div style="display:flex;gap:8px;align-items:center;height:100%;padding:0 4px;">
              <button data-action="edit" title="${this.langService.t('common.edit')}"
                style="width:28px;height:28px;background:transparent;border:none;cursor:pointer;
                       display:flex;align-items:center;justify-content:center;border-radius:4px;transition:background 0.15s;">
                <i class="bi bi-pencil" style="font-size:1rem;color:#3b82f6;pointer-events:none;"></i>
              </button>
              <button data-action="toggle" title="${toggleTitle}"
                style="width:28px;height:28px;background:transparent;border:none;cursor:pointer;
                       display:flex;align-items:center;justify-content:center;border-radius:4px;transition:background 0.15s;">
                <i class="bi bi-power" style="font-size:1.1rem;color:${toggleColor};pointer-events:none;"></i>
              </button>
              <button data-action="delete" title="${this.langService.t('common.delete')}"
                style="width:28px;height:28px;background:transparent;border:none;cursor:pointer;
                       display:flex;align-items:center;justify-content:center;border-radius:4px;transition:background 0.15s;">
                <i class="bi bi-trash" style="font-size:1rem;color:#ef4444;pointer-events:none;"></i>
              </button>
            </div>`;
        },
      },
      {
        headerName: this.langService.t('designation.col.name'),
        // Show the name appropriate for the current language
        valueGetter: (params: any) => {
          const lang = this.langService.currentLang;
          return lang === 'hi' ? (params.data?.designationNameHi || params.data?.designationName)
            : lang === 'en' ? (params.data?.designationNameEn || params.data?.designationName)
              : (params.data?.designationNameMr || params.data?.designationName);
        },
        flex: 1, minWidth: 180,
        cellStyle: { fontWeight: '600', color: '#1f2937', fontSize: '13px' },
      },
      {
        headerName: this.langService.t('designation.col.code'),
        field: 'designationCode',
        width: 140,
        cellRenderer: (params: ICellRendererParams) =>
          params.value
            ? `<span style="font-family:'Monaco','Courier New',monospace;font-size:0.82rem;font-weight:600;color:#374151;">${params.value}</span>`
            : '<span style="color:#9ca3af;">—</span>',
      },
      {
        headerName: this.langService.t('designation.col.dept'),
        field: 'departmentName',
        width: 170, minWidth: 140,
        cellRenderer: (params: ICellRendererParams) =>
          params.value
            ? `<span style="color:#374151;font-size:13px;">${params.value}</span>`
            : '<span style="color:#d1d5db;font-size:13px;">—</span>',
      },
      {
        headerName: this.langService.t('designation.col.level'),
        field: 'level',
        width: 100,
        filter: 'agNumberColumnFilter',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams) =>
          params.value != null
            ? `<span style="display:inline-flex;align-items:center;justify-content:center;
                            width:2rem;height:2rem;border-radius:50%;font-size:0.8rem;
                            font-weight:700;background:#dbeafe;color:#1d4ed8;">${params.value}</span>`
            : '<span style="color:#9ca3af;">—</span>',
      },
      {
        headerName: this.langService.t('designation.col.employees'),
        field: 'employeeCount',
        width: 140,
        filter: 'agNumberColumnFilter',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams) => {
          const count = params.value ?? 0;
          const label = this.langService.t('designation.empCount');
          return `<span style="display:inline-flex;align-items:center;justify-content:center;
                               padding:0.2rem 0.65rem;border-radius:999px;font-size:0.78rem;
                               font-weight:600;background:#e0e7ff;color:#4338ca;">${count} ${label}</span>`;
        },
      },
      {
        headerName: this.langService.t('designation.col.description'),
        field: 'description',
        flex: 1, minWidth: 160,
        cellRenderer: (params: ICellRendererParams) =>
          params.value
            ? `<span style="color:#6b7280;">${params.value}</span>`
            : '<span style="color:#d1d5db;">—</span>',
      },
      {
        headerName: this.langService.t('designation.col.active'),
        field: 'isActive',
        width: 120,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams) =>
          params.value
            ? `<span style="font-size:13px;font-weight:700;color:#16a34a;">
                 ${this.langService.t('designation.status.active')}</span>`
            : `<span style="font-size:13px;font-weight:700;color:#dc2626;">
                 ${this.langService.t('designation.status.inactive')}</span>`,
      },
      {
        headerName: this.langService.t('designation.col.createdAt'),
        field: 'createdAt',
        width: 180,
        valueFormatter: (params: any) => {
          if (!params.value) return '';
          const locale = this.langService.currentLang === 'mr' ? 'mr-IN'
            : this.langService.currentLang === 'hi' ? 'hi-IN' : 'en-IN';
          return new Date(params.value).toLocaleString(locale, {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });
        },
        cellStyle: { color: '#6b7280', fontSize: '12px' },
      },
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    this.gridApi.addEventListener('cellClicked', (event: any) => {
      const target = event.event?.target as HTMLElement;
      if (!target) return;
      const actionBtn = target.closest('[data-action]') as HTMLElement | null;
      const action = actionBtn?.getAttribute('data-action');
      if (!action || !event.data) return;
      const designation: DesignationResponseDto = event.data;
      switch (action) {
        case 'edit': this.openEditModal(designation); break;
        case 'toggle': this.toggleStatus(designation); break;
        case 'delete': this.deleteDesignation(designation); break;
      }
    });

    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const hostEl = this.agGridElement?.nativeElement;
    const container = (hostEl?.closest('.grid-wrapper') as HTMLElement) ?? hostEl;

    if (container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.gridApi) requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
      });
      this.resizeObserver.observe(container);
    }
  }

  // ─── Data Loading ─────────────────────────────────────────────────────────
  loadDesignations(): void {
    this.isLoading = true;

    if (this.selectedDepartmentId) {
      this.designationService.getDesignationsByDepartment(this.selectedDepartmentId).subscribe({
        next: (r: any) => {
          const arr: DesignationResponseDto[] = r?.data ?? [];
          this.rowData = this.searchTerm
            ? arr.filter(d =>
              d.designationName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
              d.designationCode?.toLowerCase().includes(this.searchTerm.toLowerCase()))
            : arr;
          this.totalCount = this.rowData.length;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
          this.pushToGrid();
          this.loadStatCounts();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => this.handleLoadError(err)
      });
    } else {
      const filter: DesignationFilterDto = {
        searchTerm: this.searchTerm || undefined,
        pageNumber: this.currentPage,
        pageSize: this.pageSize,
        sortBy: 'createdAt',
        sortDescending: true,
      };
      this.designationService.getFilteredDesignations(filter).subscribe({
        next: (response) => {
          this.rowData = response?.data ?? [];
          const pagination = response?.pagination;
          if (pagination) {
            this.totalCount = pagination.totalCount ?? 0;
            this.totalPages = pagination.totalPages ?? 0;
          } else {
            this.totalCount = this.rowData.length;
            this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          }
          this.pushToGrid();
          this.loadStatCounts();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => this.handleLoadError(err)
      });
    }
  }

  private pushToGrid(): void {
    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.rowData);
      refreshGrid(this.gridApi);
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
    }
  }

  private handleLoadError(error: any): void {
    let msg = 'Failed to load designations. ';
    if (error.status === 0) msg += 'Cannot connect to the server.';
    else if (error.status === 401) msg += 'Unauthorized. Please login again.';
    else if (error.status === 404) msg += 'API endpoint not found.';
    else if (error.error?.message) msg += error.error.message;
    Swal.fire({ icon: 'error', title: 'Error Loading Data', text: msg });
    this.isLoading = false;
    this.rowData = [];
    this.totalCount = 0; this.totalPages = 0;
    this.activeCount = 0; this.inactiveCount = 0;
    this.cdr.detectChanges();
  }

  private loadStatCounts(): void {
    this.designationService.getFilteredDesignations({ isActive: true, pageNumber: 1, pageSize: 1 }).subscribe({
      next: (r) => { this.activeCount = r?.pagination?.totalCount ?? 0; this.cdr.detectChanges(); }
    });
    this.designationService.getFilteredDesignations({ isActive: false, pageNumber: 1, pageSize: 1 }).subscribe({
      next: (r) => { this.inactiveCount = r?.pagination?.totalCount ?? 0; this.cdr.detectChanges(); }
    });
  }

  // ─── Search & Filter ──────────────────────────────────────────────────────
  onSearchChange(): void {
    this.currentPage = 1;
    if (!this.selectedDepartmentId) applyQuickFilter(this.gridApi, this.searchTerm);
    this.loadDesignations();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedDepartmentId = '';
    this.currentPage = 1;
    clearAllFilters(this.gridApi);
    this.loadDesignations();
  }

  refreshData(): void { this.loadDesignations(); }

  exportData(): void {
    if (this.rowData.length === 0) {
      Swal.fire('No Data', 'There is no data to export.', 'info');
      return;
    }
    exportToCsv(this.gridApi, 'designations');
  }

  // ─── Modal ────────────────────────────────────────────────────────────────
  /** Empty form for creating a new designation */
  private readonly emptyForm = {
    designationCode: '',
    designationNameMr: '',
    designationNameEn: '',
    designationNameHi: '',
    description: '',
    level: 1,
    isActive: true,
    departmentId: ''
  };

  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.selectedDesignationId = null;
    this.designationForm.reset(this.emptyForm);
  }

  openEditModal(designation: DesignationResponseDto): void {
    const id = designation.designationId || (designation as any).id || (designation as any).Id;
    if (!id) { Swal.fire('Error', 'Could not determine designation ID.', 'error'); return; }

    this.isModalOpen = true;
    this.isEditMode = true;
    this.selectedDesignationId = id;
    this.isLoadingForm = true;

    this.designationService.getDesignationById(id).subscribe({
      next: (response) => {
        const data = response.data;
        this.designationForm.patchValue({
          designationCode: data.designationCode,
          // Populate trilingual fields; fall back to the single-field value if
          // the API has not yet been updated to return them separately.
          designationNameMr: (data as any).designationNameMr || data.designationName || '',
          designationNameEn: (data as any).designationNameEn || data.designationName || '',
          designationNameHi: (data as any).designationNameHi || '',
          description: data.description || '',
          level: data.level,
          isActive: data.isActive,
          departmentId: (data as any).departmentId || '',
        });
        this.isLoadingForm = false;
        this.cdr.detectChanges();
      },
      error: () => {
        Swal.fire('Error', 'Failed to load designation details.', 'error');
        this.closeModal();
      },
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditMode = false;
    this.selectedDesignationId = null;
    this.isLoadingForm = false;
    this.isSubmitting = false;
    this.designationForm.reset(this.emptyForm);
  }

  onSubmit(): void {
    if (this.designationForm.invalid) {
      this.markFormGroupTouched(this.designationForm);
      Swal.fire('Validation Error', 'Please fill all required fields correctly.', 'warning');
      return;
    }

    this.isSubmitting = true;
    const v = this.designationForm.value;

    // Build the payload:
    // – keep `designationName` as the Marathi name for backward-compat
    // – add the three explicit language fields
    const payload = {
      ...v,
      designationName: v.designationNameMr,  // primary / backward-compat field
    };

    if (this.isEditMode && this.selectedDesignationId) {
      this.designationService.updateDesignation(this.selectedDesignationId, payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success', title: this.langService.t('common.updated') || 'Updated!',
            text: 'Designation updated successfully.', timer: 1500, showConfirmButton: false
          });
          this.closeModal();
          this.loadDesignations();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'Failed to update designation.', 'error');
          this.isSubmitting = false;
        },
      });
    } else {
      this.designationService.createDesignation(payload).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success', title: this.langService.t('common.created') || 'Created!',
            text: 'Designation created successfully.', timer: 1500, showConfirmButton: false
          });
          this.closeModal();
          this.loadDesignations();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'Failed to create designation.', 'error');
          this.isSubmitting = false;
        },
      });
    }
  }

  toggleStatus(designation: DesignationResponseDto): void {
    const action = designation.isActive ? 'deactivate' : 'activate';
    const id = designation.designationId || (designation as any).id;
    if (!id) { Swal.fire('Error', 'Could not determine designation ID.', 'error'); return; }

    Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Designation?`,
      text: `Are you sure you want to ${action} "${designation.designationName}"?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#3b82f6', cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it!`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.designationService.toggleDesignationStatus(id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Success!', text: `Designation ${action}d successfully.`, timer: 1500, showConfirmButton: false });
            this.loadDesignations();
          },
          error: (error) => Swal.fire('Error', error.error?.message || 'Failed to toggle status.', 'error'),
        });
      }
    });
  }

  deleteDesignation(designation: DesignationResponseDto): void {
    const id = designation.designationId || (designation as any).id;
    if (!id) { Swal.fire('Error', 'Could not determine designation ID.', 'error'); return; }

    if ((designation.employeeCount ?? 0) > 0) {
      Swal.fire('Cannot Delete', `"${designation.designationName}" is assigned to ${designation.employeeCount} employee(s) and cannot be deleted.`, 'warning');
      return;
    }

    Swal.fire({
      title: 'Delete Designation?',
      html: `Are you sure you want to delete <strong>"${designation.designationName}"</strong>?<br>This action cannot be undone.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.designationService.deleteDesignation(id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Designation has been deleted.', timer: 1500, showConfirmButton: false });
            if (this.rowData.length === 1 && this.currentPage > 1) this.currentPage--;
            this.loadDesignations();
          },
          error: (error) => Swal.fire('Error', error.error?.message || 'Failed to delete designation.', 'error'),
        });
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      formGroup.get(key)?.markAsTouched();
      formGroup.get(key)?.markAsDirty();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.designationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.designationForm.get(fieldName);
    if (control?.hasError('required')) return `${this.getFieldLabel(fieldName)} is required`;
    if (control?.hasError('maxlength')) return `Maximum ${control.errors?.['maxlength'].requiredLength} characters allowed`;
    if (control?.hasError('pattern')) return 'Only uppercase letters, numbers, hyphens, and underscores are allowed';
    if (control?.hasError('min')) return 'Minimum value is 1';
    if (control?.hasError('max')) return 'Maximum value is 100';
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      designationCode: 'Designation Code',
      designationNameMr: 'Designation Name (Marathi)',
      designationNameEn: 'Designation Name (English)',
      designationNameHi: 'Designation Name (Hindi)',
      description: 'Description',
      level: 'Level',
    };
    return labels[fieldName] || fieldName;
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadDesignations();
  }

  onPageSizeChange(event: Event): void {
    this.pageSize = parseInt((event.target as HTMLSelectElement).value, 10);
    this.currentPage = 1;
    this.loadDesignations();
  }

  get startRecord(): number {
    return this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getDepartmentName(id: string): string {
    return this.departments.find(d => d.id === id)?.name ?? id;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }
}