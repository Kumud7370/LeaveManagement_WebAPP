import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  AttendanceResponseDto,
  AttendanceStatus,
  CheckInMethod,
  getStatusBadgeClass,
  getCheckInMethodIcon,
  formatTime,
  formatDate,
  formatDateTime,
  formatWorkingHours
} from '../../../core/Models/attendance.model';

@Component({
  selector: 'app-attendance-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-details.component.html',
  styleUrls: ['./attendance-details.component.scss']
})
export class AttendanceDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  @Input() isModal = false;
  @Input() attendanceId: string | null = null;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<string>();
  @Output() deleteRequested = new EventEmitter<string>();
  
  attendance: AttendanceResponseDto | null = null;
  isLoading = true;

  // Enums for display
  AttendanceStatus = AttendanceStatus;
  CheckInMethod = CheckInMethod;

  // Helper functions
  getStatusBadgeClass = getStatusBadgeClass;
  getCheckInMethodIcon = getCheckInMethodIcon;
  formatTime = formatTime;
  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatWorkingHours = formatWorkingHours;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    if (this.isModal && this.attendanceId) {
      this.loadAttendanceDetails();
    } 
    else if (!this.isModal) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        this.attendanceId = params['id'];
        if (this.attendanceId) {
          this.loadAttendanceDetails();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAttendanceDetails(): void {
    if (!this.attendanceId) return;

    this.isLoading = true;
    this.attendanceService.getAttendanceById(this.attendanceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (attendance) => {
          this.attendance = attendance;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading attendance details:', error);
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load attendance details.',
            confirmButtonColor: '#3b82f6'
          }).then(() => {
            if (this.isModal) {
              this.goBack();
            } else {
              this.router.navigate(['/attendance/list']);
            }
          });
        }
      });
  }

  goBack(): void {
    if (this.isModal) {
      this.modalClosed.emit();
    } else {
      this.router.navigate(['/attendance/list']);
    }
  }

  editAttendance(): void {
    if (!this.attendanceId) return;

    if (this.isModal) {
      this.editRequested.emit(this.attendanceId);
    } else {
      this.router.navigate(['/attendance/edit', this.attendanceId]);
    }
  }

  deleteAttendance(): void {
    if (!this.attendance || !this.attendanceId) return;

    Swal.fire({
      title: 'Are you sure?',
      html: `Do you want to delete attendance record for <strong>"${this.attendance.employeeName}"</strong> on ${this.formatDate(this.attendance.attendanceDate)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performDelete();
      }
    });
  }

  private performDelete(): void {
    if (!this.attendanceId) return;

    this.attendanceService.deleteAttendance(this.attendanceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Attendance record has been deleted successfully.',
            timer: 2000,
            showConfirmButton: false
          });
          
          if (this.isModal) {
            this.deleteRequested.emit(this.attendanceId!);
          } else {
            this.router.navigate(['/attendance/list']);
          }
        },
        error: (error) => {
          console.error('Error deleting attendance:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to delete attendance record.',
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  approveAttendance(): void {
    if (!this.attendance || !this.attendanceId) return;

    Swal.fire({
      title: 'Approve Attendance?',
      text: `Approve attendance for ${this.attendance.employeeName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, approve it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.performApprove();
      }
    });
  }

  private performApprove(): void {
    if (!this.attendanceId) return;

    this.attendanceService.approveAttendance(this.attendanceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Approved!',
            text: 'Attendance has been approved successfully.',
            timer: 2000,
            showConfirmButton: false
          });
          this.loadAttendanceDetails();
        },
        error: (error) => {
          console.error('Error approving attendance:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to approve attendance.',
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  printAttendanceDetails(): void {
    window.print();
  }

  get isApproved(): boolean {
    return !!this.attendance?.approvedBy;
  }

  get canApprove(): boolean {
    // Add logic to check if current user has permission to approve
    const userRole = sessionStorage.getItem('RoleName');
    return (userRole === 'Admin' || userRole === 'Manager') && !this.isApproved;
  }
}