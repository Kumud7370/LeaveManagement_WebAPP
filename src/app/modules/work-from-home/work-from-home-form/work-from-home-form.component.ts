import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WfhRequestService } from '../../../core/services/api/work-from-home.api';
import { EmployeeService } from '../../../core/services/api/employee.api';
import {
  WfhRequest,
  CreateWfhRequestDto,
  UpdateWfhRequestDto
} from '../../../core/Models/work-from-home.model';
import Swal from 'sweetalert2';

interface EmployeeSummary { id: string; employeeCode: string; fullName: string; }

@Component({
  selector: 'app-wfh-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './work-from-home-form.component.html',
  styleUrls: ['./work-from-home-form.component.scss']
})
export class WfhRequestFormComponent implements OnInit {
  @Input() existingRequest: WfhRequest | null = null;
  @Input() restrictToEmployeeId: string | null = null; // pass this for employee login
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isEditMode = false;
  submitting = false;
  employees: EmployeeSummary[] = [];

  formData = {
    employeeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  };

  errors: { [key: string]: string } = {};

  get totalDays(): number {
    if (!this.formData.startDate || !this.formData.endDate) return 0;
    const start = new Date(this.formData.startDate);
    const end = new Date(this.formData.endDate);
    if (end < start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  constructor(
    private wfhRequestService: WfhRequestService,
    private employeeService: EmployeeService
  ) { }

  ngOnInit(): void {
    this.isEditMode = !!this.existingRequest;
    this.loadEmployees();
    if (this.existingRequest) {
      this.formData.employeeId = this.existingRequest.employeeId || '';
      this.formData.startDate = this.toDateString(this.existingRequest.startDate);
      this.formData.endDate = this.toDateString(this.existingRequest.endDate);
      this.formData.reason = this.existingRequest.reason;
    }
  }

  loadEmployees(): void {
    this.employeeService.getActiveEmployees().subscribe({
      next: (employees: any[]) => {
        const all = employees.map(e => ({
          id: e.id,
          employeeCode: e.employeeCode,
          fullName: `${e.firstName} ${e.lastName}`,
          userId: e.userId
        }));

        if (this.restrictToEmployeeId) {
          const rid = this.restrictToEmployeeId.trim().toLowerCase();
          this.employees = all.filter(e =>
            e.id?.trim().toLowerCase() === rid ||
            e.userId?.trim().toLowerCase() === rid
          );
          if (this.employees.length === 1 && !this.isEditMode) {
            this.formData.employeeId = this.employees[0].id;
          } else if (this.employees.length === 0) {
            this.employees = all;
          }
        } else {
          this.employees = all;
        }
      },
      error: () => { this.employees = []; }
    });
  }

  private toDateString(date: Date | string): string {
    return new Date(date).toISOString().substring(0, 10);
  }

  get minDate(): string {
    return new Date().toISOString().substring(0, 10);
  }

  get isSingleEmployee(): boolean {
    return !!this.restrictToEmployeeId && this.employees.length === 1;
  }

  validate(): boolean {
    this.errors = {};

    if (!this.formData.employeeId) {
      this.errors['employeeId'] = 'Employee is required.';
    }
    if (!this.formData.startDate) {
      this.errors['startDate'] = 'Start date is required.';
    } else if (this.formData.startDate < this.minDate) {
      this.errors['startDate'] = 'Start date must be today or a future date.';
    }
    if (!this.formData.endDate) {
      this.errors['endDate'] = 'End date is required.';
    } else if (this.formData.endDate < this.minDate) {
      this.errors['endDate'] = 'End date must be today or a future date.';
    } else if (this.formData.endDate < this.formData.startDate) {
      this.errors['endDate'] = 'End date must be on or after start date.';
    }
    if (!this.formData.reason.trim()) {
      this.errors['reason'] = 'Reason is required.';
    } else if (this.formData.reason.trim().length < 10) {
      this.errors['reason'] = 'Reason must be at least 10 characters.';
    } else if (this.formData.reason.trim().length > 500) {
      this.errors['reason'] = 'Reason must not exceed 500 characters.';
    }
    if (this.totalDays > 30) {
      this.errors['duration'] = 'WFH duration cannot exceed 30 days.';
    }

    return Object.keys(this.errors).length === 0;
  }

  onSubmit(): void {
    if (!this.validate()) return;
    this.submitting = true;

    if (this.isEditMode && this.existingRequest) {
      const dto: UpdateWfhRequestDto = {
        startDate: this.formData.startDate,
        endDate: this.formData.endDate,
        reason: this.formData.reason.trim()
      };
      this.wfhRequestService.updateWfhRequest(this.existingRequest.id, dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) {
            Swal.fire({ title: 'Updated!', text: 'WFH request updated successfully.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
            this.saved.emit();
          } else {
            Swal.fire('Error!', r.message || 'Failed to update WFH request.', 'error');
          }
        },
        error: (e) => { this.submitting = false; Swal.fire('Error!', e.error?.message || 'An error occurred.', 'error'); }
      });
    } else {
      const dto: CreateWfhRequestDto = {
        ...(this.isSingleEmployee ? {} : { employeeId: this.formData.employeeId }),
        startDate: this.formData.startDate,
        endDate: this.formData.endDate,
        reason: this.formData.reason.trim()
      };
      this.wfhRequestService.createWfhRequest(dto).subscribe({
        next: (r) => {
          this.submitting = false;
          if (r.success) {
            Swal.fire({ title: 'Submitted!', text: 'WFH request created successfully.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
            this.saved.emit();
          } else {
            Swal.fire('Error!', r.message || 'Failed to create WFH request.', 'error');
          }
        },
        error: (e) => { this.submitting = false; Swal.fire('Error!', e.error?.message || 'An error occurred.', 'error'); }
      });
    }
  }

  onCancel(): void { this.cancelled.emit(); }
}