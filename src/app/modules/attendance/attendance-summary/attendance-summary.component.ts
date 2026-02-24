// =============================================
// attendance-summary.component.ts
// Employee self-service summary view.
// Admin can view any employee's summary.
// =============================================

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AttendanceService } from '../../../core/services/api/attendance.api';
import { AttendanceSummaryDto } from '../../../core/Models/attendance.model';

@Component({
  selector: 'app-attendance-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-summary.component.html',
  styleUrls: ['./attendance-summary.component.scss']
})
export class AttendanceSummaryComponent implements OnInit {
  summary: AttendanceSummaryDto | null = null;
  loading = false;

  isAdmin = ['admin', 'manager'].includes(
    (sessionStorage.getItem('RoleName') || '').toLowerCase()
  );
  employeeId = sessionStorage.getItem('EmployeeId') || '';

  // Date range - default to current month
  startDate = '';
  endDate = '';
  lookupEmployeeId = '';

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    const today = new Date();
    this.endDate = today.toISOString().substring(0, 10);
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = first.toISOString().substring(0, 10);
    this.lookupEmployeeId = this.employeeId;
    if (this.lookupEmployeeId) this.loadSummary();
  }

  loadSummary(): void {
    const eid = this.isAdmin ? this.lookupEmployeeId : this.employeeId;
    if (!eid || !this.startDate || !this.endDate) return;
    this.loading = true;
    this.attendanceService.getAttendanceSummary(eid, this.startDate, this.endDate).subscribe({
      next: (r) => { if (r.success) this.summary = r.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  setCurrentMonth(): void {
    const today = new Date();
    this.endDate = today.toISOString().substring(0, 10);
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = first.toISOString().substring(0, 10);
    this.loadSummary();
  }

  setLastMonth(): void {
    const today = new Date();
    const firstOfLast = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastOfLast  = new Date(today.getFullYear(), today.getMonth(), 0);
    this.startDate = firstOfLast.toISOString().substring(0, 10);
    this.endDate   = lastOfLast.toISOString().substring(0, 10);
    this.loadSummary();
  }

  getAttendanceArc(): string {
    if (!this.summary) return 'M 50 50 m -40 0 a 40 40 0 0 1 80 0';
    const pct = this.summary.attendancePercentage / 100;
    const angle = pct * Math.PI;
    const x = 50 + 40 * Math.cos(Math.PI + angle);
    const y = 50 + 40 * Math.sin(Math.PI + angle);
    const large = angle > Math.PI / 2 ? 1 : 0;
    return `M 10 50 A 40 40 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
}