import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DepartmentService } from '../../../core/services/api/department.api';
import { Department } from '../../../../app/core/Models/department.model';

@Component({
  selector: 'app-department-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './department-form.component.html',
  styleUrls: ['./department-form.component.scss']
})
export class DepartmentFormComponent implements OnInit {
  departmentForm!: FormGroup;
  isEditMode = false;
  departmentId: string | null = null;
  loading = false;
  submitting = false;
  error: string | null = null;

  parentDepartments: Department[] = [];
  employees: any[] = [];

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.departmentId = this.route.snapshot.paramMap.get('id');
    
    if (this.departmentId) {
      this.isEditMode = true;
      this.loadDepartment();
    }
    
    this.loadDropdownData();
  }

  initializeForm(): void {
    this.departmentForm = this.fb.group({
      departmentCode: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(20),
        Validators.pattern('^[A-Z0-9_-]+$')
      ]],
      departmentName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100)
      ]],
      description: ['', [Validators.maxLength(500)]],
      headOfDepartment: [null],
      parentDepartmentId: [null],
      displayOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  loadDropdownData(): void {
    this.departmentService.getActiveDepartments().subscribe({
      next: (response) => {
        if (response.success) {
          this.parentDepartments = response.data.filter(
            dept => dept.departmentId !== this.departmentId
          );
        }
      },
      error: (err) => {
        console.error('Failed to load parent departments', err);
      }
    });
  }

  loadDepartment(): void {
    if (!this.departmentId) return;

    this.loading = true;
    this.departmentService.getDepartmentById(this.departmentId).subscribe({
      next: (response) => {
        if (response.success) {
          const dept = response.data;
          this.departmentForm.patchValue({
            departmentCode: dept.departmentCode,
            departmentName: dept.departmentName,
            description: dept.description,
            headOfDepartment: dept.headOfDepartment,
            parentDepartmentId: dept.parentDepartmentId,
            displayOrder: dept.displayOrder,
            isActive: dept.isActive
          });
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load department';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.departmentForm.invalid) {
      this.markFormGroupTouched(this.departmentForm);
      return;
    }

    this.submitting = true;
    this.error = null;

    const formValue = this.departmentForm.value;
    
    // Clean up the request - convert empty strings to null/undefined
    const requestData = {
      departmentCode: formValue.departmentCode,
      departmentName: formValue.departmentName,
      description: formValue.description || undefined,
      headOfDepartment: formValue.headOfDepartment || undefined,
      parentDepartmentId: formValue.parentDepartmentId || undefined,
      displayOrder: formValue.displayOrder || 0,
      isActive: formValue.isActive
    };

    if (this.isEditMode && this.departmentId) {
      const updateRequest = {
        departmentId: this.departmentId,
        ...requestData
      };

      this.departmentService.updateDepartment(updateRequest).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Department updated successfully!');
            this.router.navigate(['/departments']);
          } else {
            this.error = response.message || 'Failed to update department';
            this.submitting = false;
          }
        },
        error: (err) => {
          console.error('Update error:', err);
          this.error = err.error?.message || err.message || 'An error occurred while updating department';
          this.submitting = false;
        }
      });
    } else {
      this.departmentService.createDepartment(requestData).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Department created successfully!');
            this.router.navigate(['/departments']);
          } else {
            this.error = response.message || 'Failed to create department';
            this.submitting = false;
          }
        },
        error: (err) => {
          console.error('Create error:', err);
          this.error = err.error?.message || err.message || 'An error occurred while creating department';
          this.submitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/departments']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.departmentForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Minimum length is ${minLength} characters`;
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Maximum length is ${maxLength} characters`;
    }
    if (control?.hasError('pattern')) {
      return 'Invalid format. Use only uppercase letters, numbers, underscores, and hyphens';
    }
    if (control?.hasError('min')) {
      return 'Value must be 0 or greater';
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.departmentForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}