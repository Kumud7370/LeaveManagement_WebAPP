import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions } from 'ag-grid-community';
import Swal from 'sweetalert2';
import { DesignationService, DesignationResponseDto, DesignationFilterDto } from '../../../core/services/api/designation.api';

@Component({
  selector: 'app-designation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AgGridAngular],
  templateUrl: './designation-list.component.html',
  styleUrls: ['./designation-list.component.scss']
})
export class DesignationListComponent implements OnInit {
  rowData: DesignationResponseDto[] = [];
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions = {};
  
  // Filter properties
  searchTerm: string = '';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalCount: number = 0;
  totalPages: number = 0;

  // Loading state
  isLoading: boolean = false;

  // Modal properties
  isModalOpen: boolean = false;
  isEditMode: boolean = false;
  isLoadingForm: boolean = false;
  isSubmitting: boolean = false;
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

  initializeForm(): void {
    this.designationForm = this.fb.group({
      designationCode: ['', [
        Validators.required,
        Validators.maxLength(50),
        Validators.pattern(/^[A-Z0-9-_]+$/)
      ]],
      designationName: ['', [
        Validators.required,
        Validators.maxLength(100)
      ]],
      description: ['', [Validators.maxLength(500)]],
      level: [1, [
        Validators.required,
        Validators.min(1),
        Validators.max(100)
      ]],
      isActive: [true]
    });
  }

  initializeGrid(): void {
    this.columnDefs = [
      {
        headerName: 'ACTIONS',
        field: 'actions',
        width: 140,
        pinned: 'left',
        cellRenderer: (params: any) => {
          return `
            <div class="action-buttons">
              <button class="btn-action btn-edit" data-action="edit" title="Edit">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn-action btn-toggle" data-action="toggle" title="Toggle Status">
                <i class="bi bi-power"></i>
              </button>
              <button class="btn-action btn-delete" data-action="delete" title="Delete">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          `;
        },
        cellStyle: { padding: '8px' }
      },
      {
        headerName: 'CODE',
        field: 'designationCode',
        sortable: true,
        filter: true,
        width: 180,
        cellStyle: { fontWeight: '600', color: '#1e293b' }
      },
      {
        headerName: 'DESIGNATION NAME',
        field: 'designationName',
        sortable: true,
        filter: true,
        flex: 1,
        minWidth: 250
      },
      {
        headerName: 'DESCRIPTION',
        field: 'description',
        sortable: true,
        filter: true,
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (params: any) => {
          return params.value || '—';
        }
      },
      {
        headerName: 'LEVEL',
        field: 'level',
        sortable: true,
        filter: true,
        width: 120,
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'EMPLOYEE COUNT',
        field: 'employeeCount',
        sortable: true,
        width: 150,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: any) => {
          return params.value || 0;
        }
      },
      {
        headerName: 'STATUS',
        field: 'isActive',
        sortable: true,
        width: 130,
        cellRenderer: (params: any) => {
          const status = params.value;
          const badgeClass = status ? 'badge-active' : 'badge-inactive';
          const text = status ? 'Active' : 'Inactive';
          return `<span class="status-badge ${badgeClass}">${text}</span>`;
        },
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'CREATED',
        field: 'createdAt',
        sortable: true,
        width: 150,
        valueFormatter: (params: any) => {
          if (!params.value) return '—';
          return new Date(params.value).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
        }
      }
    ];

