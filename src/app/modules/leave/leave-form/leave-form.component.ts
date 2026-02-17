import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LeaveService } from '../../../core/services/api/leave.api';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { EmployeeService } from '../../../core/services/api/employee.api';
import { Leave, CreateLeaveDto, UpdateLeaveDto } from '../../../core/Models/leave.model';
import { LeaveType } from '../../../core/Models/leave-type.model'; // ✅ import from the correct model

interface EmployeeSummary { id: string; employeeCode: string; fullName: string; }

@Component({
  selector: 'app-leave-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-form.component.html',
  styleUrls: ['./leave-form.component.scss']
})
export class LeaveFormComponent implements OnInit {
  @Input() isModal = false;
  @Input() isEditMode = false;
  @Input() leaveId: string | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  leaveForm!: FormGroup;
  leaveTypes: LeaveType[] = [];
  employees: EmployeeSummary[] = [];
  selectedLeaveType: LeaveType | null = null;
  remainingDays: number | null = null;
  computedDays = 0;
  submitting = false;
  loadingLeave = false;
  formError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private leaveTypeService: LeaveTypeService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadLeaveTypes();
    this.loadEmployees();
    if (this.isEditMode && this.leaveId) {
      this.loadLeave(this.leaveId);
    }
  }

  buildForm(): void {
    this.leaveForm = this.fb.group({
      employeeId:       ['', Validators.required],
      leaveTypeId:      ['', Validators.required],
      startDate:        ['', Validators.required],
      endDate:          ['', Validators.required],
      totalDays:        [null, [Validators.required, Validators.min(0.5)]],
      reason:           ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      isEmergencyLeave: [false],
      attachmentUrl:    ['']
    }, { validators: this.dateRangeValidator });
  }

  dateRangeValidator(g: FormGroup) {
    const s = g.get('startDate')?.value;
    const e = g.get('endDate')?.value;
    if (s && e && new Date(e) < new Date(s)) {
      return { dateRange: true };
    }
    return null;
  }

  loadLeaveTypes(): void {
    this.leaveTypeService.getActiveLeaveTypes().subscribe({
      next: (r) => { if (r.success) this.leaveTypes = r.data; } // ✅ now both sides use leave-type.model LeaveType
    });
  }

  loadEmployees(): void {
    this.employeeService.getActiveEmployees().subscribe({
      next: (employees) => { // ✅ plain array — no .success/.data wrapper
        this.employees = employees.map((e) => ({
          id: e.id,
          employeeCode: e.employeeCode,
          fullName: `${e.firstName} ${e.lastName}`
        }));
      },
      error: () => { this.employees = []; }
    });
  }

  loadLeave(id: string): void {
    this.loadingLeave = true;
    this.leaveService.getLeaveById(id).subscribe({
      next: (r) => {
        if (r.success) {
          const l = r.data;
          this.leaveForm.patchValue({
            employeeId:       l.employeeId,
            leaveTypeId:      l.leaveTypeId,
            startDate:        this.toInputDate(l.startDate),
            endDate:          this.toInputDate(l.endDate),
            totalDays:        l.totalDays,
            reason:           l.reason,
            isEmergencyLeave: l.isEmergencyLeave,
            attachmentUrl:    l.attachmentUrl || ''
          });
          this.onLeaveTypeChange();
          this.computedDays = l.totalDays;
        }
        this.loadingLeave = false;
      },
      error: () => { this.loadingLeave = false; }
    });
  }

  onLeaveTypeChange(): void {
    const id = this.leaveForm.get('leaveTypeId')?.value;
    this.selectedLeaveType = this.leaveTypes.find(lt => lt.id === id) || null;
    const empId = this.leaveForm.get('employeeId')?.value;
    const year = new Date().getFullYear();
    if (id && empId) {
      this.leaveService.getRemainingLeaveDays(empId, id, year).subscribe({
        next: (r) => { if (r.success) this.remainingDays = r.data; }
      });
    } else {
      this.remainingDays = null;
    }
  }

  onDateChange(): void {
    const s = this.leaveForm.get('startDate')?.value;
    const e = this.leaveForm.get('endDate')?.value;
    if (s && e && new Date(e) >= new Date(s)) {
      const diff = Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;
      this.computedDays = diff;
      this.leaveForm.patchValue({ totalDays: diff }, { emitEvent: false });
    }
  }

  onSubmit(): void {
    if (this.leaveForm.invalid) { this.markAllTouched(); return; }
    this.submitting = true;
    this.formError = null;
    const v = this.leaveForm.value;

    if (this.isEditMode && this.leaveId) {
      const dto: UpdateLeaveDto = {
        startDate:        v.startDate,
        endDate:          v.endDate,
        totalDays:        v.totalDays,
        reason:           v.reason,
        isEmergencyLeave: v.isEmergencyLeave,
        attachmentUrl:    v.attachmentUrl || undefined
      };
      this.leaveService.updateLeave(this.leaveId, dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) { this.formSubmitted.emit(); }
          else { this.formError = r.message || 'Failed to update leave'; }
        },
        error: (e) => { this.submitting = false; this.formError = e.error?.message || 'An error occurred'; }
      });
    } else {
      const dto: CreateLeaveDto = {
        employeeId:       v.employeeId,
        leaveTypeId:      v.leaveTypeId,
        startDate:        v.startDate,
        endDate:          v.endDate,
        totalDays:        v.totalDays,
        reason:           v.reason,
        isEmergencyLeave: v.isEmergencyLeave,
        attachmentUrl:    v.attachmentUrl || undefined
      };
      this.leaveService.createLeave(dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) { this.formSubmitted.emit(); }
          else { this.formError = r.message || 'Failed to submit leave. Check overlapping leaves or insufficient balance.'; }
        },
        error: (e) => { this.submitting = false; this.formError = e.error?.message || 'An error occurred'; }
      });
    }
  }

  onCancel(): void { this.formCancelled.emit(); }

  isInvalid(field: string): boolean {
    const c = this.leaveForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  getError(field: string): string {
    const c = this.leaveForm.get(field);
    if (!c?.errors) return '';
    if (c.errors['required'])  return 'This field is required.';
    if (c.errors['minlength']) return `Minimum ${c.errors['minlength'].requiredLength} characters.`;
    if (c.errors['maxlength']) return `Maximum ${c.errors['maxlength'].requiredLength} characters.`;
    if (c.errors['min'])       return `Minimum value is ${c.errors['min'].min}.`;
    if (this.leaveForm.errors?.['dateRange'] && field === 'endDate')
      return 'End date must be on or after start date.';
    return '';
  }

  private markAllTouched(): void {
    Object.values(this.leaveForm.controls).forEach(c => c.markAsTouched());
  }

  private toInputDate(d: Date | string): string {
    return new Date(d).toISOString().slice(0, 10);
  }
}