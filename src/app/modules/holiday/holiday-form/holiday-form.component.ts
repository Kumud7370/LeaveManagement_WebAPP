import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
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
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  holidayForm!: FormGroup;
  readonly holidayTypes = Object.values(HolidayType);
  departments: any[] = [];
  isSubmitting = false;

  /**
   * Tracks whether each department is selected by ID.
   * Using a Set makes O(1) lookup and avoids the double-toggle bug that
   * existed when mutating an array directly via splice/push while Angular
   * was also re-rendering.
   */
  private selectedDepartmentSet = new Set<string>();

  /** Exposed as an array for the template length check */
  get selectedDepartments(): string[] {
    return Array.from(this.selectedDepartmentSet);
  }

  /** Used to show department validation error only after a submit attempt */
  formSubmitAttempted = false;

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

  private initializeForm(): void {
    this.holidayForm = this.fb.group({
      holidayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      holidayDate: ['', Validators.required],
      description: ['', Validators.maxLength(500)],
      holidayType: [HolidayType.National, Validators.required],
      isOptional: [false],
      applicableDepartments: [[]]
    });

    // Clear department selection when switching to National
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
      holidayName: this.holiday.holidayName,
      holidayDate: this.formatDateForInput(this.holiday.holidayDate),
      description: this.holiday.description ?? '',
      holidayType: this.holiday.holidayType,
      isOptional: this.holiday.isOptional,
      applicableDepartments: this.holiday.applicableDepartments
    });

    // Populate the Set from the holiday data
    this.selectedDepartmentSet = new Set(this.holiday.applicableDepartments);
  }

  private loadDepartments(): void {
    this.departmentService.getActiveDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.departments = response.data;
          }
        },
        error: (err: any) => console.error('Error loading departments:', err)
      });
  }

  /**
   * Toggle a single department.
   *
   * ROOT CAUSE of old bug: The template used a wrapping <label> which caused
   * the browser to fire two events per user click (one from the click itself,
   * one from the label forwarding to the checkbox). Each call toggled the Set,
   * so net result was no change — appearing as if everything was selected or
   * deselected together.
   *
   * Fix: The template now uses a plain <div> card with (click)="toggleDepartment"
   * and the checkbox uses (click)="$event.stopPropagation()" so only ONE event
   * path reaches toggleDepartment per user interaction.
   */
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

  private syncDepartmentsToForm(): void {
    this.holidayForm.patchValue({
      applicableDepartments: Array.from(this.selectedDepartmentSet)
    });
  }

  onSubmit(): void {
    this.formSubmitAttempted = true;

    if (this.holidayForm.invalid || this.isSubmitting) return;

    // Extra guard: non-national types need at least one dept
    if (!this.isNationalHoliday && this.selectedDepartmentSet.size === 0) return;

    this.isSubmitting = true;
    if (this.mode === 'create') {
      this.createHoliday();
    } else if (this.mode === 'edit') {
      this.updateHoliday();
    }
  }

  private createHoliday(): void {
    const formValue = this.holidayForm.value;

    const dto: CreateHolidayDto = {
      holidayName: formValue.holidayName,
      holidayDate: this.toUtcIso(formValue.holidayDate),
      description: formValue.description || undefined,
      holidayType: formValue.holidayType,
      isOptional: formValue.isOptional,
      applicableDepartments: Array.from(this.selectedDepartmentSet)
    };

    this.holidayService.createHoliday(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          if (response.success) this.success.emit();
        },
        error: (err: any) => {
          console.error('Error creating holiday:', err);
          this.isSubmitting = false;
        }
      });
  }

  private updateHoliday(): void {
    if (!this.holiday) return;

    const formValue = this.holidayForm.value;

    const dto: UpdateHolidayDto = {
      holidayName: formValue.holidayName || undefined,
      holidayDate: formValue.holidayDate ? this.toUtcIso(formValue.holidayDate) : undefined,
      description: formValue.description ?? undefined,
      holidayType: formValue.holidayType || undefined,
      isOptional: formValue.isOptional,
      applicableDepartments: Array.from(this.selectedDepartmentSet)
    };

    this.holidayService.updateHoliday(this.holiday.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          if (response.success) this.success.emit();
        },
        error: (err: any) => {
          console.error('Error updating holiday:', err);
          this.isSubmitting = false;
        }
      });
  }

  onClose(): void {
    this.close.emit();
  }

  // ── Date helpers ──────────────────────────────────────────────────────────

  formatDateForInput(date: any): string {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  private toUtcIso(dateStr: string): string {
    return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  get isNationalHoliday(): boolean {
    return this.holidayForm.get('holidayType')?.value === HolidayType.National;
  }

  get modalTitle(): string {
    return this.mode === 'create' ? 'Add New Holiday'
         : this.mode === 'edit'   ? 'Edit Holiday'
         : 'Holiday Details';
  }

  get submitButtonText(): string {
    if (this.isSubmitting) return 'Saving...';
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
}