import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { WfhRequestService } from '../../../core/services/api/work-from-home.api';
import { WfhRequest, ApprovalStatus, ApproveRejectWfhRequestDto } from '../../../core/Models/work-from-home.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-wfh-request-details',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './work-from-home-details.component.html',
styleUrls: ['./work-from-home-details.component.scss']
})
export class WfhRequestDetailsComponent implements OnInit {
  @Input() requestId: string | null = null;
  @Output() requestUpdated = new EventEmitter<void>();

  request: WfhRequest | null = null;
  loading = false;

  ApprovalStatus = ApprovalStatus;

  constructor(private wfhRequestService: WfhRequestService) {}

  ngOnInit(): void {
    if (this.requestId) this.loadRequest(this.requestId);
  }

  ngOnChanges(): void {
    if (this.requestId) this.loadRequest(this.requestId);
  }

  loadRequest(id: string): void {
    this.loading = true;
    this.wfhRequestService.getWfhRequestById(id).subscribe({
      next: (r) => {
        if (r.success) this.request = r.data;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getStatusClass(status: ApprovalStatus): string {
    const map: Record<number, string> = {
      [ApprovalStatus.Pending]:   'pending',
      [ApprovalStatus.Approved]:  'approved',
      [ApprovalStatus.Rejected]:  'rejected',
      [ApprovalStatus.Cancelled]: 'cancelled'
    };
    return map[status] ?? 'pending';
  }

  getStatusIcon(status: ApprovalStatus): string {
    const map: Record<number, string> = {
      [ApprovalStatus.Pending]:   'bi-clock-history',
      [ApprovalStatus.Approved]:  'bi-check-circle',
      [ApprovalStatus.Rejected]:  'bi-x-circle',
      [ApprovalStatus.Cancelled]: 'bi-slash-circle'
    };
    return map[status] ?? 'bi-clock-history';
  }

  async onApprove(): Promise<void> {
    if (!this.request) return;
    const r = await Swal.fire({
      title: 'Approve WFH Request?',
      html: `Approve <strong>${this.request.employeeName}'s</strong> WFH request (${this.request.totalDays} day${this.request.totalDays !== 1 ? 's' : ''})?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });
    if (!r.isConfirmed) return;

    const dto: ApproveRejectWfhRequestDto = { status: ApprovalStatus.Approved };
    this.wfhRequestService.approveRejectWfhRequest(this.request.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Approved!', text: 'WFH request approved.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadRequest(this.request!.id);
          this.requestUpdated.emit();
        } else {
          Swal.fire('Error!', res.message || 'Failed to approve', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async onReject(): Promise<void> {
    if (!this.request) return;
    const { value: reason } = await Swal.fire({
      title: 'Reject WFH Request',
      input: 'textarea',
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Enter reason (min 10 characters)...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject',
      inputValidator: (v) => !v || v.length < 10 ? 'Reason must be at least 10 characters!' : null
    });
    if (!reason) return;

    const dto: ApproveRejectWfhRequestDto = { status: ApprovalStatus.Rejected, rejectionReason: reason };
    this.wfhRequestService.approveRejectWfhRequest(this.request.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Rejected!', text: 'WFH request rejected.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadRequest(this.request!.id);
          this.requestUpdated.emit();
        } else {
          Swal.fire('Error!', res.message || 'Failed to reject', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async onCancel(): Promise<void> {
    if (!this.request) return;
    const r = await Swal.fire({
      title: 'Cancel WFH Request?',
      text: 'Are you sure you want to cancel this WFH request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Cancel It'
    });
    if (!r.isConfirmed) return;

    this.wfhRequestService.cancelWfhRequest(this.request.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Cancelled!', text: 'WFH request cancelled.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadRequest(this.request!.id);
          this.requestUpdated.emit();
        } else {
          Swal.fire('Error!', res.message || 'Failed to cancel', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }
}