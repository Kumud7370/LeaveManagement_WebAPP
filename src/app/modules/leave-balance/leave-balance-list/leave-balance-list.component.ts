import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { LeaveBalanceService } from '../../../core/services/api/leave-balance.api';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { LeaveBalance, LeaveBalanceFilterDto, AdjustLeaveBalanceDto } from '../../../core/Models/leave-balance.model';
import { LeaveType } from '../../../core/Models/leave-type.model';
import Swal from 'sweetalert2';
import { LeaveBalanceActionCellRendererComponent } from '../leave-balance-action-cell-renderer.component';
import { LeaveBalanceFormComponent } from '../leave-balance-form/leave-balance-form.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-leave-balance-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, LeaveBalanceFormComponent],
  templateUrl: './leave-balance-list.component.html',
  styleUrls: ['./leave-balance-list.component.scss']
})
export class LeaveBalanceListComponent implements OnInit {
  balances: LeaveBalance[] = [];
  leaveTypes: LeaveType[] = [];
  loading = false;
  error: string | null = null;

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;

  searchTerm = '';
  showFilters = false;
  selectedYear = new Date().getFullYear();
  yearOptions: number[] = [];

  filters: LeaveBalanceFilterDto = {
    pageNumber: 1, pageSize: 10,
    sortBy: 'year', sortDescending: true
  };

  showFormModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedBalanceId: string | null = null;
  Math = Math;

