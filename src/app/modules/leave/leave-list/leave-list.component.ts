import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { LeaveService } from '../../../core/services/api/leave.api';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { Leave, LeaveFilterDto } from '../../../core/Models/leave.model';
import { LeaveType } from '../../../core/Models/leave-type.model'; 
import Swal from 'sweetalert2';
import { LeaveActionCellRendererComponent } from '../leave-action-cell-renderer.component';
import { LeaveFormComponent } from '../leave-form/leave-form.component';
import { LeaveDetailsComponent } from '../leave-details/leave-details.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-leave-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, LeaveFormComponent, LeaveDetailsComponent],
  templateUrl: './leave-list.component.html',
  styleUrls: ['./leave-list.component.scss']
})
export class LeaveListComponent implements OnInit {
  leaves: Leave[] = [];
  leaveTypes: LeaveType[] = []; 
  loading = false;
  error: string | null = null;
  statistics: { [key: string]: number } = {};

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;

  searchTerm = '';
  showFilters = false;
  filters: LeaveFilterDto = {
    pageNumber: 1, pageSize: 10,
    sortBy: 'AppliedDate', sortDescending: true
  };

  showFormModal = false;
  showDetailsModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedLeaveId: string | null = null;
  Math = Math;

  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true, flex: 1, minWidth: 100 };
  gridOptions: GridOptions = {
    pagination: false, rowSelection: 'multiple',
    suppressRowClickSelection: true, domLayout: 'autoHeight',
    context: { componentParent: this }
  };

  constructor(
    private leaveService: LeaveService,
    private leaveTypeService: LeaveTypeService
  ) {
    this.initColumnDefs();
  }

  ngOnInit(): void {
    this.loadLeaveTypes();
    this.loadLeaves();
    this.loadStatistics();
  }

  initColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'ACTIONS', width: 190, pinned: 'left',
        cellRenderer: LeaveActionCellRendererComponent,
        sortable: false, filter: false, cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'EMPLOYEE', field: 'employeeName', width: 200,
        cellRenderer: (p: { value: string; data: Leave }) => p.value
          ? `<div class="employee-cell"><span class="emp-name">${p.value}</span></div>`
          : ''
      },
      {
        headerName: 'LEAVE TYPE', field: 'leaveTypeName', width: 160,
        cellRenderer: (p: { value: string; data: Leave }) => {
          if (!p.value) return '';
          const c = p.data.leaveTypeColor || '#3b82f6';
          return `<span class="type-badge" style="background:${c}22;color:${c};border:1px solid ${c}44">${p.value}</span>`;
        }
      },
      {
        headerName: 'DATE RANGE', field: 'startDate', width: 230,
        cellRenderer: (p: { value: string; data: Leave }) => {
          const s = new Date(p.value);
          const e = new Date(p.data.endDate);
          const d = p.data.totalDays;
          const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `<div class="date-cell"><span class="date-from">${fmt(s)}</span><span to ${fmt(e)}</span></div>`;
        }
      },
      {
        headerName: 'REASON', field: 'reason', width: 260,
        cellRenderer: (p: { value: string; data: Leave }) => {
          const txt = p.value?.length > 55 ? p.value.substring(0, 55) + '…' : p.value || '';
          const em = p.data.isEmergencyLeave ? '<span class="emergency-tag"></span>' : '';
          return `<div class="reason-cell"><span>${txt}</span>${em}</div>`;
        }
      },
      {
        headerName: 'STATUS', field: 'leaveStatus', width: 130,
        cellRenderer: (p: { value: any; data: Leave }) => {
          const map: Record<string, [string, string]> = {
            '1': ['pending', 'Pending'],
            '2': ['approved', 'Approved'],
            '3': ['rejected', 'Rejected'],
            '4': ['cancelled', 'Cancelled'],
            'Pending': ['pending', 'Pending'],
            'Approved': ['approved', 'Approved'],
            'Rejected': ['rejected', 'Rejected'],
            'Cancelled': ['cancelled', 'Cancelled']
          };
          const [cls, lbl] = map[String(p.value)] ?? ['pending', 'Pending'];
          return `<span class="status-chip ${cls}">${lbl}</span>`;
        }
      },
      {
        headerName: 'APPLIED ON', field: 'appliedDate', width: 140,
        valueFormatter: (p) => p.value
          ? new Date(p.value).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'
      },
      {
        headerName: 'APPROVED BY', field: 'approvedByName', width: 160,
        valueFormatter: (p) => p.value || '—'
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void { params.api.sizeColumnsToFit(); }

  loadLeaveTypes(): void {
    this.leaveTypeService.getActiveLeaveTypes().subscribe({
      next: (r) => { if (r.success) this.leaveTypes = r.data; }
    });
  }

  loadLeaves(): void {
    this.loading = true;
    this.error = null;
    const filter: LeaveFilterDto = {
      ...this.filters,
      searchTerm: this.searchTerm || undefined,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };
    this.leaveService.getFilteredLeaves(filter).subscribe({
      next: (r) => {
        if (r.success) {
          this.leaves = r.data.items;
          this.totalPages = r.data.totalPages;
          this.totalCount = r.data.totalCount;
        } else {
          this.error = r.message || 'Failed to load leaves';
        }
        this.loading = false;
      },
      error: (e) => { this.error = e.error?.message || 'Error loading leaves'; this.loading = false; }
    });
  }

 loadStatistics(): void {
  this.leaveService.getLeaveStatisticsByStatus().subscribe({
    next: (r) => {
      if (r.success) {
        console.log('Statistics keys:', r.data); 
        this.statistics = r.data;
      }
    }
  });
}

  onSearch(): void { this.currentPage = 1; this.loadLeaves(); }
  onFilterChange(): void { this.currentPage = 1; this.loadLeaves(); }
  clearFilters(): void {
    this.searchTerm = '';
    this.filters = { pageNumber: 1, pageSize: 10, sortBy: 'AppliedDate', sortDescending: true };
    this.currentPage = 1;
    this.loadLeaves();
  }

  onPageChange(page: number): void { this.currentPage = page; this.loadLeaves(); }
  onPageSizeChange(e: Event): void { this.pageSize = +(e.target as HTMLSelectElement).value; this.currentPage = 1; this.loadLeaves(); }

  createLeave(): void { this.formMode = 'create'; this.selectedLeaveId = null; this.showFormModal = true; }
  viewDetails(leave: Leave): void { this.selectedLeaveId = leave.id; this.showDetailsModal = true; }
  editLeave(leave: Leave): void { this.formMode = 'edit'; this.selectedLeaveId = leave.id; this.showFormModal = true; }
  closeFormModal(): void { this.showFormModal = false; this.selectedLeaveId = null; }
  closeDetailsModal(): void { this.showDetailsModal = false; this.selectedLeaveId = null; }
  onFormSuccess(): void { this.closeFormModal(); this.loadLeaves(); this.loadStatistics(); }
  onLeaveUpdated(): void { this.loadLeaves(); this.loadStatistics(); }

  async approveLeave(leave: Leave): Promise<void> {
    const r = await Swal.fire({
      title: 'Approve Leave?',
      html: `Approve <strong>${leave.employeeName}</strong>'s leave (${leave.totalDays} days)?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Approve'
    });
    if (!r.isConfirmed) return;
    this.leaveService.approveLeave(leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Approved!', text: 'Leave approved.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to approve', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  async rejectLeave(leave: Leave): Promise<void> {
    const { value: reason } = await Swal.fire({
      title: 'Reject Leave', input: 'textarea',
      inputLabel: 'Reason for rejection', inputPlaceholder: 'Enter reason...',
      showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject', inputValidator: (v) => !v ? 'Reason is required!' : null
    });
    if (!reason) return;
    this.leaveService.rejectLeave(leave.id, reason).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Rejected!', text: 'Leave rejected.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to reject', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  async cancelLeave(leave: Leave): Promise<void> {
    const { value: reason } = await Swal.fire({
      title: 'Cancel Leave', input: 'textarea',
      inputLabel: 'Reason for cancellation', inputPlaceholder: 'Enter reason...',
      showCancelButton: true, confirmButtonColor: '#f59e0b', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Cancel Leave', inputValidator: (v) => !v ? 'Reason is required!' : null
    });
    if (!reason) return;
    this.leaveService.cancelLeave(leave.id, reason).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Cancelled!', text: 'Leave cancelled.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to cancel', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  async deleteLeave(leave: Leave): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete Leave?',
      html: `Delete <strong>${leave.employeeName}'s</strong> leave? This cannot be undone.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });
    if (!r.isConfirmed) return;
    this.leaveService.deleteLeave(leave.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Deleted!', text: 'Leave deleted.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeaves(); this.loadStatistics();
        } else { Swal.fire('Error!', res.message || 'Failed to delete', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  exportToExcel(): void {
    if (!this.leaves.length) { Swal.fire('No Data', 'Nothing to export.', 'info'); return; }
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const data = this.leaves.map(l => ({
      'Employee Code': l.employeeCode || '',
      'Employee Name': l.employeeName || '',
      'Leave Type': l.leaveTypeName || '',
      'Start Date': new Date(l.startDate).toLocaleDateString(),
      'End Date': new Date(l.endDate).toLocaleDateString(),
      'Total Days': l.totalDays,
      'Reason': l.reason,
      'Status': l.leaveStatusName,
      'Emergency': l.isEmergencyLeave ? 'Yes' : 'No',
      'Applied Date': new Date(l.appliedDate).toLocaleDateString(),
      'Approved By': l.approvedByName || '',
      'Rejection Reason': l.rejectionReason || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [10, 20, 15, 12, 12, 10, 30, 12, 10, 12, 18, 20].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leaves');
    const fn = `Leaves_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: 'Done!', text: `${fn} downloaded.`, icon: 'success', timer: 2500, confirmButtonColor: '#3b82f6' });
  }

  get activeFilterCount(): number {
    return [
      this.filters.leaveTypeId,
      this.filters.leaveStatus !== undefined && this.filters.leaveStatus !== null,
      this.filters.startDateFrom,
      this.filters.startDateTo,
      this.filters.appliedDateFrom,
      this.filters.isEmergencyLeave
    ].filter(Boolean).length;
  }

  get pages(): number[] {
    const max = 5;
    let s = Math.max(1, this.currentPage - Math.floor(max / 2));
    const e = Math.min(this.totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }
}