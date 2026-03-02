import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DepartmentService } from '../../../core/services/api/department.api';
import { Department } from '../../../../app/core/Models/department.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-department-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './department-form.component.html',
  styleUrls: ['./department-form.component.scss']
})
export class DepartmentFormComponent implements OnInit {
  @Input() isModal = false;
  @Input() departmentId: string | null = null;
  @Input() isEditMode = false;
  @Output() formCancelled = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<Department>();

  departmentForm!: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    if (this.departmentId) {
      this.isEditMode = true;
      this.loadDepartment();
    }
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
      description:  ['', [Validators.maxLength(500)]],
      displayOrder: [0,  [Validators.min(0)]],
      isActive:     [true]
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
            description:    dept.description,
            displayOrder:   dept.displayOrder,
            isActive:       dept.isActive
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

    const v = this.departmentForm.value;
    const requestData = {
      departmentCode: v.departmentCode,
      departmentName: v.departmentName,
      description:    v.description || undefined,
      displayOrder:   v.displayOrder || 0,
      isActive:       v.isActive
    };

    if (this.isEditMode && this.departmentId) {
      this.departmentService.updateDepartment({ departmentId: this.departmentId, ...requestData }).subscribe({
        next: (response) => {
          this.submitting = false;
          if (response.success) {
            this.formSubmitted.emit(response.data);
            Swal.fire({
              title: 'Department Updated!',
              text: `"${response.data.departmentName}" has been updated successfully.`,
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              confirmButtonText: 'OK'
            });
          } else {
            this.error = response.message || 'Failed to update department';
            Swal.fire({
              title: 'Error!',
              text: this.error!,
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: (err) => {
          this.submitting = false;
          this.error = err.error?.message || 'An error occurred while updating department';
          Swal.fire({
            title: 'Error!',
            text: this.error!,
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });

    } else {
      this.departmentService.createDepartment(requestData).subscribe({
        next: (response) => {
          this.submitting = false;
          if (response.success) {
            this.formSubmitted.emit(response.data);
            Swal.fire({
              title: 'Department Created!',
              text: `"${response.data.departmentName}" has been created successfully.`,
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              confirmButtonText: 'OK'
            });
          } else {
            this.error = response.message || 'Failed to create department';
            Swal.fire({
              title: 'Error!',
              text: this.error!,
              icon: 'error',
              confirmButtonColor: '#ef4444'
            });
          }
        },
        error: (err) => {
          this.submitting = false;
          this.error = err.error?.message || 'An error occurred while creating department';
          Swal.fire({
            title: 'Error!',
            text: this.error!,
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      });
    }
  }

  onCancel(): void {
    this.formCancelled.emit();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) this.markFormGroupTouched(control);
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.departmentForm.get(fieldName);
    if (control?.hasError('required'))  return 'This field is required';
    if (control?.hasError('minlength')) return `Minimum length is ${control.errors?.['minlength'].requiredLength} characters`;
    if (control?.hasError('maxlength')) return `Maximum length is ${control.errors?.['maxlength'].requiredLength} characters`;
    if (control?.hasError('pattern'))   return 'Invalid format. Use only uppercase letters, numbers, underscores, and hyphens';
    if (control?.hasError('min'))       return 'Value must be 0 or greater';
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.departmentForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}