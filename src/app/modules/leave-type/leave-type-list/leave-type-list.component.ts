import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi, GridReadyEvent, ColDef,
  ModuleRegistry, AllCommunityModule, themeQuartz
} from 'ag-grid-community';
import Swal from 'sweetalert2';
import { LeaveTypeService } from '../../../core/services/api/leave-type.api';
import { LeaveType, LeaveTypeFilterDto } from '../../../core/Models/leave-type.model';
import { PaginationManager, PagedResultDto } from '../../../core/Models/pagination.model';
import { LeaveTypeActionCellRendererComponent } from '../leave-type-action-cell-renderer.component';
import { LeaveTypeFormComponent } from '../leave-type-form/leave-type-form.component';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const leaveTypeGridTheme = themeQuartz.withParams({
  backgroundColor:                '#ffffff',
  foregroundColor:                '#1f2937',
  borderColor:                    '#e5e7eb',
  headerBackgroundColor:          '#ffffff',
  headerTextColor:                '#374151',
  oddRowBackgroundColor:          '#ffffff',
  rowHoverColor:                  '#f8faff',
  selectedRowBackgroundColor:     '#dbeafe',
  fontFamily:                     '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize:                       13,
  columnBorder:                   true,
  headerColumnBorder:             true,
  headerColumnBorderHeight:       '50%',
  headerColumnResizeHandleColor:  '#9ca3af',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth:  2,
  cellHorizontalPaddingScale:     0.8,
});

@Component({
  selector: 'app-leave-type-list',
  standalone: true,
  templateUrl: './leave-type-list.component.html',
  styleUrls: ['./leave-type-list.component.scss'],
  imports: [CommonModule, FormsModule, AgGridAngular, LeaveTypeFormComponent]
})
export class LeaveTypeListComponent implements OnInit {

  readonly gridTheme = leaveTypeGridTheme;

  leaveTypes: LeaveType[] = [];
  gridApi!: GridApi;
  context = { componentParent: this };

  loading = false;
  error: string | null = null;

  // Pagination
  paginationManager = new PaginationManager(1, 10);
  pagedResult: PagedResultDto<LeaveType> | null = null;
  pageSizeOptions = [5, 10, 20, 50, 100];

  // Stats
  activeCount       = 0;
  carryForwardCount = 0;
  requiresDocCount  = 0;

  // Filters
  searchTerm  = '';
  showFilters = false;
  filters: LeaveTypeFilterDto = {
    pageNumber: 1, pageSize: 10, sortBy: 'DisplayOrder', sortDescending: false
  };

