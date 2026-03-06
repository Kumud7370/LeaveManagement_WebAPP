import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  @Input() editData: RegularizationResponseDto | null = null;
  @Output() formCancelled = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<void>();

  regularizationForm!: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;

  RegularizationType = RegularizationType;

  compareTypeValues = (a: any, b: any): boolean => Number(a) === Number(b);

  get isEditMode(): boolean {
    return !!this.editData;
  }

  constructor(
    private fb: FormBuilder,
    private regularizationService: AttendanceRegularizationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    if (this.editData) {
      this.patchFormWithEditData(this.editData);
    }
  }

  initializeForm(): void {
    this.regularizationForm = this.fb.group({
      employeeId: ['', Validators.required],
      regularizationType: [RegularizationType.MissedPunch, Validators.required],
      attendanceDate: ['', Validators.required],
      requestedCheckIn: [''],
      requestedCheckOut: [''],
      reason: ['', [Validators.required, Validators.maxLength(500)]]
    }, { validators: this.regularizationValidator.bind(this) });

    this.regularizationForm.get('regularizationType')?.valueChanges.subscribe(type => {
      this.updateFieldValidators(Number(type));
    });

    this.updateFieldValidators(RegularizationType.MissedPunch);
  }

  private patchFormWithEditData(data: RegularizationResponseDto): void {
    const toDateInput = (val: any): string => {
      if (!val) return '';
      return new Date(val).toISOString().slice(0, 10);
    };

    const toDateTimeLocal = (val: any): string => {
      if (!val) return '';
      const d = new Date(val);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const regType: RegularizationType = Number(data.regularizationType) as RegularizationType;

    this.regularizationForm.patchValue({
      employeeId:         data.employeeId || '',
      regularizationType: regType,
      attendanceDate:     toDateInput(data.attendanceDate),
      requestedCheckIn:   toDateTimeLocal(data.requestedCheckIn),
      requestedCheckOut:  toDateTimeLocal(data.requestedCheckOut),
      reason:             data.reason || ''
    });

    this.updateFieldValidators(regType);
  }

  regularizationValidator(form: FormGroup) {
    const type     = Number(form.get('regularizationType')?.value);
    const checkIn  = form.get('requestedCheckIn')?.value;
    const checkOut = form.get('requestedCheckOut')?.value;

    if (type === RegularizationType.FullDayRegularization) {
      if (!checkIn || !checkOut) return { fullDayRequired: true };
    }

    if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      return { invalidTimeRange: true };
    }

    return null;
  }

  updateFieldValidators(type: number): void {
    const ci = this.regularizationForm.get('requestedCheckIn');
    const co = this.regularizationForm.get('requestedCheckOut');

    ci?.clearValidators();
    co?.clearValidators();

    switch (type) {
      case RegularizationType.LateEntry:
        ci?.setValidators([Validators.required]); break;
      case RegularizationType.EarlyExit:
        co?.setValidators([Validators.required]); break;
      case RegularizationType.FullDayRegularization:
        ci?.setValidators([Validators.required]);
        co?.setValidators([Validators.required]); break;
    }

    ci?.updateValueAndValidity();
    co?.updateValueAndValidity();
  }

  showCheckInField(): boolean {
    if (this.isEditMode) return true;
    const type = Number(this.regularizationForm.get('regularizationType')?.value);
    return [
      RegularizationType.MissedPunch,
      RegularizationType.LateEntry,
      RegularizationType.FullDayRegularization
    ].includes(type);
  }

  showCheckOutField(): boolean {
    if (this.isEditMode) return true;
    const type = Number(this.regularizationForm.get('regularizationType')?.value);
    return [
      RegularizationType.MissedPunch,
      RegularizationType.EarlyExit,
      RegularizationType.FullDayRegularization
    ].includes(type);
  }

  isCheckInRequired(): boolean {
    const type = Number(this.regularizationForm.get('regularizationType')?.value);
    return [RegularizationType.LateEntry, RegularizationType.FullDayRegularization].includes(type);
  }

  isCheckOutRequired(): boolean {
    const type = Number(this.regularizationForm.get('regularizationType')?.value);
    return [RegularizationType.EarlyExit, RegularizationType.FullDayRegularization].includes(type);
  }

  onSubmit(): void {
    if (this.regularizationForm.invalid) {
      this.markFormGroupTouched(this.regularizationForm);
      return;
    }

    this.submitting = true;
    this.error = null;

    const fv = this.regularizationForm.value;

    const requestData: RegularizationRequestDto = {
      employeeId:         String(fv.employeeId).trim(),
      regularizationType: parseInt(fv.regularizationType, 10) as RegularizationType,
      attendanceDate:     new Date(fv.attendanceDate),
      requestedCheckIn:   fv.requestedCheckIn  ? new Date(fv.requestedCheckIn)  : undefined,
      requestedCheckOut:  fv.requestedCheckOut ? new Date(fv.requestedCheckOut) : undefined,
      reason:             fv.reason
    };

    this.regularizationService.requestRegularization(requestData).subscribe({
      next: (response) => {
        this.submitting = false;
        if (response.success) {
          this.formSubmitted.emit();
          setTimeout(() => {
            Swal.fire({
              title: 'Success!',
              text: this.isEditMode
                ? 'Regularization request updated successfully!'
                : 'Regularization request submitted successfully!',
              icon: 'success',
              confirmButtonColor: '#3b82f6',
              timer: 2500,
              timerProgressBar: true,
              showConfirmButton: false,
              customClass: { container: 'swal-on-top' }
            });
          }, 0);

          if (!this.isModal) {
            this.router.navigate(['/attendance-regularization/list']);
          }
        } else {
          this.error = response.message || 'Failed to submit request';
          Swal.fire('Error!', this.error ?? 'Failed to submit request', 'error');
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
          Swal.fire('Error!', this.error ?? 'An error occurred', 'error');
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
      { value: RegularizationType.MissedPunch,           label: 'Missed Punch',            description: 'Request for missed check-in or check-out' },
      { value: RegularizationType.LateEntry,             label: 'Late Entry',              description: 'Request to regularize late check-in' },
      { value: RegularizationType.EarlyExit,             label: 'Early Exit',              description: 'Request to regularize early check-out' },
      { value: RegularizationType.FullDayRegularization, label: 'Full Day Regularization', description: 'Request to regularize entire day attendance' }
    ];
  }

  getSelectedTypeDescription(): string {
    const type = Number(this.regularizationForm.get('regularizationType')?.value);
    return this.getTypeOptions().find(o => o.value === type)?.description || '';
  }
}