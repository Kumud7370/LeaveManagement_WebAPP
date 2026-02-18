import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LeaveService } from '../../../core/services/api/leave.api';
import { Leave, LeaveStatus } from '../../../core/Models/leave.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-leave-details',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './leave-details.component.html',
  styleUrls: ['./leave-details.component.scss']
})
export class LeaveDetailsComponent implements OnInit {
  @Input() leaveId: string | null = null;
  @Output() leaveUpdated = new EventEmitter<void>();

  leave: Leave | null = null;
  loading = false;

  // Expose enum to template
  LeaveStatus = LeaveStatus;

  constructor(private leaveService: LeaveService) {}

  ngOnInit(): void {
    if (this.leaveId) this.loadLeave(this.leaveId);
  }

  loadLeave(id: string): void {
    this.loading = true;
    this.leaveService.getLeaveById(id).subscribe({
      next: (r) => {
        if (r.success) this.leave = r.data;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getStatusClass(status: LeaveStatus): string {
    const map: Record<number, string> = {
      [LeaveStatus.Pending]:   'pending',
      [LeaveStatus.Approved]:  'approved',
      [LeaveStatus.Rejected]:  'rejected',
      [LeaveStatus.Cancelled]: 'cancelled'
    };
    return map[status] ?? 'pending';
  }

  getStatusIcon(status: LeaveStatus): string {
    const map: Record<number, string> = {
      [LeaveStatus.Pending]:   'bi-clock-history',
      [LeaveStatus.Approved]:  'bi-check-circle',
      [LeaveStatus.Rejected]:  'bi-x-circle',
      [LeaveStatus.Cancelled]: 'bi-slash-circle'
    };
    return map[status] ?? 'bi-clock-history';
  }

  async onApprove(): Promise<void> {
    if (!this.leave) return;
    const r = await Swal.fire({
      title: 'Approve Leave?',
      html: `Approve <strong>${this.leave.employeeName}'s</strong> leave (${this.leave.totalDays} days)?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });
    if (!r.isConfirmed) return;
    this.leaveService.approveLeave(this.leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Approved!', text: 'Leave approved.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id);
          this.leaveUpdated.emit();
        } else {
          Swal.fire('Error!', res.message || 'Failed to approve', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async onReject(): Promise<void> {
    if (!this.leave) return;
    const { value: reason } = await Swal.fire({
      title: 'Reject Leave', input: 'textarea',
      inputLabel: 'Rejection Reason', inputPlaceholder: 'Enter reason...',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject', inputValidator: (v) => !v ? 'Reason is required!' : null
    });
    if (!reason) return;
    this.leaveService.rejectLeave(this.leave.id, reason).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Rejected!', text: 'Leave rejected.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id);
          this.leaveUpdated.emit();
        } else {
          Swal.fire('Error!', res.message || 'Failed to reject', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async onCancel(): Promise<void> {
    if (!this.leave) return;
    const { value: reason } = await Swal.fire({
      title: 'Cancel Leave', input: 'textarea',
      inputLabel: 'Cancellation Reason', inputPlaceholder: 'Enter reason...',
      showCancelButton: true, confirmButtonColor: '#f59e0b', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Cancel Leave', inputValidator: (v) => !v ? 'Reason is required!' : null
    });
    if (!reason) return;
    this.leaveService.cancelLeave(this.leave.id, reason).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Cancelled!', text: 'Leave cancelled.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id);
          this.leaveUpdated.emit();
        } else {
          Swal.fire('Error!', res.message || 'Failed to cancel', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }
}