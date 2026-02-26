import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
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
  foregroundColor:                '#374151',
  borderColor:                    '#e5e7eb',
  headerBackgroundColor:          '#ffffff',
  headerTextColor:                '#374151',
  oddRowBackgroundColor:          '#ffffff',
  rowHoverColor:                  '#f8faff',
  selectedRowBackgroundColor:     '#dbeafe',
  fontFamily:                     '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize:                       13,
  columnBorder:                   true,
  headerColumnBorder:             true,
  headerColumnBorderHeight:       '50%',
  headerColumnResizeHandleColor:  '#d1d5db',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth:  2,
  cellHorizontalPaddingScale:     0.75,
  headerFontWeight:               500,
  headerFontSize:                 13,
  rowBorder:                      true,
});

@Component({
  selector: 'app-leave-type-list',
  standalone: true,
  templateUrl: './leave-type-list.component.html',
  styleUrls: ['./leave-type-list.component.scss'],
  imports: [CommonModule, FormsModule, AgGridAngular, LeaveTypeFormComponent]
})
export class LeaveTypeListComponent implements OnInit, OnDestroy {

  readonly gridTheme = leaveTypeGridTheme;

  leaveTypes: LeaveType[] = [];
  gridApi!: GridApi;
  context = { componentParent: this };

  loading = false;
  error: string | null = null;

  paginationManager = new PaginationManager(1, 10);
  pagedResult: PagedResultDto<LeaveType> | null = null;
  pageSizeOptions = [5, 10, 20, 50, 100];

  activeCount       = 0;
  carryForwardCount = 0;
  requiresDocCount  = 0;

  searchTerm  = '';
  showFilters = false;
  filters: LeaveTypeFilterDto = {
    pageNumber: 1, pageSize: 10, sortBy: 'DisplayOrder', sortDescending: false
  };

  showFormModal       = false;
  formMode: 'create' | 'edit' = 'create';
  selectedLeaveTypeId: string | null = null;

