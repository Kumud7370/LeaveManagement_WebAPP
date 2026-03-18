import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LeaveService } from '../../../core/services/api/leave.api';
import { Leave, LeaveStatus } from '../../../core/Models/leave.model';
import { AuthService } from '../../../core/services/api/auth.api';
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
  @Input() isEmployee = false;

  leave: Leave | null = null;
  loading = false;

  // Expose enum to template
  LeaveStatus = LeaveStatus;

  constructor(private leaveService: LeaveService, private authService: AuthService) { }

  private getStatusNum(): number {
    const map: Record<string, number> = {
      'Pending': 0, 'AdminApproved': 1, 'NayabApproved': 2,
      'FullyApproved': 3, 'Rejected': 4, 'Cancelled': 5
    };
    const raw = this.leave?.leaveStatus;
    return typeof raw === 'number' ? raw : (map[raw as any] ?? -1);
  }

  get canAdminApprove(): boolean { return this.authService.isAdmin() && this.getStatusNum() === 0; }
  get canNayabApprove(): boolean { return this.authService.isNayabTehsildar() && this.getStatusNum() === 1; }
  get canTehsildarApprove(): boolean { return this.authService.isTehsildar() && this.getStatusNum() === 2; }
  get canReject(): boolean {
    return this.leave != null &&
      (this.authService.isAdmin() || this.authService.isNayabTehsildar() || this.authService.isTehsildar()) &&
      [0, 1, 2].includes(this.getStatusNum());
  }
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
    [LeaveStatus.Pending]:       'pending',
    [LeaveStatus.AdminApproved]: 'admin-approved',
    [LeaveStatus.NayabApproved]: 'nayab-approved',
    [LeaveStatus.FullyApproved]: 'approved',
    [LeaveStatus.Rejected]:      'rejected',
    [LeaveStatus.Cancelled]:     'cancelled',
  };
  const statusMap: Record<string, number> = {
    'Pending': 0, 'AdminApproved': 1, 'NayabApproved': 2,
    'FullyApproved': 3, 'Rejected': 4, 'Cancelled': 5
  };
  const num = typeof status === 'number' ? status : (statusMap[status as any] ?? -1);
  return map[num] ?? 'pending';
}

getStatusIcon(status: LeaveStatus): string {
  const map: Record<number, string> = {
    [LeaveStatus.Pending]:       'bi-clock-history',
    [LeaveStatus.AdminApproved]: 'bi-check-circle-fill',
    [LeaveStatus.NayabApproved]: 'bi-check2-circle',
    [LeaveStatus.FullyApproved]: 'bi-check-circle-fill',
    [LeaveStatus.Rejected]:      'bi-x-circle-fill',
    [LeaveStatus.Cancelled]:     'bi-slash-circle',
  };

  // Handle string status from backend
  const statusMap: Record<string, number> = {
    'Pending': 0, 'AdminApproved': 1, 'NayabApproved': 2,
    'FullyApproved': 3, 'Rejected': 4, 'Cancelled': 5
  };
  const num = typeof status === 'number' ? status : (statusMap[status as any] ?? -1);
  return map[num] ?? 'bi-clock-history';
}

  getStatusDisplayName(): string {
  const map: Record<string, string> = {
    'Pending':       'Pending',
    'AdminApproved': 'Admin Approved',
    'NayabApproved': 'Nayab Approved',
    'FullyApproved': 'Fully Approved',
    'Rejected':      'Rejected',
    'Cancelled':     'Cancelled',
  };
  const raw = String(this.leave?.leaveStatus ?? this.leave?.leaveStatusName ?? '');
  return map[raw] ?? raw;
}

  async onAdminApprove(): Promise<void> {
    if (!this.leave) return;
    const r = await Swal.fire({
      title: 'Admin Approve?',
      html: `Forward <strong>${this.leave.employeeName}'s</strong> leave to Nayab Tehsildar?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });
    if (!r.isConfirmed) return;
    this.leaveService.adminApproveLeave(this.leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Approved!', text: 'Forwarded to Nayab Tehsildar.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id); this.leaveUpdated.emit();
        } else { Swal.fire('Error!', res.message || 'Failed', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async onNayabApprove(): Promise<void> {
    if (!this.leave) return;
    const r = await Swal.fire({
      title: 'Nayab Approve?',
      html: `Forward <strong>${this.leave.employeeName}'s</strong> leave to Tehsildar?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });
    if (!r.isConfirmed) return;
    this.leaveService.nayabApproveLeave(this.leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Approved!', text: 'Forwarded to Tehsildar.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id); this.leaveUpdated.emit();
        } else { Swal.fire('Error!', res.message || 'Failed', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async onTehsildarApprove(): Promise<void> {
    if (!this.leave) return;
    const r = await Swal.fire({
      title: 'Final Approval?',
      html: `Fully approve <strong>${this.leave.employeeName}'s</strong> leave (${this.leave.totalDays} days)? Balance will be consumed.`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Fully Approve'
    });
    if (!r.isConfirmed) return;
    this.leaveService.tehsildarApproveLeave(this.leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Fully Approved!', text: 'Leave fully approved and balance consumed.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id); this.leaveUpdated.emit();
        } else { Swal.fire('Error!', res.message || 'Failed', 'error'); }
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