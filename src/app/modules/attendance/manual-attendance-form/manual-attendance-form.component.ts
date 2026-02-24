// =============================================
// manual-attendance-form.component.ts
// Create or edit a manual attendance record.
// Used by Admin & Manager roles.
// =============================================

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  AttendanceResponseDto,
  ManualAttendanceDto,
  AttendanceStatus,
  CheckInMethod
} from '../../../core/Models/attendance.model';

@Component({
  selector: 'app-manual-attendance-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manual-attendance-form.component.html',
  styleUrls: ['./manual-attendance-form.component.scss']
})
export class ManualAttendanceFormComponent implements OnInit {
  @Input() existingRecord: AttendanceResponseDto | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isEditMode = false;
  submitting = false;

  AttendanceStatus = AttendanceStatus;
  CheckInMethod = CheckInMethod;

  formData = {
    employeeId: '',
    attendanceDate: '',
    checkInTime: '',
    checkOutTime: '',
    status: AttendanceStatus.Present as AttendanceStatus,
    remarks: ''
  };

  errors: { [key: string]: string } = {};

  get todayStr(): string {
    return new Date().toISOString().substring(0, 10);
  }

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.isEditMode = !!this.existingRecord;
    if (this.existingRecord) {
      const r = this.existingRecord;
      this.formData = {
        employeeId: r.employeeId,
        attendanceDate: r.attendanceDate ? r.attendanceDate.substring(0, 10) : '',
        checkInTime:  r.checkInTime  ? this.toLocalDatetimeString(r.checkInTime)  : '',
        checkOutTime: r.checkOutTime ? this.toLocalDatetimeString(r.checkOutTime) : '',
        status: r.status,
        remarks: r.remarks ?? ''
      };
    }
  }

  private toLocalDatetimeString(isoStr: string): string {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  validate(): boolean {
    this.errors = {};
    if (!this.formData.employeeId.trim()) {
      this.errors['employeeId'] = 'Employee ID is required.';
    }
    if (!this.formData.attendanceDate) {
      this.errors['attendanceDate'] = 'Attendance date is required.';
    } else if (this.formData.attendanceDate > this.todayStr) {
      this.errors['attendanceDate'] = 'Attendance date cannot be in the future.';
    }
    if (this.formData.checkInTime && this.formData.checkOutTime) {
      if (this.formData.checkOutTime <= this.formData.checkInTime) {
        this.errors['checkOutTime'] = 'Check-out time must be after check-in time.';
      }
    }
    return Object.keys(this.errors).length === 0;
  }

  onSubmit(): void {
    if (!this.validate()) return;
    this.submitting = true;

    const dto: ManualAttendanceDto = {
      employeeId: this.formData.employeeId,
      attendanceDate: new Date(this.formData.attendanceDate).toISOString(),
      checkInTime:  this.formData.checkInTime  ? new Date(this.formData.checkInTime).toISOString()  : undefined,
      checkOutTime: this.formData.checkOutTime ? new Date(this.formData.checkOutTime).toISOString() : undefined,
      status: this.formData.status,
      remarks: this.formData.remarks.trim() || undefined
    };

    if (this.isEditMode && this.existingRecord) {
      this.attendanceService.updateAttendance(this.existingRecord.id, dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) {
            Swal.fire({ title: 'Updated!', text: 'Attendance updated successfully.', icon: 'success', timer: 2000, confirmButtonColor: '#6366f1' });
            this.saved.emit();
          } else {
            Swal.fire('Error!', r.message || 'Update failed.', 'error');
          }
        },
        error: (e) => {
          this.submitting = false;
          Swal.fire('Error!', e.error?.message || 'An error occurred.', 'error');
        }
      });
    } else {
      this.attendanceService.markManualAttendance(dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) {
            Swal.fire({ title: 'Marked!', text: 'Attendance recorded successfully.', icon: 'success', timer: 2000, confirmButtonColor: '#6366f1' });
            this.saved.emit();
          } else {
            Swal.fire('Error!', r.message || 'Failed to record attendance.', 'error');
          }
        },
        error: (e) => {
          this.submitting = false;
          Swal.fire('Error!', e.error?.message || 'An error occurred.', 'error');
        }
      });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}