  // Modal
  showFormModal       = false;
  formMode: 'create' | 'edit' = 'create';
  selectedLeaveTypeId: string | null = null;

  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true, resizable: true, minWidth: 80
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      width: 130, minWidth: 130, maxWidth: 130,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      cellClass: 'actions-cell',
      cellRenderer: LeaveTypeActionCellRendererComponent,
      suppressSizeToFit: true
    },
    {
      headerName: 'Order', field: 'displayOrder', width: 90, minWidth: 80,
      cellRenderer: (p: any) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;
          background:#f1f5f9;border-radius:6px;font-size:12px;font-weight:700;color:#475569;">${p.value}</span>`
    },
    {
      headerName: 'Leave Type', field: 'name', width: 220, minWidth: 180,
      cellRenderer: (p: any) => {
        const color = p.data?.color || '#3b82f6';
        const code  = p.data?.code  || '';
        return `<div style="display:flex;align-items:center;gap:8px;height:100%;">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block;"></span>
          <div style="display:flex;flex-direction:column;justify-content:center;line-height:1.3;">
            <span style="font-weight:600;font-size:13px;color:#1f2937;">${p.value}</span>
            <span style="font-size:11px;color:#6b7280;font-family:monospace;background:#f3f4f6;
              padding:1px 4px;border-radius:3px;width:fit-content;">${code}</span>
          </div>
        </div>`;
      }
    },
    {
      headerName: 'Description', field: 'description', width: 260, minWidth: 180,
      cellRenderer: (p: any) => {
        if (!p.value) return '<span style="color:#9ca3af;">—</span>';
        const txt = p.value.length > 55 ? p.value.substring(0, 55) + '…' : p.value;
        return `<span style="font-size:13px;color:#6b7280;">${txt}</span>`;
      }
    },
    {
      headerName: 'Max Days/Year', field: 'maxDaysPerYear', width: 140, minWidth: 120,
      cellRenderer: (p: any) =>
        `<span style="display:inline-flex;align-items:center;padding:3px 8px;background:#eff6ff;
          color:#1d4ed8;border-radius:6px;font-size:12px;font-weight:600;">${p.value} days</span>`
    },
    {
      headerName: 'Carry Fwd', field: 'isCarryForward', width: 120, minWidth: 100,
      cellRenderer: (p: any) => !p.value
        ? `<span style="display:inline-flex;padding:3px 10px;background:#f1f5f9;color:#6b7280;
            border-radius:9999px;font-size:12px;font-weight:600;">No</span>`
        : `<span style="display:inline-flex;padding:3px 10px;background:#dcfce7;color:#15803d;
            border-radius:9999px;font-size:12px;font-weight:600;">${p.data?.maxCarryForwardDays} days</span>`
    },
    {
      headerName: 'Approval', field: 'requiresApproval', width: 120, minWidth: 100,
      cellRenderer: (p: any) => p.value
        ? `<span style="display:inline-flex;padding:3px 10px;background:#dcfce7;color:#15803d;
            border-radius:9999px;font-size:12px;font-weight:600;">Required</span>`
        : `<span style="display:inline-flex;padding:3px 10px;background:#f1f5f9;color:#6b7280;
            border-radius:9999px;font-size:12px;font-weight:600;">Auto</span>`
    },
    {
      headerName: 'Document', field: 'requiresDocument', width: 120, minWidth: 100,
      cellRenderer: (p: any) => p.value
        ? `<span style="display:inline-flex;padding:3px 10px;background:#dcfce7;color:#15803d;
            border-radius:9999px;font-size:12px;font-weight:600;">Required</span>`
        : `<span style="display:inline-flex;padding:3px 10px;background:#fef9c3;color:#854d0e;
            border-radius:9999px;font-size:12px;font-weight:600;">Optional</span>`
    },
    {
      headerName: 'Notice Days', field: 'minimumNoticeDays', width: 120, minWidth: 100,
      cellRenderer: (p: any) => p.value > 0
        ? `<span style="display:inline-flex;padding:3px 8px;background:#eff6ff;color:#1d4ed8;
            border-radius:6px;font-size:12px;font-weight:600;">${p.value} days</span>`
        : `<span style="color:#9ca3af;">None</span>`
    },
    {
      headerName: 'Status', field: 'isActive', width: 110, minWidth: 100,
      cellRenderer: (p: any) => p.value
        ? `<span style="display:inline-flex;padding:3px 10px;background:#dcfce7;color:#166534;
            border-radius:9999px;font-size:12px;font-weight:600;">Active</span>`
        : `<span style="display:inline-flex;padding:3px 10px;background:#fee2e2;color:#991b1b;
            border-radius:9999px;font-size:12px;font-weight:600;">Inactive</span>`
    }
  ];

  constructor(
    private leaveTypeService: LeaveTypeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.loadLeaveTypes(); }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
  }

  get currentPage(): number  { return this.paginationManager.pageNumber; }
  get pageSize(): number     { return this.paginationManager.pageSize; }
  get totalPages(): number   { return this.pagedResult?.totalPages   ?? 0; }
  get totalCount(): number   { return this.pagedResult?.totalCount   ?? 0; }
  get hasNextPage(): boolean { return this.pagedResult?.hasNextPage  ?? false; }
  get hasPrevPage(): boolean { return this.pagedResult?.hasPreviousPage ?? false; }
  get showingFrom(): number  { return this.totalCount === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get showingTo(): number    { return Math.min(this.currentPage * this.pageSize, this.totalCount); }

  get pages(): number[] {
    const max = 5, cur = this.currentPage, total = this.totalPages;
    let s = Math.max(1, cur - Math.floor(max / 2));
    const e = Math.min(total, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }

  loadLeaveTypes(): void {
    this.loading = true; this.error = null;
    const filter: LeaveTypeFilterDto = {
      ...this.filters,
      searchTerm: this.searchTerm || undefined,
      pageNumber: this.paginationManager.pageNumber,
      pageSize:   this.paginationManager.pageSize
    };
    this.leaveTypeService.getFilteredLeaveTypes(filter).subscribe({
      next: (r) => {
        this.loading = false;
        if (r.success) {
          this.pagedResult = new PagedResultDto<LeaveType>({
            items: r.data.items, totalCount: r.data.totalCount,
            pageNumber: this.paginationManager.pageNumber,
            pageSize:   this.paginationManager.pageSize
          });
          this.leaveTypes = this.pagedResult.items;
          this.computeStats();
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.leaveTypes);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
        } else { this.error = r.message || 'Failed to load leave types'; }
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.loading = false;
        this.error = e.error?.message || 'Error loading leave types';
        this.cdr.detectChanges();
      }
    });
  }

  computeStats(): void {
    this.activeCount       = this.leaveTypes.filter(lt => lt.isActive).length;
    this.carryForwardCount = this.leaveTypes.filter(lt => lt.isCarryForward).length;
    this.requiresDocCount  = this.leaveTypes.filter(lt => lt.requiresDocument).length;
  }

  onSearch(): void       { this.paginationManager.goToPage(1); this.loadLeaveTypes(); }
  onFilterChange(): void { this.paginationManager.goToPage(1); this.loadLeaveTypes(); }

  clearFilters(): void {
    this.searchTerm = '';
    this.filters    = { pageNumber: 1, pageSize: 10, sortBy: 'DisplayOrder', sortDescending: false };
    this.paginationManager.goToPage(1);
    this.loadLeaveTypes();
  }

  get activeFilterCount(): number {
    return [
      this.filters.isActive         !== null && this.filters.isActive         !== undefined,
      this.filters.requiresApproval !== null && this.filters.requiresApproval !== undefined,
      this.filters.requiresDocument !== null && this.filters.requiresDocument !== undefined,
      this.filters.isCarryForward   !== null && this.filters.isCarryForward   !== undefined
    ].filter(Boolean).length;
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.paginationManager.goToPage(page);
    this.loadLeaveTypes();
  }

  onPageSizeChange(size: number): void {
    this.paginationManager.setPageSize(Number(size));
    this.loadLeaveTypes();
  }

  createLeaveType(): void { this.formMode = 'create'; this.selectedLeaveTypeId = null; this.showFormModal = true; }
  editLeaveType(lt: LeaveType): void { this.formMode = 'edit'; this.selectedLeaveTypeId = lt.id; this.showFormModal = true; }
  closeFormModal(): void { this.showFormModal = false; this.selectedLeaveTypeId = null; }
  onFormSuccess():  void { this.closeFormModal(); this.loadLeaveTypes(); }

  async toggleStatus(lt: LeaveType): Promise<void> {
    const action = lt.isActive ? 'deactivate' : 'activate';
    const r = await Swal.fire({
      title: `${lt.isActive ? 'Deactivate' : 'Activate'} Leave Type?`,
      html: `${lt.isActive ? 'Deactivate' : 'Activate'} <strong>${lt.name}</strong>?`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: lt.isActive ? '#6366f1' : '#10b981', cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action} it!`
    });
    if (!r.isConfirmed) return;
    this.leaveTypeService.toggleLeaveTypeStatus(lt.id, !lt.isActive).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Done!', text: `Leave type ${action}d.`, icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaveTypes();
        } else { Swal.fire('Error!', res.message || `Failed to ${action}`, 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  async deleteLeaveType(lt: LeaveType): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete Leave Type?', html: `Delete <strong>${lt.name}</strong>? This cannot be undone.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete'
    });
    if (!r.isConfirmed) return;
    this.leaveTypeService.deleteLeaveType(lt.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Deleted!', text: 'Leave type deleted.', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaveTypes();
        } else { Swal.fire('Error!', res.message || 'Failed to delete', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  exportToExcel(): void {
    if (!this.leaveTypes.length) { Swal.fire('No Data', 'Nothing to export.', 'info'); return; }
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const data = this.leaveTypes.map(lt => ({
      'Order': lt.displayOrder, 'Name': lt.name, 'Code': lt.code, 'Description': lt.description,
      'Max Days/Year': lt.maxDaysPerYear, 'Carry Forward': lt.isCarryForward ? 'Yes' : 'No',
      'Max Carry Forward Days': lt.maxCarryForwardDays,
      'Requires Approval': lt.requiresApproval ? 'Yes' : 'No',
      'Requires Document': lt.requiresDocument ? 'Yes' : 'No',
      'Min Notice Days': lt.minimumNoticeDays, 'Color': lt.color,
      'Status': lt.isActive ? 'Active' : 'Inactive',
      'Created': new Date(lt.createdAt).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [8, 20, 12, 35, 14, 14, 20, 16, 16, 14, 10, 10, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Types');
    const fn = `LeaveTypes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: 'Done!', text: `${fn} downloaded.`, icon: 'success', timer: 2500, showConfirmButton: false });
  }
}