  private resizeObserver!: ResizeObserver;
  private sidebarResizeTimer: any = null;

  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80,
    cellStyle: { display: 'flex', alignItems: 'center' }
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      width: 120, minWidth: 120, maxWidth: 130,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      headerClass: 'lt-action-col',
      cellClass: 'lt-action-cell lt-action-col',
      cellStyle: { display: 'flex', alignItems: 'center', padding: '0' },
      cellRenderer: LeaveTypeActionCellRendererComponent,
      suppressSizeToFit: true
    },
    {
      headerName: 'Order',
      field: 'displayOrder',
      width: 88, minWidth: 80,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' },
      cellRenderer: (p: any) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;
          width:26px;height:26px;background:#f1f5f9;border-radius:5px;
          font-size:12px;font-weight:600;color:#475569;font-family:inherit;">${p.value}</span>`
    },
    {
      headerName: 'Leave Type',
      field: 'name',
      width: 200, minWidth: 160,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => {
        const color = p.data?.color || '#3b82f6';
        const code  = p.data?.code  || '';
        return `<div style="display:flex;align-items:center;gap:8px;height:100%;">
          <span style="width:9px;height:9px;border-radius:50%;background:${color};
            flex-shrink:0;display:inline-block;"></span>
          <div style="display:flex;flex-direction:column;justify-content:center;gap:1px;">
            <span style="font-weight:600;font-size:13px;color:#111827;line-height:1.2;
              font-family:'Inter',-apple-system,sans-serif;">${p.value}</span>
            <span style="font-size:11px;color:#9ca3af;font-family:monospace;letter-spacing:0.3px;">${code}</span>
          </div>
        </div>`;
      }
    },
    {
      headerName: 'Description',
      field: 'description',
      width: 260, minWidth: 180,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => {
        if (!p.value) return '<span style="color:#d1d5db;font-size:13px;">—</span>';
        const txt = p.value.length > 55 ? p.value.substring(0, 55) + '…' : p.value;
        return `<span style="font-size:13px;color:#6b7280;font-family:'Inter',-apple-system,sans-serif;">${txt}</span>`;
      }
    },
    {
      headerName: 'Max Days/Year',
      field: 'maxDaysPerYear',
      width: 140, minWidth: 110,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) =>
        `<span style="display:inline-flex;align-items:center;padding:2px 10px;
          background:#dbeafe;color:#1d4ed8;border-radius:9999px;
          font-size:12px;font-weight:600;font-family:'Inter',-apple-system,sans-serif;">${p.value} days</span>`
    },
    {
      headerName: 'Carry Fwd',
      field: 'isCarryForward',
      width: 115, minWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => !p.value
        ? `<span style="display:inline-flex;padding:2px 10px;background:#f3f4f6;color:#6b7280;
            border-radius:9999px;font-size:12px;font-weight:500;font-family:'Inter',-apple-system,sans-serif;">No</span>`
        : `<span style="display:inline-flex;padding:2px 10px;background:#dcfce7;color:#15803d;
            border-radius:9999px;font-size:12px;font-weight:600;font-family:'Inter',-apple-system,sans-serif;">${p.data?.maxCarryForwardDays} days</span>`
    },
    {
      headerName: 'Approval',
      field: 'requiresApproval',
      width: 115, minWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => p.value
        ? `<span style="display:inline-flex;padding:2px 10px;background:#dcfce7;color:#15803d;
            border-radius:9999px;font-size:12px;font-weight:600;font-family:'Inter',-apple-system,sans-serif;">Required</span>`
        : `<span style="display:inline-flex;padding:2px 10px;background:#f3f4f6;color:#6b7280;
            border-radius:9999px;font-size:12px;font-weight:500;font-family:'Inter',-apple-system,sans-serif;">Auto</span>`
    },
    {
      headerName: 'Document',
      field: 'requiresDocument',
      width: 115, minWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => p.value
        ? `<span style="display:inline-flex;padding:2px 10px;background:#dcfce7;color:#15803d;
            border-radius:9999px;font-size:12px;font-weight:600;font-family:'Inter',-apple-system,sans-serif;">Required</span>`
        : `<span style="display:inline-flex;padding:2px 10px;background:#fef9c3;color:#854d0e;
            border-radius:9999px;font-size:12px;font-weight:500;font-family:'Inter',-apple-system,sans-serif;">Optional</span>`
    },
    {
      headerName: 'Notice Days',
      field: 'minimumNoticeDays',
      width: 115, minWidth: 100,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => p.value > 0
        ? `<span style="display:inline-flex;padding:2px 10px;background:#dbeafe;color:#1d4ed8;
            border-radius:9999px;font-size:12px;font-weight:600;font-family:'Inter',-apple-system,sans-serif;">${p.value} days</span>`
        : `<span style="color:#d1d5db;font-size:13px;font-family:'Inter',-apple-system,sans-serif;">None</span>`
    },
    {
      headerName: 'Status',
      field: 'isActive',
      width: 105, minWidth: 90,
      cellStyle: { display: 'flex', alignItems: 'center' },
      cellRenderer: (p: any) => p.value
        ? `<span style="display:inline-flex;padding:2px 12px;background:#dcfce7;color:#15803d;
            border-radius:9999px;font-size:12px;font-weight:600;font-family:'Inter',-apple-system,sans-serif;">Active</span>`
        : `<span style="display:inline-flex;padding:2px 12px;background:#fee2e2;color:#b91c1c;
            border-radius:9999px;font-size:12px;font-weight:600;font-family:'Inter',-apple-system,sans-serif;">Inactive</span>`
    }
  ];

  constructor(
    private leaveTypeService: LeaveTypeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.loadLeaveTypes(); }

  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    clearTimeout(this.sidebarResizeTimer);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.scheduleSizeColumnsToFit(320);
  }

  private scheduleSizeColumnsToFit(delay = 320): void {
    clearTimeout(this.sidebarResizeTimer);
    this.sidebarResizeTimer = setTimeout(() => {
      if (this.gridApi) this.gridApi.sizeColumnsToFit();
    }, delay);
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const gridEl = document.querySelector('app-leave-type-list ag-grid-angular') as HTMLElement;
    if (gridEl && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleSizeColumnsToFit(50);
      });
      this.resizeObserver.observe(gridEl);
    }
  }

  /* ── Pagination getters ── */
  get currentPage(): number  { return this.paginationManager.pageNumber; }
  get pageSize(): number     { return this.paginationManager.pageSize; }
  get totalPages(): number   { return this.pagedResult?.totalPages    ?? 0; }
  get totalCount(): number   { return this.pagedResult?.totalCount    ?? 0; }
  get hasNextPage(): boolean { return this.pagedResult?.hasNextPage   ?? false; }
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
          Swal.fire({ title: 'Done!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadLeaveTypes();
        } else { Swal.fire('Error!', res.message || `Failed to ${action}`, 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error occurred', 'error')
    });
  }

  async deleteLeaveType(lt: LeaveType): Promise<void> {
    const r = await Swal.fire({
      title: 'Delete Leave Type?',
      html: `Delete <strong>${lt.name}</strong>? This cannot be undone.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Yes, Delete'
    });
    if (!r.isConfirmed) return;
    this.leaveTypeService.deleteLeaveType(lt.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Deleted!', icon: 'success', timer: 2000, showConfirmButton: false });
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
    ws['!cols'] = [8, 20, 12, 35, 14, 14, 20, 16, 16, 14, 10, 10, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Types');
    const fn = `LeaveTypes_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: 'Done!', text: `${fn} downloaded.`, icon: 'success', timer: 2500, showConfirmButton: false });
  }
}