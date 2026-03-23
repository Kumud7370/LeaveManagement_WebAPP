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
      designationCode:   ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Z0-9-_]+$/)]],
      // Trilingual name fields — all required
      designationNameMr: ['', [Validators.required, Validators.maxLength(100)]],
      designationNameEn: ['', [Validators.required, Validators.maxLength(100)]],
      designationNameHi: ['', [Validators.required, Validators.maxLength(100)]],
      description:       ['', [Validators.maxLength(500)]],
      level:             [1,  [Validators.required, Validators.min(1), Validators.max(100)]],
      isActive:          [true]
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
        const d = response.data;
        this.designationForm.patchValue({
          designationCode:   d.designationCode,
          // Populate trilingual fields; fall back to the single field if the
          // API has not yet been updated to return them separately.
          designationNameMr: (d as any).designationNameMr || d.designationName || '',
          designationNameEn: (d as any).designationNameEn || d.designationName || '',
          designationNameHi: (d as any).designationNameHi || '',
          description:       d.description || '',
          level:             d.level,
          isActive:          d.isActive
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
      Swal.fire('Validation Error', 'Please fill all required fields correctly.', 'warning');
      return;
    }

    this.isSubmitting = true;
    const v = this.designationForm.value;

    // Build the payload:
    // – keep `designationName` as the Marathi name for backward-compat with the API
    // – add the three explicit language fields for the updated API
    const payload = {
      ...v,
      designationName: v.designationNameMr,
    };

    if (this.isEditMode && this.designationId) {
      this.designationService.updateDesignation(this.designationId, payload).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Success!', text: 'Designation updated successfully', timer: 1500, showConfirmButton: false });
          this.router.navigate(['/designations']);
        },
        error: (error) => {
          console.error('Error updating designation:', error);
          Swal.fire('Error', error.error?.message || 'Failed to update designation', 'error');
          this.isSubmitting = false;
        }
      });
    } else {
      this.designationService.createDesignation(payload).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Success!', text: 'Designation created successfully', timer: 1500, showConfirmButton: false });
          this.router.navigate(['/designations']);
        },
        error: (error) => {
          console.error('Error creating designation:', error);
          Swal.fire('Error', error.error?.message || 'Failed to create designation', 'error');
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
      formGroup.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.designationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.designationForm.get(fieldName);
    if (control?.hasError('required'))  return `${this.getFieldLabel(fieldName)} is required`;
    if (control?.hasError('maxlength')) return `Maximum ${control.errors?.['maxlength'].requiredLength} characters allowed`;
    if (control?.hasError('pattern'))   return 'Only uppercase letters, numbers, hyphens, and underscores are allowed';
    if (control?.hasError('min'))       return 'Minimum value is 1';
    if (control?.hasError('max'))       return 'Maximum value is 100';
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      designationCode:   'Designation Code',
      designationNameMr: 'Name (Marathi)',
      designationNameEn: 'Name (English)',
      designationNameHi: 'Name (Hindi)',
      description:       'Description',
      level:             'Level',
    };
    return labels[fieldName] || fieldName;
  }
}