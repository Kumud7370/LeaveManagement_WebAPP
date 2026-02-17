import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { LeaveType, LeaveTypeFilterDto } from '../../../core/Models/leave-type.model';
import Swal from 'sweetalert2';
import { LeaveTypeActionCellRendererComponent } from '../leave-type-action-cell-renderer.component';
import { LeaveTypeFormComponent } from '../leave-type-form/leave-type-form.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-leave-type-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, LeaveTypeFormComponent],
  templateUrl: './leave-type-list.component.html',
  styleUrls: ['./leave-type-list.component.scss']
})
export class LeaveTypeListComponent implements OnInit {
  leaveTypes: LeaveType[] = [];
  loading = false;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;

  // Stats
  activeCount = 0;
  carryForwardCount = 0;
  requiresDocCount = 0;

  // Filters
  searchTerm = '';
  showFilters = false;
  filters: LeaveTypeFilterDto = {
    pageNumber: 1, pageSize: 10,
    sortBy: 'DisplayOrder', sortDescending: false
  };

  // Modal
  showFormModal = false;
  formMode: 'create' | 'edit' = 'create';
  selectedLeaveTypeId: string | null = null;
  Math = Math;

  // AG Grid
  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = { sortable: true, filter: true, resizable: true, flex: 1, minWidth: 100 };
  gridOptions: GridOptions = {
    pagination: false, rowSelection: 'multiple',
    suppressRowClickSelection: true, domLayout: 'autoHeight',
    context: { componentParent: this }
  };

  constructor(private leaveTypeService: LeaveTypeService) {
    this.initColumnDefs();
  }

  ngOnInit(): void {
    this.loadLeaveTypes();
  }

  initColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'ACTIONS', width: 140, pinned: 'left',
        cellRenderer: LeaveTypeActionCellRendererComponent,
        sortable: false, filter: false, cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'ORDER', field: 'displayOrder', width: 90,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: number }) =>
          `<span class="order-badge">${p.value}</span>`
      },
      {
        headerName: 'LEAVE TYPE', field: 'name', width: 220,
        cellRenderer: (p: { value: string; data: LeaveType }) => {
          const dot = `<span class="color-dot" style="background:${p.data.color}"></span>`;
          const code = `<span class="type-code">${p.data.code}</span>`;
          return `<div class="type-name-cell">${dot}<div><span class="type-name">${p.value}</div>`;
        }
      },
      {
        headerName: 'DESCRIPTION', field: 'description', width: 3000,
        cellRenderer: (p: { value: string }) => {
          if (!p.value) return '<span style="color:#94a3b8">—</span>';
          const txt = p.value.length > 60 ? p.value.substring(0, 60) + '…' : p.value;
          return `<span class="description-text">${txt}</span>`;
        }
      },
      {
        headerName: 'MAX DAYS/YEAR', field: 'maxDaysPerYear', width: 150,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: number }) =>
          `<span class="days-badge">${p.value} days</span>`
      },
      {
        headerName: 'CARRY FWD', field: 'isCarryForward', width: 130,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: boolean; data: LeaveType }) => {
          if (!p.value) return '<span class="bool-badge no">No</span>';
          return `<span class="bool-badge yes">${p.data.maxCarryForwardDays} days</span>`;
        }
      },
      {
        headerName: 'APPROVAL', field: 'requiresApproval', width: 120,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: boolean }) =>
          p.value
            ? '<span class="bool-badge yes">Required</span>'
            : '<span class="bool-badge no">Auto</span>'
      },
      {
        headerName: 'DOCUMENT', field: 'requiresDocument', width: 120,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: boolean }) =>
          p.value
            ? '<span class="bool-badge yes">Required</span>'
            : '<span class="bool-badge neutral">Optional</span>'
      },
      {
        headerName: 'NOTICE DAYS', field: 'minimumNoticeDays', width: 130,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: number }) =>
          p.value > 0
            ? `<span class="days-badge">${p.value} days</span>`
            : '<span style="color:#94a3b8">None</span>'
      },
      {
        headerName: 'STATUS', field: 'isActive', width: 110,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (p: { value: boolean }) =>
          p.value
            ? '<span class="status-chip active">Active</span>'
            : '<span class="status-chip inactive">Inactive</span>'
      }
    ];
  }

  onGridReady(params: GridReadyEvent): void { params.api.sizeColumnsToFit(); }

  loadLeaveTypes(): void {
    this.loading = true;
    this.error = null;
    const filter: LeaveTypeFilterDto = {
      ...this.filters,
      searchTerm: this.searchTerm || undefined,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };
    this.leaveTypeService.getFilteredLeaveTypes(filter).subscribe({
      next: (r) => {
        if (r.success) {
          this.leaveTypes = r.data.items;
          this.totalPages = r.data.totalPages;
          this.totalCount = r.data.totalCount;
          this.computeStats();
        } else {
          this.error = r.message || 'Failed to load leave types';
        }
        this.loading = false;
      },
      error: (e) => { this.error = e.error?.message || 'Error loading leave types'; this.loading = false; }
    });
  }

  computeStats(): void {
    this.activeCount       = this.leaveTypes.filter(lt => lt.isActive).length;
    this.carryForwardCount = this.leaveTypes.filter(lt => lt.isCarryForward).length;
    this.requiresDocCount  = this.leaveTypes.filter(lt => lt.requiresDocument).length;
  }

  onSearch(): void { this.currentPage = 1; this.loadLeaveTypes(); }
  onFilterChange(): void { this.currentPage = 1; this.loadLeaveTypes(); }
  clearFilters(): void {
    this.searchTerm = '';
    this.filters = { pageNumber: 1, pageSize: 10, sortBy: 'DisplayOrder', sortDescending: false };
    this.currentPage = 1;
    this.loadLeaveTypes();
  }

  onPageChange(page: number): void { this.currentPage = page; this.loadLeaveTypes(); }
  onPageSizeChange(e: Event): void { this.pageSize = +(e.target as HTMLSelectElement).value; this.currentPage = 1; this.loadLeaveTypes(); }

  createLeaveType(): void { this.formMode = 'create'; this.selectedLeaveTypeId = null; this.showFormModal = true; }
  editLeaveType(lt: LeaveType): void { this.formMode = 'edit'; this.selectedLeaveTypeId = lt.id; this.showFormModal = true; }
  closeFormModal(): void { this.showFormModal = false; this.selectedLeaveTypeId = null; }
  onFormSuccess(): void { this.closeFormModal(); this.loadLeaveTypes(); }

  async toggleStatus(lt: LeaveType): Promise<void> {
    const action = lt.isActive ? 'deactivate' : 'activate';
    const r = await Swal.fire({
      title: `${lt.isActive ? 'Deactivate' : 'Activate'} Leave Type?`,
      html: `${lt.isActive ? 'Deactivate' : 'Activate'} <strong>${lt.name}</strong>?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: lt.isActive ? '#6366f1' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it!`
    });
    if (!r.isConfirmed) return;
    this.leaveTypeService.toggleLeaveTypeStatus(lt.id, !lt.isActive).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Done!', text: `Leave type ${action}d.`, icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeaveTypes();
        } else {
          Swal.fire('Error!', res.message || `Failed to ${action}`, 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  async deleteLeaveType(lt: LeaveType): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete Leave Type?',
      html: `Delete <strong>${lt.name}</strong>? This cannot be undone.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });
    if (!r.isConfirmed) return;
    this.leaveTypeService.deleteLeaveType(lt.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Deleted!', text: 'Leave type deleted.', icon: 'success', timer: 2000, confirmButtonColor: '#3b82f6' });
          this.loadLeaveTypes();
        } else {
          Swal.fire('Error!', res.message || 'Failed to delete', 'error');
        }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  exportToExcel(): void {
    if (!this.leaveTypes.length) { Swal.fire('No Data', 'Nothing to export.', 'info'); return; }
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const data = this.leaveTypes.map(lt => ({
      'Order': lt.displayOrder, 'Name': lt.name, 'Code': lt.code,
      'Description': lt.description, 'Max Days/Year': lt.maxDaysPerYear,
      'Carry Forward': lt.isCarryForward ? 'Yes' : 'No',
      'Max Carry Forward Days': lt.maxCarryForwardDays,
      'Requires Approval': lt.requiresApproval ? 'Yes' : 'No',
      'Requires Document': lt.requiresDocument ? 'Yes' : 'No',
      'Min Notice Days': lt.minimumNoticeDays, 'Color': lt.color,
      'Status': lt.isActive ? 'Active' : 'Inactive',
      'Created': new Date(lt.createdAt).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [8,20,12,35,14,14,20,16,16,14,10,10,14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Types');
    const fn = `LeaveTypes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: 'Done!', text: `${fn} downloaded.`, icon: 'success', timer: 2500, confirmButtonColor: '#3b82f6' });
  }

  get activeFilterCount(): number {
    return [
      this.filters.isActive !== null && this.filters.isActive !== undefined,
      this.filters.requiresApproval !== null && this.filters.requiresApproval !== undefined,
      this.filters.requiresDocument !== null && this.filters.requiresDocument !== undefined,
      this.filters.isCarryForward !== null && this.filters.isCarryForward !== undefined
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