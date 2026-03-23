import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LeaveBalanceService } from '../../../core/services/api/leave-balance.api';
import { LeaveTypeService }    from '../../../core/services/api/leave-type.api';
import { EmployeeService }     from '../../../core/services/api/employee.api';
import { LanguageService }     from '../../../core/services/api/language.api';
import { LeaveBalance, CreateLeaveBalanceDto, UpdateLeaveBalanceDto } from '../../../core/Models/leave-balance.model';
import { LeaveType } from '../../../core/Models/leave-type.model';

interface EmployeeSummary { id: string; employeeCode: string; fullName: string; }

@Component({
  selector: 'app-leave-balance-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './leave-balance-form.component.html',
  styleUrls: ['./leave-balance-form.component.scss']
})
export class LeaveBalanceFormComponent implements OnInit {
  @Input() isModal      = false;
  @Input() isEditMode   = false;
  @Input() balanceId:   string | null = null;
  @Input() defaultYear  = new Date().getFullYear();
  @Output() formSubmitted = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  balanceForm!:       FormGroup;
  leaveTypes:         LeaveType[]       = [];
  employees:          EmployeeSummary[] = [];
  selectedLeaveType:  LeaveType | null  = null;
  submitting          = false;
  loadingBalance      = false;
  formError:          string | null     = null;
  yearOptions:        number[]          = [];

  constructor(
    private fb:                 FormBuilder,
    private leaveBalanceService: LeaveBalanceService,
    private leaveTypeService:   LeaveTypeService,
    private employeeService:    EmployeeService,
    public  langService:        LanguageService
  ) {
    const cur = new Date().getFullYear();
    for (let y = cur + 1; y >= cur - 3; y--) this.yearOptions.push(y);
  }

  ngOnInit(): void {
    this.buildForm();
    this.loadLeaveTypes();
    this.loadEmployees();
    if (this.isEditMode && this.balanceId) this.loadBalance(this.balanceId);
  }

  buildForm(): void {
    this.balanceForm = this.fb.group({
      employeeId:     ['', Validators.required],
      leaveTypeId:    ['', Validators.required],
      year:           [this.defaultYear, [Validators.required, Validators.min(2000), Validators.max(2100)]],
      totalAllocated: [null, [Validators.required, Validators.min(0), Validators.max(365)]],
      carriedForward: [0,    [Validators.min(0), Validators.max(365)]]
    });
  }

  loadLeaveTypes(): void {
    this.leaveTypeService.getActiveLeaveTypes().subscribe({
      next: (r) => { if (r.success) this.leaveTypes = r.data; }
    });
  }

  loadEmployees(): void {
    this.employeeService.getActiveEmployees().subscribe({
      next: (employees: any[]) => {
        this.employees = employees.map(e => ({
          id: e.id, employeeCode: e.employeeCode,
          fullName: `${e.firstName} ${e.lastName}`
        }));
      },
      error: () => { this.employees = []; }
    });
  }

  loadBalance(id: string): void {
    this.loadingBalance = true;
    this.leaveBalanceService.getLeaveBalanceById(id).subscribe({
      next: (r) => {
        if (r.success) {
          const b: LeaveBalance = r.data;
          this.balanceForm.patchValue({
            employeeId: b.employeeId, leaveTypeId: b.leaveTypeId,
            year: b.year, totalAllocated: b.totalAllocated, carriedForward: b.carriedForward
          });
          this.balanceForm.get('employeeId')?.disable();
          this.balanceForm.get('leaveTypeId')?.disable();
          this.balanceForm.get('year')?.disable();
          this.onLeaveTypeChange();
        }
        this.loadingBalance = false;
      },
      error: () => { this.loadingBalance = false; }
    });
  }

  onLeaveTypeChange(): void {
    const id = this.balanceForm.get('leaveTypeId')?.value;
    this.selectedLeaveType = this.leaveTypes.find(lt => lt.id === id) || null;
    if (!this.isEditMode && this.selectedLeaveType) {
      this.balanceForm.patchValue({ totalAllocated: this.selectedLeaveType.maxDaysPerYear });
    }
    if (this.selectedLeaveType && !this.selectedLeaveType.isCarryForward) {
      this.balanceForm.patchValue({ carriedForward: 0 });
    }
  }

  onSubmit(): void {
    if (this.balanceForm.invalid) { this.markAllTouched(); return; }
    this.submitting = true; this.formError = null;
    const v = this.balanceForm.getRawValue();
    const t = (k: string) => this.langService.t(k);

    if (this.isEditMode && this.balanceId) {
      const dto: UpdateLeaveBalanceDto = {
        totalAllocated: v.totalAllocated,
        carriedForward: v.carriedForward
      };
      this.leaveBalanceService.updateLeaveBalance(this.balanceId, dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) this.formSubmitted.emit();
          else this.formError = r.message || t('lb.msg.updateFailed');
        },
        error: (e) => { this.submitting = false; this.formError = e.error?.message || t('common.error'); }
      });
    } else {
      const dto: CreateLeaveBalanceDto = {
        employeeId: v.employeeId, leaveTypeId: v.leaveTypeId,
        year: v.year, totalAllocated: v.totalAllocated,
        carriedForward: v.carriedForward || 0
      };
      this.leaveBalanceService.createLeaveBalance(dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) this.formSubmitted.emit();
          else this.formError = r.message || t('lb.msg.createFailed');
        },
        error: (e) => { this.submitting = false; this.formError = e.error?.message || t('common.error'); }
      });
    }
  }

  onCancel(): void { this.formCancelled.emit(); }

  isInvalid(field: string): boolean {
    const c = this.balanceForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  getError(field: string): string {
    const c = this.balanceForm.get(field);
    if (!c?.errors) return '';
    const t = (k: string) => this.langService.t(k);
    if (c.errors['required']) return t('common.fieldRequired');
    if (c.errors['min'])      return `${t('common.minValue')} ${c.errors['min'].min}.`;
    if (c.errors['max'])      return `${t('common.maxValue')} ${c.errors['max'].max}.`;
    return '';
  }

  private markAllTouched(): void {
    Object.values(this.balanceForm.controls).forEach(c => c.markAsTouched());
  }
}