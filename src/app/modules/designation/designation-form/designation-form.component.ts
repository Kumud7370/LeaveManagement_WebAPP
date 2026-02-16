import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { DesignationService } from '../../../core/services/api/designation.api';

@Component({
  selector: 'app-designation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './designation-form.component.html',
  styleUrls: ['./designation-form.component.scss']
})
export class DesignationFormComponent implements OnInit {
  designationForm!: FormGroup;
  isEditMode = false;
  designationId: string | null = null;
  isLoading = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private designationService: DesignationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
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

  checkEditMode(): void {
    this.designationId = this.route.snapshot.paramMap.get('id');
    if (this.designationId) {
      this.isEditMode = true;
      this.loadDesignation();
    }
  }

  loadDesignation(): void {
    if (!this.designationId) return;

    this.isLoading = true;
    this.designationService.getDesignationById(this.designationId).subscribe({
      next: (response) => {
        const designation = response.data;
        this.designationForm.patchValue({
          designationCode: designation.designationCode,
          designationName: designation.designationName,
          description: designation.description,
          level: designation.level,
          isActive: designation.isActive
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading designation:', error);
        Swal.fire('Error', 'Failed to load designation details', 'error');
        this.router.navigate(['/designations']);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.designationForm.invalid) {
      this.markFormGroupTouched(this.designationForm);
      return;
    }

    this.isSubmitting = true;
    const formValue = this.designationForm.value;

    if (this.isEditMode && this.designationId) {
      this.designationService.updateDesignation(this.designationId, formValue).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Designation updated successfully',
            timer: 1500,
            showConfirmButton: false
          });
          this.router.navigate(['/designations']);
        },
        error: (error) => {
          console.error('Error updating designation:', error);
          const errorMsg = error.error?.message || 'Failed to update designation';
          Swal.fire('Error', errorMsg, 'error');
          this.isSubmitting = false;
        }
      });
    } else {
      this.designationService.createDesignation(formValue).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Designation created successfully',
            timer: 1500,
            showConfirmButton: false
          });
          this.router.navigate(['/designations']);
        },
        error: (error) => {
          console.error('Error creating designation:', error);
          const errorMsg = error.error?.message || 'Failed to create designation';
          Swal.fire('Error', errorMsg, 'error');
          this.isSubmitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/designations']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
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
}