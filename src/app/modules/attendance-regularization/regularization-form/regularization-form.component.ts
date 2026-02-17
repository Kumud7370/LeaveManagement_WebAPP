import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AttendanceRegularizationService } from '../../../core/services/api/attendance-regularization.api';
import { 
  RegularizationRequestDto,
  RegularizationType,
  RegularizationResponseDto
} from '../../../core/Models/attendance-regularization.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-regularization-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './regularization-form.component.html',
  styleUrls: ['./regularization-form.component.scss']
})
export class RegularizationFormComponent implements OnInit {
  @Input() isModal = false;
  @Input() attendanceId: string | null = null;
  @Output() formCancelled = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<void>();

  regularizationForm!: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;

  RegularizationType = RegularizationType;

  constructor(
    private fb: FormBuilder,
    private regularizationService: AttendanceRegularizationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.regularizationForm = this.fb.group({
      attendanceId: ['', Validators.required],
      regularizationType: [RegularizationType.MissedPunch, Validators.required],
      attendanceDate: ['', Validators.required],
      requestedCheckIn: [''],
      requestedCheckOut: [''],
      reason: ['', [Validators.required, Validators.maxLength(500)]]
    }, { validators: this.regularizationValidator });

    // Pre-fill attendanceId if provided
    if (this.attendanceId) {
      this.regularizationForm.patchValue({ attendanceId: this.attendanceId });
    }

    // Watch for type changes to adjust required fields
    this.regularizationForm.get('regularizationType')?.valueChanges.subscribe(type => {
      this.updateFieldValidators(type);
    });
  }

  regularizationValidator(form: FormGroup) {
    const type = form.get('regularizationType')?.value;
    const checkIn = form.get('requestedCheckIn')?.value;
    const checkOut = form.get('requestedCheckOut')?.value;

    // For Full Day Regularization, both times are required
    if (type === RegularizationType.FullDayRegularization) {
      if (!checkIn || !checkOut) {
        return { fullDayRequired: true };
      }
    }

    // Check-out must be after check-in if both provided
    if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      return { invalidTimeRange: true };
    }

    return null;
  }

  updateFieldValidators(type: RegularizationType): void {
    const checkInControl = this.regularizationForm.get('requestedCheckIn');
    const checkOutControl = this.regularizationForm.get('requestedCheckOut');

    // Clear existing validators
    checkInControl?.clearValidators();
    checkOutControl?.clearValidators();

    // Set validators based on type
    switch (type) {
      case RegularizationType.MissedPunch:
        // At least one time is required
        checkInControl?.setValidators([Validators.required]);
        break;
      case RegularizationType.LateEntry:
        checkInControl?.setValidators([Validators.required]);
        break;
      case RegularizationType.EarlyExit:
        checkOutControl?.setValidators([Validators.required]);
        break;
      case RegularizationType.FullDayRegularization:
        checkInControl?.setValidators([Validators.required]);
        checkOutControl?.setValidators([Validators.required]);
        break;
    }

    checkInControl?.updateValueAndValidity();
    checkOutControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.regularizationForm.invalid) {
      this.markFormGroupTouched(this.regularizationForm);
      return;
    }

    this.submitting = true;
    this.error = null;

    const formValue = this.regularizationForm.value;
    
    const requestData: RegularizationRequestDto = {
      attendanceId: formValue.attendanceId,
      regularizationType: formValue.regularizationType,
      attendanceDate: new Date(formValue.attendanceDate),
      requestedCheckIn: formValue.requestedCheckIn ? new Date(formValue.requestedCheckIn) : undefined,
      requestedCheckOut: formValue.requestedCheckOut ? new Date(formValue.requestedCheckOut) : undefined,
      reason: formValue.reason
    };

    this.regularizationService.requestRegularization(requestData).subscribe({
      next: (response) => {
        if (response.success) {
          Swal.fire({
            title: 'Success!',
            text: 'Regularization request submitted successfully!',
            icon: 'success',
            confirmButtonColor: '#3b82f6'
          }).then(() => {
            this.formSubmitted.emit();
          });
        } else {
          this.error = response.message || 'Failed to submit regularization request';
          this.submitting = false;
          Swal.fire({
            title: 'Error!',
            text: this.error,
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'An error occurred';
        this.submitting = false;
        Swal.fire({
          title: 'Error!',
          text: this.error || 'An error occurred',  // Provide fallback
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  onCancel(): void {
    this.formCancelled.emit();
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

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private formatDateTimeForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.regularizationForm.get(fieldName);
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Maximum length is ${maxLength} characters`;
    }
    if (this.regularizationForm.hasError('invalidTimeRange')) {
      return 'Check-out time must be after check-in time';
    }
    if (this.regularizationForm.hasError('fullDayRequired')) {
      return 'Both check-in and check-out times are required for full day regularization';
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.regularizationForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getTypeOptions(): { value: RegularizationType; label: string; description: string }[] {
    return [
      { 
        value: RegularizationType.MissedPunch, 
        label: 'Missed Punch',
        description: 'Request for missed check-in or check-out'
      },
      { 
        value: RegularizationType.LateEntry, 
        label: 'Late Entry',
        description: 'Request to regularize late check-in'
      },
      { 
        value: RegularizationType.EarlyExit, 
        label: 'Early Exit',
        description: 'Request to regularize early check-out'
      },
      { 
        value: RegularizationType.FullDayRegularization, 
        label: 'Full Day Regularization',
        description: 'Request to regularize entire day attendance'
      }
    ];
  }

  getSelectedTypeDescription(): string {
    const type = this.regularizationForm.get('regularizationType')?.value;
    const option = this.getTypeOptions().find(opt => opt.value === type);
    return option?.description || '';
  }

  showCheckInField(): boolean {
    const type = this.regularizationForm.get('regularizationType')?.value;
    return type === RegularizationType.MissedPunch || 
           type === RegularizationType.LateEntry || 
           type === RegularizationType.FullDayRegularization;
  }

  showCheckOutField(): boolean {
    const type = this.regularizationForm.get('regularizationType')?.value;
    return type === RegularizationType.MissedPunch || 
           type === RegularizationType.EarlyExit || 
           type === RegularizationType.FullDayRegularization;
  }
}