    this.gridOptions = {
      defaultColDef: {
        resizable: true,
        sortable: true,
        filter: false
      },
      pagination: false,
      domLayout: 'autoHeight',
      suppressCellFocus: true,
      rowHeight: 60,
      headerHeight: 50,
      onCellClicked: (event: any) => {
        if (event.event.target.dataset.action) {
          const action = event.event.target.dataset.action;
          const rowData = event.data;
          
          if (action === 'edit') {
            this.openEditModal(rowData);
          } else if (action === 'toggle') {
            this.toggleStatus(rowData);
          } else if (action === 'delete') {
            this.deleteDesignation(rowData);
          }
        }
      }
    };
  }

  loadDesignations(): void {
    this.isLoading = true;
    
    const filter: DesignationFilterDto = {
      searchTerm: this.searchTerm || undefined,
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      sortBy: 'createdAt',
      sortDescending: true
    };

    console.log('🔍 Fetching designations with filter:', filter);

    this.designationService.getFilteredDesignations(filter).subscribe({
      next: (response) => {
        console.log('✅ Raw API Response:', response);
        
        if (response && response.data) {
          this.rowData = response.data;
          
          if (response.pagination) {
            this.totalCount = response.pagination.totalCount || 0;
            this.totalPages = response.pagination.totalPages || 0;
          } else {
            this.totalCount = response.data.length;
            this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          }
          
          console.log(`✅ Loaded ${this.rowData.length} designations`);
          console.log('📊 Total count:', this.totalCount);
          console.log('📄 Total pages:', this.totalPages);
          console.log('🔢 First item ID:', this.rowData[0]?.designationId);
        } else {
          console.warn('⚠️ Unexpected response structure:', response);
          this.rowData = [];
          this.totalCount = 0;
          this.totalPages = 0;
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading designations:', error);
        console.error('📍 Error status:', error.status);
        console.error('💬 Error message:', error.message);
        console.error('📦 Error details:', error.error);
        
        let errorMessage = 'Failed to load designations. ';
        
        if (error.status === 0) {
          errorMessage += 'Cannot connect to the server. Please check if the backend is running.';
        } else if (error.status === 401) {
          errorMessage += 'Unauthorized. Please login again.';
        } else if (error.status === 404) {
          errorMessage += 'API endpoint not found. Please check the API URL configuration.';
        } else if (error.error?.message) {
          errorMessage += error.error.message;
        } else {
          errorMessage += 'Please check the console for details.';
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Data',
          text: errorMessage,
          footer: `<small>Status: ${error.status || 'Unknown'} | URL: ${error.url || 'N/A'}</small>`
        });
        
        this.isLoading = false;
        this.rowData = [];
        this.totalCount = 0;
        this.totalPages = 0;
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadDesignations();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadDesignations();
  }

  refreshData(): void {
    this.loadDesignations();
  }

  exportData(): void {
    Swal.fire('Info', 'Export functionality coming soon!', 'info');
  }

  // Modal Methods
  openCreateModal(): void {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.selectedDesignationId = null;
    this.designationForm.reset({
      designationCode: '',
      designationName: '',
      description: '',
      level: 1,
      isActive: true
    });
  }

  openEditModal(designation: DesignationResponseDto): void {
    console.log('🔧 Opening edit modal for:', designation);
    this.isModalOpen = true;
    this.isEditMode = true;
    this.selectedDesignationId = designation.designationId;  // Changed from id to designationId
    this.isLoadingForm = true;

    this.designationService.getDesignationById(designation.designationId).subscribe({
      next: (response) => {
        console.log('✅ Loaded designation for edit:', response);
        const data = response.data;
        this.designationForm.patchValue({
          designationCode: data.designationCode,
          designationName: data.designationName,
          description: data.description || '',
          level: data.level,
          isActive: data.isActive
        });
        this.isLoadingForm = false;
      },
      error: (error) => {
        console.error('❌ Error loading designation:', error);
        Swal.fire('Error', 'Failed to load designation details', 'error');
        this.closeModal();
        this.isLoadingForm = false;
      }
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
      isActive: true
    });
  }

  onSubmit(): void {
    if (this.designationForm.invalid) {
      this.markFormGroupTouched(this.designationForm);
      Swal.fire('Validation Error', 'Please fill all required fields correctly', 'warning');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.designationForm.value;
    
    console.log('📝 Submitting form:', formValue);
    console.log('🔄 Is Edit Mode:', this.isEditMode);
    console.log('🆔 Selected ID:', this.selectedDesignationId);

    if (this.isEditMode && this.selectedDesignationId) {
      this.designationService.updateDesignation(this.selectedDesignationId, formValue).subscribe({
        next: (response) => {
          console.log('✅ Update successful:', response);
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Designation updated successfully',
            timer: 1500,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadDesignations();
        },
        error: (error) => {
          console.error('❌ Error updating designation:', error);
          const errorMsg = error.error?.message || error.message || 'Failed to update designation';
          Swal.fire('Error', errorMsg, 'error');
          this.isSubmitting = false;
        }
      });
    } else {
      this.designationService.createDesignation(formValue).subscribe({
        next: (response) => {
          console.log('✅ Create successful:', response);
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Designation created successfully',
            timer: 1500,
            showConfirmButton: false
          });
          this.closeModal();
          this.loadDesignations();
        },
        error: (error) => {
          console.error('❌ Error creating designation:', error);
          const errorMsg = error.error?.message || error.message || 'Failed to create designation';
          Swal.fire('Error', errorMsg, 'error');
          this.isSubmitting = false;
        }
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
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
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Maximum ${maxLength} characters allowed`;
    }
    if (control?.hasError('pattern')) {
      return 'Only uppercase letters, numbers, hyphens, and underscores are allowed';
    }
    if (control?.hasError('min')) {
      return 'Minimum value is 1';
    }
    if (control?.hasError('max')) {
      return 'Maximum value is 100';
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      designationCode: 'Designation Code',
      designationName: 'Designation Name',
      description: 'Description',
      level: 'Level'
    };
    return labels[fieldName] || fieldName;
  }

  toggleStatus(designation: DesignationResponseDto): void {
    const action = designation.isActive ? 'deactivate' : 'activate';
    
    Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Designation?`,
      text: `Are you sure you want to ${action} "${designation.designationName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it!`
    }).then((result) => {
      if (result.isConfirmed) {
        this.designationService.toggleDesignationStatus(designation.designationId).subscribe({
          next: (response) => {
            console.log('✅ Status toggled:', response);
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: `Designation ${action}d successfully.`,
              timer: 1500,
              showConfirmButton: false
            });
            this.loadDesignations();
          },
          error: (error) => {
            console.error('❌ Error toggling status:', error);
            Swal.fire('Error', error.error?.message || 'Failed to toggle designation status', 'error');
          }
        });
      }
    });
  }

  deleteDesignation(designation: DesignationResponseDto): void {
    if (designation.employeeCount > 0) {
      Swal.fire(
        'Cannot Delete',
        'This designation is assigned to employees and cannot be deleted.',
        'warning'
      );
      return;
    }

    Swal.fire({
      title: 'Delete Designation?',
      text: `Are you sure you want to delete "${designation.designationName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.designationService.deleteDesignation(designation.designationId).subscribe({
          next: (response) => {
            console.log('✅ Designation deleted:', response);
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Designation has been deleted.',
              timer: 1500,
              showConfirmButton: false
            });
            this.loadDesignations();
          },
          error: (error) => {
            console.error('❌ Error deleting designation:', error);
            Swal.fire('Error', error.error?.message || 'Failed to delete designation', 'error');
          }
        });
      }
    });
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadDesignations();
  }

  onPageSizeChange(event: any): void {
    this.pageSize = parseInt(event.target.value);
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
    let endPage = Math.min(this.totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}