import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { EmployeeService } from '../../../core/services/api/employee.api';
import { DepartmentService } from '../../../core/services/api/department.api';
import { DesignationService } from '../../../core/services/api/designation.api';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
  EmployeeStatus,
  EmploymentType,
  Gender
} from '../../../../app/core/Models/employee.model';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.scss']
})
export class EmployeeFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() isModal = false;
  @Input() employeeId: string | null = null;
  @Input() isEditMode = false;
  @Output() formCancelled = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<void>();

  employeeForm: FormGroup;
  isLoading = false;
  isSaving = false;

  // Departments & Designations
  departments: any[] = [];
  designations: any[] = [];
  isDepartmentsLoading = false;
  isDesignationsLoading = false;

  genderOptions = [
    { value: Gender.Male,   label: 'Male' },
    { value: Gender.Female, label: 'Female' },
    { value: Gender.Other,  label: 'Other' }
  ];

  employmentTypeOptions = [
    { value: EmploymentType.FullTime,  label: 'Full Time' },
    { value: EmploymentType.PartTime,  label: 'Part Time' },
    { value: EmploymentType.Contract,  label: 'Contract' },
    { value: EmploymentType.Intern,    label: 'Intern' },
    { value: EmploymentType.Temporary, label: 'Temporary' }
  ];

  employeeStatusOptions = [
    { value: EmployeeStatus.Active,     label: 'Active' },
    { value: EmployeeStatus.Inactive,   label: 'Inactive' },
    { value: EmployeeStatus.OnLeave,    label: 'On Leave' },
    { value: EmployeeStatus.Suspended,  label: 'Suspended' },
    { value: EmployeeStatus.Terminated, label: 'Terminated' },
    { value: EmployeeStatus.Resigned,   label: 'Resigned' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private designationService: DesignationService
  ) {
    this.employeeForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadDesignations();

    if (this.isModal && this.employeeId) {
      this.isEditMode = true;
      this.loadEmployeeData();
    } else if (!this.isModal) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['id']) {
          this.isEditMode = true;
          this.employeeId = params['id'];
          this.loadEmployeeData();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Load Departments ─────────────────────────────────────────────────────────
  // Handles all response shapes:
  //   • T[]                            (service already unwrapped with map(r => r.data))
  //   • ApiResponseDto<T[]>            { success, data: T[] }
  //   • ApiResponseDto<PagedResultDto> { success, data: { items: T[] } }
  //   • PagedResultDto                 { items: T[], totalCount, ... }
  private loadDepartments(): void {
    this.isDepartmentsLoading = true;
    this.departmentService.getActiveDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.departments = this.extractArray(response);
          console.log(`✅ Departments loaded: ${this.departments.length}`, this.departments);
          this.isDepartmentsLoading = false;
        },
        error: (err: any) => {
          console.error('❌ Error loading departments:', err);
          this.isDepartmentsLoading = false;
        }
      });
  }

  // ─── Load Designations ────────────────────────────────────────────────────────
  private loadDesignations(): void {
    this.isDesignationsLoading = true;
    this.designationService.getActiveDesignations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.designations = this.extractArray(response);
          console.log(`✅ Designations loaded: ${this.designations.length}`, this.designations);
          this.isDesignationsLoading = false;
        },
        error: (err: any) => {
          console.error('❌ Error loading designations:', err);
          this.isDesignationsLoading = false;
        }
      });
  }

  /**
   * Safely extracts an array from any of these API response shapes:
   *   T[]                              → returned as-is
   *   { data: T[] }                   → returns data
   *   { data: { items: T[] } }        → returns data.items
   *   { items: T[] }                  → returns items
   */
  private extractArray(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (response?.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (Array.isArray(response.data?.items)) {
        return response.data.items;
      }
    }
    if (Array.isArray(response?.items)) {
      return response.items;
    }
    console.warn('⚠️ Could not extract array from response shape:', response);
    return [];
  }

  // ─── Form ─────────────────────────────────────────────────────────────────────
  private createForm(): FormGroup {
    return this.fb.group({
      employeeCode:         ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      firstName:            ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      middleName:           ['', Validators.maxLength(50)],
      lastName:             ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      dateOfBirth:          ['', Validators.required],
      gender:               [Gender.Male, Validators.required],
      email:                ['', [Validators.required, Validators.email]],
      phoneNumber:          ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      alternatePhoneNumber: ['', Validators.pattern(/^\+?[1-9]\d{1,14}$/)],
      street:               ['', [Validators.required, Validators.maxLength(200)]],
      city:                 ['', [Validators.required, Validators.maxLength(100)]],
      state:                ['', [Validators.required, Validators.maxLength(100)]],
      country:              ['', [Validators.required, Validators.maxLength(100)]],
      postalCode:           ['', [Validators.required, Validators.maxLength(20)]],
      departmentId:         ['', Validators.required],
      designationId:        ['', Validators.required],
      managerId:            [''],
      dateOfJoining:        ['', Validators.required],
      dateOfLeaving:        [''],
      employmentType:       [EmploymentType.FullTime, Validators.required],
      employeeStatus:       [EmployeeStatus.Active, Validators.required],
      profileImageUrl:      [''],
      biometricId:          ['']
    });
  }

  private loadEmployeeData(): void {
    if (!this.employeeId) return;

    this.isLoading = true;
    this.employeeService.getEmployeeById(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.populateForm(employee);
          this.isLoading = false;
          this.employeeForm.get('employeeCode')?.disable();
        },
        error: (error) => {
          console.error('Error loading employee:', error);
          this.isLoading = false;
          Swal.fire({
            icon: 'error', title: 'Error',
            text: 'Failed to load employee data.',
            confirmButtonColor: '#1a2a6c'
          }).then(() => {
            if (this.isModal) { this.cancel(); } else { this.router.navigate(['/employees']); }
          });
        }
      });
  }

  private populateForm(employee: EmployeeResponseDto): void {
    this.employeeForm.patchValue({
      employeeCode:         employee.employeeCode,
      firstName:            employee.firstName,
      middleName:           employee.middleName,
      lastName:             employee.lastName,
      dateOfBirth:          this.formatDateForInput(employee.dateOfBirth),
      gender:               employee.gender,
      email:                employee.email,
      phoneNumber:          employee.phoneNumber,
      alternatePhoneNumber: employee.alternatePhoneNumber,
      street:               employee.address?.street || '',
      city:                 employee.address?.city || '',
      state:                employee.address?.state || '',
      country:              employee.address?.country || '',
      postalCode:           employee.address?.postalCode || '',
      departmentId:         employee.departmentId,
      designationId:        employee.designationId,
      managerId:            employee.managerId,
      dateOfJoining:        this.formatDateForInput(employee.dateOfJoining),
      dateOfLeaving:        employee.dateOfLeaving ? this.formatDateForInput(employee.dateOfLeaving) : '',
      employmentType:       employee.employmentType,
      employeeStatus:       employee.employeeStatus,
      profileImageUrl:      employee.profileImageUrl,
      biometricId:          employee.biometricId
    });
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────
  onSubmit(): void {
    if (this.employeeForm.invalid) {
      this.markFormGroupTouched(this.employeeForm);
      Swal.fire({
        icon: 'warning', title: 'Validation Error',
        text: 'Please fill all required fields correctly.',
        confirmButtonColor: '#1a2a6c'
      });
      return;
    }
    this.isSaving = true;
    if (this.isEditMode) { this.updateEmployee(); } else { this.createEmployee(); }
  }

  private createEmployee(): void {
    const formValue = this.employeeForm.getRawValue();
    const dto: CreateEmployeeDto = {
      employeeCode:         formValue.employeeCode,
      firstName:            formValue.firstName,
      middleName:           formValue.middleName || undefined,
      lastName:             formValue.lastName,
      dateOfBirth:          new Date(formValue.dateOfBirth),
      gender:               Number(formValue.gender),
      email:                formValue.email,
      phoneNumber:          formValue.phoneNumber,
      alternatePhoneNumber: formValue.alternatePhoneNumber || undefined,
      address: {
        street:     formValue.street,
        city:       formValue.city,
        state:      formValue.state,
        country:    formValue.country,
        postalCode: formValue.postalCode
      },
      departmentId:    formValue.departmentId,
      designationId:   formValue.designationId,
      managerId:       formValue.managerId || undefined,
      dateOfJoining:   new Date(formValue.dateOfJoining),
      dateOfLeaving:   formValue.dateOfLeaving ? new Date(formValue.dateOfLeaving) : undefined,
      employmentType:  Number(formValue.employmentType),
      employeeStatus:  Number(formValue.employeeStatus),
      profileImageUrl: formValue.profileImageUrl || undefined,
      biometricId:     formValue.biometricId || undefined
    };

    this.employeeService.createEmployee(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          Swal.fire({ icon: 'success', title: 'Success', text: 'Employee created successfully.', timer: 2000, showConfirmButton: false });
          if (this.isModal) { this.formSubmitted.emit(); } else { this.router.navigate(['/employees']); }
        },
        error: (error) => {
          console.error('Error creating employee:', error);
          this.isSaving = false;
          Swal.fire({ icon: 'error', title: 'Error', text: error.error?.message || 'Failed to create employee.', confirmButtonColor: '#1a2a6c' });
        }
      });
  }

  private updateEmployee(): void {
    if (!this.employeeId) return;

    const formValue = this.employeeForm.getRawValue();
    const dto: UpdateEmployeeDto = {
      firstName:            formValue.firstName,
      middleName:           formValue.middleName || undefined,
      lastName:             formValue.lastName,
      dateOfBirth:          new Date(formValue.dateOfBirth),
      gender:               Number(formValue.gender),
      email:                formValue.email,
      phoneNumber:          formValue.phoneNumber,
      alternatePhoneNumber: formValue.alternatePhoneNumber || undefined,
      address: {
        street:     formValue.street,
        city:       formValue.city,
        state:      formValue.state,
        country:    formValue.country,
        postalCode: formValue.postalCode
      },
      departmentId:    formValue.departmentId,
      designationId:   formValue.designationId,
      managerId:       formValue.managerId || undefined,
      dateOfJoining:   new Date(formValue.dateOfJoining),
      dateOfLeaving:   formValue.dateOfLeaving ? new Date(formValue.dateOfLeaving) : undefined,
      employmentType:  Number(formValue.employmentType),
      employeeStatus:  Number(formValue.employeeStatus),
      profileImageUrl: formValue.profileImageUrl || undefined,
      biometricId:     formValue.biometricId || undefined
    };

    this.employeeService.updateEmployee(this.employeeId, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          Swal.fire({ icon: 'success', title: 'Success', text: 'Employee updated successfully.', timer: 2000, showConfirmButton: false });
          if (this.isModal) { this.formSubmitted.emit(); } else { this.router.navigate(['/employees']); }
        },
        error: (error) => {
          console.error('Error updating employee:', error);
          this.isSaving = false;
          Swal.fire({ icon: 'error', title: 'Error', text: error.error?.message || 'Failed to update employee.', confirmButtonColor: '#1a2a6c' });
        }
      });
  }

  cancel(): void {
    if (this.isModal) { this.formCancelled.emit(); } else { this.router.navigate(['/employees']); }
  }

  private formatDateForInput(date: Date | string): string {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day   = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      formGroup.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required'])  return 'This field is required';
      if (field.errors['email'])     return 'Invalid email format';
      if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength}`;
      if (field.errors['maxlength']) return `Maximum length is ${field.errors['maxlength'].requiredLength}`;
      if (field.errors['pattern'])   return 'Invalid format';
    }
    return '';
  }
}