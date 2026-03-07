import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  AttendanceResponseDto,
  CheckInDto,
  CheckOutDto,
  CheckInMethod,
  AttendanceStatus,
  LocationDto
} from '../../../core/Models/attendance.model';

@Component({
  selector: 'app-attendance-check-in-out',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-check-in-out.component.html',
  styleUrls: ['./attendance-check-in-out.component.scss']
})
export class AttendanceCheckInOutComponent implements OnInit, OnDestroy {

  todayRecord: AttendanceResponseDto | null = null;
  loading    = false;
  checkingIn  = false;
  checkingOut = false;

  currentRole  = (sessionStorage.getItem('RoleName') || '').toLowerCase();
  employeeId   = sessionStorage.getItem('EmployeeId') || '';
  employeeName =
    sessionStorage.getItem('username')  ||
    sessionStorage.getItem('Username')  ||
    sessionStorage.getItem('FirstName') ||
    'Employee';

  currentTime = new Date();
  private clockSub!: Subscription;

  CheckInMethod   = CheckInMethod;
  AttendanceStatus = AttendanceStatus;
  selectedMethod: CheckInMethod = CheckInMethod.WebApp;
  remarks = '';

  currentLocation: LocationDto | null = null;
  locationStatus: 'idle' | 'loading' | 'granted' | 'denied' = 'idle';

  get hasCheckedIn():  boolean { return !!this.todayRecord?.checkInTime; }
  get hasCheckedOut(): boolean { return !!this.todayRecord?.checkOutTime; }

  get workingHoursDisplay(): string {
    if (!this.todayRecord?.checkInTime) return '--:--';
    const inTime  = new Date(this.todayRecord.checkInTime);
    const outTime = this.todayRecord.checkOutTime
      ? new Date(this.todayRecord.checkOutTime)
      : new Date();
    const diff = outTime.getTime() - inTime.getTime();
    const h    = Math.floor(diff / 3_600_000);
    const m    = Math.floor((diff % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  }

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    this.clockSub = interval(1000).subscribe(() => { this.currentTime = new Date(); });
    this.loadTodayRecord();
    this.requestLocation();
  }

  ngOnDestroy(): void { this.clockSub?.unsubscribe(); }

  loadTodayRecord(): void {
    if (!this.employeeId) return;
    this.loading = true;
    this.attendanceService.getTodayAttendance(this.employeeId).subscribe({
      next:  (r) => { if (r.success) this.todayRecord = r.data; this.loading = false; },
      error: ()  => { this.loading = false; }
    });
  }

  requestLocation(): void {
    if (!navigator.geolocation) { this.locationStatus = 'denied'; return; }
    this.locationStatus = 'loading';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        this.locationStatus  = 'granted';
      },
      () => { this.locationStatus = 'denied'; }
    );
  }

  /**
   * toISOString() always returns UTC (ends with "Z").
   * We subtract 10s to absorb any browser↔server clock skew so the
   * "not in the future" validator on the server always passes.
   */
  private utcNowSafe(): string {
    const d = new Date();
    d.setSeconds(d.getSeconds() - 10);
    return d.toISOString();   // e.g. "2026-03-07T11:05:10.000Z"
  }

  // ── Check In ───────────────────────────────────────────────────────────────
  async onCheckIn(): Promise<void> {
    const confirmed = await Swal.fire({
      title: 'Confirm Check-In',
      html: `<div style="text-align:left;padding:0.5rem 0">
        <p><strong>Time:</strong> ${this.currentTime.toLocaleTimeString()}</p>
        <p><strong>Method:</strong> ${CheckInMethod[this.selectedMethod]}</p>
        ${this.currentLocation
          ? `<p><strong>Location:</strong> ${this.currentLocation.latitude.toFixed(4)}, ${this.currentLocation.longitude.toFixed(4)}</p>`
          : '<p><strong>Location:</strong> Not available</p>'}
      </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  'Check In'
    });
    if (!confirmed.isConfirmed) return;

    this.checkingIn = true;

    const dto: CheckInDto = {
      employeeId:      this.employeeId,     // backend resolves real ID from JWT
      checkInTime:     this.utcNowSafe(),   // guaranteed UTC, slightly in the past
      checkInMethod:   Number(this.selectedMethod) as CheckInMethod,
      checkInLocation: this.currentLocation ?? undefined,
      remarks:         this.remarks.trim() || undefined
    };

    this.attendanceService.checkIn(dto).subscribe({
      next: (r) => {
        this.checkingIn = false;
        if (r.success) {
          this.todayRecord = r.data;
          if (!this.employeeId && r.data?.employeeId) {
            this.employeeId = r.data.employeeId;
            sessionStorage.setItem('EmployeeId', this.employeeId);
          }
          this.remarks = '';
          Swal.fire({ title: 'Checked In!', text: r.message, icon: 'success', timer: 2000, showConfirmButton: false });
        } else {
          Swal.fire('Error!', r.message || 'Check-in failed', 'error');
        }
      },
      error: (e) => {
        this.checkingIn = false;
        Swal.fire('Error!', e?.error?.message || e?.error?.title || 'An error occurred.', 'error');
      }
    });
  }

  // ── Check Out ──────────────────────────────────────────────────────────────
  async onCheckOut(): Promise<void> {
    const confirmed = await Swal.fire({
      title: 'Confirm Check-Out',
      html: `<div style="text-align:left;padding:0.5rem 0">
        <p><strong>Time:</strong> ${this.currentTime.toLocaleTimeString()}</p>
        <p><strong>Working Hours:</strong> ${this.workingHoursDisplay}</p>
      </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  'Check Out'
    });
    if (!confirmed.isConfirmed) return;

    this.checkingOut = true;

    const dto: CheckOutDto = {
      employeeId:       this.employeeId,
      checkOutTime:     this.utcNowSafe(),
      checkOutMethod:   Number(this.selectedMethod) as CheckInMethod,
      checkOutLocation: this.currentLocation ?? undefined,
      remarks:          this.remarks.trim() || undefined
    };

    this.attendanceService.checkOut(dto).subscribe({
      next: (r) => {
        this.checkingOut = false;
        if (r.success) {
          this.todayRecord = r.data;
          this.remarks = '';
          Swal.fire({ title: 'Checked Out!', text: r.message, icon: 'success', timer: 2000, showConfirmButton: false });
        } else {
          Swal.fire('Error!', r.message || 'Check-out failed', 'error');
        }
      },
      error: (e) => {
        this.checkingOut = false;
        Swal.fire('Error!', e?.error?.message || e?.error?.title || 'An error occurred.', 'error');
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  formatTime(dateStr?: string): string {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  getStatusClass(status?: AttendanceStatus): string {
    const map: Record<number, string> = {
      [AttendanceStatus.Present]:      'present',
      [AttendanceStatus.Absent]:       'absent',
      [AttendanceStatus.HalfDay]:      'halfday',
      [AttendanceStatus.Leave]:        'leave',
      [AttendanceStatus.Holiday]:      'holiday',
      [AttendanceStatus.WeekOff]:      'weekoff',
      [AttendanceStatus.WorkFromHome]: 'wfh',
      [AttendanceStatus.OnDuty]:       'onduty'
    };
    return status !== undefined ? (map[status] ?? 'absent') : 'absent';
  }
}