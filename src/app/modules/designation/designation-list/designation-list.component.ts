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
import { StatusCellRendererComponent } from '../../../shared/status-cell-renderer.component';

// ── AG Grid Helpers ──────────────────────────────────────────────────────────
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
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 100,
  };

  gridOptions: GridOptions = {
    pagination: false,
    domLayout: 'autoHeight',
    rowSelection: 'single',
    suppressRowClickSelection: true,
    suppressCellFocus: true,
    animateRows: true,
    enableBrowserTooltips: true,
    rowHeight: 60,
    headerHeight: 50,

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
        case 'edit':
          this.openEditModal(designation);
          break;
        case 'toggle':
          this.toggleStatus(designation);
          break;
        case 'delete':
          this.deleteDesignation(designation);
          break;
      }
    },
  };

  // ── Filter / Pagination ───────────────────────────────────────────────────
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;

  // ── Loading ───────────────────────────────────────────────────────────────
  isLoading = false;

  // ── Modal ─────────────────────────────────────────────────────────────────
  isModalOpen = false;
  isEditMode = false;
  isLoadingForm = false;
  isSubmitting = false;
  designationForm!: FormGroup;
  selectedDesignationId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private designationService: DesignationService,
    private router: Router
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.initializeForm();
    this.initializeGrid();
    this.loadDesignations();
  }

  ngOnDestroy(): void {
    this.gridApi = undefined;
  }

  // ── Form Setup ────────────────────────────────────────────────────────────
  initializeForm(): void {
    this.designationForm = this.fb.group({
      designationCode: [
        '',
        [
          Validators.required,
          Validators.maxLength(50),
          Validators.pattern(/^[A-Z0-9\-_]+$/),
        ],
      ],
      designationName: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      level: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
      isActive: [true],
    });
  }

  // ── Grid Setup ────────────────────────────────────────────────────────────
  initializeGrid(): void {
    this.columnDefs = [
      {
        headerName: 'ACTIONS',
        width: 150,
        sortable: false,
        filter: false,
        pinned: 'left',
        suppressKeyboardEvent: () => true,
        cellStyle: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        cellRenderer: (params: ICellRendererParams) => {
          const isActive = params.data?.isActive;
          const toggleTitle = isActive ? 'Deactivate' : 'Activate';
          const toggleBg = isActive ? '#fef9c3' : '#dcfce7';
          const toggleColor = isActive ? '#854d0e' : '#166534';
          return `
            <div style="display:flex;gap:0.4rem;align-items:center;height:100%;pointer-events:all;">
              <button data-action="edit" title="Edit"
                style="width:2rem;height:2rem;border:none;border-radius:0.375rem;
                       cursor:pointer;display:flex;align-items:center;justify-content:center;
                       background:#fef3c7;color:#92400e;font-size:0.875rem;pointer-events:all;">
                <i class="bi bi-pencil" style="pointer-events:none;"></i>
              </button>
              <button data-action="toggle" title="${toggleTitle}"
                style="width:2rem;height:2rem;border:none;border-radius:0.375rem;
                       cursor:pointer;display:flex;align-items:center;justify-content:center;
                       background:${toggleBg};color:${toggleColor};font-size:0.875rem;pointer-events:all;">
                <i class="bi bi-power" style="pointer-events:none;"></i>
              </button>
              <button data-action="delete" title="Delete"
                style="width:2rem;height:2rem;border:none;border-radius:0.375rem;
                       cursor:pointer;display:flex;align-items:center;justify-content:center;
                       background:#fee2e2;color:#991b1b;font-size:0.875rem;pointer-events:all;">
                <i class="bi bi-trash" style="pointer-events:none;"></i>
              </button>
            </div>
          `;
        },
      },
      {
        headerName: 'CODE',
        field: 'designationCode',
        width: 160,
        cellRenderer: (params: ICellRendererParams) =>
          params.value
            ? `<span style="font-family:'Monaco','Courier New',monospace;background:#f1f5f9;
                             padding:0.3rem 0.65rem;border-radius:0.375rem;font-size:0.85rem;
                             font-weight:600;color:#334155;">${params.value}</span>`
            : '—',
      },
      {
        headerName: 'DESIGNATION NAME',
        field: 'designationName',
        width: 260,
        cellStyle: { fontWeight: '500', color: '#1e293b' },
      },
      {
        headerName: 'DESCRIPTION',
        field: 'description',
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: ICellRendererParams) => params.value || '—',
      },
      {
        headerName: 'LEVEL',
        field: 'level',
        width: 110,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams) =>
          `<span style="display:inline-flex;align-items:center;justify-content:center;
                        padding:0.3rem 0.65rem;border-radius:0.375rem;font-size:0.8rem;
                        font-weight:600;background:#dbeafe;color:#1e40af;">
             ${params.value ?? '—'}
           </span>`,
      },
      {
        headerName: 'EMPLOYEES',
        field: 'employeeCount',
        width: 130,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams) =>
          `<span style="display:inline-flex;align-items:center;justify-content:center;
                        padding:0.3rem 0.65rem;border-radius:0.375rem;font-size:0.8rem;
                        font-weight:600;background:#e0e7ff;color:#3730a3;">
             ${params.value ?? 0}
           </span>`,
      },
      {
        headerName: 'STATUS',
        field: 'isActive',
        width: 120,
        cellRenderer: StatusCellRendererComponent,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      },
      {
        headerName: 'CREATED',
        field: 'createdAt',
        width: 145,
        // ✅ Using shared dateFormatter helper
        valueFormatter: dateFormatter,
      },
    ];
  }

  // ── Grid Ready ────────────────────────────────────────────────────────────
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    // ✅ Auto-size columns on ready using helper
    autoSizeAll(this.gridApi);
  }

  // ── Data Loading ──────────────────────────────────────────────────────────
  loadDesignations(): void {
    this.isLoading = true;

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

        // ✅ Refresh grid cells after data update using helper
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
        this.isLoading = false;
        this.rowData = [];
        this.totalCount = 0;
        this.totalPages = 0;
      },
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────
  onSearchChange(): void {
    this.currentPage = 1;
    // ✅ Apply quick filter via helper for instant client-side filtering feedback
    applyQuickFilter(this.gridApi, this.searchTerm);
    // Then reload from server
    this.loadDesignations();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    // ✅ Clear all AG Grid filters using helper
    clearAllFilters(this.gridApi);
    this.loadDesignations();
  }

  refreshData(): void {
    this.loadDesignations();
  }

  // ── Export ────────────────────────────────────────────────────────────────
  exportData(): void {
    if (this.rowData.length === 0) {
      Swal.fire('No Data', 'There is no data to export.', 'info');
      return;
    }

    // ✅ Use AG Grid's built-in CSV export helper (excludes 'actions' column automatically)
    exportToCsv(this.gridApi, 'designations');
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.selectedDesignationId = null;
    this.designationForm.reset({
      designationCode: '',
      designationName: '',
      description: '',
      level: 1,
      isActive: true,
    });
  }

  openEditModal(designation: DesignationResponseDto): void {
    const id =
      designation.designationId ||
      (designation as any).id ||
      (designation as any).Id;

    if (!id) {
      Swal.fire('Error', 'Could not determine designation ID.', 'error');
      return;
    }

    this.isModalOpen = true;
    this.isEditMode = true;
    this.selectedDesignationId = id;
    this.isLoadingForm = true;

    this.designationService.getDesignationById(id).subscribe({
      next: (response) => {
        const data = response.data;
        this.designationForm.patchValue({
          designationCode: data.designationCode,
          designationName: data.designationName,
          description: data.description || '',
          level: data.level,
          isActive: data.isActive,
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
    this.isModalOpen = false;
    this.isEditMode = false;
    this.selectedDesignationId = null;
    this.isLoadingForm = false;
    this.isSubmitting = false;
    this.designationForm.reset({
      designationCode: '',
      designationName: '',
      description: '',
      level: 1,
      isActive: true,
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.designationForm.invalid) {
      this.markFormGroupTouched(this.designationForm);
      Swal.fire('Validation Error', 'Please fill all required fields correctly.', 'warning');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.designationForm.value;

    if (this.isEditMode && this.selectedDesignationId) {
      this.designationService
        .updateDesignation(this.selectedDesignationId, formValue)
        .subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: 'Designation updated successfully.',
              timer: 1500,
              showConfirmButton: false,
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
      this.designationService.createDesignation(formValue).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Created!',
            text: 'Designation created successfully.',
            timer: 1500,
            showConfirmButton: false,
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

  // ── Toggle Status ─────────────────────────────────────────────────────────
  toggleStatus(designation: DesignationResponseDto): void {
    const action = designation.isActive ? 'deactivate' : 'activate';
    const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
    const id = designation.designationId || (designation as any).id;

    if (!id) {
      Swal.fire('Error', 'Could not determine designation ID.', 'error');
      return;
    }

    Swal.fire({
      title: `${actionLabel} Designation?`,
      text: `Are you sure you want to ${action} "${designation.designationName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it!`,
    }).then((result) => {
      if (result.isConfirmed) {
        this.designationService.toggleDesignationStatus(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: `Designation ${action}d successfully.`,
              timer: 1500,
              showConfirmButton: false,
            });
            this.loadDesignations();
          },
          error: (error) => {
            Swal.fire('Error', error.error?.message || 'Failed to toggle status.', 'error');
          },
        });
      }
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteDesignation(designation: DesignationResponseDto): void {
    const id = designation.designationId || (designation as any).id;

    if (!id) {
      Swal.fire('Error', 'Could not determine designation ID.', 'error');
      return;
    }

    if ((designation.employeeCount ?? 0) > 0) {
      Swal.fire(
        'Cannot Delete',
        `"${designation.designationName}" is assigned to ${designation.employeeCount} employee(s) and cannot be deleted.`,
        'warning'
      );
      return;
    }

    Swal.fire({
      title: 'Delete Designation?',
      html: `Are you sure you want to delete <strong>"${designation.designationName}"</strong>?<br>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.designationService.deleteDesignation(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Designation has been deleted.',
              timer: 1500,
              showConfirmButton: false,
            });

            if (this.rowData.length === 1 && this.currentPage > 1) {
              this.currentPage--;
            }
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
    if (control?.hasError('required'))
      return `${this.getFieldLabel(fieldName)} is required`;
    if (control?.hasError('maxlength'))
      return `Maximum ${control.errors?.['maxlength'].requiredLength} characters allowed`;
    if (control?.hasError('pattern'))
      return 'Only uppercase letters, numbers, hyphens, and underscores are allowed';
    if (control?.hasError('min')) return 'Minimum value is 1';
    if (control?.hasError('max'))  return 'Maximum value is 100';
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
    this.pageSize = parseInt((event.target as HTMLSelectElement).value, 10);
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
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  }
}