// =============================================
// attendance-list.component.ts
// Admin / Manager: filterable AG-Grid list
// with approve, delete, manual mark actions
// =============================================

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef, GridApi, GridReadyEvent, GridOptions, ICellRendererParams
} from 'ag-grid-community';
import Swal from 'sweetalert2';

import { AttendanceService } from '../../../core/services/api/attendance.api';
import {
  AttendanceResponseDto,
  AttendanceFilterDto,
  AttendanceStatus,
  CheckInMethod
} from '../../../core/Models/attendance.model';
import { AttendanceDetailsComponent } from '../attendance-details/attendance-details.component';
import { ManualAttendanceFormComponent } from '../manual-attendance-form/manual-attendance-form.component';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    AttendanceDetailsComponent,
    ManualAttendanceFormComponent
  ],
  templateUrl: './attendance-list.component.html',
  styleUrls: ['./attendance-list.component.scss']
})
export class AttendanceListComponent implements OnInit {
  private gridApi!: GridApi;
  rowData: AttendanceResponseDto[] = [];
  loading = false;

  // Sidebar
  showDetails = false;
  showForm = false;
  selectedAttendanceId: string | null = null;
  editingRecord: AttendanceResponseDto | null = null;

  // Filters
  filter: AttendanceFilterDto = {
    pageNumber: 1,
    pageSize: 1000,
    sortBy: 'AttendanceDate',
    sortDescending: true
  };
  searchEmployeeId = '';
  selectedStatus: AttendanceStatus | '' = '';
  startDate = '';
  endDate = '';

  AttendanceStatus = AttendanceStatus;
  statistics: { [key: string]: number } = {};

