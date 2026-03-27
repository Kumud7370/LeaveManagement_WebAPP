import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LeaveService } from '../../../core/services/api/leave.api';
import { Leave, LeaveStatus } from '../../../core/Models/leave.model';
import { AuthService } from '../../../core/services/api/auth.api';
import { LanguageService } from '../../../core/services/api/language.api';
import { LeaveDocumentService } from '../../../core/services/api/leave-document.api';
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
  printing = false;
  LeaveStatus = LeaveStatus;

  constructor(
    private leaveService: LeaveService,
    private authService: AuthService,
    private leaveDocService: LeaveDocumentService,
    public  langService: LanguageService
  ) { }

  getStatusNum(): number {
    const map: Record<string, number> = {
      'Pending': 0, 'AdminApproved': 1, 'NayabApproved': 2,
      'FullyApproved': 3, 'Rejected': 4, 'Cancelled': 5
    };
    const raw = this.leave?.leaveStatus;
    return typeof raw === 'number' ? raw : (map[raw as any] ?? -1);
  }

  get canAdminApprove():     boolean { return this.authService.isAdmin() && this.getStatusNum() === 0; }
  get canNayabApprove():     boolean { return this.authService.isNayabTehsildar() && this.getStatusNum() === 1; }
  get canTehsildarApprove(): boolean { return this.authService.isTehsildar() && this.getStatusNum() === 2; }
  get canReject(): boolean {
    return this.leave != null &&
      (this.authService.isAdmin() || this.authService.isNayabTehsildar() || this.authService.isTehsildar()) &&
      [0, 1, 2].includes(this.getStatusNum());
  }

  /** Print is available to Admin, Nayab, Tehsildar, HR — and for the employee's own leave */
  get canPrint(): boolean {
    return this.leave != null && (
      this.authService.isAdmin() ||
      this.authService.isNayabTehsildar() ||
      this.authService.isTehsildar() ||
      this.authService.isHR()
    );
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

  // ── Print / Download ─────────────────────────────────────────────

  onPrint(): void {
    if (!this.leave) return;
    this.printing = true;
    try {
      this.leaveDocService.printLeave(this.leave);
    } finally {
      setTimeout(() => { this.printing = false; }, 600);
    }
  }

  onDownload(): void {
    if (!this.leave) return;
    this.leaveDocService.downloadLeave(this.leave);
  }

  // ── Status helpers ───────────────────────────────────────────────

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

  getStatusDisplayName(): string {
    const keyMap: Record<string, string> = {
      'Pending':       'leave.status.pending',
      'AdminApproved': 'leave.status.adminApproved',
      'NayabApproved': 'leave.status.nayabApproved',
      'FullyApproved': 'leave.status.fullyApproved',
      'Rejected':      'leave.status.rejected',
      'Cancelled':     'leave.status.cancelled',
    };
    const numMap: Record<number, string> = {
      0: 'leave.status.pending',
      1: 'leave.status.adminApproved',
      2: 'leave.status.nayabApproved',
      3: 'leave.status.fullyApproved',
      4: 'leave.status.rejected',
      5: 'leave.status.cancelled',
    };
    const raw = this.leave?.leaveStatus ?? this.leave?.leaveStatusName ?? '';
    const key = typeof raw === 'number'
      ? (numMap[raw] ?? 'leave.status.pending')
      : (keyMap[String(raw)] ?? 'leave.status.pending');
    return this.langService.t(key);
  }

  // ── Approval actions ─────────────────────────────────────────────

  async onAdminApprove(): Promise<void> {
    if (!this.leave) return;
    const r = await Swal.fire({
      title: `${this.langService.t('leave.swal.adminApproveLabel')}?`,
      html: `${this.langService.t('leave.details.swal.forwardTo')} <strong>${this.leave.employeeName}</strong> ${this.langService.t('leave.details.swal.toNayab')}?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: this.langService.t('leave.swal.yesApprove'),
      cancelButtonText: this.langService.t('common.cancel')
    });
    if (!r.isConfirmed) return;
    this.leaveService.adminApproveLeave(this.leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: this.langService.t('leave.swal.approved'), text: this.langService.t('leave.details.swal.forwardedNayab'), icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id); this.leaveUpdated.emit();
        } else { Swal.fire(this.langService.t('common.errorTitle'), res.message || this.langService.t('leave.swal.approveFailed'), 'error'); }
      },
      error: (e) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error')
    });
  }

  async onNayabApprove(): Promise<void> {
    if (!this.leave) return;
    const r = await Swal.fire({
      title: `${this.langService.t('leave.swal.nayabApproveLabel')}?`,
      html: `${this.langService.t('leave.details.swal.forwardTo')} <strong>${this.leave.employeeName}</strong> ${this.langService.t('leave.details.swal.toTehsildar')}?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: this.langService.t('leave.swal.yesApprove'),
      cancelButtonText: this.langService.t('common.cancel')
    });
    if (!r.isConfirmed) return;
    this.leaveService.nayabApproveLeave(this.leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: this.langService.t('leave.swal.approved'), text: this.langService.t('leave.details.swal.forwardedTehsildar'), icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id); this.leaveUpdated.emit();
        } else { Swal.fire(this.langService.t('common.errorTitle'), res.message || this.langService.t('leave.swal.approveFailed'), 'error'); }
      },
      error: (e) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error')
    });
  }

  async onTehsildarApprove(): Promise<void> {
    if (!this.leave) return;
    const r = await Swal.fire({
      title: `${this.langService.t('leave.swal.finalApproveLabel')}?`,
      html: `${this.langService.t('leave.details.swal.fullyApprove')} <strong>${this.leave.employeeName}</strong> (${this.leave.totalDays} ${this.langService.t('leave.swal.days')})?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: this.langService.t('leave.details.swal.yesFullyApprove'),
      cancelButtonText: this.langService.t('common.cancel')
    });
    if (!r.isConfirmed) return;
    this.leaveService.tehsildarApproveLeave(this.leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: this.langService.t('leave.details.swal.fullyApproved'), text: this.langService.t('leave.details.swal.balanceConsumed'), icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id); this.leaveUpdated.emit();
        } else { Swal.fire(this.langService.t('common.errorTitle'), res.message || this.langService.t('leave.swal.approveFailed'), 'error'); }
      },
      error: (e) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error')
    });
  }

  async onReject(): Promise<void> {
    if (!this.leave) return;
    const { value: reason } = await Swal.fire({
      title: this.langService.t('leave.swal.rejectTitle'),
      input: 'textarea',
      inputLabel: this.langService.t('leave.swal.rejectInputLabel'),
      inputPlaceholder: this.langService.t('leave.swal.rejectPlaceholder'),
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: this.langService.t('leave.swal.rejectBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      inputValidator: (v) => !v ? this.langService.t('leave.swal.reasonRequired') : null
    });
    if (!reason) return;
    this.leaveService.rejectLeave(this.leave.id, reason).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: this.langService.t('leave.swal.rejected'), text: this.langService.t('leave.details.swal.leaveRejected'), icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id); this.leaveUpdated.emit();
        } else { Swal.fire(this.langService.t('common.errorTitle'), res.message || this.langService.t('leave.swal.rejectFailed'), 'error'); }
      },
      error: (e) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error')
    });
  }

  async onCancel(): Promise<void> {
    if (!this.leave) return;
    const { value: reason } = await Swal.fire({
      title: this.langService.t('leave.swal.cancelTitle'),
      input: 'textarea',
      inputLabel: this.langService.t('leave.swal.cancelInputLabel'),
      inputPlaceholder: this.langService.t('leave.swal.cancelPlaceholder'),
      showCancelButton: true, confirmButtonColor: '#f59e0b', cancelButtonColor: '#6b7280',
      confirmButtonText: this.langService.t('leave.swal.cancelBtn'),
      cancelButtonText: this.langService.t('common.cancel'),
      inputValidator: (v) => !v ? this.langService.t('leave.swal.reasonRequired') : null
    });
    if (!reason) return;
    this.leaveService.cancelLeave(this.leave.id, reason).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: this.langService.t('leave.swal.cancelled'), text: this.langService.t('leave.details.swal.leaveCancelled'), icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeave(this.leave!.id); this.leaveUpdated.emit();
        } else { Swal.fire(this.langService.t('common.errorTitle'), res.message || this.langService.t('leave.swal.cancelFailed'), 'error'); }
      },
      error: (e) => Swal.fire(this.langService.t('common.errorTitle'), e.error?.message || this.langService.t('common.error'), 'error')
    });
  }
}