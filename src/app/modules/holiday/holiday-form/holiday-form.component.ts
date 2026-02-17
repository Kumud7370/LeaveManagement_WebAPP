import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { HolidayService } from '../../../core/services/api/holiday.api';
import { DepartmentService } from '../../../core/services/api/department.api';
import { Holiday, CreateHolidayDto, UpdateHolidayDto, HolidayType } from '../../../core/Models/holiday.model';

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
  holidayTypes = Object.values(HolidayType);
  departments: any[] = [];
  isSubmitting = false;
  selectedDepartments: string[] = [];

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

  initializeForm(): void {
    this.holidayForm = this.fb.group({
      holidayName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      holidayDate: ['', Validators.required],
      description: ['', Validators.maxLength(500)],
      holidayType: [HolidayType.National, Validators.required],
      isOptional: [false],
      applicableDepartments: [[]]
    });

    // Listen to holiday type changes
    this.holidayForm.get('holidayType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        if (type === HolidayType.National) {
          this.holidayForm.get('applicableDepartments')?.setValue([]);
        }
      });
  }

  populateForm(): void {
    if (!this.holiday) return;

    const formattedDate = this.formatDateForInput(this.holiday.holidayDate);
    
    this.holidayForm.patchValue({
      holidayName: this.holiday.holidayName,
      holidayDate: formattedDate,
      description: this.holiday.description,
      holidayType: this.holiday.holidayType,
      isOptional: this.holiday.isOptional,
      applicableDepartments: this.holiday.applicableDepartments
    });

    this.selectedDepartments = this.holiday.applicableDepartments;
  }

  loadDepartments(): void {
    // Load active departments for the holiday form
    this.departmentService.getActiveDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.departments = response.data;
          }
        },
        error: (error: any) => {
          console.error('Error loading departments:', error);
        }
      });
  }

  toggleDepartment(departmentId: string): void {
    const index = this.selectedDepartments.indexOf(departmentId);
    if (index > -1) {
      this.selectedDepartments.splice(index, 1);
    } else {
      this.selectedDepartments.push(departmentId);
    }
    this.holidayForm.patchValue({ applicableDepartments: this.selectedDepartments });
  }

  isDepartmentSelected(departmentId: string): boolean {
    return this.selectedDepartments.includes(departmentId);
  }

  onSubmit(): void {
    if (this.holidayForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;

    if (this.mode === 'create') {
      this.createHoliday();
    } else if (this.mode === 'edit') {
      this.updateHoliday();
    }
  }

  createHoliday(): void {
    const dto: CreateHolidayDto = this.holidayForm.value;
    
    this.holidayService.createHoliday(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.success.emit();
          }
          this.isSubmitting = false;
        },
        error: (error: any) => {
          console.error('Error creating holiday:', error);
          this.isSubmitting = false;
        }
      });
  }

  updateHoliday(): void {
    if (!this.holiday) return;

    const dto: UpdateHolidayDto = this.holidayForm.value;
    
    this.holidayService.updateHoliday(this.holiday.id, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.success.emit();
          }
          this.isSubmitting = false;
        },
        error: (error: any) => {
          console.error('Error updating holiday:', error);
          this.isSubmitting = false;
        }
      });
  }

  onClose(): void {
    this.close.emit();
  }

  formatDateForInput(date: any): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  get isNationalHoliday(): boolean {
    return this.holidayForm.get('holidayType')?.value === HolidayType.National;
  }

  get modalTitle(): string {
    if (this.mode === 'create') return 'Add New Holiday';
    if (this.mode === 'edit') return 'Edit Holiday';
    return 'Holiday Details';
  }

  get submitButtonText(): string {
    if (this.isSubmitting) return 'Saving...';
    if (this.mode === 'create') return 'Create Holiday';
    return 'Update Holiday';
  }

  // Form field getters for validation
  get f() {
    return this.holidayForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.holidayForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.holidayForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    if (errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
    if (errors['minlength']) return `${this.getFieldLabel(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} must not exceed ${errors['maxlength'].requiredLength} characters`;
    
    return 'Invalid value';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      holidayName: 'Holiday name',
      holidayDate: 'Holiday date',
      description: 'Description',
      holidayType: 'Holiday type'
    };
    return labels[fieldName] || fieldName;
  }
}