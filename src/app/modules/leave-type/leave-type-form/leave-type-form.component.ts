import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { LeaveType, CreateLeaveTypeDto, UpdateLeaveTypeDto } from '../../../core/Models/leave-type.model';

@Component({
  selector: 'app-leave-type-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-type-form.component.html',
  styleUrls: ['./leave-type-form.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LeaveTypeFormComponent implements OnInit {
  @Input() isModal = false;
  @Input() isEditMode = false;
  @Input() leaveTypeId: string | null = null;
  @Output() formSubmitted  = new EventEmitter<void>();
  @Output() formCancelled  = new EventEmitter<void>();

  leaveTypeForm!: FormGroup;
  submitting      = false;
  loadingLeaveType = false;
  formError: string | null = null;

  constructor(private fb: FormBuilder, private leaveTypeService: LeaveTypeService) {}

  ngOnInit(): void {
    this.buildForm();
    if (this.isEditMode && this.leaveTypeId) {
      this.loadLeaveType(this.leaveTypeId);
    }
  }

  buildForm(): void {
    this.leaveTypeForm = this.fb.group({
      name:                ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      code:                ['', [Validators.required, Validators.minLength(2), Validators.maxLength(10), Validators.pattern(/^[A-Z]+$/)]],
      description:         ['', Validators.maxLength(500)],
      maxDaysPerYear:      [1,  [Validators.required, Validators.min(1), Validators.max(365)]],
      isCarryForward:      [false],
      maxCarryForwardDays: [0,  [Validators.min(0)]],
      requiresApproval:    [true],
      requiresDocument:    [false],
      minimumNoticeDays:   [0,  [Validators.min(0)]],
      colorPicker:         ['#3b82f6'],
      colorHex:            ['#3b82f6'],
      isActive:            [true],
      displayOrder:        [0,  [Validators.min(0)]]
    });
  }

  loadLeaveType(id: string): void {
    this.loadingLeaveType = true;
    this.leaveTypeService.getLeaveTypeById(id).subscribe({
      next: (r) => {
        if (r.success) {
          const lt: LeaveType = r.data;
          this.leaveTypeForm.patchValue({
            name:                lt.name,
            code:                lt.code,
            description:         lt.description        ?? '',
            maxDaysPerYear:      lt.maxDaysPerYear      ?? 1,
            isCarryForward:      lt.isCarryForward      ?? false,
            maxCarryForwardDays: lt.maxCarryForwardDays ?? 0,
            requiresApproval:    lt.requiresApproval    ?? true,
            requiresDocument:    lt.requiresDocument    ?? false,
            minimumNoticeDays:   lt.minimumNoticeDays   ?? 0,
            colorPicker:         lt.color               || '#3b82f6',
            colorHex:            lt.color               || '#3b82f6',
            isActive:            lt.isActive            ?? true,
            displayOrder:        lt.displayOrder        ?? 0
          });
        }
        this.loadingLeaveType = false;
      },
      error: () => { this.loadingLeaveType = false; }
    });
  }

  onColorPickerChange(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.leaveTypeForm.get('colorHex')?.setValue(val, { emitEvent: false });
  }

  onColorHexChange(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      this.leaveTypeForm.get('colorPicker')?.setValue(val, { emitEvent: false });
    }
  }

  onCodeInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const upper = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    this.leaveTypeForm.get('code')?.setValue(upper, { emitEvent: false });
    input.value = upper;
  }

  onCarryForwardChange(): void {
    if (!this.leaveTypeForm.get('isCarryForward')?.value) {
      this.leaveTypeForm.patchValue({ maxCarryForwardDays: 0 });
    }
  }

  onSubmit(): void {
    if (this.leaveTypeForm.invalid) { this.markAllTouched(); return; }
    this.submitting = true;
    this.formError  = null;
    const v = this.leaveTypeForm.value;
    const isCarryForward = v.isCarryForward as boolean;

    const basePayload = {
      name:                (v.name as string).trim(),
      code:                (v.code as string).trim().toUpperCase(),
      description:         (v.description as string) ?? '',
      maxDaysPerYear:      Number(v.maxDaysPerYear) || 1,
      isCarryForward:      isCarryForward,
      maxCarryForwardDays: isCarryForward ? (Number(v.maxCarryForwardDays) || 0) : 0,
      requiresApproval:    v.requiresApproval as boolean,
      requiresDocument:    v.requiresDocument as boolean,
      minimumNoticeDays:   Number(v.minimumNoticeDays) || 0,
      color:               (v.colorPicker as string) || '#3b82f6',
      isActive:            v.isActive as boolean,
      displayOrder:        Number(v.displayOrder) || 0
    };

    if (this.isEditMode && this.leaveTypeId) {
      const dto: UpdateLeaveTypeDto = { ...basePayload };
      this.leaveTypeService.updateLeaveType(this.leaveTypeId, dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) { this.formSubmitted.emit(); }
          else { this.formError = r.message || 'Failed to update leave type'; }
        },
        error: (e) => { this.submitting = false; this.formError = this.extractError(e); }
      });
    } else {
      const dto: CreateLeaveTypeDto = { ...basePayload };
      this.leaveTypeService.createLeaveType(dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) { this.formSubmitted.emit(); }
          else { this.formError = r.message || 'Failed to create leave type. Code may already exist.'; }
        },
        error: (e) => { this.submitting = false; this.formError = this.extractError(e); }
      });
    }
  }

  onCancel(): void { this.formCancelled.emit(); }

  isInvalid(field: string): boolean {
    const c = this.leaveTypeForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  getError(field: string): string {
    const c = this.leaveTypeForm.get(field);
    if (!c?.errors) return '';
    if (c.errors['required'])  return 'This field is required.';
    if (c.errors['minlength']) return `Minimum ${c.errors['minlength'].requiredLength} characters.`;
    if (c.errors['maxlength']) return `Maximum ${c.errors['maxlength'].requiredLength} characters.`;
    if (c.errors['min'])       return `Minimum value is ${c.errors['min'].min}.`;
    if (c.errors['max'])       return `Maximum value is ${c.errors['max'].max}.`;
    if (c.errors['pattern'])   return 'Only uppercase letters allowed (A–Z).';
    return '';
  }

  private markAllTouched(): void {
    Object.values(this.leaveTypeForm.controls).forEach(c => c.markAsTouched());
  }

  private extractError(e: { error?: { errors?: Record<string, string[]>; message?: string; title?: string } }): string {
    const body = e.error;
    if (!body) return 'An unexpected error occurred.';
    if (body.errors && typeof body.errors === 'object') {
      const messages = Object.entries(body.errors)
        .map(([field, msgs]) => `${field}: ${(Array.isArray(msgs) ? msgs : [msgs]).join(', ')}`);
      if (messages.length) return messages.join(' | ');
    }
    if (body.message) return body.message;
    if (body.title)   return body.title;
    return 'An error occurred. Please check all fields and try again.';
  }
}