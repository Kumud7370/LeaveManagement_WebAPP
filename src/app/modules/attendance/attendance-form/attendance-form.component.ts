import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  ManualAttendanceDto,
  AttendanceResponseDto,
  AttendanceStatus,
  AttendanceStatusOptions,
  formatDate,
  formatTime
} from '../../../core/Models/attendance.model';

@Component({
  selector: 'app-attendance-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './attendance-form.component.html',
  styleUrls: ['./attendance-form.component.scss']
})
export class AttendanceFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  @Input() isModal = false;
  @Input() attendanceId: string | null = null;
  @Input() isEditMode = false;
  @Output() formCancelled = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<void>();
  
  attendanceForm: FormGroup;
  isLoading = false;
  isSaving = false;
  
  // Enums for dropdowns
  attendanceStatusOptions = AttendanceStatusOptions;
  AttendanceStatus = AttendanceStatus;
  
  // Helper functions
  formatDate = formatDate;
  formatTime = formatTime;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private attendanceService: AttendanceService
  ) {
    this.attendanceForm = this.createForm();
  }

  ngOnInit(): void {
    // If modal mode with attendanceId, load the attendance
    if (this.isModal && this.attendanceId) {
      this.isEditMode = true;
      this.loadAttendanceData();
    } 
    // If not modal mode, check route params
    else if (!this.isModal) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['id']) {
          this.isEditMode = true;
          this.attendanceId = params['id'];
          this.loadAttendanceData();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      employeeId: ['', [Validators.required]],
      attendanceDate: ['', [Validators.required]],
      checkInTime: [''],
      checkOutTime: [''],
      status: [AttendanceStatus.Present, [Validators.required]],
      remarks: ['', [Validators.maxLength(500)]]
    });
  }

  private loadAttendanceData(): void {
    if (!this.attendanceId) return;

    this.isLoading = true;
    this.attendanceService.getAttendanceById(this.attendanceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (attendance) => {
          this.populateForm(attendance);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading attendance:', error);
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load attendance data.',
            confirmButtonColor: '#3b82f6'
          }).then(() => {
            if (this.isModal) {
              this.cancel();
            } else {
              this.router.navigate(['/attendance/list']);
            }
          });
        }
      });
  }

  private populateForm(attendance: AttendanceResponseDto): void {
    this.attendanceForm.patchValue({
      employeeId: attendance.employeeId,
      attendanceDate: this.formatDateForInput(attendance.attendanceDate),
      checkInTime: attendance.checkInTime ? this.formatDateTimeForInput(attendance.checkInTime) : '',
      checkOutTime: attendance.checkOutTime ? this.formatDateTimeForInput(attendance.checkOutTime) : '',
      status: attendance.status,
      remarks: attendance.remarks || ''
    });
  }

  onSubmit(): void {
    if (this.attendanceForm.invalid) {
      this.markFormGroupTouched(this.attendanceForm);
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill all required fields correctly.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    // Validate check-in and check-out times
    const checkInTime = this.attendanceForm.value.checkInTime;
    const checkOutTime = this.attendanceForm.value.checkOutTime;
    
    if (checkInTime && checkOutTime) {
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);
      
      if (checkOut <= checkIn) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Time',
          text: 'Check-out time must be after check-in time.',
          confirmButtonColor: '#3b82f6'
        });
        return;
      }
    }

    this.isSaving = true;
    
    if (this.isEditMode) {
      this.updateAttendance();
    } else {
      this.createAttendance();
    }
  }

  private createAttendance(): void {
    const formValue = this.attendanceForm.value;
    const dto: ManualAttendanceDto = {
      employeeId: formValue.employeeId,
      attendanceDate: new Date(formValue.attendanceDate),
      checkInTime: formValue.checkInTime ? new Date(formValue.checkInTime) : undefined,
      checkOutTime: formValue.checkOutTime ? new Date(formValue.checkOutTime) : undefined,
      status: formValue.status,
      remarks: formValue.remarks || undefined
    };

    this.attendanceService.markManualAttendance(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Attendance marked successfully.',
            timer: 2000,
            showConfirmButton: false
          });
          
          if (this.isModal) {
            this.formSubmitted.emit();
          } else {
            this.router.navigate(['/attendance/list']);
          }
        },
        error: (error) => {
          console.error('Error creating attendance:', error);
          this.isSaving = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to mark attendance.',
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  private updateAttendance(): void {
    if (!this.attendanceId) return;

    const formValue = this.attendanceForm.value;
    const dto: ManualAttendanceDto = {
      employeeId: formValue.employeeId,
      attendanceDate: new Date(formValue.attendanceDate),
      checkInTime: formValue.checkInTime ? new Date(formValue.checkInTime) : undefined,
      checkOutTime: formValue.checkOutTime ? new Date(formValue.checkOutTime) : undefined,
      status: formValue.status,
      remarks: formValue.remarks || undefined
    };

    this.attendanceService.updateAttendance(this.attendanceId, dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Attendance updated successfully.',
            timer: 2000,
            showConfirmButton: false
          });
          
          if (this.isModal) {
            this.formSubmitted.emit();
          } else {
            this.router.navigate(['/attendance/list']);
          }
        },
        error: (error) => {
          console.error('Error updating attendance:', error);
          this.isSaving = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to update attendance.',
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  cancel(): void {
    if (this.isModal) {
      this.formCancelled.emit();
    } else {
      this.router.navigate(['/attendance/list']);
    }
  }

  private formatDateForInput(date: Date): string {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}`;
  }

  private formatDateTimeForInput(date: Date): string {
    const d = new Date(date);
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    const hours = ('0' + d.getHours()).slice(-2);
    const minutes = ('0' + d.getMinutes()).slice(-2);
    return `${d.getFullYear()}-${month}-${day}T${hours}:${minutes}`;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.attendanceForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.attendanceForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['maxlength']) return `Maximum length is ${field.errors['maxlength'].requiredLength}`;
    }
    return '';
  }

  onStatusChange(status: AttendanceStatus): void {
    // If status is Absent, clear check-in and check-out times
    if (status === AttendanceStatus.Absent) {
      this.attendanceForm.patchValue({
        checkInTime: '',
        checkOutTime: ''
      });
    }
  }

  setCurrentDateTime(field: string): void {
    const now = new Date();
    const formattedDateTime = this.formatDateTimeForInput(now);
    this.attendanceForm.patchValue({
      [field]: formattedDateTime
    });
  }
}