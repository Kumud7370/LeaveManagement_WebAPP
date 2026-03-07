
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
  loading = false;
  checkingIn = false;
  checkingOut = false;

  currentRole = (sessionStorage.getItem('RoleName') || '').toLowerCase();
  isAdmin = ['admin', 'manager', 'superadmin'].includes(this.currentRole);

  // FIX: Try every possible key name your login stores the employee ID under
  employeeId = this.resolveEmployeeId();
  employeeName = sessionStorage.getItem('username')
    || sessionStorage.getItem('Username')
    || sessionStorage.getItem('UserName')
    || sessionStorage.getItem('name')
    || sessionStorage.getItem('Name')
    || '';

  currentTime = new Date();
  private clockSub!: Subscription;

  CheckInMethod = CheckInMethod;
  AttendanceStatus = AttendanceStatus;
  selectedMethod: CheckInMethod = CheckInMethod.WebApp;
  remarks = '';

  currentLocation: LocationDto | null = null;
  locationStatus: 'idle' | 'loading' | 'granted' | 'denied' = 'idle';

  get hasCheckedIn(): boolean { return !!this.todayRecord?.checkInTime; }
  get hasCheckedOut(): boolean { return !!this.todayRecord?.checkOutTime; }

  get workingHoursDisplay(): string {
    if (!this.todayRecord?.checkInTime) return '--:--';
    const inTime = new Date(this.todayRecord.checkInTime);
    const outTime = this.todayRecord.checkOutTime ? new Date(this.todayRecord.checkOutTime) : new Date();
    const diff = outTime.getTime() - inTime.getTime();
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  }

  constructor(private attendanceService: AttendanceService) { }

  ngOnInit(): void {
    this.clockSub = interval(1000).subscribe(() => { this.currentTime = new Date(); });

    // Debug: open DevTools console to see what keys are actually stored
    console.log('[Attendance] All sessionStorage keys:', { ...sessionStorage });
    console.log('[Attendance] Resolved employeeId:', this.employeeId);
    console.log('[Attendance] Resolved employeeName:', this.employeeName);

    this.loadTodayRecord();
    this.requestLocation();
  }

  ngOnDestroy(): void { this.clockSub?.unsubscribe(); }

  // FIX: Scan every common key name variation
  private resolveEmployeeId(): string {
    const candidates = [
      'EmployeeId', 'employeeId', 'EmployeeID', 'employeeID',
      'employee_id', 'EmpId', 'empId', 'emp_id',
      'UserId', 'userId', 'UserID', 'Id', 'id'
    ];
    for (const key of candidates) {
      const val = sessionStorage.getItem(key);
      if (val && val.trim() !== '') {
        console.log(`[Attendance] Found employee ID under key "${key}":`, val);
        return val.trim();
      }
    }
    console.warn('[Attendance] Could not find employee ID in sessionStorage!');
    return '';
  }

  loadTodayRecord(): void {
    if (!this.employeeId) { console.warn('[Attendance] employeeId empty, skipping loadTodayRecord'); return; }
    this.loading = true;
    this.attendanceService.getTodayAttendance(this.employeeId).subscribe({
      next: (r) => { if (r.success) this.todayRecord = r.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  requestLocation(): void {
    if (!navigator.geolocation) { this.locationStatus = 'denied'; return; }
    this.locationStatus = 'loading';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.currentLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        this.locationStatus = 'granted';
      },
      () => { this.locationStatus = 'denied'; }
    );
  }

  private safeNow(): string {
    const d = new Date();
    d.setSeconds(d.getSeconds() - 2);
    return d.toISOString();
  }

  async onCheckIn(): Promise<void> {
    // Re-try resolution in case it was populated after init
    if (!this.employeeId) this.employeeId = this.resolveEmployeeId();

    if (!this.employeeId) {
      const keys = Object.keys(sessionStorage).join(', ') || 'none';
      Swal.fire('Employee ID Not Found',
        `Cannot find your Employee ID.<br><br>
         Session keys found: <code>${keys}</code><br><br>
         Please log out and log in again, or contact your administrator.`,
        'error');
      return;
    }

    const confirmed = await Swal.fire({
      title: 'Confirm Check-In',
      html: `<div style="text-align:left;padding:0.5rem 0">
          <p><strong>Time:</strong> ${this.currentTime.toLocaleTimeString()}</p>
          <p><strong>Method:</strong> ${CheckInMethod[this.selectedMethod]}</p>
          ${this.currentLocation
          ? `<p><strong>Location:</strong> ${this.currentLocation.latitude.toFixed(4)}, ${this.currentLocation.longitude.toFixed(4)}</p>`
          : '<p><strong>Location:</strong> Not available (proceeding without location)</p>'}
        </div>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280', confirmButtonText: 'Check In'
    });
    if (!confirmed.isConfirmed) return;

    this.checkingIn = true;
    const dto: CheckInDto = {
      employeeId: this.employeeId,
      checkInTime: this.safeNow(),
      checkInMethod: Number(this.selectedMethod) as CheckInMethod,
      checkInLocation: this.currentLocation ?? undefined,
      remarks: this.remarks.trim() || undefined
    };
    console.log('[Attendance] checkIn DTO:', dto);

    this.attendanceService.checkIn(dto).subscribe({
      next: (r) => {
        this.checkingIn = false;
        if (r.success) {
          this.todayRecord = r.data; this.remarks = '';
          Swal.fire({ title: 'Checked In!', text: r.message, icon: 'success', timer: 2000, showConfirmButton: false });
        } else { Swal.fire('Error!', r.message || 'Check-in failed', 'error'); }
      },
      error: (e) => {
        this.checkingIn = false;
        Swal.fire('Error!', e?.error?.message || e?.error?.title || 'An error occurred.', 'error');
      }
    });
  }

  async onCheckOut(): Promise<void> {
    if (!this.employeeId) this.employeeId = this.resolveEmployeeId();
    if (!this.employeeId) { Swal.fire('Employee ID Not Found', 'Please log out and log in again.', 'error'); return; }

    const confirmed = await Swal.fire({
      title: 'Confirm Check-Out',
      html: `<div style="text-align:left;padding:0.5rem 0">
          <p><strong>Time:</strong> ${this.currentTime.toLocaleTimeString()}</p>
          <p><strong>Working Hours:</strong> ${this.workingHoursDisplay}</p>
        </div>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#3b82f6', cancelButtonColor: '#6b7280', confirmButtonText: 'Check Out'
    });
    if (!confirmed.isConfirmed) return;

    this.checkingOut = true;
    const dto: CheckOutDto = {
      employeeId: this.employeeId,
      checkOutTime: this.safeNow(),
      checkOutMethod: Number(this.selectedMethod) as CheckInMethod,
      checkOutLocation: this.currentLocation ?? undefined,
      remarks: this.remarks.trim() || undefined
    };

    this.attendanceService.checkOut(dto).subscribe({
      next: (r) => {
        this.checkingOut = false;
        if (r.success) {
          this.todayRecord = r.data; this.remarks = '';
          Swal.fire({ title: 'Checked Out!', text: r.message, icon: 'success', timer: 2000, showConfirmButton: false });
        } else { Swal.fire('Error!', r.message || 'Check-out failed', 'error'); }
      },
      error: (e) => {
        this.checkingOut = false;
        Swal.fire('Error!', e?.error?.message || e?.error?.title || 'An error occurred.', 'error');
      }
    });
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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
}