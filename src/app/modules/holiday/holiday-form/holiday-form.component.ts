// holiday-form.component.ts

import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { HolidayService } from '../../../core/services/api/holiday.api';
import { DepartmentService } from '../../../core/services/api/department.api';
import {
  Holiday,
  CreateHolidayDto,
  UpdateHolidayDto,
  HolidayType
} from '../../../core/Models/holiday.model';

@Component({
  selector: 'app-holiday-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './holiday-form.component.html',
  styleUrls: ['./holiday-form.component.scss']
})
export class HolidayFormComponent implements OnInit, OnDestroy {
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() holiday: Holiday | null = null;
  @Output() close   = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  holidayForm!: FormGroup;
  readonly holidayTypes = Object.values(HolidayType);
  departments: any[] = [];
  isSubmitting = false;
  formSubmitAttempted = false;

  private selectedDepartmentSet = new Set<string>();

  get selectedDepartments(): string[] {
    return Array.from(this.selectedDepartmentSet);
  }

  constructor(
    private fb: FormBuilder,
    private holidayService: HolidayService,
    private departmentService: DepartmentService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadDepartments();

    if (this.holiday && (this.mode === 'edit' || this.mode === 'view')) {
      this.populateForm();
    }

    if (this.mode === 'view') {
      this.holidayForm.disable();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Form Setup ───────────────────────────────────────────────────────────

  private initializeForm(): void {
    this.holidayForm = this.fb.group({
      holidayName:  ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      holidayDate:  ['', Validators.required],
      description:  ['', Validators.maxLength(500)],
      holidayType:  [HolidayType.National, Validators.required],
      isOptional:   [false],
      applicableDepartments: [[]]
    });

    this.holidayForm.get('holidayType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type: HolidayType) => {
        if (type === HolidayType.National) {
          this.selectedDepartmentSet.clear();
          this.syncDepartmentsToForm();
        }
      });
  }

  private populateForm(): void {
    if (!this.holiday) return;

    this.holidayForm.patchValue({
      holidayName:  this.holiday.holidayName,
      holidayDate:  this.formatDateForInput(this.holiday.holidayDate),
      description:  this.holiday.description ?? '',
      holidayType:  this.holiday.holidayType,
      isOptional:   this.holiday.isOptional,
      applicableDepartments: this.holiday.applicableDepartments
    });

    this.selectedDepartmentSet = new Set(this.holiday.applicableDepartments);
  }

  private loadDepartments(): void {
    this.departmentService.getActiveDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) this.departments = response.data;
        },
        error: (err: any) => {
          console.error('Error loading departments:', err);
          Swal.fire({
            icon: 'error',
            title: 'Failed to Load Departments',
            text: 'Could not load the department list. Please close and try again.',
            confirmButtonColor: '#3b82f6'
          });
        }
      });
  }

  // ─── Department Helpers ───────────────────────────────────────────────────

  toggleDepartment(departmentId: string): void {
    if (this.mode === 'view') return;
    if (this.selectedDepartmentSet.has(departmentId)) {
      this.selectedDepartmentSet.delete(departmentId);
    } else {
      this.selectedDepartmentSet.add(departmentId);
    }
    this.syncDepartmentsToForm();
  }

  isDepartmentSelected(departmentId: string): boolean {
    return this.selectedDepartmentSet.has(departmentId);
  }

  removeDepartment(departmentId: string): void {
    this.selectedDepartmentSet.delete(departmentId);
    this.syncDepartmentsToForm();
  }

  private syncDepartmentsToForm(): void {
    this.holidayForm.patchValue({ applicableDepartments: Array.from(this.selectedDepartmentSet) });
  }

  getDepartmentName(id: string): string {
    return this.departments.find(d => d.id === id)?.departmentName || id;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    this.formSubmitAttempted = true;

    if (this.holidayForm.invalid || this.isSubmitting) return;

    if (!this.isNationalHoliday && this.selectedDepartmentSet.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Department Selected',
        text: 'Please select at least one applicable department.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    this.isSubmitting = true;
    if (this.mode === 'create') {
      this.createHoliday();
    } else if (this.mode === 'edit') {
      this.updateHoliday();
    }
  }

  private createHoliday(): void {
    const fv = this.holidayForm.value;
    const dto: CreateHolidayDto = {
      holidayName:  fv.holidayName,
      holidayDate:  this.toUtcIso(fv.holidayDate),
      description:  fv.description || undefined,
      holidayType:  fv.holidayType,
      isOptional:   fv.isOptional,
      applicableDepartments: Array.from(this.selectedDepartmentSet)
    };

    this.holidayService.createHoliday(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          if (response.success) {
            Swal.fire({
              icon: 'success', title: 'Holiday Created!',
              text: `"${dto.holidayName}" has been added successfully.`,
              confirmButtonColor: '#3b82f6', timer: 2000, timerProgressBar: true, showConfirmButton: false
            });
            this.success.emit();
          } else {
            Swal.fire({ icon: 'error', title: 'Creation Failed', text: 'Could not create the holiday.', confirmButtonColor: '#3b82f6' });
          }
        },
        error: (err: any) => {
          this.isSubmitting = false;
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'An unexpected error occurred.', confirmButtonColor: '#3b82f6' });
        }
      });
  }

  private updateHoliday(): void {
    if (!this.holiday) return;
    const fv = this.holidayForm.value;
    const dto: UpdateHolidayDto = {
      holidayName:  fv.holidayName || undefined,
      holidayDate:  fv.holidayDate ? this.toUtcIso(fv.holidayDate) : undefined,
      description:  fv.description ?? undefined,
      holidayType:  fv.holidayType || undefined,
      isOptional:   fv.isOptional,
      applicableDepartments: Array.from(this.selectedDepartmentSet)
    };

    this.holidayService.updateHoliday(this.holiday.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          if (response.success) {
            Swal.fire({
              icon: 'success', title: 'Holiday Updated!',
              text: `"${dto.holidayName ?? this.holiday?.holidayName}" has been updated.`,
              confirmButtonColor: '#3b82f6', timer: 2000, timerProgressBar: true, showConfirmButton: false
            });
            this.success.emit();
          } else {
            Swal.fire({ icon: 'error', title: 'Update Failed', text: 'Could not update the holiday.', confirmButtonColor: '#3b82f6' });
          }
        },
        error: (err: any) => {
          this.isSubmitting = false;
          Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message ?? 'An unexpected error occurred.', confirmButtonColor: '#3b82f6' });
        }
      });
  }

  // ─── Close / Backdrop ─────────────────────────────────────────────────────

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) this.onClose();
  }

  // ─── Template Helpers ─────────────────────────────────────────────────────

  get isNationalHoliday(): boolean {
    return this.holidayForm.get('holidayType')?.value === HolidayType.National;
  }

  get modalTitle(): string {
    return this.mode === 'create' ? 'Add New Holiday'
         : this.mode === 'edit'   ? 'Edit Holiday'
         : 'Holiday Details';
  }

  get submitButtonText(): string {
    return this.mode === 'create' ? 'Create Holiday' : 'Update Holiday';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.holidayForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.holidayForm.get(fieldName);
    if (!field?.errors) return '';
    const { required, minlength, maxlength } = field.errors;
    if (required)  return `${this.getFieldLabel(fieldName)} is required`;
    if (minlength) return `${this.getFieldLabel(fieldName)} must be at least ${minlength.requiredLength} characters`;
    if (maxlength) return `${this.getFieldLabel(fieldName)} must not exceed ${maxlength.requiredLength} characters`;
    return 'Invalid value';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      holidayName: 'Holiday name',
      holidayDate: 'Holiday date',
      description: 'Description',
      holidayType: 'Holiday type'
    };
    return labels[fieldName] ?? fieldName;
  }

  // ─── Date Helpers ─────────────────────────────────────────────────────────

  formatDateForInput(date: any): string {
    const d = new Date(date);
    const year  = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day   = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private toUtcIso(dateStr: string): string {
    return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
  }
}