  // ---- Column Definitions ----
  columnDefs: ColDef[] = [
    {
      field: 'employeeCode', headerName: 'Emp Code',
      width: 110, sortable: true, filter: true
    },
    {
      field: 'employeeName', headerName: 'Employee',
      flex: 1, minWidth: 150, sortable: true, filter: true
    },
    {
      field: 'attendanceDate', headerName: 'Date',
      width: 130, sortable: true,
      valueFormatter: p => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—'
    },
    {
      field: 'checkInTime', headerName: 'Check In',
      width: 110,
      valueFormatter: p => p.value
        ? new Date(p.value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '—'
    },
    {
      field: 'checkOutTime', headerName: 'Check Out',
      width: 110,
      valueFormatter: p => p.value
        ? new Date(p.value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '—'
    },
    {
      field: 'workingHours', headerName: 'Hours',
      width: 90, sortable: true,
      valueFormatter: p => p.value != null ? `${(+p.value).toFixed(1)}h` : '—',
      cellStyle: { textAlign: 'center' }
    },
    {
      field: 'status', headerName: 'Status',
      width: 130, sortable: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: ICellRendererParams) => {
        const status: AttendanceStatus = params.value;
        const label = params.data?.statusName ?? '';
        const styleMap: Record<number, { bg: string; color: string; border: string }> = {
          [AttendanceStatus.Present]:      { bg: '#dcfce7', color: '#14532d', border: '#86efac' },
          [AttendanceStatus.Absent]:       { bg: '#fee2e2', color: '#7f1d1d', border: '#fca5a5' },
          [AttendanceStatus.HalfDay]:      { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
          [AttendanceStatus.Leave]:        { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
          [AttendanceStatus.Holiday]:      { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
          [AttendanceStatus.WeekOff]:      { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
          [AttendanceStatus.WorkFromHome]: { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
          [AttendanceStatus.OnDuty]:       { bg: '#fff7ed', color: '#9a3412', border: '#fdba74' }
        };
        const s = styleMap[status] ?? styleMap[AttendanceStatus.Absent];
        return `<span style="display:inline-flex;align-items:center;padding:0.3rem 0.75rem;
                              border-radius:2rem;font-size:0.78rem;font-weight:700;
                              background:${s.bg};color:${s.color};border:1px solid ${s.border};">
                  ${label}
                </span>`;
      }
    },
    {
      field: 'isLate', headerName: 'Late',
      width: 80, sortable: true,
      cellStyle: { textAlign: 'center' },
      cellRenderer: (p: ICellRendererParams) =>
        p.value
          ? `<span style="color:#d97706;font-weight:700;font-size:0.78rem;">+${p.data?.lateMinutes ?? 0}m</span>`
          : `<span style="color:#94a3b8;font-size:0.78rem;">—</span>`
    },
    {
      field: 'checkInMethodName', headerName: 'Method',
      width: 110,
      cellStyle: { color: '#64748b', fontSize: '0.82rem' }
    },
    {
      headerName: 'Actions', width: 180,
      sortable: false, filter: false,
      pinned: 'left',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' },
      cellRenderer: (params: ICellRendererParams) => {
        if (!params.data) return '';
        const viewBtn = `<button data-action="view" title="View"
          style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;cursor:pointer;
                 display:inline-flex;align-items:center;justify-content:center;
                 background:#dbeafe;color:#1e40af;font-size:0.82rem;">
          <i class="fas fa-eye" style="pointer-events:none"></i></button>`;
        const editBtn = `<button data-action="edit" title="Edit"
          style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;cursor:pointer;
                 display:inline-flex;align-items:center;justify-content:center;
                 background:#fef3c7;color:#92400e;font-size:0.82rem;">
          <i class="fas fa-edit" style="pointer-events:none"></i></button>`;
        const approveBtn = !params.data.approvedBy ? `<button data-action="approve" title="Approve"
          style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;cursor:pointer;
                 display:inline-flex;align-items:center;justify-content:center;
                 background:#d1fae5;color:#065f46;font-size:0.82rem;">
          <i class="fas fa-check" style="pointer-events:none"></i></button>` : '';
        const deleteBtn = `<button data-action="delete" title="Delete"
          style="width:1.9rem;height:1.9rem;border:none;border-radius:0.375rem;cursor:pointer;
                 display:inline-flex;align-items:center;justify-content:center;
                 background:#fee2e2;color:#991b1b;font-size:0.82rem;">
          <i class="fas fa-trash" style="pointer-events:none"></i></button>`;
        return `<div style="display:flex;gap:0.35rem;align-items:center;height:100%;">
                  ${viewBtn}${editBtn}${approveBtn}${deleteBtn}</div>`;
      }
    }
  ];

  gridOptions: GridOptions = {
    rowHeight: 50,
    headerHeight: 44,
    defaultColDef: { resizable: true },
    animateRows: true,
    rowSelection: 'single',
    suppressRowClickSelection: true,
    suppressCellFocus: true,
    onCellClicked: (event: any) => {
      const target = event.event?.target as HTMLElement;
      const action = (target?.closest ? target.closest('[data-action]') as HTMLElement : null)
        ?.getAttribute('data-action');
      if (!action || !event.data) return;
      const record: AttendanceResponseDto = event.data;
      switch (action) {
        case 'view':    this.viewDetails(record);     break;
        case 'edit':    this.openEditForm(record);    break;
        case 'approve': this.approveRecord(record);  break;
        case 'delete':  this.deleteRecord(record);   break;
      }
    }
  };

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    // Set default 30-day range
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    this.endDate = today.toISOString().substring(0, 10);
    this.startDate = thirtyDaysAgo.toISOString().substring(0, 10);
    this.loadAttendance();
    this.loadStats();
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  loadAttendance(): void {
    this.loading = true;
    const f: AttendanceFilterDto = {
      ...this.filter,
      employeeId: this.searchEmployeeId || undefined,
      status: this.selectedStatus !== '' ? (this.selectedStatus as AttendanceStatus) : undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined
    };
    this.attendanceService.getFilteredAttendance(f).subscribe({
      next: (r) => {
        if (r.success) this.rowData = r.data.items;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadStats(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    this.attendanceService.getStatistics(
      thirtyDaysAgo.toISOString().substring(0, 10),
      today.toISOString().substring(0, 10)
    ).subscribe({
      next: (r) => { if (r.success) this.statistics = r.data; }
    });
  }

  onClearFilters(): void {
    this.searchEmployeeId = '';
    this.selectedStatus = '';
    this.filter.pageNumber = 1;
    this.loadAttendance();
  }

  exportData(): void {
    if (!this.rowData.length) {
      Swal.fire('No Data', 'Nothing to export.', 'info');
      return;
    }
    const headers = ['Emp Code', 'Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Late', 'Method'];
    const rows = this.rowData.map(r => [
      r.employeeCode,
      r.employeeName,
      r.attendanceDate ? new Date(r.attendanceDate).toLocaleDateString('en-GB') : '',
      r.checkInTime   ? new Date(r.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      r.checkOutTime  ? new Date(r.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      r.workingHours != null ? (+r.workingHours).toFixed(1) : '',
      r.statusName,
      r.isLate ? `+${r.lateMinutes}m` : '',
      r.checkInMethodName ?? ''
    ]);
    const csv = [headers, ...rows].map(row =>
      row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  viewDetails(record: AttendanceResponseDto): void {
    this.selectedAttendanceId = record.id;
    this.showDetails = true;
    this.showForm = false;
  }

  openEditForm(record: AttendanceResponseDto): void {
    this.editingRecord = record;
    this.showForm = true;
    this.showDetails = false;
  }

  openCreateForm(): void {
    this.editingRecord = null;
    this.showForm = true;
    this.showDetails = false;
  }

  async approveRecord(record: AttendanceResponseDto): Promise<void> {
    const res = await Swal.fire({
      title: 'Approve Attendance?',
      html: `Approve <strong>${record.employeeName}</strong>'s attendance for ${new Date(record.attendanceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Approve'
    });
    if (!res.isConfirmed) return;
    this.attendanceService.approveAttendance(record.id).subscribe({
      next: (r) => {
        if (r.success) {
          Swal.fire({ title: 'Approved!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadAttendance();
        } else {
          Swal.fire('Error!', r.message, 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  async deleteRecord(record: AttendanceResponseDto): Promise<void> {
    const res = await Swal.fire({
      title: 'Delete Attendance?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete'
    });
    if (!res.isConfirmed) return;
    this.attendanceService.deleteAttendance(record.id).subscribe({
      next: (r) => {
        if (r.success) {
          Swal.fire({ title: 'Deleted!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadAttendance();
          this.loadStats();
        } else {
          Swal.fire('Error!', r.message, 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  onRecordSaved(): void {
    this.showForm = false;
    this.editingRecord = null;
    this.loadAttendance();
    this.loadStats();
  }

  onSidebarClose(): void {
    this.showDetails = false;
    this.showForm = false;
    this.selectedAttendanceId = null;
    this.editingRecord = null;
  }

  onRecordUpdated(): void {
    this.loadAttendance();
    this.loadStats();
  }

  getStatCount(key: string): number {
    return this.statistics[key] ?? 0;
  }
}