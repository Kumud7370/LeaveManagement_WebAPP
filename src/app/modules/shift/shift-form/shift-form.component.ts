
import {
  Component, OnInit, OnDestroy,
  Input, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ShiftService } from '../../../core/services/api/shift.api';
import { Shift, CreateShiftDto, UpdateShiftDto } from '../../../core/Models/shift.model';  // ✅ FIXED

@Component({
  selector: 'app-shift-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './shift-form.component.html',
  styleUrls: ['./shift-form.component.scss']
})
export class ShiftFormComponent implements OnInit, OnDestroy {

  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() shift: Shift | null = null;
  @Output() close   = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  shiftForm!: FormGroup;
  isSubmitting = false;

  colorPalette = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#A855F7'
  ];

  constructor(
    private fb: FormBuilder,
    private shiftService: ShiftService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    if (this.shift && (this.mode === 'edit' || this.mode === 'view')) {
      this.populateForm();
    }
    if (this.mode === 'view') {
      this.shiftForm.disable();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  
  initializeForm(): void {
    this.shiftForm = this.fb.group({
      shiftName:                     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      shiftCode:                     ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20),
                                           Validators.pattern('^[A-Z0-9_-]+$')]],
      startTime:                     ['', Validators.required],
      endTime:                       ['', Validators.required],
      gracePeriodMinutes:            [15,  [Validators.required, Validators.min(0), Validators.max(60)]],
      minimumWorkingMinutes:         [480, [Validators.required, Validators.min(1), Validators.max(1440)]],
      breakDurationMinutes:          [60,  [Validators.required, Validators.min(0), Validators.max(240)]],
      isNightShift:                  [false],
      isActive:                      [true],
     
      description:                   ['', Validators.maxLength(500)],
      color:                         ['#3B82F6', [Validators.required,
                                                   Validators.pattern('^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$')]],
      nightShiftAllowancePercentage: [0, [Validators.min(0), Validators.max(100)]]
    });

   
    this.shiftForm.get('shiftCode')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        if (val && val !== val.toUpperCase()) {
          this.shiftForm.get('shiftCode')?.setValue(val.toUpperCase(), { emitEvent: false });
        }
      });

    
    this.shiftForm.get('isNightShift')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(isNight => {
        if (!isNight) {
          this.shiftForm.get('nightShiftAllowancePercentage')?.setValue(0);
        }
      });
  }

  populateForm(): void {
    if (!this.shift) return;
   
    const startTime = this.shift.startTimeFormatted
      || String(this.shift.startTime || '').substring(0, 5);
    const endTime = this.shift.endTimeFormatted
      || String(this.shift.endTime || '').substring(0, 5);

    this.shiftForm.patchValue({
      shiftName:                     this.shift.shiftName,
      shiftCode:                     this.shift.shiftCode,
      startTime,
      endTime,
      gracePeriodMinutes:            this.shift.gracePeriodMinutes,
      minimumWorkingMinutes:         this.shift.minimumWorkingMinutes,
      breakDurationMinutes:          this.shift.breakDurationMinutes,
      isNightShift:                  this.shift.isNightShift,
      isActive:                      this.shift.isActive,
      description:                   this.shift.description ?? '',
      color:                         this.shift.color,
      nightShiftAllowancePercentage: this.shift.nightShiftAllowancePercentage
    });
  }


  onSubmit(): void {
    if (this.shiftForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;
    if (this.mode === 'create') this.createShift();
    else if (this.mode === 'edit') this.updateShift();
  }

  private createShift(): void {
    const dto: CreateShiftDto = { ...this.shiftForm.value };

    this.shiftService.createShift(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            Swal.fire({
              icon: 'success',
              title: 'Shift Created!',
              html: `<b>${dto.shiftName}</b> has been created successfully.`,
              confirmButtonColor: '#3b82f6',
              timer: 2500,
              timerProgressBar: true,
              showConfirmButton: false
            }).then(() => this.success.emit());
          } else {
            Swal.fire({
              icon: 'warning',
              title: 'Could Not Create',
              text: response.message || 'Shift code already exists or creation failed.',
              confirmButtonColor: '#f59e0b'
            });
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Create shift error:', err);
         
          const msg = this.extractErrorMessage(err);
          Swal.fire({
            icon: 'error',
            title: 'Error Creating Shift',
            html: msg,
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  private updateShift(): void {
    if (!this.shift) return;
    const dto: UpdateShiftDto = { ...this.shiftForm.value };

    this.shiftService.updateShift(this.shift.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success) {
            Swal.fire({
              icon: 'success',
              title: 'Shift Updated!',
              text: 'The shift has been updated successfully.',
              confirmButtonColor: '#3b82f6',
              timer: 2500,
              timerProgressBar: true,
              showConfirmButton: false
            }).then(() => this.success.emit());
          } else {
            Swal.fire({
              icon: 'warning',
              title: 'Could Not Update',
              text: response.message || 'Shift code already exists or update failed.',
              confirmButtonColor: '#f59e0b'
            });
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update shift error:', err);
          const msg = this.extractErrorMessage(err);
          Swal.fire({
            icon: 'error',
            title: 'Error Updating Shift',
            html: msg,
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

 
  private extractErrorMessage(err: any): string {
    const e = err?.error;
    if (!e) return 'An unexpected error occurred.';

  
  
    if (e.errors && typeof e.errors === 'object') {
      const lines = Object.values(e.errors)
        .flat()
        .map((m: any) => `• ${m}`)
        .join('<br>');
      return lines || e.title || 'Validation failed.';
    }

  
    if (e.message) return e.message;
    if (e.title)   return e.title;

  
    if (typeof e === 'string') return e;

    return 'An unexpected error occurred. Please check the console for details.';
  }

  onClose(): void { this.close.emit(); }

 
  selectColor(hex: string): void {
    this.shiftForm.get('color')?.setValue(hex);
  }

  isColorSelected(hex: string): boolean {
    return this.shiftForm.get('color')?.value === hex;
  }


  isFieldInvalid(fieldName: string): boolean {
    const f = this.shiftForm.get(fieldName);
    return !!(f && f.invalid && (f.dirty || f.touched));
  }

  getErrorMessage(fieldName: string): string {
    const f = this.shiftForm.get(fieldName);
    if (!f?.errors) return '';
    const e = f.errors;
    if (e['required'])   return `${this.label(fieldName)} is required`;
    if (e['minlength'])  return `${this.label(fieldName)} must be at least ${e['minlength'].requiredLength} characters`;
    if (e['maxlength'])  return `${this.label(fieldName)} must not exceed ${e['maxlength'].requiredLength} characters`;
    if (e['min'])        return `${this.label(fieldName)} must be at least ${e['min'].min}`;
    if (e['max'])        return `${this.label(fieldName)} cannot exceed ${e['max'].max}`;
    if (e['pattern'])    return this.patternError(fieldName);
    return 'Invalid value';
  }

  private label(f: string): string {
    const map: Record<string, string> = {
      shiftName: 'Shift name', shiftCode: 'Shift code',
      startTime: 'Start time', endTime: 'End time',
      gracePeriodMinutes: 'Grace period', minimumWorkingMinutes: 'Minimum working minutes',
      breakDurationMinutes: 'Break duration', description: 'Description',
      color: 'Color', nightShiftAllowancePercentage: 'Night shift allowance', displayOrder: 'Display order'
    };
    return map[f] || f;
  }

  private patternError(f: string): string {
    if (f === 'shiftCode') return 'Only uppercase letters, numbers, _ and - allowed';
    if (f === 'color')     return 'Must be a valid hex code e.g. #3B82F6';
    return 'Invalid format';
  }

 
  get modalTitle(): string {
    return this.mode === 'create' ? 'Add New Shift'
         : this.mode === 'edit'   ? 'Edit Shift'
         : 'Shift Details';
  }

  get submitButtonText(): string {
    if (this.isSubmitting)      return 'Saving...';
    if (this.mode === 'create') return 'Create Shift';
    return 'Update Shift';
  }

  get isNightShiftEnabled(): boolean {
    return this.shiftForm.get('isNightShift')?.value === true;
  }

  get netWorkingPreview(): string {
    const min = +(this.shiftForm.get('minimumWorkingMinutes')?.value || 0);
    const brk = +(this.shiftForm.get('breakDurationMinutes')?.value  || 0);
    const net = Math.max(0, min - brk);
    return `${Math.floor(net / 60)}h ${net % 60}m`;
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}