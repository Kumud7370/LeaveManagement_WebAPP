import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridOptions,
  GridReadyEvent,
  GridApi,
  ICellRendererParams
} from 'ag-grid-community';
import Swal from 'sweetalert2';
import { DesignationService } from '../../../core/services/api/designation.api';
import { DesignationResponseDto, DesignationFilterDto } from '../../../core/Models/designation.model';
import {
  dateFormatter,
  applyQuickFilter,
  clearAllFilters,
  exportToCsv,
  refreshGrid,
  autoSizeAll,
} from '../../../utils/ag-grid-helpers';

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

  // ── Grid ──────────────────────────────────────────────────────────────────
  rowData: DesignationResponseDto[] = [];
  columnDefs: ColDef[] = [];
  private gridApi: GridApi | undefined;

  defaultColDef: ColDef = {
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
    minWidth: 80,
    floatingFilter: true,
    suppressFloatingFilterButton: false,
  };

  gridOptions: GridOptions = {
    pagination: false,
    domLayout: 'autoHeight',
    rowSelection: 'single',
    suppressRowClickSelection: true,
    suppressCellFocus: true,
    animateRows: true,
    enableBrowserTooltips: true,
    rowHeight: 52,
    headerHeight: 48,
    floatingFiltersHeight: 44,

    onCellClicked: (event: any) => {
      const target = event.event?.target as HTMLElement;
      if (!target) return;

      const actionBtn = target.closest
        ? (target.closest('[data-action]') as HTMLElement | null)
        : null;

      const action = actionBtn?.getAttribute('data-action');
      if (!action || !event.data) return;

      const designation: DesignationResponseDto = event.data;

      switch (action) {
        case 'view':   this.viewDesignation(designation);  break;
        case 'edit':   this.openEditModal(designation);    break;
        case 'toggle': this.toggleStatus(designation);     break;
        case 'delete': this.deleteDesignation(designation); break;
      }
    },
  };

  // ── Stat Counts ───────────────────────────────────────────────────────────
  activeCount   = 0;
  inactiveCount = 0;

  // ── Filter / Pagination ───────────────────────────────────────────────────
  searchTerm  = '';
  currentPage = 1;
  pageSize    = 10;
  totalCount  = 0;
  totalPages  = 0;

  // ── Loading ───────────────────────────────────────────────────────────────
  isLoading = false;

  // ── Modal ─────────────────────────────────────────────────────────────────
  isModalOpen           = false;
  isEditMode            = false;
  isLoadingForm         = false;
  isSubmitting          = false;
  designationForm!: FormGroup;
  selectedDesignationId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private designationService: DesignationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeGrid();
    this.loadDesignations();
  }

  ngOnDestroy(): void {
    this.gridApi = undefined;
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  initializeForm(): void {
    this.designationForm = this.fb.group({
      designationCode: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Z0-9\-_]+$/)]],
      designationName: ['', [Validators.required, Validators.maxLength(100)]],
      description:     ['', [Validators.maxLength(500)]],
      level:           [1,  [Validators.required, Validators.min(1), Validators.max(100)]],
      isActive:        [true],
    });
  }

  // ── Grid Setup ────────────────────────────────────────────────────────────
  initializeGrid(): void {
    this.columnDefs = [
      {
        headerName: 'Actions',
        width: 155,
        sortable: false,
        filter: false,
        floatingFilter: false,
        pinned: 'left',
        suppressKeyboardEvent: () => true,
        cellStyle: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '6px',
          paddingLeft: '14px',
          overflow: 'visible',
        },
        cellRenderer: (params: ICellRendererParams) => {
          const isActive = params.data?.isActive;
          const toggleTitle = isActive ? 'Deactivate' : 'Activate';
          const toggleColor = isActive ? '#22c55e' : '#94a3b8';
          return `
            <div style="display:flex;gap:8px;align-items:center;height:100%;pointer-events:all;">
              <button data-action="view" title="View"
                style="background:none;border:none;cursor:pointer;padding:2px;
                       display:flex;align-items:center;pointer-events:all;line-height:1;">
                <i class="bi bi-eye" style="font-size:1.1rem;color:#22c55e;pointer-events:none;"></i>
              </button>
              <button data-action="edit" title="Edit"
                style="background:none;border:none;cursor:pointer;padding:2px;
                       display:flex;align-items:center;pointer-events:all;line-height:1;">
                <i class="bi bi-pencil" style="font-size:1rem;color:#3b82f6;pointer-events:none;"></i>
              </button>
              <button data-action="toggle" title="${toggleTitle}"
                style="background:none;border:none;cursor:pointer;padding:2px;
                       display:flex;align-items:center;pointer-events:all;line-height:1;">
                <i class="bi bi-power" style="font-size:1.1rem;color:${toggleColor};pointer-events:none;"></i>
              </button>
              <button data-action="delete" title="Delete"
                style="background:none;border:none;cursor:pointer;padding:2px;
                       display:flex;align-items:center;pointer-events:all;line-height:1;">
                <i class="bi bi-trash" style="font-size:1rem;color:#ef4444;pointer-events:none;"></i>
              </button>
            </div>
          `;
        },
      },
      {
        headerName: 'Designation Name',
        field: 'designationName',
        flex: 1,
        minWidth: 180,
        cellStyle: { fontWeight: '600', color: '#111827', fontSize: '0.875rem' },
      },
      {
        headerName: 'Code',
        field: 'designationCode',
        width: 140,
        cellRenderer: (params: ICellRendererParams) =>
          params.value
            ? `<span style="font-family:'Monaco','Courier New',monospace;font-size:0.82rem;
                             font-weight:600;color:#374151;">${params.value}</span>`
            : '<span style="color:#9ca3af;">—</span>',
      },
      {
        headerName: 'Level',
        field: 'level',
        width: 100,
        filter: 'agNumberColumnFilter',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams) =>
          params.value != null
            ? `<span style="display:inline-flex;align-items:center;justify-content:center;
                            width:2rem;height:2rem;border-radius:50%;font-size:0.8rem;
                            font-weight:700;background:#dbeafe;color:#1d4ed8;">
                 ${params.value}
               </span>`
            : '<span style="color:#9ca3af;">—</span>',
      },
      {
        headerName: 'Employees',
        field: 'employeeCount',
        width: 120,
        filter: 'agNumberColumnFilter',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams) => {
          const count = params.value ?? 0;
          return `<span style="display:inline-flex;align-items:center;justify-content:center;
                               padding:0.2rem 0.65rem;border-radius:999px;font-size:0.78rem;
                               font-weight:600;background:#e0e7ff;color:#4338ca;cursor:default;"
                        title="${count} employee(s)">
                    ${count} Employee(s)
                  </span>`;
        },
      },
      {
        headerName: 'Description',
        field: 'description',
        flex: 1,
        minWidth: 160,
        cellStyle: { color: '#6b7280', fontSize: '0.85rem' },
        cellRenderer: (params: ICellRendererParams) =>
          params.value
            ? `<span style="color:#6b7280;">${params.value}</span>`
            : '<span style="color:#d1d5db;">—</span>',
      },
      {
        headerName: 'Active',
        field: 'isActive',
        width: 120,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams) => {
          const isActive = params.value;
          if (isActive) {
            return `<span style="font-size:0.875rem;font-weight:700;color:#16a34a;letter-spacing:0.01em;">Active</span>`;
          } else {
            return `<span style="font-size:0.875rem;font-weight:700;color:#dc2626;letter-spacing:0.01em;">Inactive</span>`;
          }
        },
      },
      {
        headerName: 'Created At',
        field: 'createdAt',
        width: 170,
        valueFormatter: (params: any) => {
          if (!params.value) return '';
          return new Date(params.value).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        },
        cellStyle: { color: '#6b7280', fontSize: '0.82rem' },
      },
    ];
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
  }

  // ── Data Loading ──────────────────────────────────────────────────────────
  loadDesignations(): void {
    this.isLoading = true;

    const filter: DesignationFilterDto = {
      searchTerm:     this.searchTerm || undefined,
      pageNumber:     this.currentPage,
      pageSize:       this.pageSize,
      sortBy:         'createdAt',
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

        this.loadStatCounts();
        refreshGrid(this.gridApi);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading designations:', error);
        let msg = 'Failed to load designations. ';
        if (error.status === 0)        msg += 'Cannot connect to the server.';
        else if (error.status === 401) msg += 'Unauthorized. Please login again.';
        else if (error.status === 404) msg += 'API endpoint not found.';
        else if (error.error?.message) msg += error.error.message;

        Swal.fire({ icon: 'error', title: 'Error Loading Data', text: msg });
        this.isLoading     = false;
        this.rowData       = [];
        this.totalCount    = 0;
        this.totalPages    = 0;
        this.activeCount   = 0;
        this.inactiveCount = 0;
      },
    });
  }

  private loadStatCounts(): void {
    this.designationService.getFilteredDesignations({ isActive: true,  pageNumber: 1, pageSize: 1 }).subscribe({
      next: (r) => { this.activeCount = r?.pagination?.totalCount ?? 0; }
    });
    this.designationService.getFilteredDesignations({ isActive: false, pageNumber: 1, pageSize: 1 }).subscribe({
      next: (r) => { this.inactiveCount = r?.pagination?.totalCount ?? 0; }
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────
  onSearchChange(): void {
    this.currentPage = 1;
    applyQuickFilter(this.gridApi, this.searchTerm);
    this.loadDesignations();
  }

  clearFilters(): void {
    this.searchTerm  = '';
    this.currentPage = 1;
    clearAllFilters(this.gridApi);
    this.loadDesignations();
  }

  refreshData(): void {
    this.loadDesignations();
  }

  exportData(): void {
    if (this.rowData.length === 0) {
      Swal.fire('No Data', 'There is no data to export.', 'info');
      return;
    }
    exportToCsv(this.gridApi, 'designations');
  }

  // ── View ──────────────────────────────────────────────────────────────────
  viewDesignation(designation: DesignationResponseDto): void {
    const id = designation.designationId || (designation as any).id || (designation as any).Id;
    if (!id) { Swal.fire('Error', 'Could not determine designation ID.', 'error'); return; }
    this.router.navigate(['/designations', id]);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  openCreateModal(): void {
    this.isModalOpen          = true;
    this.isEditMode           = false;
    this.selectedDesignationId = null;
    this.designationForm.reset({ designationCode: '', designationName: '', description: '', level: 1, isActive: true });
  }

  openEditModal(designation: DesignationResponseDto): void {
    const id = designation.designationId || (designation as any).id || (designation as any).Id;
    if (!id) { Swal.fire('Error', 'Could not determine designation ID.', 'error'); return; }

    this.isModalOpen           = true;
    this.isEditMode            = true;
    this.selectedDesignationId = id;
    this.isLoadingForm         = true;

    this.designationService.getDesignationById(id).subscribe({
      next: (response) => {
        const data = response.data;
        this.designationForm.patchValue({
          designationCode: data.designationCode,
          designationName: data.designationName,
          description:     data.description || '',
          level:           data.level,
          isActive:        data.isActive,
        });
        this.isLoadingForm = false;
      },
      error: () => {
        Swal.fire('Error', 'Failed to load designation details.', 'error');
        this.closeModal();
      },
    });
  }

  closeModal(): void {
    this.isModalOpen           = false;
    this.isEditMode            = false;
    this.selectedDesignationId = null;
    this.isLoadingForm         = false;
    this.isSubmitting          = false;
    this.designationForm.reset({ designationCode: '', designationName: '', description: '', level: 1, isActive: true });
  }

  onSubmit(): void {
    if (this.designationForm.invalid) {
      this.markFormGroupTouched(this.designationForm);
      Swal.fire('Validation Error', 'Please fill all required fields correctly.', 'warning');
      return;
    }

    this.isSubmitting = true;
    const formValue   = this.designationForm.value;

    if (this.isEditMode && this.selectedDesignationId) {
      this.designationService.updateDesignation(this.selectedDesignationId, formValue).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Updated!', text: 'Designation updated successfully.', timer: 1500, showConfirmButton: false });
          this.closeModal();
          this.loadDesignations();
        },
        error: (error) => {
          Swal.fire('Error', error.error?.message || 'Failed to update designation.', 'error');
          this.isSubmitting = false;
        },
      });
    } else {
      this.designationService.createDesignation(formValue).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Created!', text: 'Designation created successfully.', timer: 1500, showConfirmButton: false });
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
    const action      = designation.isActive ? 'deactivate' : 'activate';
    const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
    const id          = designation.designationId || (designation as any).id;
    if (!id) { Swal.fire('Error', 'Could not determine designation ID.', 'error'); return; }

    Swal.fire({
      title:              `${actionLabel} Designation?`,
      text:               `Are you sure you want to ${action} "${designation.designationName}"?`,
      icon:               'warning',
      showCancelButton:   true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  `Yes, ${action} it!`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.designationService.toggleDesignationStatus(id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Success!', text: `Designation ${action}d successfully.`, timer: 1500, showConfirmButton: false });
            this.loadDesignations();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'Failed to toggle status.', 'error');
          },
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
      title:              'Delete Designation?',
      html:               `Are you sure you want to delete <strong>"${designation.designationName}"</strong>?<br>This action cannot be undone.`,
      icon:               'warning',
      showCancelButton:   true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.designationService.deleteDesignation(id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Designation has been deleted.', timer: 1500, showConfirmButton: false });
            if (this.rowData.length === 1 && this.currentPage > 1) this.currentPage--;
            this.loadDesignations();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'Failed to delete designation.', 'error');
          },
        });
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      control?.markAsDirty();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.designationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.designationForm.get(fieldName);
    if (control?.hasError('required'))   return `${this.getFieldLabel(fieldName)} is required`;
    if (control?.hasError('maxlength'))  return `Maximum ${control.errors?.['maxlength'].requiredLength} characters allowed`;
    if (control?.hasError('pattern'))    return 'Only uppercase letters, numbers, hyphens, and underscores are allowed';
    if (control?.hasError('min'))        return 'Minimum value is 1';
    if (control?.hasError('max'))        return 'Maximum value is 100';
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      designationCode: 'Designation Code',
      designationName: 'Designation Name',
      description:     'Description',
      level:           'Level',
    };
    return labels[fieldName] || fieldName;
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadDesignations();
  }

  onPageSizeChange(event: Event): void {
    this.pageSize    = parseInt((event.target as HTMLSelectElement).value, 10);
    this.currentPage = 1;
    this.loadDesignations();
  }

  get startRecord(): number {
    return this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let endPage   = Math.min(this.totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  }
}