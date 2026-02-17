import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { LeaveType, CreateLeaveTypeDto, UpdateLeaveTypeDto } from '../../../core/Models/leave-type.model';

@Component({
  selector: 'app-leave-type-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-type-form.component.html',
  styleUrls: ['./leave-type-form.component.scss']
})
export class LeaveTypeFormComponent implements OnInit {
  @Input() isModal = false;
  @Input() isEditMode = false;
  @Input() leaveTypeId: string | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  leaveTypeForm!: FormGroup;
  submitting = false;
  loadingLeaveType = false;
  formError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private leaveTypeService: LeaveTypeService
  ) {}

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
      maxDaysPerYear:      [null, [Validators.required, Validators.min(1), Validators.max(365)]],
      isCarryForward:      [false],
      maxCarryForwardDays: [0, [Validators.min(0)]],
      requiresApproval:    [true],
      requiresDocument:    [false],
      minimumNoticeDays:   [0, [Validators.min(0)]],
      color:               ['#3b82f6'],
      isActive:            [true],
      displayOrder:        [0, [Validators.min(0)]]
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
            description:         lt.description,
            maxDaysPerYear:      lt.maxDaysPerYear,
            isCarryForward:      lt.isCarryForward,
            maxCarryForwardDays: lt.maxCarryForwardDays,
            requiresApproval:    lt.requiresApproval,
            requiresDocument:    lt.requiresDocument,
            minimumNoticeDays:   lt.minimumNoticeDays,
            color:               lt.color,
            isActive:            lt.isActive,
            displayOrder:        lt.displayOrder
          });
        }
        this.loadingLeaveType = false;
      },
      error: () => { this.loadingLeaveType = false; }
    });
  }

  onCodeInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const upper = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    this.leaveTypeForm.get('code')?.setValue(upper, { emitEvent: false });
    input.value = upper;
  }

  onCarryForwardChange(): void {
    const isCarryForward = this.leaveTypeForm.get('isCarryForward')?.value as boolean;
    if (!isCarryForward) {
      this.leaveTypeForm.patchValue({ maxCarryForwardDays: 0 });
    }
  }

  onSubmit(): void {
    if (this.leaveTypeForm.invalid) { this.markAllTouched(); return; }
    this.submitting = true;
    this.formError = null;
    const v = this.leaveTypeForm.value;

    if (this.isEditMode && this.leaveTypeId) {
      const dto: UpdateLeaveTypeDto = {
        name:                v.name,
        code:                v.code,
        description:         v.description,
        maxDaysPerYear:      v.maxDaysPerYear,
        isCarryForward:      v.isCarryForward,
        maxCarryForwardDays: v.isCarryForward ? v.maxCarryForwardDays : 0,
        requiresApproval:    v.requiresApproval,
        requiresDocument:    v.requiresDocument,
        minimumNoticeDays:   v.minimumNoticeDays,
        color:               v.color,
        isActive:            v.isActive,
        displayOrder:        v.displayOrder
      };
      this.leaveTypeService.updateLeaveType(this.leaveTypeId, dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) { this.formSubmitted.emit(); }
          else { this.formError = r.message || 'Failed to update leave type'; }
        },
        error: (e) => { this.submitting = false; this.formError = e.error?.message || 'An error occurred'; }
      });
    } else {
      const dto: CreateLeaveTypeDto = {
        name:                v.name,
        code:                v.code,
        description:         v.description,
        maxDaysPerYear:      v.maxDaysPerYear,
        isCarryForward:      v.isCarryForward,
        maxCarryForwardDays: v.isCarryForward ? v.maxCarryForwardDays : 0,
        requiresApproval:    v.requiresApproval,
        requiresDocument:    v.requiresDocument,
        minimumNoticeDays:   v.minimumNoticeDays,
        color:               v.color,
        isActive:            v.isActive,
        displayOrder:        v.displayOrder
      };
      this.leaveTypeService.createLeaveType(dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) { this.formSubmitted.emit(); }
          else { this.formError = r.message || 'Failed to create leave type. Code may already exist.'; }
        },
        error: (e) => { this.submitting = false; this.formError = e.error?.message || 'An error occurred'; }
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
    if (c.errors['required'])   return 'This field is required.';
    if (c.errors['minlength'])  return `Minimum ${c.errors['minlength'].requiredLength} characters.`;
    if (c.errors['maxlength'])  return `Maximum ${c.errors['maxlength'].requiredLength} characters.`;
    if (c.errors['min'])        return `Minimum value is ${c.errors['min'].min}.`;
    if (c.errors['max'])        return `Maximum value is ${c.errors['max'].max}.`;
    if (c.errors['pattern'])    return 'Only uppercase letters allowed (A-Z).';
    return '';
  }

  private markAllTouched(): void {
    Object.values(this.leaveTypeForm.controls).forEach(c => c.markAsTouched());
  }
}