  // Stats
  totalEmployeesWithBalance = 0;
  lowBalanceCount = 0;
  totalAvailableDays = 0;
  avgUtilization = 0;

  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true, flex: 1, minWidth: 100 };
  gridOptions: GridOptions = {
    pagination: false, rowSelection: 'multiple',
    suppressRowClickSelection: true, domLayout: 'autoHeight',
    context: { componentParent: this }
  };

  constructor(
    private leaveBalanceService: LeaveBalanceService,
    private leaveTypeService: LeaveTypeService
  ) {
    this.buildYearOptions();
    this.initColumnDefs();
  }

  ngOnInit(): void {
    this.loadLeaveTypes();
    this.loadBalances();
  }

  buildYearOptions(): void {
    const current = new Date().getFullYear();
    for (let y = current + 1; y >= current - 3; y--) {
      this.yearOptions.push(y);
    }
  }

  initColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'ACTIONS', width: 180, pinned: 'left',
        cellRenderer: LeaveBalanceActionCellRendererComponent,
        sortable: false, filter: false, cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'EMPLOYEE', field: 'employeeName', width: 210,
        cellRenderer: (p: { value: string; data: LeaveBalance }) => p.value
          ? `<div class="employee-cell">
               <span class="emp-name">${p.value}</span>
               <span class="emp-code">${p.data.employeeCode || ''}</span>
             </div>`
          : ''
      },
      {
        headerName: 'LEAVE TYPE', field: 'leaveTypeName', width: 160,
        cellRenderer: (p: { value: string; data: LeaveBalance }) => {
          if (!p.value) return '';
          const c = p.data.leaveTypeColor || '#3b82f6';
          return `<span class="type-badge" style="background:${c}22;color:${c};border:1px solid ${c}44">${p.value}</span>`;
        }
      },
      {
        headerName: 'YEAR', field: 'year', width: 90,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: number; data: LeaveBalance }) =>
          p.data.isCurrentYear
            ? `<span class="year-badge current">${p.value}</span>`
            : `<span class="year-badge">${p.value}</span>`
      },
      {
        headerName: 'ALLOCATED', field: 'totalAllocated', width: 120,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: number; data: LeaveBalance }) =>
          `<span class="days-chip allocated">${p.value + (p.data.carriedForward || 0)} days</span>`
      },
      {
        headerName: 'CONSUMED', field: 'consumed', width: 120,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: number }) =>
          `<span class="days-chip consumed">${p.value} days</span>`
      },
      {
        headerName: 'CARRY FWD', field: 'carriedForward', width: 120,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: number }) =>
          p.value > 0
            ? `<span class="days-chip carry">${p.value} days</span>`
            : `<span style="color:#94a3b8">—</span>`
      },
      {
        headerName: 'AVAILABLE', field: 'available', width: 120,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: number; data: LeaveBalance }) => {
          const cls = p.data.isLowBalance ? 'available low' : 'available';
          const icon = p.data.isLowBalance ? ' <i class="bi bi-exclamation-triangle-fill"></i>' : '';
          return `<span class="days-chip ${cls}">${p.value} days${icon}</span>`;
        }
      },
      {
        headerName: 'UTILIZATION', field: 'utilizationPercentage', width: 160,
        cellRenderer: (p: { value: number }) => {
          const pct = Math.round(p.value);
          const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
          return `<div class="utilization-cell">
            <div class="util-bar-bg">
              <div class="util-bar-fill" style="width:${Math.min(pct,100)}%;background:${color}"></div>
            </div>
            <span class="util-pct" style="color:${color}">${pct}%</span>
          </div>`;
        }
      },
      {
        headerName: 'LAST UPDATED', field: 'lastUpdated', width: 150,
        valueFormatter: (p) => p.value
          ? new Date(p.value).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—'
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void { params.api.sizeColumnsToFit(); }

  loadLeaveTypes(): void {
    this.leaveTypeService.getActiveLeaveTypes().subscribe({
      next: (r) => { if (r.success) this.leaveTypes = r.data; }
    });
  }

  loadBalances(): void {
    this.loading = true;
    this.error = null;
    const filter: LeaveBalanceFilterDto = {
      ...this.filters,
      year: this.selectedYear || undefined,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };
    this.leaveBalanceService.getFilteredLeaveBalances(filter).subscribe({
      next: (r) => {
        if (r.success) {
          this.balances = r.data.items;
          this.totalPages = r.data.totalPages;
          this.totalCount = r.data.totalCount;
          this.computeStats();
        } else {
          this.error = r.message || 'Failed to load balances';
        }
        this.loading = false;
      },
      error: (e) => { this.error = e.error?.message || 'Error loading balances'; this.loading = false; }
    });
  }

  computeStats(): void {
    const unique = new Set(this.balances.map(b => b.employeeId));
    this.totalEmployeesWithBalance = unique.size;
    this.lowBalanceCount = this.balances.filter(b => b.isLowBalance).length;
    this.totalAvailableDays = this.balances.reduce((s, b) => s + b.available, 0);
    const total = this.balances.reduce((s, b) => s + b.utilizationPercentage, 0);
    this.avgUtilization = this.balances.length ? Math.round(total / this.balances.length) : 0;
  }

  onYearChange(): void { this.currentPage = 1; this.loadBalances(); }
  onFilterChange(): void { this.currentPage = 1; this.loadBalances(); }
  clearFilters(): void {
    this.filters = { pageNumber: 1, pageSize: 10, sortBy: 'year', sortDescending: true };
    this.selectedYear = new Date().getFullYear();
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadBalances();
  }

  onPageChange(page: number): void { this.currentPage = page; this.loadBalances(); }
  onPageSizeChange(e: Event): void {
    this.pageSize = +(e.target as HTMLSelectElement).value;
    this.currentPage = 1;
    this.loadBalances();
  }

  createBalance(): void { this.formMode = 'create'; this.selectedBalanceId = null; this.showFormModal = true; }
  editBalance(balance: LeaveBalance): void { this.formMode = 'edit'; this.selectedBalanceId = balance.id; this.showFormModal = true; }
  closeFormModal(): void { this.showFormModal = false; this.selectedBalanceId = null; }
  onFormSuccess(): void { this.closeFormModal(); this.loadBalances(); }

  async adjustBalance(balance: LeaveBalance): Promise<void> {
    const { value: formValues } = await Swal.fire({
      title: `Adjust Balance`,
      html: `
        <p style="margin-bottom:1rem;color:#64748b;font-size:.9rem">
          Adjusting <strong>${balance.employeeName}</strong> — ${balance.leaveTypeName} (${balance.year})
        </p>
        <input id="swal-amount" type="number" step="0.5" placeholder="Days (+ add / - deduct)"
          class="swal2-input" style="width:100%">
        <textarea id="swal-reason" placeholder="Reason for adjustment" rows="3"
          class="swal2-textarea" style="width:100%"></textarea>
      `,
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Apply',
      focusConfirm: false,
      preConfirm: () => {
        const amount = parseFloat((document.getElementById('swal-amount') as HTMLInputElement).value);
        const reason = (document.getElementById('swal-reason') as HTMLTextAreaElement).value.trim();
        if (isNaN(amount) || amount === 0) { Swal.showValidationMessage('Enter a non-zero amount'); return false; }
        if (!reason) { Swal.showValidationMessage('Reason is required'); return false; }
        return { amount, reason };
      }
    });
    if (!formValues) return;
    const dto: AdjustLeaveBalanceDto = {
      adjustmentAmount: formValues.amount,
      adjustmentReason: formValues.reason,
      adjustmentType: 'Manual'
    };
    this.leaveBalanceService.adjustLeaveBalance(balance.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Adjusted!', text: 'Balance updated.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadBalances();
        } else {
          Swal.fire('Error!', res.message || 'Failed to adjust', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  async recalculateBalance(balance: LeaveBalance): Promise<void> {
    const r = await Swal.fire({
      title: 'Recalculate Balance?',
      html: `Recalculate <strong>${balance.employeeName}'s</strong> ${balance.leaveTypeName} balance for ${balance.year}?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#0284c7', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Recalculate'
    });
    if (!r.isConfirmed) return;
    this.leaveBalanceService.recalculateBalance(balance.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Done!', text: 'Balance recalculated.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadBalances();
        } else {
          Swal.fire('Error!', res.message || 'Failed to recalculate', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  async deleteBalance(balance: LeaveBalance): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete Balance?',
      html: `Delete <strong>${balance.employeeName}'s</strong> ${balance.leaveTypeName} balance for ${balance.year}? This cannot be undone.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });
    if (!r.isConfirmed) return;
    this.leaveBalanceService.deleteLeaveBalance(balance.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Deleted!', text: 'Balance deleted.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadBalances();
        } else {
          Swal.fire('Error!', res.message || 'Failed to delete', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  async initializeEmployee(): Promise<void> {
    const { value: employeeId } = await Swal.fire({
      title: 'Initialize Employee Balances',
      input: 'text',
      inputLabel: 'Employee ID',
      inputPlaceholder: 'Enter employee ID...',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Initialize',
      inputValidator: (v) => !v ? 'Employee ID is required!' : null
    });
    if (!employeeId) return;
    this.leaveBalanceService.initializeBalanceForEmployee(employeeId, this.selectedYear).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Done!', text: 'Balances initialized.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadBalances();
        } else {
          Swal.fire('Error!', res.message || 'Failed to initialize', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  exportToExcel(): void {
    if (!this.balances.length) { Swal.fire('No Data', 'Nothing to export.', 'info'); return; }
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const data = this.balances.map(b => ({
      'Employee Code':      b.employeeCode || '',
      'Employee Name':      b.employeeName || '',
      'Leave Type':         b.leaveTypeName || '',
      'Year':               b.year,
      'Total Allocated':    b.totalAllocated,
      'Carried Forward':    b.carriedForward,
      'Consumed':           b.consumed,
      'Available':          b.available,
      'Utilization %':      Math.round(b.utilizationPercentage),
      'Low Balance':        b.isLowBalance ? 'Yes' : 'No',
      'Current Year':       b.isCurrentYear ? 'Yes' : 'No',
      'Last Updated':       new Date(b.lastUpdated).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [12, 22, 16, 8, 14, 14, 12, 12, 14, 12, 12, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Balances');
    const fn = `LeaveBalances_${this.selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: 'Done!', text: `${fn} downloaded.`, icon: 'success', timer: 2500, confirmButtonColor: '#3b82f6' });
  }

  get activeFilterCount(): number {
    return [
      this.filters.leaveTypeId,
      this.filters.isLowBalance,
      this.filters.minAvailableBalance !== undefined && this.filters.minAvailableBalance !== null,
      this.filters.maxAvailableBalance !== undefined && this.filters.maxAvailableBalance !== null
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