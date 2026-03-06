import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { LeaveBalanceService } from '../../../core/services/api/leave-balance.api';
import { LeaveTypeService }    from '../../../core/services/api/leave-type.api';
import { EmployeeService }     from '../../../core/services/api/employee.api';
import { LeaveType }           from '../../../core/Models/leave-type.model';
import {
  CollectiveLeaveBalanceDto,
  CollectiveAssignmentResultDto
} from '../../../core/Models/leave-balance.model';

interface EmployeeSummary {
  id:           string;
  employeeCode: string;
  fullName:     string;
}

type ScopeMode = 'all' | 'select';

@Component({
  selector:    'app-collective-leave-balance-form',
  standalone:  true,
  imports:     [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './collective-leave-balance-form.component.html',
  styleUrls:   ['./collective-leave-balance-form.component.scss']
})
export class CollectiveLeaveBalanceFormComponent implements OnInit {

  @Input()  defaultYear    = new Date().getFullYear();
  @Output() formSubmitted  = new EventEmitter<void>();
  @Output() formCancelled  = new EventEmitter<void>();

  // ── Form ────────────────────────────────────────────────────────────────────
  collectiveForm!: FormGroup;

  // ── Reference data ──────────────────────────────────────────────────────────
  leaveTypes:        LeaveType[]       = [];
  employees:         EmployeeSummary[] = [];
  selectedLeaveType: LeaveType | null  = null;
  yearOptions:       number[]          = [];

  // ── Employee scope ──────────────────────────────────────────────────────────
  scopeMode:           ScopeMode  = 'all';
  selectedEmployeeIds: Set<string> = new Set();
  employeeSearch                   = '';

  // ── UI state ────────────────────────────────────────────────────────────────
  loadingTypes      = false;
  loadingEmployees  = false;
  submitting        = false;
  formError:         string | null = null;
  resultSummary:     CollectiveAssignmentResultDto | null = null;

  constructor(
    private fb:                  FormBuilder,
    private leaveBalanceService: LeaveBalanceService,
    private leaveTypeService:    LeaveTypeService,
    private employeeService:     EmployeeService
  ) {
    const cur = new Date().getFullYear();
    for (let y = cur + 1; y >= cur - 3; y--) this.yearOptions.push(y);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.buildForm();
    this.loadLeaveTypes();
    this.loadEmployees();
  }

  // ── Form setup ───────────────────────────────────────────────────────────────
  buildForm(): void {
    this.collectiveForm = this.fb.group({
      leaveTypeId:    ['',              Validators.required],
      year:           [this.defaultYear, [Validators.required, Validators.min(2000), Validators.max(2100)]],
      totalAllocated: [null,            [Validators.required, Validators.min(0), Validators.max(365)]],
      carriedForward: [null,            [Validators.min(0), Validators.max(365)]],
      skipExisting:   [true]
    });
  }

  // ── Data loading ─────────────────────────────────────────────────────────────
  loadLeaveTypes(): void {
    this.loadingTypes = true;
    this.leaveTypeService.getActiveLeaveTypes().subscribe({
      next:  (r) => { if (r.success) this.leaveTypes = r.data; this.loadingTypes = false; },
      error: ()  => { this.loadingTypes = false; }
    });
  }

  loadEmployees(): void {
    this.loadingEmployees = true;
    this.employeeService.getActiveEmployees().subscribe({
      next: (employees: any[]) => {
        this.employees = employees.map(e => ({
          id:           e.id,
          employeeCode: e.employeeCode,
          fullName:     `${e.firstName} ${e.lastName}`
        }));
        this.loadingEmployees = false;
      },
      error: () => { this.employees = []; this.loadingEmployees = false; }
    });
  }

  // ── Leave type change ─────────────────────────────────────────────────────────
  onLeaveTypeChange(): void {
    const id = this.collectiveForm.get('leaveTypeId')?.value as string;
    this.selectedLeaveType = this.leaveTypes.find(lt => lt.id === id) ?? null;

    if (this.selectedLeaveType) {
      // Auto-fill allocation from the leave type's default
      this.collectiveForm.patchValue({ totalAllocated: this.selectedLeaveType.maxDaysPerYear });
    }

    // Clear carry-forward if the leave type doesn't support it
    if (this.selectedLeaveType && !this.selectedLeaveType.isCarryForward) {
      this.collectiveForm.patchValue({ carriedForward: null });
    }
  }

  // ── Employee scope ────────────────────────────────────────────────────────────
  setScopeMode(mode: ScopeMode): void {
    this.scopeMode      = mode;
    this.employeeSearch = '';
    if (mode === 'all') {
      this.selectedEmployeeIds = new Set();
    }
  }

  toggleEmployee(id: string): void {
    const updated = new Set(this.selectedEmployeeIds);
    if (updated.has(id)) updated.delete(id); else updated.add(id);
    this.selectedEmployeeIds = updated;
  }

  toggleSelectAll(): void {
    const updated = new Set(this.selectedEmployeeIds);
    if (this.allFilteredSelected) {
      this.filteredEmployees.forEach(e => updated.delete(e.id));
    } else {
      this.filteredEmployees.forEach(e => updated.add(e.id));
    }
    this.selectedEmployeeIds = updated;
  }

  get filteredEmployees(): EmployeeSummary[] {
    const q = this.employeeSearch.toLowerCase().trim();
    if (!q) return this.employees;
    return this.employees.filter(e =>
      e.fullName.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q)
    );
  }

  get allFilteredSelected(): boolean {
    return this.filteredEmployees.length > 0 &&
      this.filteredEmployees.every(e => this.selectedEmployeeIds.has(e.id));
  }

  // ── Computed helpers ──────────────────────────────────────────────────────────
  get effectiveEmployeeCount(): number {
    return this.scopeMode === 'all'
      ? this.employees.length
      : this.selectedEmployeeIds.size;
  }

  get canSubmit(): boolean {
    return !(this.scopeMode === 'select' && this.selectedEmployeeIds.size === 0);
  }

  get canShowSummary(): boolean {
    return !!(
      this.collectiveForm.get('leaveTypeId')?.value &&
      this.collectiveForm.get('totalAllocated')?.value != null &&
      this.effectiveEmployeeCount > 0
    );
  }

  get isLoading(): boolean {
    return this.loadingTypes || this.loadingEmployees;
  }

  // ── Submit — calls POST /api/leavebalance/assign/collective ──────────────────
  onSubmit(): void {
    if (this.collectiveForm.invalid || !this.canSubmit) {
      this.markAllTouched();
      return;
    }

    const v         = this.collectiveForm.getRawValue();
    const targetIds = this.scopeMode === 'all'
      ? this.employees.map(e => e.id)
      : Array.from(this.selectedEmployeeIds);

    if (targetIds.length === 0) {
      this.formError = 'No employees selected.';
      return;
    }

    const dto: CollectiveLeaveBalanceDto = {
      leaveTypeId:  v.leaveTypeId,
      employeeIds:  targetIds,
      year:         Number(v.year),
      skipExisting: v.skipExisting ?? true,
      ...(v.totalAllocated != null ? { totalAllocated: Number(v.totalAllocated) } : {}),
      ...(v.carriedForward != null && Number(v.carriedForward) > 0
            ? { carriedForward: Number(v.carriedForward) }
            : {})
    };

    this.submitting    = true;
    this.formError     = null;
    this.resultSummary = null;

    this.leaveBalanceService.assignCollectiveLeaveBalance(dto).subscribe({
      next: (r) => {
        this.submitting = false;
        if (r.success) {
          this.resultSummary = r.data;
          if (r.data.succeeded > 0) {
            setTimeout(() => this.formSubmitted.emit(), 2200);
          }
        } else {
          this.formError = r.message || 'Assignment failed. Please try again.';
        }
      },
      error: (e) => {
        this.submitting = false;
        this.formError  = e.error?.message || 'An unexpected error occurred.';
      }
    });
  }

  onCancel(): void { this.formCancelled.emit(); }

  // ── Validation helpers ────────────────────────────────────────────────────────
  isInvalid(field: string): boolean {
    const c = this.collectiveForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  getError(field: string): string {
    const c = this.collectiveForm.get(field);
    if (!c?.errors) return '';
    if (c.errors['required']) return 'This field is required.';
    if (c.errors['min'])      return `Minimum value is ${c.errors['min'].min}.`;
    if (c.errors['max'])      return `Maximum value is ${c.errors['max'].max}.`;
    return '';
  }

  private markAllTouched(): void {
    Object.values(this.collectiveForm.controls).forEach(c => c.markAsTouched());
  }
}