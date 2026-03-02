import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AttendanceRegularizationService } from '../../../core/services/api/attendance-regularization.api';
import {
  RegularizationRequestDto,
  RegularizationType
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
  @Output() formCancelled = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<void>();

  regularizationForm!: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;

  RegularizationType = RegularizationType;

  constructor(
    private fb: FormBuilder,
    private regularizationService: AttendanceRegularizationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.regularizationForm = this.fb.group({
      employeeId: ['', Validators.required],   // ✅ Manual employee ID input
      regularizationType: [RegularizationType.MissedPunch, Validators.required],
      attendanceDate: ['', Validators.required],
      requestedCheckIn: [''],
      requestedCheckOut: [''],
      reason: ['', [Validators.required, Validators.maxLength(500)]]
    }, { validators: this.regularizationValidator });

    this.regularizationForm.get('regularizationType')?.valueChanges.subscribe(type => {
      this.updateFieldValidators(+type);
    });

    this.updateFieldValidators(RegularizationType.MissedPunch);
  }

  regularizationValidator(form: FormGroup) {
    const type = +form.get('regularizationType')?.value;
    const checkIn = form.get('requestedCheckIn')?.value;
    const checkOut = form.get('requestedCheckOut')?.value;

    if (type === RegularizationType.FullDayRegularization) {
      if (!checkIn || !checkOut) {
        return { fullDayRequired: true };
      }
    }

    if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      return { invalidTimeRange: true };
    }

    return null;
  }

  updateFieldValidators(type: number): void {
    const checkInControl = this.regularizationForm.get('requestedCheckIn');
    const checkOutControl = this.regularizationForm.get('requestedCheckOut');

    checkInControl?.clearValidators();
    checkOutControl?.clearValidators();

    switch (type) {
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
      employeeId: formValue.employeeId.trim(),
      regularizationType: +formValue.regularizationType,
      attendanceDate: new Date(formValue.attendanceDate),
      requestedCheckIn: formValue.requestedCheckIn
        ? new Date(formValue.requestedCheckIn)
        : undefined,
      requestedCheckOut: formValue.requestedCheckOut
        ? new Date(formValue.requestedCheckOut)
        : undefined,
      reason: formValue.reason
    };

    this.regularizationService.requestRegularization(requestData).subscribe({
      next: (response) => {
        this.submitting = false;
        if (response.success) {
          Swal.fire({
            title: 'Success!',
            text: 'Regularization request submitted successfully!',
            icon: 'success',
            confirmButtonColor: '#3b82f6'
          }).then(() => {
            this.formSubmitted.emit();
            if (!this.isModal) {
              this.router.navigate(['/attendance-regularization/list']);
            }
          });
        } else {
          this.error = response.message || 'Failed to submit request';
          Swal.fire('Error!', this.error, 'error');
        }
      },
      error: (err) => {
        this.submitting = false;
        const backendErrors = err.error?.errors;
        if (backendErrors) {
          const messages = Object.entries(backendErrors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
            .join('\n');
          this.error = messages;
          Swal.fire('Validation Error', messages, 'error');
        } else {
          this.error = err.error?.message || 'An error occurred';
          Swal.fire('Error!', this.error || 'An error occurred', 'error');
        }
      }
    });
  }

  onCancel(): void {
    this.formCancelled.emit();
    if (!this.isModal) {
      this.router.navigate(['/attendance-regularization/list']);
    }
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
    const control = this.regularizationForm.get(fieldName);
    if (control?.hasError('required')) return 'This field is required';
    if (control?.hasError('maxlength')) {
      return `Maximum ${control.errors?.['maxlength'].requiredLength} characters allowed`;
    }
    if (fieldName === 'requestedCheckOut' && this.regularizationForm.hasError('invalidTimeRange')) {
      return 'Check-out time must be after check-in time';
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.regularizationForm.get(fieldName);
    return !!(control?.invalid && (control.dirty || control.touched));
  }

  getTypeOptions(): { value: RegularizationType; label: string; description: string }[] {
    return [
      { value: RegularizationType.MissedPunch, label: 'Missed Punch', description: 'Request for missed check-in or check-out' },
      { value: RegularizationType.LateEntry, label: 'Late Entry', description: 'Request to regularize late check-in' },
      { value: RegularizationType.EarlyExit, label: 'Early Exit', description: 'Request to regularize early check-out' },
      { value: RegularizationType.FullDayRegularization, label: 'Full Day Regularization', description: 'Request to regularize entire day attendance' }
    ];
  }

  getSelectedTypeDescription(): string {
    const type = +this.regularizationForm.get('regularizationType')?.value;
    return this.getTypeOptions().find(o => o.value === type)?.description || '';
  }

  showCheckInField(): boolean {
    const type = +this.regularizationForm.get('regularizationType')?.value;
    return [
      RegularizationType.MissedPunch,
      RegularizationType.LateEntry,
      RegularizationType.FullDayRegularization
    ].includes(type);
  }

  showCheckOutField(): boolean {
    const type = +this.regularizationForm.get('regularizationType')?.value;
    return [
      RegularizationType.MissedPunch,
      RegularizationType.EarlyExit,
      RegularizationType.FullDayRegularization
    ].includes(type);
  }
}