import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { EmployeeService } from '../../../../../core/services/api/employee.api';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
  EmployeeStatus,
  EmploymentType,
  Gender
} from '../../../../../core/Models/employee.model';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.scss']
})
export class EmployeeFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  employeeForm: FormGroup;
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  employeeId: string = '';
  
  // Enums for dropdowns
  genderOptions = Object.values(Gender).map(value => ({
    value: value,
    label: value
  }));
  
  employmentTypeOptions = Object.values(EmploymentType).map(value => ({
    value: value,
    label: value
  }));
  
  employeeStatusOptions = Object.values(EmployeeStatus).map(value => ({
    value: value,
    label: value
  }));

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService
  ) {
    this.employeeForm = this.createForm();
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.employeeId = params['id'];
        this.loadEmployeeData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Personal Information
      employeeCode: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      middleName: ['', Validators.maxLength(50)],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      dateOfBirth: ['', Validators.required],
      gender: [Gender.Male, Validators.required],
      
      // Contact Information
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      alternatePhoneNumber: ['', Validators.pattern(/^\+?[1-9]\d{1,14}$/)],
      
      // Address
      street: ['', [Validators.required, Validators.maxLength(200)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: ['', [Validators.required, Validators.maxLength(100)]],
      country: ['', [Validators.required, Validators.maxLength(100)]],
      postalCode: ['', [Validators.required, Validators.maxLength(20)]],
      
      // Employment Details
      departmentId: ['', Validators.required],
      designationId: ['', Validators.required],
      managerId: [''],
      dateOfJoining: ['', Validators.required],
      dateOfLeaving: [''],
      employmentType: [EmploymentType.FullTime, Validators.required],
      employeeStatus: [EmployeeStatus.Active, Validators.required],
      
      // Additional Information
      profileImageUrl: [''],
      biometricId: ['']
    });
  }

  private loadEmployeeData(): void {
    this.isLoading = true;
    this.employeeService.getEmployeeById(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee) => {
          this.populateForm(employee);
          this.isLoading = false;
          
          // Disable employee code in edit mode
          this.employeeForm.get('employeeCode')?.disable();
        },
        error: (error) => {
          console.error('Error loading employee:', error);
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load employee data.',
            confirmButtonColor: '#1a2a6c'
          }).then(() => {
            this.router.navigate(['/employees']);
          });
        }
      });
  }

  private populateForm(employee: EmployeeResponseDto): void {
    this.employeeForm.patchValue({
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      dateOfBirth: this.formatDateForInput(employee.dateOfBirth),
      gender: employee.gender,
      email: employee.email,
      phoneNumber: employee.phoneNumber,
      alternatePhoneNumber: employee.alternatePhoneNumber,
      street: employee.address?.street || '',
      city: employee.address?.city || '',
      state: employee.address?.state || '',
      country: employee.address?.country || '',
      postalCode: employee.address?.postalCode || '',
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      managerId: employee.managerId,
      dateOfJoining: this.formatDateForInput(employee.dateOfJoining),
      dateOfLeaving: employee.dateOfLeaving ? this.formatDateForInput(employee.dateOfLeaving) : '',
      employmentType: employee.employmentType,
      employeeStatus: employee.employeeStatus,
      profileImageUrl: employee.profileImageUrl,
      biometricId: employee.biometricId
    });
  }

  onSubmit(): void {
    if (this.employeeForm.invalid) {
      this.markFormGroupTouched(this.employeeForm);
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill all required fields correctly.',
        confirmButtonColor: '#1a2a6c'
      });
      return;
    }

    this.isSaving = true;
    
    if (this.isEditMode) {
      this.updateEmployee();
    } else {
      this.createEmployee();
    }
  }

  private createEmployee(): void {
    const formValue = this.employeeForm.getRawValue();
    const dto: CreateEmployeeDto = {
      employeeCode: formValue.employeeCode,
      firstName: formValue.firstName,
      middleName: formValue.middleName,
      lastName: formValue.lastName,
      dateOfBirth: new Date(formValue.dateOfBirth),
      gender: formValue.gender,
      email: formValue.email,
      phoneNumber: formValue.phoneNumber,
      alternatePhoneNumber: formValue.alternatePhoneNumber,
      address: {
        street: formValue.street,
        city: formValue.city,
        state: formValue.state,
        country: formValue.country,
        postalCode: formValue.postalCode
      },
      departmentId: formValue.departmentId,
      designationId: formValue.designationId,
      managerId: formValue.managerId,
      dateOfJoining: new Date(formValue.dateOfJoining),
      dateOfLeaving: formValue.dateOfLeaving ? new Date(formValue.dateOfLeaving) : undefined,
      employmentType: formValue.employmentType,
      employeeStatus: formValue.employeeStatus,
      profileImageUrl: formValue.profileImageUrl,
      biometricId: formValue.biometricId
    };

    this.employeeService.createEmployee(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Employee created successfully.',
            timer: 2000,
            showConfirmButton: false
          });
          this.router.navigate(['/employees']);
        },
        error: (error) => {
          console.error('Error creating employee:', error);
          this.isSaving = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to create employee.',
            confirmButtonColor: '#1a2a6c'
          });
        }
      });
  }

  private updateEmployee(): void {
    const formValue = this.employeeForm.getRawValue();
    const dto: UpdateEmployeeDto = {
      firstName: formValue.firstName,
      middleName: formValue.middleName,
      lastName: formValue.lastName,
      dateOfBirth: new Date(formValue.dateOfBirth),
      gender: formValue.gender,
      email: formValue.email,
      phoneNumber: formValue.phoneNumber,
      alternatePhoneNumber: formValue.alternatePhoneNumber,
      address: {
        street: formValue.street,
        city: formValue.city,
        state: formValue.state,
        country: formValue.country,
        postalCode: formValue.postalCode
      },
      departmentId: formValue.departmentId,
      designationId: formValue.designationId,
      managerId: formValue.managerId,
      dateOfJoining: new Date(formValue.dateOfJoining),
      dateOfLeaving: formValue.dateOfLeaving ? new Date(formValue.dateOfLeaving) : undefined,
      employmentType: formValue.employmentType,
      employeeStatus: formValue.employeeStatus,
      profileImageUrl: formValue.profileImageUrl,
      biometricId: formValue.biometricId
    };

    this.employeeService.updateEmployee(this.employeeId, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Employee updated successfully.',
            timer: 2000,
            showConfirmButton: false
          });
          this.router.navigate(['/employees']);
        },
        error: (error) => {
          console.error('Error updating employee:', error);
          this.isSaving = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to update employee.',
            confirmButtonColor: '#1a2a6c'
          });
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/employees']);
  }

  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Invalid email format';
      if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength}`;
      if (field.errors['maxlength']) return `Maximum length is ${field.errors['maxlength'].requiredLength}`;
      if (field.errors['pattern']) return 'Invalid format';
    }
    return '';
  }
}