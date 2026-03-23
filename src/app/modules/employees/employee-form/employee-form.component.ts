import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { EmployeeService } from '../../../core/services/api/employee.api';
import { DepartmentService } from '../../../core/services/api/department.api';
import { DesignationService } from '../../../core/services/api/designation.api';
import { LanguageService } from '../../../core/services/api/language.api';
import {
  CreateEmployeeDto, UpdateEmployeeDto, EmployeeResponseDto,
  EmployeeStatus, EmploymentType, Gender
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

  departments: any[] = [];
  designations: any[] = [];
  isDepartmentsLoading = false;
  isDesignationsLoading = false;

  // ── Translated option lists — rebuilt when language changes ──────────────
  get genderOptions() {
    return [
      { value: Gender.Male, label: this.langService.t('employee.gender.male') },
      { value: Gender.Female, label: this.langService.t('employee.gender.female') },
      { value: Gender.Other, label: this.langService.t('employee.gender.other') }
    ];
  }

  get employmentTypeOptions() {
    return [
      { value: EmploymentType.FullTime, label: this.langService.t('employee.empType.fullTime') },
      { value: EmploymentType.PartTime, label: this.langService.t('employee.empType.partTime') },
      { value: EmploymentType.Contract, label: this.langService.t('employee.empType.contract') },
      { value: EmploymentType.Intern, label: this.langService.t('employee.empType.intern') },
      { value: EmploymentType.Temporary, label: this.langService.t('employee.empType.temporary') }
    ];
  }

  get employeeStatusOptions() {
    return [
      { value: EmployeeStatus.Active, label: this.langService.t('employee.status.active') },
      { value: EmployeeStatus.Inactive, label: this.langService.t('employee.status.inactive') },
      { value: EmployeeStatus.OnLeave, label: this.langService.t('employee.status.onLeave') },
      { value: EmployeeStatus.Suspended, label: this.langService.t('employee.status.suspended') },
      { value: EmployeeStatus.Terminated, label: this.langService.t('employee.status.terminated') },
      { value: EmployeeStatus.Resigned, label: this.langService.t('empform.status.resigned') }
    ];
  }

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private departmentService: DepartmentService,
    private designationService: DesignationService,
    public langService: LanguageService
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

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadDepartments(): void {
    this.isDepartmentsLoading = true;
    this.departmentService.getActiveDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        const raw = this.extractArray(response);
        this.departments = raw.map((d: any) => ({
          id: d.departmentId ?? d.id,
          name: d.departmentNameMr || d.departmentName || d.name
        }));
        this.isDepartmentsLoading = false;
      },
      error: () => { this.isDepartmentsLoading = false; }
    });
  }

  private loadDesignations(): void {
    this.isDesignationsLoading = true;
    this.designationService.getActiveDesignations().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        const raw = this.extractArray(response);
        this.designations = raw.map((d: any) => ({
          id: d.designationId ?? d.id,
          name: d.designationName ?? d.name
        }));
        this.isDesignationsLoading = false;
      },
      error: () => { this.isDesignationsLoading = false; }
    });
  }

  private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.data) {
      if (Array.isArray(response.data)) return response.data;
      if (Array.isArray(response.data?.items)) return response.data.items;
    }
    if (Array.isArray(response?.items)) return response.items;
    return [];
  }

  private createForm(): FormGroup {
    return this.fb.group({
      employeeCode: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      middleName: ['', Validators.maxLength(50)],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      dateOfBirth: ['', Validators.required],
      gender: [Gender.Male, Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      alternatePhoneNumber: ['', Validators.pattern(/^\+?[1-9]\d{1,14}$/)],
      street: ['', [Validators.required, Validators.maxLength(200)]],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: ['', [Validators.required, Validators.maxLength(100)]],
      country: ['', [Validators.required, Validators.maxLength(100)]],
      postalCode: ['', [Validators.required, Validators.maxLength(20)]],
      departmentId: ['', Validators.required],
      designationId: ['', Validators.required],
      managerId: [''],
      dateOfJoining: ['', Validators.required],
      dateOfLeaving: [''],
      employmentType: [EmploymentType.FullTime, Validators.required],
      employeeStatus: [EmployeeStatus.Active, Validators.required],
      profileImageUrl: [''],
      biometricId: ['']
    });
  }

  private loadEmployeeData(): void {
    if (!this.employeeId) return;
    this.isLoading = true;
    this.employeeService.getEmployeeById(this.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (employee) => {
        this.populateForm(employee);
        this.isLoading = false;
        this.employeeForm.get('employeeCode')?.disable();
      },
      error: () => {
        this.isLoading = false;
        Swal.fire({ icon: 'error', title: this.langService.t('common.errorTitle'), text: this.langService.t('empform.loadError'), confirmButtonColor: '#1a2a6c' })
          .then(() => { if (this.isModal) { this.cancel(); } else { this.router.navigate(['/employees']); } });
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

  private toEnumString<T extends object>(enumObj: T, value: any): string {
    const numVal = Number(value);
    const name = (enumObj as any)[numVal];
    if (typeof name === 'string') return name;
    if (typeof value === 'string' && isNaN(Number(value))) return value;
    return String(value);
  }

  private parseBackendErrors(error: any): string {
    const body = error?.error;
    if (body?.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)) {
      const lines: string[] = [];
      for (const field of Object.keys(body.errors)) {
        const msgs = body.errors[field];
        if (Array.isArray(msgs)) msgs.forEach((m: string) => lines.push(`• <b>${field}:</b> ${m}`));
      }
      if (lines.length) return lines.join('<br>');
    }
    if (Array.isArray(body?.errors) && body.errors.length) return (body.errors as string[]).join('<br>');
    if (body?.message) return body.message;
    if (typeof body === 'string') return body;
    return this.langService.t('empform.error.saveFailed');
  }

  private isDuplicateError(error: any): boolean {
    if (error?.status === 409) return true;
    const msg = (error?.error?.message || '').toLowerCase();
    return msg.includes('duplicate') || msg.includes('already exists') || msg.includes('already taken') || msg.includes('conflict');
  }

  private getDuplicateMessage(error: any): string {
    const msg = (error?.error?.message || '').toLowerCase();
    if (msg.includes('email')) {
      const email = this.employeeForm.get('email')?.value || '';
      return `${this.langService.t('empform.error.emailDuplicate')} <b>${email}</b>`;
    }
    if (msg.includes('employee code') || msg.includes('employeecode')) {
      const code = this.employeeForm.getRawValue().employeeCode || '';
      return `${this.langService.t('empform.error.codeDuplicate')} <b>${code}</b>`;
    }
    return error?.error?.message || this.langService.t('empform.error.duplicate');
  }

  private getClientValidationErrors(): string[] {
    const errors: string[] = [];
    const fieldLabel = (key: string) => this.langService.t(`empform.field.${key}`) || key;
    Object.keys(this.employeeForm.controls).forEach(key => {
      const ctrl = this.employeeForm.get(key);
      if (!ctrl || !ctrl.invalid) return;
      const label = fieldLabel(key);
      if (ctrl.errors?.['required']) { errors.push(`<b>${label}</b> ${this.langService.t('common.fieldRequired')}`); return; }
      if (ctrl.errors?.['email']) { errors.push(`<b>${label}</b> – ${this.langService.t('empform.error.invalidEmail')}`); return; }
      if (ctrl.errors?.['minlength']) { errors.push(`<b>${label}</b> – ${this.langService.t('common.minLength')} ${ctrl.errors['minlength'].requiredLength}`); return; }
      if (ctrl.errors?.['maxlength']) { errors.push(`<b>${label}</b> – ${this.langService.t('common.maxLength')} ${ctrl.errors['maxlength'].requiredLength}`); return; }
      if (ctrl.errors?.['pattern']) { errors.push(`<b>${label}</b> – ${this.langService.t('empform.error.invalidFormat')}`); return; }
    });
    return errors;
  }

  onSubmit(): void {
    if (this.employeeForm.invalid) {
      this.markFormGroupTouched(this.employeeForm);
      const errors = this.getClientValidationErrors();
      const listHtml = errors.map(e => `<li style="text-align:left;margin:4px 0;">${e}</li>`).join('');
      Swal.fire({
        icon: 'warning',
        title: this.langService.t('empform.error.fixFields'),
        html: `<div style="max-height:260px;overflow-y:auto;"><ul style="padding-left:18px;margin:0;font-size:14px;line-height:1.8;">${listHtml}</ul></div>`,
        confirmButtonColor: '#1a2a6c',
        confirmButtonText: this.langService.t('empform.error.fixBtn')
      });
      return;
    }
    this.isSaving = true;
    if (this.isEditMode) { this.updateEmployee(); } else { this.createEmployee(); }
  }

  private buildCreateDto(): any {
    const fv = this.employeeForm.getRawValue();
    return {
      employeeCode: fv.employeeCode,
      firstName: fv.firstName,
      middleName: fv.middleName || null,
      lastName: fv.lastName,
      dateOfBirth: new Date(fv.dateOfBirth).toISOString(),
      gender: this.toEnumString(Gender, fv.gender),
      email: fv.email,
      phoneNumber: fv.phoneNumber,
      alternatePhoneNumber: fv.alternatePhoneNumber || null,
      address: { street: fv.street, city: fv.city, state: fv.state, country: fv.country, postalCode: fv.postalCode },
      departmentId: fv.departmentId,
      designationId: fv.designationId,
      managerId: fv.managerId || null,
      dateOfJoining: new Date(fv.dateOfJoining).toISOString(),
      dateOfLeaving: fv.dateOfLeaving ? new Date(fv.dateOfLeaving).toISOString() : null,
      employmentType: this.toEnumString(EmploymentType, fv.employmentType),
      employeeStatus: this.toEnumString(EmployeeStatus, fv.employeeStatus),
      profileImageUrl: fv.profileImageUrl || null,
      biometricId: fv.biometricId || null
    };
  }

  private buildUpdateDto(): any {
    const fv = this.employeeForm.getRawValue();
    return {
      firstName: fv.firstName,
      middleName: fv.middleName || null,
      lastName: fv.lastName,
      dateOfBirth: new Date(fv.dateOfBirth).toISOString(),
      gender: this.toEnumString(Gender, fv.gender),
      email: fv.email,
      phoneNumber: fv.phoneNumber,
      alternatePhoneNumber: fv.alternatePhoneNumber || null,
      address: { street: fv.street, city: fv.city, state: fv.state, country: fv.country, postalCode: fv.postalCode },
      departmentId: fv.departmentId,
      designationId: fv.designationId,
      managerId: fv.managerId || null,
      dateOfJoining: new Date(fv.dateOfJoining).toISOString(),
      dateOfLeaving: fv.dateOfLeaving ? new Date(fv.dateOfLeaving).toISOString() : null,
      employmentType: this.toEnumString(EmploymentType, fv.employmentType),
      employeeStatus: this.toEnumString(EmployeeStatus, fv.employeeStatus),
      profileImageUrl: fv.profileImageUrl || null,
      biometricId: fv.biometricId || null
    };
  }

  private createEmployee(): void {
    this.employeeService.createEmployee(this.buildCreateDto()).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        Swal.fire({ icon: 'success', title: this.langService.t('common.success'), text: this.langService.t('empform.created'), timer: 2000, showConfirmButton: false });
        if (this.isModal) { this.formSubmitted.emit(); } else { this.router.navigate(['/employees']); }
      },
      error: (error: any) => {
        this.isSaving = false;
        if (this.isDuplicateError(error)) {
          Swal.fire({ icon: 'warning', title: this.langService.t('empform.error.duplicateTitle'), html: this.getDuplicateMessage(error), confirmButtonColor: '#1a2a6c' }); return;
        }
        Swal.fire({ icon: 'error', title: this.langService.t('empform.error.validationFailed'), html: `<div style="font-size:14px;line-height:1.9;text-align:left;">${this.parseBackendErrors(error)}</div>`, confirmButtonColor: '#1a2a6c' });
      }
    });
  }

  private updateEmployee(): void {
    if (!this.employeeId) return;
    this.employeeService.updateEmployee(this.employeeId, this.buildUpdateDto()).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        Swal.fire({ icon: 'success', title: this.langService.t('common.success'), text: this.langService.t('empform.updated'), timer: 2000, showConfirmButton: false });
        if (this.isModal) { this.formSubmitted.emit(); } else { this.router.navigate(['/employees']); }
      },
      error: (error: any) => {
        this.isSaving = false;
        if (this.isDuplicateError(error)) {
          Swal.fire({ icon: 'warning', title: this.langService.t('empform.error.duplicateTitle'), html: this.getDuplicateMessage(error), confirmButtonColor: '#1a2a6c' }); return;
        }
        Swal.fire({ icon: 'error', title: this.langService.t('empform.error.validationFailed'), html: `<div style="font-size:14px;line-height:1.9;text-align:left;">${this.parseBackendErrors(error)}</div>`, confirmButtonColor: '#1a2a6c' });
      }
    });
  }

  cancel(): void {
    if (this.isModal) { this.formCancelled.emit(); } else { this.router.navigate(['/employees']); }
  }

  private formatDateForInput(date: Date | string): string {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => formGroup.get(key)?.markAsTouched());
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return this.langService.t('common.fieldRequired');
      if (field.errors['email']) return this.langService.t('empform.error.invalidEmail');
      if (field.errors['minlength']) return `${this.langService.t('common.minLength')} ${field.errors['minlength'].requiredLength}`;
      if (field.errors['maxlength']) return `${this.langService.t('common.maxLength')} ${field.errors['maxlength'].requiredLength}`;
      if (field.errors['pattern']) return this.langService.t('empform.error.invalidFormat');
    }
    return '';
  }
}