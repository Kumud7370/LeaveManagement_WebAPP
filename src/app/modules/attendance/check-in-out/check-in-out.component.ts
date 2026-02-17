import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  CheckInDto,
  CheckOutDto,
  AttendanceResponseDto,
  CheckInMethod,
  formatTime,
  formatDate,
  formatWorkingHours
} from '../../../core/Models/attendance.model';

@Component({
  selector: 'app-check-in-out',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './check-in-out.component.html',
  styleUrls: ['./check-in-out.component.scss']
})
export class CheckInOutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  employeeId: string = '';
  todayAttendance: AttendanceResponseDto | null = null;
  isLoading = false;
  currentTime = new Date();
  
  // For display
  formatTime = formatTime;
  formatDate = formatDate;
  formatWorkingHours = formatWorkingHours;
  
  constructor(
    private attendanceService: AttendanceService,
    private datePipe: DatePipe
  ) {
    // Get employee ID from session storage
    this.employeeId = sessionStorage.getItem('UserId') || '';
  }

  ngOnInit(): void {
    console.log('🚀 Check-In Component Initialized');
    console.log('📋 Employee ID:', this.employeeId);
    console.log('📅 Current Date:', new Date().toISOString());
    
    // Check if employee ID exists
    if (!this.employeeId) {
      console.error('❌ No Employee ID found in session storage');
      console.log('📦 Session Storage Contents:', {
        UserId: sessionStorage.getItem('UserId'),
        username: sessionStorage.getItem('username'),
        RoleName: sessionStorage.getItem('RoleName'),
        token: sessionStorage.getItem('token') ? 'EXISTS' : 'MISSING'
      });
      
      Swal.fire({
        icon: 'error',
        title: 'Authentication Error',
        text: 'Employee ID not found. Please login again.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    this.loadTodayAttendance();
    this.startClock();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startClock(): void {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  loadTodayAttendance(): void {
    if (!this.employeeId) {
      console.error('❌ Cannot load attendance - No employee ID');
      return;
    }
    
    this.isLoading = true;
    console.log('📡 Loading today\'s attendance for:', this.employeeId);
    
    this.attendanceService.getTodayAttendance(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (attendance) => {
          console.log('✅ Attendance found:', attendance);
          this.todayAttendance = attendance;
          this.isLoading = false;
          
          // Show info if already checked in
          if (attendance.checkInTime) {
            console.log('ℹ️ Already checked in at:', attendance.checkInTime);
          }
        },
        error: (error) => {
          console.log('ℹ️ No attendance record for today');
          this.todayAttendance = null;
          this.isLoading = false;
        }
      });
  }

  checkIn(): void {
    console.log('\n=== 🔵 CHECK-IN PROCESS STARTED ===');
    console.log('Step 1: Validating employee ID');
    
    if (!this.employeeId) {
      console.error('❌ Validation Failed: No employee ID');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Employee ID not found. Please login again.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }
    
    console.log('✅ Employee ID valid:', this.employeeId);
    console.log('Step 2: Checking if already checked in');

    // Check if already checked in
    if (this.hasCheckedIn) {
      console.warn('⚠️ Already checked in');
      Swal.fire({
        icon: 'warning',
        title: 'Already Checked In',
        text: `You already checked in at ${formatTime(this.todayAttendance?.checkInTime)}`,
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    console.log('✅ Not checked in yet - proceeding');
    console.log('Step 3: Showing confirmation dialog');

    const now = new Date();
    
    Swal.fire({
      title: 'Check In',
      html: `
        <p>Are you sure you want to check in?</p>
        <p style="font-size: 0.9em; color: #6b7280; margin-top: 0.5rem;">
          Time: <strong>${now.toLocaleTimeString()}</strong>
        </p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Check In',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('✅ User confirmed check-in');
        // ⚠️ CRITICAL: Refresh attendance data before attempting check-in
        this.refreshAndCheckIn();
      } else {
        console.log('❌ User cancelled check-in');
      }
    });
  }

  // ✅ NEW METHOD: Refresh attendance data before check-in
  private refreshAndCheckIn(): void {
    console.log('🔄 Refreshing attendance data before check-in...');
    
    this.isLoading = true;
    
    this.attendanceService.getTodayAttendance(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (attendance) => {
          console.log('✅ Refreshed attendance data:', attendance);
          this.todayAttendance = attendance;
          this.isLoading = false;
          
          // Check again if already checked in
          if (attendance.checkInTime) {
            console.warn('⚠️ Already checked in (found after refresh)');
            Swal.fire({
              icon: 'info',
              title: 'Already Checked In',
              html: `
                <p>You have already checked in today.</p>
                <p style="margin-top: 0.5rem;">Check-in time: <strong>${formatTime(attendance.checkInTime)}</strong></p>
              `,
              confirmButtonColor: '#3b82f6'
            });
          } else {
            // Safe to proceed with check-in
            console.log('✅ Confirmed not checked in - proceeding');
            this.performCheckIn();
          }
        },
        error: (error) => {
          console.log('ℹ️ No attendance found - safe to check in');
          this.todayAttendance = null;
          this.isLoading = false;
          
          // No attendance exists, safe to check in
          this.performCheckIn();
        }
      });
  }

  private performCheckIn(): void {
    console.log('Step 4: Preparing check-in data');
    
    const now = new Date();
    const dto: CheckInDto = {
      employeeId: this.employeeId,
      checkInTime: now,
      checkInMethod: CheckInMethod.WebApp,
      checkInDeviceId: this.getDeviceId(),
      remarks: ''
    };

    console.log('📝 Check-in DTO:', {
      employeeId: dto.employeeId,
      checkInTime: now.toISOString(),
      checkInTimeLocal: now.toLocaleString(),
      checkInMethod: 'WebApp',
      checkInMethodValue: dto.checkInMethod,
      checkInDeviceId: dto.checkInDeviceId
    });

    this.isLoading = true;
    console.log('📤 Sending check-in request...');
    
    this.attendanceService.checkIn(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (attendance) => {
          console.log('✅✅✅ CHECK-IN SUCCESSFUL!');
          console.log('Response:', attendance);
          
          this.todayAttendance = attendance;
          this.isLoading = false;
          
          Swal.fire({
            icon: 'success',
            title: 'Check In Successful',
            html: `
              <div style="text-align: center;">
                <p style="font-size: 1.1em; margin-bottom: 0.5rem;">
                  Checked in at <strong style="color: #3b82f6;">${formatTime(attendance.checkInTime)}</strong>
                </p>
                ${attendance.isLate ? 
                  `<p style="color: #f59e0b; margin-top: 0.5rem;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Late by ${attendance.lateMinutes} minutes
                  </p>` : 
                  `<p style="color: #10b981; margin-top: 0.5rem;">
                    <i class="fas fa-check-circle"></i> 
                    On time!
                  </p>`
                }
              </div>
            `,
            timer: 3000,
            showConfirmButton: false
          });
        },
        error: (error) => {
          console.error('❌❌❌ CHECK-IN FAILED!');
          console.error('Error:', error);
          
          this.isLoading = false;
          
          // Parse error message
          let errorMessage = 'Failed to check in. Please try again.';
          let errorDetails = '';
          
          if (error.error) {
            // Backend returned structured error
            if (error.error.message) {
              errorMessage = error.error.message;
            }
            
            // Check for specific error messages
            if (errorMessage.includes('Already checked in')) {
              // Refresh the data and show the existing check-in
              this.loadTodayAttendance();
              
              Swal.fire({
                icon: 'info',
                title: 'Already Checked In',
                html: `
                  <p>${errorMessage}</p>
                  <p style="margin-top: 1rem; font-size: 0.9em; color: #6b7280;">
                    Refreshing your attendance data...
                  </p>
                `,
                confirmButtonColor: '#3b82f6'
              });
              return;
            }
            
            if (errorMessage.includes('employee not found')) {
              errorDetails = `
                <p style="margin-top: 1rem; font-size: 0.9em; color: #dc2626;">
                  Your employee record was not found in the system.
                </p>
                <p style="font-size: 0.85em; color: #6b7280;">
                  Employee ID: <code>${this.employeeId}</code>
                </p>
                <p style="font-size: 0.85em; color: #6b7280;">
                  Please contact your administrator.
                </p>
              `;
            }
          }
          
          Swal.fire({
            icon: 'error',
            title: 'Check In Failed',
            html: `
              <p>${errorMessage}</p>
              ${errorDetails}
              <details style="margin-top: 1rem; font-size: 0.85em; color: #6b7280;">
                <summary style="cursor: pointer;">Technical Details</summary>
                <pre style="text-align: left; background: #f3f4f6; padding: 0.5rem; border-radius: 4px; overflow-x: auto; margin-top: 0.5rem;">${JSON.stringify(error.error || error, null, 2)}</pre>
              </details>
            `,
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  checkOut(): void {
    console.log('\n=== 🔴 CHECK-OUT PROCESS STARTED ===');
    
    if (!this.employeeId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Employee ID not found. Please login again.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    if (!this.hasCheckedIn) {
      Swal.fire({
        icon: 'warning',
        title: 'Not Checked In',
        text: 'You need to check in first before checking out.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    if (this.hasCheckedOut) {
      Swal.fire({
        icon: 'warning',
        title: 'Already Checked Out',
        text: `You already checked out at ${formatTime(this.todayAttendance?.checkOutTime)}`,
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    const now = new Date();

    Swal.fire({
      title: 'Check Out',
      html: `
        <p>Are you sure you want to check out?</p>
        <p style="font-size: 0.9em; color: #6b7280; margin-top: 0.5rem;">
          Time: <strong>${now.toLocaleTimeString()}</strong>
        </p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Check Out',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performCheckOut();
      }
    });
  }

  private performCheckOut(): void {
    const now = new Date();
    const dto: CheckOutDto = {
      employeeId: this.employeeId,
      checkOutTime: now,
      checkOutMethod: CheckInMethod.WebApp,
      checkOutDeviceId: this.getDeviceId(),
      remarks: ''
    };

    this.isLoading = true;
    
    this.attendanceService.checkOut(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (attendance) => {
          console.log('✅ Check-out successful');
          this.todayAttendance = attendance;
          this.isLoading = false;
          
          Swal.fire({
            icon: 'success',
            title: 'Check Out Successful',
            html: `
              <div style="text-align: center;">
                <p>Checked out at <strong style="color: #3b82f6;">${formatTime(attendance.checkOutTime)}</strong></p>
                <p style="margin-top: 0.5rem;">Working Hours: <strong style="color: #10b981;">${formatWorkingHours(attendance.workingHours)}</strong></p>
                ${attendance.overtimeHours && attendance.overtimeHours > 0 ? 
                  `<p style="color: #8b5cf6;">Overtime: <strong>${formatWorkingHours(attendance.overtimeHours)}</strong></p>` : ''}
                ${attendance.isEarlyLeave ? 
                  `<p style="color: #f59e0b; margin-top: 0.5rem;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Early leave by ${attendance.earlyLeaveMinutes} minutes
                  </p>` : ''}
              </div>
            `,
            timer: 4000,
            showConfirmButton: false
          });
        },
        error: (error) => {
          console.error('❌ Check-out failed:', error);
          this.isLoading = false;
          
          let errorMessage = 'Failed to check out. Please try again.';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          Swal.fire({
            icon: 'error',
            title: 'Check Out Failed',
            text: errorMessage,
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  get hasCheckedIn(): boolean {
    return !!this.todayAttendance?.checkInTime;
  }

  get hasCheckedOut(): boolean {
    return !!this.todayAttendance?.checkOutTime;
  }

  get canCheckIn(): boolean {
    return !this.hasCheckedIn && !this.isLoading;
  }

  get canCheckOut(): boolean {
    return this.hasCheckedIn && !this.hasCheckedOut && !this.isLoading;
  }

  private getDeviceId(): string {
    let deviceId = sessionStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'web-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }
}