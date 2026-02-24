// =============================================
// attendance-details.component.ts
// Read-only detail panel (sidebar) with
// approve and delete actions for admins
// =============================================

import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import Swal from 'sweetalert2';

import { AttendanceService } from '../../../core/services/api/attendance.api';
import { AttendanceResponseDto, AttendanceStatus } from '../../../core/Models/attendance.model';

@Component({
  selector: 'app-attendance-details',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './attendance-details.component.html',
  styleUrls: ['./attendance-details.component.scss']
})
export class AttendanceDetailsComponent implements OnInit, OnChanges {
  @Input() attendanceId: string | null = null;
  @Output() recordUpdated = new EventEmitter<void>();

  record: AttendanceResponseDto | null = null;
  loading = false;

  AttendanceStatus = AttendanceStatus;

  isAdmin = ['admin', 'manager'].includes(
    (sessionStorage.getItem('RoleName') || '').toLowerCase()
  );

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    if (this.attendanceId) this.loadRecord(this.attendanceId);
  }

  ngOnChanges(): void {
    if (this.attendanceId) this.loadRecord(this.attendanceId);
  }

  loadRecord(id: string): void {
    this.loading = true;
    this.attendanceService.getAttendanceById(id).subscribe({
      next: (r) => { if (r.success) this.record = r.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  getStatusClass(status?: AttendanceStatus): string {
    const map: Record<number, string> = {
      [AttendanceStatus.Present]: 'present',
      [AttendanceStatus.Absent]: 'absent',
      [AttendanceStatus.HalfDay]: 'halfday',
      [AttendanceStatus.Leave]: 'leave',
      [AttendanceStatus.Holiday]: 'holiday',
      [AttendanceStatus.WeekOff]: 'weekoff',
      [AttendanceStatus.WorkFromHome]: 'wfh',
      [AttendanceStatus.OnDuty]: 'onduty'
    };
    return status !== undefined ? (map[status] ?? 'absent') : 'absent';
  }

  async onApprove(): Promise<void> {
    if (!this.record) return;
    const res = await Swal.fire({
      title: 'Approve Attendance?',
      html: `Approve <strong>${this.record.employeeName}</strong>'s attendance for ${this.formatDate(this.record.attendanceDate)}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Approve'
    });
    if (!res.isConfirmed) return;
    this.attendanceService.approveAttendance(this.record.id).subscribe({
      next: (r) => {
        if (r.success) {
          Swal.fire({ title: 'Approved!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadRecord(this.record!.id);
          this.recordUpdated.emit();
        } else {
          Swal.fire('Error!', r.message, 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }
}