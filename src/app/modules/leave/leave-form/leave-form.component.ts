import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LeaveService } from '../../../core/services/api/leave.api';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { EmployeeService } from '../../../core/services/api/employee.api';
import { LanguageService } from '../../../core/services/api/language.api';
import { Leave, CreateLeaveDto, UpdateLeaveDto } from '../../../core/Models/leave.model';
import { LeaveType } from '../../../core/Models/leave-type.model';

interface EmployeeSummary { id: string; employeeCode: string; fullName: string; userId?: string; }

@Component({
  selector: 'app-leave-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-form.component.html',
  styleUrls: ['./leave-form.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LeaveFormComponent implements OnInit {
  @Input() isModal = false;
  @Input() isEditMode = false;
  @Input() leaveId: string | null = null;
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();
  @Input() restrictToEmployeeId: string | null = null;

  leaveForm!: FormGroup;
  leaveTypes: LeaveType[] = [];
  employees: EmployeeSummary[] = [];
  selectedLeaveType: LeaveType | null = null;

  remainingDays: number | null = null;
  balanceLoading = false;
  balanceNotFound = false;
  computedDays = 0;
  submitting = false;
  loadingLeave = false;
  formError: string | null = null;
  currentYear = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private leaveService: LeaveService,
    private leaveTypeService: LeaveTypeService,
    private employeeService: EmployeeService,
    public  langService: LanguageService
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.loadLeaveTypes();
    this.loadEmployees().then(() => {
      if (this.isEditMode && this.leaveId) this.loadLeave(this.leaveId);
    });
  }

  buildForm(): void {
    this.leaveForm = this.fb.group(
      {
        employeeId:       ['', Validators.required],
        leaveTypeId:      ['', Validators.required],
        startDate:        ['', Validators.required],
        endDate:          ['', Validators.required],
        totalDays:        [1, [Validators.required, Validators.min(0.5)]],
        reason:           ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
        isEmergencyLeave: [false],
        attachmentUrl:    ['']
      },
      { validators: this.dateRangeValidator }
    );
  }

  dateRangeValidator(g: FormGroup): { dateRange: boolean } | null {
    const s = g.get('startDate')?.value as string;
    const e = g.get('endDate')?.value as string;
    if (s && e && new Date(e) < new Date(s)) return { dateRange: true };
    return null;
  }

  loadLeaveTypes(): void {
    this.leaveTypeService.getActiveLeaveTypes().subscribe({
      next: (r) => { if (r.success) this.leaveTypes = r.data; }
    });
  }

  loadEmployees(): Promise<void> {
    return new Promise((resolve) => {
      this.employeeService.getActiveEmployees().subscribe({
        next: (employees: any[]) => {
          const all = employees.map(e => ({
            id: e.id,
            employeeCode: e.employeeCode,
            fullName: `${e.firstName} ${e.lastName}`,
            userId: e.userId
          }));

          if (this.restrictToEmployeeId) {
            const rid = this.restrictToEmployeeId.trim().toLowerCase();
            this.employees = all.filter(e =>
              e.id?.trim().toLowerCase() === rid ||
              e.userId?.trim().toLowerCase() === rid
            );
            if (this.employees.length === 1 && !this.isEditMode) {
              setTimeout(() => {
                this.leaveForm.patchValue({ employeeId: this.employees[0].id });
                this.onLeaveTypeChange();
              }, 0);
            } else if (this.employees.length === 0) {
              this.employees = all;
            }
          } else {
            this.employees = all;
          }
          resolve();
        },
        error: () => { this.employees = []; resolve(); }
      });
    });
  }

  loadLeave(id: string): void {
    this.loadingLeave = true;
    this.leaveService.getLeaveById(id).subscribe({
      next: (r) => {
        if (r.success) {
          const l: Leave = r.data;
          this.leaveForm.patchValue({
            employeeId: l.employeeId, leaveTypeId: l.leaveTypeId,
            startDate: this.toInputDate(l.startDate), endDate: this.toInputDate(l.endDate),
            totalDays: l.totalDays, reason: l.reason,
            isEmergencyLeave: l.isEmergencyLeave, attachmentUrl: l.attachmentUrl || ''
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
    const raw    = this.leaveForm.getRawValue();
    const typeId = raw.leaveTypeId as string;
    const empId  = raw.employeeId  as string;

    this.selectedLeaveType = this.leaveTypes.find(lt => lt.id === typeId) ?? null;
    this.remainingDays = null; this.balanceNotFound = false;

    if (typeId && empId) {
      this.balanceLoading = true;
      this.leaveService.getRemainingLeaveDays(empId, typeId, this.currentYear).subscribe({
        next: (r) => {
          this.balanceLoading = false;
          if (r.success) { this.remainingDays = r.data; this.balanceNotFound = false; }
          else            { this.remainingDays = null;   this.balanceNotFound = true;  }
        },
        error: () => { this.balanceLoading = false; this.remainingDays = null; this.balanceNotFound = true; }
      });
    }
  }

  onDateChange(): void {
    const s = this.leaveForm.get('startDate')?.value as string;
    const e = this.leaveForm.get('endDate')?.value as string;
    if (s && e && new Date(e) >= new Date(s)) {
      const diff = Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86_400_000) + 1;
      this.computedDays = diff;
      this.leaveForm.patchValue({ totalDays: diff }, { emitEvent: false });
    }
  }

  onSubmit(): void {
    if (this.leaveForm.invalid) { this.markAllTouched(); return; }

    if (this.balanceNotFound && !this.isEditMode) {
      this.formError = this.langService.t('leave.form.error.noBalance');
      return;
    }
    if (this.remainingDays !== null && !this.isEditMode) {
      const requested = Number(this.leaveForm.get('totalDays')?.value);
      if (requested > this.remainingDays) {
        this.formError = `${this.langService.t('leave.form.error.insufficientBalance')} ${requested} ${this.langService.t('leave.form.days')}, ${this.langService.t('leave.form.error.available')}: ${this.remainingDays} ${this.langService.t('leave.form.days')}.`;
        return;
      }
    }

    this.submitting = true; this.formError = null;
    const v = this.leaveForm.value;

    if (this.isEditMode && this.leaveId) {
      const dto: UpdateLeaveDto = {
        startDate: this.toISODateTime(v.startDate as string),
        endDate: this.toISODateTime(v.endDate as string),
        totalDays: Number(v.totalDays),
        reason: (v.reason as string).trim(),
        isEmergencyLeave: v.isEmergencyLeave as boolean,
        attachmentUrl: (v.attachmentUrl as string) || undefined,
        leaveTypeId: v.leaveTypeId as string,
      };
      this.leaveService.updateLeave(this.leaveId, dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) this.formSubmitted.emit();
          else this.formError = r.message || this.langService.t('leave.form.error.updateFailed');
        },
        error: (e) => { this.submitting = false; this.formError = this.extractError(e); }
      });
    } else {
      const dto: CreateLeaveDto = {
        employeeId: v.employeeId as string,
        leaveTypeId: v.leaveTypeId as string,
        startDate: this.toISODateTime(v.startDate as string),
        endDate: this.toISODateTime(v.endDate as string),
        totalDays: Number(v.totalDays),
        reason: (v.reason as string).trim(),
        isEmergencyLeave: v.isEmergencyLeave as boolean,
        attachmentUrl: (v.attachmentUrl as string) || undefined
      };
      this.leaveService.createLeave(dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) this.formSubmitted.emit();
          else this.formError = r.message || this.langService.t('leave.form.error.submitFailed');
        },
        error: (e) => { this.submitting = false; this.formError = this.extractError(e); }
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
    if (!c?.errors) {
      if (this.leaveForm.errors?.['dateRange'] && field === 'endDate')
        return this.langService.t('leave.form.error.dateRange');
      return '';
    }
    if (c.errors['required'])   return this.langService.t('common.fieldRequired');
    if (c.errors['minlength'])  return `${this.langService.t('common.minLength')} ${c.errors['minlength'].requiredLength}.`;
    if (c.errors['maxlength'])  return `${this.langService.t('common.maxLength')} ${c.errors['maxlength'].requiredLength}.`;
    if (c.errors['min'])        return `${this.langService.t('common.minValue')} ${c.errors['min'].min}.`;
    return '';
  }

  private markAllTouched(): void { Object.values(this.leaveForm.controls).forEach(c => c.markAsTouched()); }

  private toISODateTime(dateStr: string): string {
    if (!dateStr) return '';
    if (dateStr.includes('T')) return dateStr;
    return `${dateStr}T00:00:00.000Z`;
  }

  private toInputDate(d: Date | string): string { return new Date(d).toISOString().slice(0, 10); }

  private extractError(e: { error?: { errors?: Record<string, string[]>; message?: string; title?: string } }): string {
    const body = e?.error;
    if (!body) return this.langService.t('common.error');
    if (body.errors && typeof body.errors === 'object') {
      const msgs = Object.entries(body.errors).map(([f, m]) => `${f}: ${(Array.isArray(m) ? m : [m]).join(', ')}`);
      if (msgs.length) return msgs.join(' | ');
    }
    return body.message || body.title || this.langService.t('common.error');
  }
}