import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { EmployeeShiftService } from '../../../core/services/api/employee-shift.api';
import { ShiftService } from '../../../core/services/api/shift.api';
import { ApiClientService } from '../../../core/services/api/apiClient';
import {
  EmployeeShift,
  CreateEmployeeShiftDto,
  UpdateEmployeeShiftDto,
  ShiftChangeStatus,
  ShiftChangeStatusColor,
} from '../../../core/Models/employee-shift.module';
import { Shift } from '../../../core/Models/shift.model';

@Component({
  selector: 'app-employee-shift-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-shift-form.component.html',
  styleUrls: ['./employee-shift-form.component.scss'],
})
export class EmployeeShiftFormComponent implements OnInit, OnDestroy {

  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() employeeShift: EmployeeShift | null = null;
  @Input() preselectedEmployeeId: string | null = null;

  @Output() close   = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  form!: FormGroup;
  isSubmitting = false;
  activeShifts: Shift[] = [];
  employees: any[] = [];

  ShiftChangeStatus = ShiftChangeStatus;

  constructor(
    private fb: FormBuilder,
    private svc: EmployeeShiftService,
    private shiftSvc: ShiftService,
    private api: ApiClientService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadDropdowns();

    if (this.employeeShift && this.mode !== 'create') {
      this.patchForm();
    }

    if (this.preselectedEmployeeId && this.mode === 'create') {
      this.form.get('employeeId')?.setValue(this.preselectedEmployeeId);
      this.form.get('employeeId')?.disable();
    }

    if (this.mode === 'view') {
      this.form.disable();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      employeeId:    ['', Validators.required],
      shiftId:       ['', Validators.required],
      effectiveFrom: ['', Validators.required],
      effectiveTo:   [null],
      changeReason:  ['', [Validators.minLength(10), Validators.maxLength(500)]],
    }, { validators: this.dateRangeValidator });
  }

  private dateRangeValidator(g: AbstractControl) {
    const from = g.get('effectiveFrom')?.value;
    const to   = g.get('effectiveTo')?.value;
    if (from && to && new Date(to) < new Date(from)) {
      return { dateRange: true };
    }
    return null;
  }

  private loadDropdowns(): void {
    this.shiftSvc.getActiveShifts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: r => { if (r.success) this.activeShifts = r.data; } });

    this.api.getActiveEmployees()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r: any) => { if (r.success) this.employees = r.data; } });
  }

  private patchForm(): void {
    if (!this.employeeShift) return;
    this.form.patchValue({
      employeeId:    this.employeeShift.employeeId,
      shiftId:       this.employeeShift.shiftId,
      effectiveFrom: this.toInput(this.employeeShift.effectiveFrom),
      effectiveTo:   this.employeeShift.effectiveTo ? this.toInput(this.employeeShift.effectiveTo) : null,
      changeReason:  this.employeeShift.changeReason ?? '',
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) return;
    this.isSubmitting = true;
    this.mode === 'create' ? this.create() : this.update();
  }

  private create(): void {
    const v = this.form.getRawValue();
    const dto: CreateEmployeeShiftDto = {
      employeeId:    v.employeeId,
      shiftId:       v.shiftId,
      effectiveFrom: v.effectiveFrom,
      effectiveTo:   v.effectiveTo || null,
      changeReason:  v.changeReason || undefined,
    };
    this.svc.createEmployeeShift(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.isSubmitting = false;
          if (r.success) {
            Swal.fire({
              icon: 'success',
              title: 'Shift Assigned!',
              text: 'Assignment submitted — awaiting approval.',
              confirmButtonColor: '#3b82f6',
              timer: 2500, timerProgressBar: true, showConfirmButton: false,
            }).then(() => this.success.emit());
          } else {
            Swal.fire({
              icon: 'warning',
              title: 'Could Not Assign',
              text: r.message || 'Check overlapping shifts or pending limit (max 3).',
              confirmButtonColor: '#f59e0b'
            });
          }
        },
        error: err => {
          this.isSubmitting = false;
          Swal.fire({ icon: 'error', title: 'Error', html: this.extractError(err), confirmButtonColor: '#ef4444' });
        },
      });
  }

  private update(): void {
    if (!this.employeeShift) return;
    const v = this.form.getRawValue();
    const dto: UpdateEmployeeShiftDto = {
      shiftId:       v.shiftId,
      effectiveFrom: v.effectiveFrom,
      effectiveTo:   v.effectiveTo || null,
      changeReason:  v.changeReason || undefined,
    };
    this.svc.updateEmployeeShift(this.employeeShift.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.isSubmitting = false;
          if (r.success) {
            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: 'Shift assignment updated.',
              confirmButtonColor: '#3b82f6',
              timer: 2500, timerProgressBar: true, showConfirmButton: false,
            }).then(() => this.success.emit());
          } else {
            Swal.fire({
              icon: 'warning',
              title: 'Update Failed',
              text: r.message || 'Update failed.',
              confirmButtonColor: '#f59e0b'
            });
          }
        },
        error: err => {
          this.isSubmitting = false;
          Swal.fire({ icon: 'error', title: 'Error', html: this.extractError(err), confirmButtonColor: '#ef4444' });
        },
      });
  }

  private toInput(v: string | Date | null | undefined): string {
    if (!v) return '';
    return new Date(v).toISOString().substring(0, 10);
  }

  private extractError(err: any): string {
    const e = err?.error;
    if (!e) return 'An unexpected error occurred.';
    if (e.errors) return Object.values(e.errors).flat().map((m: any) => `• ${m}`).join('<br>');
    return e.message || e.title || 'An unexpected error occurred.';
  }

  isInvalid(f: string): boolean {
    const c = this.form.get(f);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  getError(f: string): string {
    const c = this.form.get(f);
    if (!c?.errors) return '';
    const e = c.errors;
    if (e['required'])  return 'This field is required';
    if (e['minlength']) return `Minimum ${e['minlength'].requiredLength} characters`;
    if (e['maxlength']) return `Maximum ${e['maxlength'].requiredLength} characters`;
    return 'Invalid value';
  }

  get hasDateRangeError(): boolean {
    return !!(this.form.errors?.['dateRange'] &&
      (this.form.get('effectiveTo')?.dirty || this.form.get('effectiveTo')?.touched));
  }

  resolveStatus(status: any): ShiftChangeStatus {
    if (typeof status === 'string') {
      const map: Record<string, ShiftChangeStatus> = {
        'Pending':   ShiftChangeStatus.Pending,
        'Approved':  ShiftChangeStatus.Approved,
        'Rejected':  ShiftChangeStatus.Rejected,
        'Cancelled': ShiftChangeStatus.Cancelled,
      };
      return map[status] ?? ShiftChangeStatus.Pending;
    }
    return status as ShiftChangeStatus;
  }

  getStatusStyle(status: any) {
    return ShiftChangeStatusColor[this.resolveStatus(status)] ?? { bg: '#f1f5f9', color: '#475569' };
  }

  isStatusApproved(status: any): boolean {
    return this.resolveStatus(status) === ShiftChangeStatus.Approved;
  }

  isStatusRejected(status: any): boolean {
    return this.resolveStatus(status) === ShiftChangeStatus.Rejected;
  }

  fmt(v: any): string {
    if (!v) return '—';
    return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  onClose(): void { this.close.emit(); }

  get modalTitle(): string {
    return this.mode === 'create' ? 'Assign Shift to Employee'
         : this.mode === 'edit'   ? 'Edit Shift Assignment'
         : 'Assignment Details';
  }

  get submitLabel(): string {
    if (this.isSubmitting) return 'Saving...';
    return this.mode === 'create' ? 'Submit Assignment' : 'Update Assignment';
  }
}