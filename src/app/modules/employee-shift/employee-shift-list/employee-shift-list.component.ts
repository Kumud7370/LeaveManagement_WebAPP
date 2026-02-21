// ============================================================
// FILE: src/app/modules/employee-shift/employee-shift-list/employee-shift-list.component.ts
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { EmployeeShiftService } from '../../../core/services/api/employee-shift.api';
import {
  EmployeeShift,
  EmployeeShiftFilterDto,
  ShiftChangeStatus,
  ShiftChangeStatusLabel,
  ShiftChangeStatusColor,
} from '../../../core/Models/employee-shift.module';
import { EmployeeShiftFormComponent } from '../employee-shift-form/employee-shift-form.component';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';

@Component({
  selector: 'app-employee-shift-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridModule,
    EmployeeShiftFormComponent,
    ActionCellRendererComponent,
  ],
  templateUrl: './employee-shift-list.component.html',
  styleUrls: ['./employee-shift-list.component.scss']
})
export class EmployeeShiftListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private gridApi!: GridApi;

  shifts: EmployeeShift[] = [];
  totalRecords = 0;
  currentPage = 1;
  pageSize = 10;
  isLoading = false;

  stats: Record<string, number> = {};
  statsLoaded = false;

  filterStatus: ShiftChangeStatus | '' = '';
  filterOnlyCurrent = false;

  ShiftChangeStatus = ShiftChangeStatus;
  statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending',   value: ShiftChangeStatus.Pending },
    { label: 'Approved',  value: ShiftChangeStatus.Approved },
    { label: 'Rejected',  value: ShiftChangeStatus.Rejected },
    { label: 'Cancelled', value: ShiftChangeStatus.Cancelled },
  ];

  showModal = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedShift: EmployeeShift | null = null;

  showRejectDialog = false;
  rejectTarget: EmployeeShift | null = null;
  rejectReason = '';

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      field: 'id',
      cellRenderer: ActionCellRendererComponent,
      width: 165,
      pinned: 'left',
      sortable: false,
      filter: false,
      resizable: false,
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 115,
      sortable: true,
      cellRenderer: (p: ICellRendererParams) => {
        const s = p.data as EmployeeShift;
        // Normalize: backend may return string "Pending" or number 1
        const statusKey = this.resolveStatus(s.status);
        const c = ShiftChangeStatusColor[statusKey];
        const l = ShiftChangeStatusLabel[statusKey] ?? s.statusName ?? String(s.status);
        return `<span style="background:${c?.bg ?? '#f1f5f9'};color:${c?.color ?? '#475569'};padding:3px 10px;
          border-radius:4px;font-size:.74rem;font-weight:700;letter-spacing:.03em">${l}</span>`;
      },
    },
    {
      headerName: 'Employee',
      field: 'employeeName',
      flex: 1,
      minWidth: 160,
      sortable: true,
      filter: true,
      cellRenderer: (p: ICellRendererParams) => {
        const s = p.data as EmployeeShift;
        return `<div style="line-height:1.35;padding:4px 0">
          <div style="font-weight:600;color:#1e293b;font-size:.84rem">${s.employeeName ?? '—'}</div>
          <div style="font-size:.73rem;color:#94a3b8;font-family:monospace">${s.employeeCode ?? ''}</div>
        </div>`;
      },
    },
    {
      headerName: 'Shift',
      field: 'shiftName',
      width: 165,
      sortable: true,
      cellRenderer: (p: ICellRendererParams) => {
        const s = p.data as EmployeeShift;
        const dot = s.shiftColor
          ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;
              background:${s.shiftColor};margin-right:5px;vertical-align:middle"></span>`
          : '';
        return `<div style="line-height:1.35;padding:4px 0">
          <div style="font-weight:600;color:#334155;font-size:.84rem">${dot}${s.shiftName ?? '—'}</div>
          <div style="font-size:.73rem;color:#94a3b8">${s.shiftTimingDisplay ?? ''}</div>
        </div>`;
      },
    },
    {
      headerName: 'Effective From',
      field: 'effectiveFrom',
      width: 130,
      sortable: true,
      valueFormatter: p => this.fmt(p.value),
    },
    {
      headerName: 'Effective To',
      field: 'effectiveTo',
      width: 125,
      sortable: true,
      cellRenderer: (p: ICellRendererParams) =>
        p.value
          ? `<span style="font-size:.84rem">${this.fmt(p.value)}</span>`
          : `<span style="color:#94a3b8;font-style:italic;font-size:.8rem">Ongoing</span>`,
    },
    {
      headerName: 'Currently Active',
      field: 'isCurrentlyActive',
      width: 130,
      sortable: true,
      cellRenderer: (p: ICellRendererParams) =>
        p.value
          ? `<span style="color:#10b981;font-size:.82rem;font-weight:600">&#10004; Yes</span>`
          : `<span style="color:#cbd5e1;font-size:.82rem">&#8212; No</span>`,
    },
    {
      headerName: 'Requested',
      field: 'requestedDate',
      width: 120,
      sortable: true,
      valueFormatter: p => this.fmt(p.value),
    },
    {
      headerName: 'Approved By',
      field: 'approvedByName',
      width: 140,
      sortable: false,
      valueFormatter: p => p.value ?? '—',
    },
    {
      headerName: 'Duration',
      field: 'durationInDays',
      width: 105,
      sortable: false,
      valueFormatter: p => p.value === -1 || p.value == null ? 'Ongoing' : `${p.value} days`,
    },
  ];

  defaultColDef: ColDef = { resizable: true, sortable: true, filter: true };
  context = { componentParent: this };

  constructor(private svc: EmployeeShiftService) {}

  ngOnInit(): void {
    this.loadShifts();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onGridReady(e: GridReadyEvent): void {
    this.gridApi = e.api;
    setTimeout(() => this.gridApi.sizeColumnsToFit(), 100);
  }

  loadShifts(): void {
    this.isLoading = true;
    const filter: EmployeeShiftFilterDto = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      sortBy: 'EffectiveFrom',
      sortDescending: true,
      status: this.filterStatus === '' ? undefined : (this.filterStatus as ShiftChangeStatus),
      onlyCurrentAssignments: this.filterOnlyCurrent || undefined,
    };
    this.svc.getFilteredEmployeeShifts(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.success) {
            this.shifts = res.data.items;
            this.totalRecords = res.data.totalCount;
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
          }
          this.isLoading = false;
        },
        error: err => {
          console.error(err);
          this.isLoading = false;
          Swal.fire({ icon: 'error', title: 'Load Error', text: 'Failed to load shift assignments.', confirmButtonColor: '#ef4444' });
        },
      });
  }

  loadStats(): void {
    this.svc.getStatisticsByStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.success) {
            this.stats = res.data;
            this.statsLoaded = true;
          }
        }
      });
  }

  onStatusChange(): void  { this.currentPage = 1; this.loadShifts(); }
  onCurrentToggle(): void { this.currentPage = 1; this.loadShifts(); }
  clearFilters(): void {
    this.filterStatus = '';
    this.filterOnlyCurrent = false;
    this.currentPage = 1;
    this.loadShifts();
  }

  get totalPages(): number  { return Math.ceil(this.totalRecords / this.pageSize); }
  getMaxRecords(): number   { return Math.min(this.currentPage * this.pageSize, this.totalRecords); }
  onPageChange(p: number): void     { this.currentPage = p; this.loadShifts(); }
  onPageSizeChange(s: number): void { this.pageSize = s; this.currentPage = 1; this.loadShifts(); }

  exportData(): void {
    this.gridApi?.exportDataAsCsv({ fileName: `employee_shifts_${Date.now()}.csv` });
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedShift = null;
    this.showModal = true;
  }

  // ── ActionCellRenderer callbacks ──────────────────────────

  viewDetails(shift: EmployeeShift): void {
    this.modalMode = 'view';
    this.selectedShift = shift;
    this.showModal = true;
  }

  editDepartment(shift: EmployeeShift): void {
    if (!shift.canBeModified) {
      Swal.fire({
        icon: 'info',
        title: 'Cannot Edit',
        text: 'Only Pending assignments with a future effective date can be modified.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }
    this.modalMode = 'edit';
    this.selectedShift = shift;
    this.showModal = true;
  }

  // ── Status normalization ──────────────────────────────────
  // Backend may return status as string ("Pending") or number (1).
  // This helper always returns the ShiftChangeStatus enum number.
  private resolveStatus(status: any): ShiftChangeStatus {
    if (typeof status === 'string') {
      const map: Record<string, ShiftChangeStatus> = {
        'Pending':   ShiftChangeStatus.Pending,
        'Approved':  ShiftChangeStatus.Approved,
        'Rejected':  ShiftChangeStatus.Rejected,
        'Cancelled': ShiftChangeStatus.Cancelled,
      };
      return map[status] ?? ShiftChangeStatus.Pending;
    }
    return status as ShiftChangeStatus;
  }

  private isPending(shift: EmployeeShift): boolean {
    return this.resolveStatus(shift.status) === ShiftChangeStatus.Pending;
  }

  private isApproved(shift: EmployeeShift): boolean {
    return this.resolveStatus(shift.status) === ShiftChangeStatus.Approved;
  }

  // Repurposed toggleStatus → Approve if Pending
  toggleStatus(shift: EmployeeShift): void {
    if (!this.isPending(shift)) {
      Swal.fire({
        icon: 'info',
        title: 'Not Applicable',
        text: `Assignment is already ${shift.statusName}. Only Pending can be approved.`,
        confirmButtonColor: '#3b82f6'
      });
      return;
    }
    Swal.fire({
      title: 'Approve Assignment?',
      html: `Approve <b>${shift.employeeName}</b> → <b>${shift.shiftName}</b><br>
             <small style="color:#64748b">Effective: ${this.fmt(shift.effectiveFrom)}</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.svc.approveShiftChange(shift.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: res => {
            if (res.success) {
              this.toast('Approved!', `${shift.employeeName}'s shift has been approved.`);
              this.loadShifts();
              this.loadStats();
            } else {
              Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Approval failed.', confirmButtonColor: '#ef4444' });
            }
          },
          error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Approval failed.', confirmButtonColor: '#ef4444' }),
        });
    });
  }

  deleteDepartment(shift: EmployeeShift): void {
    if (this.isPending(shift)) {
      Swal.fire({
        title: 'What would you like to do?',
        html: `<b>${shift.employeeName}</b> → <b>${shift.shiftName}</b>`,
        icon: 'warning',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        denyButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
        confirmButtonText: shift.canBeModified ? '&#128465; Delete' : '&#10006; Reject',
        denyButtonText: '&#128683; Cancel Request',
        cancelButtonText: 'Back',
      }).then(r => {
        if (r.isConfirmed) {
          shift.canBeModified ? this.doDelete(shift) : this.openRejectDialog(shift);
        } else if (r.isDenied) {
          this.doCancel(shift);
        }
      });
      return;
    }
    Swal.fire({
      icon: 'info',
      title: 'Cannot Delete',
      text: 'Only Pending assignments can be removed.',
      confirmButtonColor: '#3b82f6'
    });
  }

  openRejectDialog(shift: EmployeeShift): void {
    this.rejectTarget = shift;
    this.rejectReason = '';
    this.showRejectDialog = true;
  }

  confirmReject(): void {
    if (!this.rejectTarget || !this.rejectReason.trim()) return;
    const target = this.rejectTarget;
    this.showRejectDialog = false;
    this.svc.rejectShiftChange(target.id, this.rejectReason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.success) {
            this.toast('Rejected', `${target.employeeName}'s request was rejected.`);
            this.loadShifts();
            this.loadStats();
          } else {
            Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Rejection failed.', confirmButtonColor: '#ef4444' });
          }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Rejection failed.', confirmButtonColor: '#ef4444' }),
      });
  }

  private doCancel(shift: EmployeeShift): void {
    this.svc.cancelShiftChange(shift.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          if (res.success) {
            this.toast('Cancelled', 'Shift request cancelled.');
            this.loadShifts();
            this.loadStats();
          }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Cancel failed.', confirmButtonColor: '#ef4444' }),
      });
  }

  private doDelete(shift: EmployeeShift): void {
    this.isLoading = true;
    this.svc.deleteEmployeeShift(shift.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.isLoading = false;
          if (res.success) {
            this.toast('Deleted!', 'Assignment deleted.');
            this.loadShifts();
            this.loadStats();
          } else {
            Swal.fire({ icon: 'error', title: 'Failed', text: res.message || 'Delete failed.', confirmButtonColor: '#ef4444' });
          }
        },
        error: () => {
          this.isLoading = false;
          Swal.fire({ icon: 'error', title: 'Error', text: 'Delete failed.', confirmButtonColor: '#ef4444' });
        },
      });
  }

  onModalClose(): void   { this.showModal = false; this.selectedShift = null; }
  onModalSuccess(): void { this.showModal = false; this.selectedShift = null; this.loadShifts(); this.loadStats(); }

  fmt(val: any): string {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private toast(title: string, text: string): void {
    Swal.fire({
      icon: 'success', title, text,
      confirmButtonColor: '#3b82f6',
      timer: 2000, timerProgressBar: true, showConfirmButton: false
    });
  }

  getStatColor(key: string): { bg: string; color: string } {
    const map: Record<string, { bg: string; color: string }> = {
      Pending:   { bg: '#fef9c3', color: '#713f12' },
      Approved:  { bg: '#d1fae5', color: '#065f46' },
      Rejected:  { bg: '#fee2e2', color: '#991b1b' },
      Cancelled: { bg: '#f1f5f9', color: '#475569' },
    };
    return map[key] ?? { bg: '#f1f5f9', color: '#475569' };
  }
}