import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { EmployeeShiftService } from '../../core/services/api/employee-shift.api';
import {
  EmployeeShift,
  ShiftChangeStatus,
  ShiftChangeStatusColor,
  ShiftChangeStatusLabel,
} from '../../core/Models/employee-shift.module';

@Component({
  selector: 'app-my-shifts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-shifts.component.html',
  styleUrls: ['./my-shifts.component.scss'],
})
export class MyShiftsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Employee ID input
  employeeId: string = '';
  employeeIdInput: string = '';
  employeeName: string = '';
  isIdSet: boolean = false;

  shifts: EmployeeShift[] = [];
  filteredShifts: EmployeeShift[] = [];

  isLoading = false;
  searchTerm = '';

  // Reject dialog
  showRejectDialog = false;
  rejectTarget: EmployeeShift | null = null;
  rejectReason = '';

  // Detail modal
  showDetailModal = false;
  selectedShift: EmployeeShift | null = null;

  ShiftChangeStatus = ShiftChangeStatus;
  ShiftChangeStatusColor = ShiftChangeStatusColor;
  ShiftChangeStatusLabel = ShiftChangeStatusLabel;

  activeTab: 'all' | 'pending' | 'approved' | 'rejected' = 'all';

  get pendingCount(): number {
    return this.shifts.filter(s => this.resolveStatus(s.status) === ShiftChangeStatus.Pending).length;
  }

  get approvedCount(): number {
    return this.shifts.filter(s => this.resolveStatus(s.status) === ShiftChangeStatus.Approved).length;
  }

  get rejectedCount(): number {
    return this.shifts.filter(s => this.resolveStatus(s.status) === ShiftChangeStatus.Rejected).length;
  }

  constructor(
    private svc: EmployeeShiftService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Try to auto-load from sessionStorage if employeeId was saved before
    const saved = sessionStorage.getItem('employeeId') || sessionStorage.getItem('EmployeeId');
    if (saved) {
      this.employeeId = saved;
      this.employeeIdInput = saved;
      this.isIdSet = true;
      this.loadShifts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setEmployeeId(): void {
    const id = this.employeeIdInput.trim();
    if (!id) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter your Employee ID.', confirmButtonColor: '#3b82f6' });
      return;
    }
    this.employeeId = id;
    this.isIdSet = true;
    sessionStorage.setItem('employeeId', id);
    this.loadShifts();
  }

  changeEmployeeId(): void {
    this.isIdSet = false;
    this.shifts = [];
    this.filteredShifts = [];
    this.employeeName = '';
    this.activeTab = 'all';
    this.searchTerm = '';
  }

  loadShifts(): void {
    if (!this.employeeId) return;
    this.isLoading = true;

    this.svc.getShiftsByEmployee(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.isLoading = false;
          if (res.success) {
            this.shifts = res.data;

            // Grab employee name from first result
            if (this.shifts.length > 0 && this.shifts[0].employeeName) {
              this.employeeName = this.shifts[0].employeeName;
            }

            this.applyFilter();
            this.cdr.detectChanges();
          } else {
            Swal.fire({ icon: 'error', title: 'Not Found', text: 'No employee found with this ID. Please check and try again.', confirmButtonColor: '#ef4444' });
            this.isIdSet = false;
          }
        },
        error: err => {
          this.isLoading = false;
          if (err.status === 404) {
            Swal.fire({ icon: 'error', title: 'Not Found', text: 'Employee ID not found. Please check your Employee ID.', confirmButtonColor: '#ef4444' });
            this.isIdSet = false;
          } else if (err.status !== 401) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load shifts. Please try again.', confirmButtonColor: '#ef4444' });
          }
        }
      });
  }

  applyFilter(): void {
    let result = [...this.shifts];

    if (this.activeTab !== 'all') {
      const statusMap: Record<string, ShiftChangeStatus> = {
        pending: ShiftChangeStatus.Pending,
        approved: ShiftChangeStatus.Approved,
        rejected: ShiftChangeStatus.Rejected,
      };
      result = result.filter(s => this.resolveStatus(s.status) === statusMap[this.activeTab]);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(s =>
        s.shiftName?.toLowerCase().includes(term) ||
        s.shiftTimingDisplay?.toLowerCase().includes(term) ||
        s.changeReason?.toLowerCase().includes(term)
      );
    }

    this.filteredShifts = result;
  }

  setTab(tab: 'all' | 'pending' | 'approved' | 'rejected'): void {
    this.activeTab = tab;
    this.applyFilter();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  // ── View Detail ─────────────────────────────────────────────────────────────

  viewDetail(shift: EmployeeShift): void {
    this.selectedShift = shift;
    this.showDetailModal = true;
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.showDetailModal = false;
    this.selectedShift = null;
  }

  // ── Employee Confirm ────────────────────────────────────────────────────────

  confirmShift(shift: EmployeeShift): void {
    if (this.resolveStatus(shift.status) !== ShiftChangeStatus.Pending) {
      Swal.fire({ icon: 'info', title: 'Not Available', text: `This assignment is already ${shift.statusName}.`, confirmButtonColor: '#3b82f6' });
      return;
    }

    Swal.fire({
      title: 'Confirm Shift Assignment?',
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.9">
          <b>Shift:</b> ${shift.shiftName}<br>
          <b>Timing:</b> ${shift.shiftTimingDisplay}<br>
          <b>Effective From:</b> ${this.fmt(shift.effectiveFrom)}<br>
          <b>Effective To:</b> ${shift.effectiveTo ? this.fmt(shift.effectiveTo) : 'Ongoing'}
        </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '✅ Yes, Confirm',
      cancelButtonText: 'Cancel'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.employeeApproveShift(shift.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: res => {
            if (res.success) {
              this.toast('Confirmed!', 'Your shift has been confirmed successfully.');
              this.loadShifts();
            } else {
              Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Could not confirm shift.', confirmButtonColor: '#ef4444' });
            }
          },
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Could not confirm shift.', confirmButtonColor: '#ef4444' })
        });
    });
  }

  // ── Employee Decline ────────────────────────────────────────────────────────

  openRejectDialog(shift: EmployeeShift): void {
    if (this.resolveStatus(shift.status) !== ShiftChangeStatus.Pending) {
      Swal.fire({ icon: 'info', title: 'Not Available', text: `This assignment is already ${shift.statusName}.`, confirmButtonColor: '#3b82f6' });
      return;
    }
    this.rejectTarget = shift;
    this.rejectReason = '';
    this.showRejectDialog = true;
    this.cdr.detectChanges();
  }

  confirmReject(): void {
    if (!this.rejectTarget || this.rejectReason.trim().length < 5) return;
    const target = this.rejectTarget;
    this.showRejectDialog = false;

    this.svc.employeeRejectShift(target.id, this.rejectReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.success) {
            this.toast('Declined', 'Shift declined. Admin will be notified to reassign.');
            this.loadShifts();
          } else {
            Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Decline failed.', confirmButtonColor: '#ef4444' });
          }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Decline failed.', confirmButtonColor: '#ef4444' })
      });
  }

  cancelReject(): void {
    this.showRejectDialog = false;
    this.rejectTarget = null;
    this.rejectReason = '';
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  resolveStatus(status: any): ShiftChangeStatus {
    if (typeof status === 'string') {
      const map: Record<string, ShiftChangeStatus> = {
        Pending: ShiftChangeStatus.Pending,
        Approved: ShiftChangeStatus.Approved,
        Rejected: ShiftChangeStatus.Rejected,
        Cancelled: ShiftChangeStatus.Cancelled,
      };
      return map[status] ?? ShiftChangeStatus.Pending;
    }
    return status as ShiftChangeStatus;
  }

  getStatusStyle(status: any): { bg: string; color: string } {
    return ShiftChangeStatusColor[this.resolveStatus(status)] ?? { bg: '#f1f5f9', color: '#475569' };
  }

  getStatusLabel(status: any): string {
    return ShiftChangeStatusLabel[this.resolveStatus(status)] ?? String(status);
  }

  isPending(shift: EmployeeShift): boolean {
    return this.resolveStatus(shift.status) === ShiftChangeStatus.Pending;
  }

  isApproved(shift: EmployeeShift): boolean {
    return this.resolveStatus(shift.status) === ShiftChangeStatus.Approved;
  }

  isRejected(shift: EmployeeShift): boolean {
    return this.resolveStatus(shift.status) === ShiftChangeStatus.Rejected;
  }

  fmt(val: any): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private toast(title: string, text: string): void {
    Swal.fire({ icon: 'success', title, text, timer: 2500, timerProgressBar: true, showConfirmButton: false });
  }
}