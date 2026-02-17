import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  AttendanceSummaryDto,
  formatDate,
  formatWorkingHours
} from '../../../core/Models/attendance.model';

@Component({
  selector: 'app-attendance-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-summary.component.html',
  styleUrls: ['./attendance-summary.component.scss']
})
export class AttendanceSummaryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  employeeId: string = '';
  startDate: Date = new Date();
  endDate: Date = new Date();
  summary: AttendanceSummaryDto | null = null;
  isLoading = false;

  formatDate = formatDate;
  formatWorkingHours = formatWorkingHours;

  constructor(private attendanceService: AttendanceService) {
    this.employeeId = sessionStorage.getItem('UserId') || '';
    
    // Set default date range (current month)
    const now = new Date();
    this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  ngOnInit(): void {
    if (this.employeeId) {
      this.loadSummary();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSummary(): void {
    if (!this.employeeId || !this.startDate || !this.endDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select a date range.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    this.isLoading = true;
    this.attendanceService.getAttendanceSummary(
      this.employeeId,
      this.startDate,
      this.endDate
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.summary = summary;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading summary:', error);
          this.isLoading = false;
          
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to load attendance summary.',
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  onDateRangeChange(): void {
    this.loadSummary();
  }

  setCurrentMonth(): void {
    const now = new Date();
    this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.loadSummary();
  }

  setLastMonth(): void {
    const now = new Date();
    this.startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    this.endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    this.loadSummary();
  }

  setCurrentYear(): void {
    const now = new Date();
    this.startDate = new Date(now.getFullYear(), 0, 1);
    this.endDate = new Date(now.getFullYear(), 11, 31);
    this.loadSummary();
  }

  getAttendancePercentageColor(percentage: number): string {
    if (percentage >= 90) return '#10b981';
    if (percentage >= 75) return '#f59e0b';
    return '#ef4444';
  }
}