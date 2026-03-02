import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  OnInit,
  OnDestroy,
  ElementRef,
  ChangeDetectorRef,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  GridApi,
  GridReadyEvent,
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  SortChangedEvent,
  FilterChangedEvent,
  themeQuartz
} from 'ag-grid-community';
import { AttendanceRegularizationService } from '../../../core/services/api/attendance-regularization.api';
import {
  RegularizationResponseDto,
  RegularizationFilterDto,
  RegularizationType,
  RegularizationStatus
} from '../../../core/Models/attendance-regularization.model';
import Swal from 'sweetalert2';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import * as XLSX from 'xlsx';
import { RegularizationFormComponent } from '../regularization-form/regularization-form.component';
import {
  dateTimeFormatter,
  clearAllFilters,
  refreshGrid,
  getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const regularizationGridTheme = themeQuartz.withParams({
  backgroundColor:                '#ffffff',
  foregroundColor:                '#1f2937',
  borderColor:                    '#e5e7eb',
  headerBackgroundColor:          '#f9fafb',
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
  selector: 'app-regularization-list',
  standalone: true,
  templateUrl: './regularization-list.component.html',
  styleUrls: ['./regularization-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    FormsModule,
    AgGridAngular,
    RegularizationFormComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegularizationListComponent implements OnInit, OnDestroy {

  @ViewChild('agGrid', { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;

  readonly gridTheme = regularizationGridTheme;

  // ─── Grid state ───────────
  rowData: RegularizationResponseDto[] = [];
  gridApi!: GridApi;
  searchTerm = '';

  // ─── Pagination ─────────
  currentPage = 1;
  pageSize = 20;
  totalItems = 0;
  totalPages = 0;
  private isLoadingData = false;
  private searchDebounceTimer: any = null;
  Math = Math;

  // ─── Filters ─────────────
  employeeIdFilter = '';
  regularizationTypeFilter: RegularizationType | null = null;
  statusFilter: RegularizationStatus | null = null;
  startDateFilter: Date | null = null;
  endDateFilter: Date | null = null;
  sortBy = 'RequestedAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // ─── UI States ────────────
  showAddModal = false;
  showApprovalModal = false;
  selectedRegularization: RegularizationResponseDto | null = null;
  approvalReason = '';

  // ─── Enums ───────────────
  RegularizationType = RegularizationType;
  RegularizationStatus = RegularizationStatus;

  // ─── Stats ───────────────
  stats = { total: 0, pending: 0, approved: 0, rejected: 0 };

  // ─── ResizeObserver ───────
  private resizeObserver: ResizeObserver | null = null;

  // ─── Active Filters ───────
  activeFilters = {
    hasActiveFilters: false,
    filters: [] as string[],
    count: 0
  };

  context = { componentParent: this };

  // ─── Grid Config ──────────
  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 80,
    suppressSizeToFit: false,
    suppressAutoSize: false
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      field: 'actions',
      width: 155,
      minWidth: 155,
      maxWidth: 155,
      sortable: false,
      filter: false,
      floatingFilter: false,
      suppressFloatingFilterButton: true,
      cellClass: 'actions-cell',
      cellRenderer: ActionCellRendererComponent,
      suppressSizeToFit: true,
      pinned: 'left'
    },
    {
      headerName: 'Employee Code',
      field: 'employeeCode',
      width: 150,
      minWidth: 120,
      cellStyle: {
        fontFamily: 'Monaco, Courier New, monospace',
        fontWeight: '600',
        color: '#334155'
      },
      cellRenderer: (params: any) => {
        const val = params.value || '';
        const search = params.context?.componentParent?.searchTerm || '';
        const highlighted = params.context?.componentParent?.highlightText(val, search) || val;
        return `<span style="font-family:Monaco,monospace;font-weight:600;background:#f1f5f9;padding:2px 8px;border-radius:4px;">${highlighted}</span>`;
      }
    },
    {
      headerName: 'Employee Name',
      field: 'employeeName',
      width: 200,
      minWidth: 160,
      cellRenderer: (params: any) => {
        const val = params.value || '';
        const search = params.context?.componentParent?.searchTerm || '';
        const highlighted = params.context?.componentParent?.highlightText(val, search) || val;
        return `<span style="font-weight:600;color:#1f2937;">${highlighted}</span>`;
      }
    },
    {
      headerName: 'Date',
      field: 'attendanceDate',
      width: 140,
      minWidth: 120,
      valueFormatter: (params: any) => {
        if (!params.value) return '—';
        return new Date(params.value).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      },
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Type',
      field: 'regularizationTypeName',
      width: 190,
      minWidth: 150,
      cellRenderer: (params: any) => {
        const type = params.data?.regularizationType;
        let cls = '';
        switch (type) {
          case RegularizationType.MissedPunch:           cls = 'reg-type-missed';   break;
          case RegularizationType.LateEntry:             cls = 'reg-type-late';     break;
          case RegularizationType.EarlyExit:             cls = 'reg-type-early';    break;
          case RegularizationType.FullDayRegularization: cls = 'reg-type-fullday';  break;
          default:                                       cls = 'reg-type-missed';   break;
        }
        const val = params.value || '';
        const search = params.context?.componentParent?.searchTerm || '';
        const highlighted = params.context?.componentParent?.highlightText(val, search) || val;
        return `<span class="reg-type-badge ${cls}">${highlighted}</span>`;
      }
    },
    {
      headerName: 'Check-In',
      field: 'requestedCheckIn',
      width: 130,
      minWidth: 110,
      valueFormatter: (params: any) => {
        if (!params.value) return '—';
        return new Date(params.value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      },
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Check-Out',
      field: 'requestedCheckOut',
      width: 130,
      minWidth: 110,
      valueFormatter: (params: any) => {
        if (!params.value) return '—';
        return new Date(params.value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      },
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Status',
      field: 'statusName',
      width: 130,
      minWidth: 110,
      cellRenderer: (params: any) => {
        const status = params.data?.status;
        let style = '';
        switch (status) {
          case RegularizationStatus.Pending:
            style = 'background:#fef3c7;color:#92400e;'; break;
          case RegularizationStatus.Approved:
            style = 'background:#dcfce7;color:#166534;'; break;
          case RegularizationStatus.Rejected:
            style = 'background:#fee2e2;color:#991b1b;'; break;
          case RegularizationStatus.Cancelled:
            style = 'background:#f1f5f9;color:#475569;'; break;
          default:
            style = 'background:#f1f5f9;color:#475569;'; break;
        }
        const val = params.value || '';
        return `<span class="badge-status" style="${style}">${val}</span>`;
      }
    },
    {
      headerName: 'Approved By',
      field: 'approvedByName',
      width: 160,
      minWidth: 130,
      valueFormatter: (params: any) => params.value || '—',
      cellStyle: { color: '#6b7280' }
    },
    {
      headerName: 'Requested At',
      field: 'requestedAt',
      width: 180,
      minWidth: 150,
      valueFormatter: dateTimeFormatter,
      cellStyle: { color: '#6b7280', fontSize: '12px' }
    }
  ];

  constructor(
    private regularizationService: AttendanceRegularizationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setDefaultDateFilters();
    this.loadRegularizations();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  // ─── Grid Ready ───────────
  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('sortChanged',   this.onSortChanged.bind(this));
    this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const hostEl = this.agGridElement?.nativeElement;
    const container = (hostEl?.closest('.rl-grid-container') as HTMLElement) ?? hostEl;

    if (container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.gridApi) {
          requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
        }
      });
      this.resizeObserver.observe(container);
    }
  }

  onSortChanged(_event: SortChangedEvent): void {
    this.currentPage = 1;
    this.loadRegularizations();
  }

  onFilterChanged(_event: FilterChangedEvent): void {
    this.currentPage = 1;
    this.loadRegularizations();
    this.updateActiveFilters();
  }

  // ─── Highlight ────────────
  highlightText(text: string, term: string): string {
    if (!term || !term.trim() || !text) return String(text);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex   = new RegExp(`(${escaped})`, 'gi');
    return String(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // ─── Data Loading ─────────
  setDefaultDateFilters(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDateFilter = firstDayOfMonth;
    this.endDateFilter = today;
  }

  loadRegularizations(): void {
    if (this.isLoadingData) return;
    this.isLoadingData = true;

    const filter: RegularizationFilterDto = {
      employeeId: this.employeeIdFilter || undefined,
      startDate: this.startDateFilter || undefined,
      endDate: this.endDateFilter || undefined,
      regularizationType: this.regularizationTypeFilter ?? undefined,
      status: this.statusFilter ?? undefined,
      sortBy: this.sortBy,
      sortDescending: this.sortDirection === 'desc',
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    };

    this.regularizationService.getFiltered(filter).subscribe({
      next: (response) => {
        this.isLoadingData = false;
        if (response.success) {
          this.rowData    = response.data.items;
          this.totalItems = response.data.totalCount;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          this.currentPage = response.data.pageNumber;

          // Compute stats
          this.computeStats(this.rowData);

          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            refreshGrid(this.gridApi);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isLoadingData = false;
        if (err.status !== 401) {
          Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || 'Failed to load regularization requests.' });
        }
      }
    });
  }

  private computeStats(items: RegularizationResponseDto[]): void {
    this.stats.total    = this.totalItems;
    this.stats.pending  = items.filter(r => r.status === RegularizationStatus.Pending).length;
    this.stats.approved = items.filter(r => r.status === RegularizationStatus.Approved).length;
    this.stats.rejected = items.filter(r => r.status === RegularizationStatus.Rejected).length;
  }

  // ─── Search ───────────────
  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadRegularizations();
      this.updateActiveFilters();
    }, 350);
  }

  clearSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.employeeIdFilter = '';
    this.currentPage = 1;
    this.loadRegularizations();
    this.updateActiveFilters();
  }

  handleClearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.employeeIdFilter = '';
    this.currentPage = 1;
    clearAllFilters(this.gridApi);
    this.loadRegularizations();
    this.updateActiveFilters();
  }

  updateActiveFilters(): void {
    const columnFilterCount = this.gridApi
      ? Object.keys(this.gridApi.getFilterModel()).length
      : 0;
    const additionalFilters = columnFilterCount > 0
      ? { 'Column filters': `${columnFilterCount} active` }
      : undefined;
    const filters = getActiveFiltersSummary(this.searchTerm, undefined, additionalFilters);
    this.activeFilters = { hasActiveFilters: filters.length > 0, filters, count: filters.length };
  }

  // ─── Pagination ───────────
  onPageSizeChanged(newPageSize: number): void {
    this.pageSize    = newPageSize;
    this.currentPage = 1;
    this.loadRegularizations();
  }

  goToPage(page: number | string): void {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(pageNum) || pageNum < 1 || pageNum > this.totalPages || pageNum === this.currentPage) return;
    this.currentPage = pageNum;
    this.loadRegularizations();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  // ─── Modal ────────────────
  openAddModal(): void {
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  onFormSubmitted(): void {
    this.showAddModal = false;
    this.loadRegularizations();
  }

  // ─── Action Handlers ──────
  viewDetails(regularization: RegularizationResponseDto): void {
    this.router.navigate(['/attendance-regularization/details', regularization.id]);
  }

  editDepartment(regularization: RegularizationResponseDto): void {
    // Navigate to edit or open edit modal as needed
    this.router.navigate(['/attendance-regularization/edit', regularization.id]);
  }

  toggleStatus(regularization: RegularizationResponseDto): void {
    if (regularization.status === RegularizationStatus.Pending) {
      this.approveRegularization(regularization);
    } else {
      Swal.fire({ icon: 'info', title: 'Info', text: 'Only pending requests can be approved/rejected.' });
    }
  }

  deleteDepartment(regularization: RegularizationResponseDto): void {
    this.cancelRegularization(regularization);
  }

  // ─── Approve / Reject ─────
  openApprovalModal(regularization: RegularizationResponseDto, approve: boolean): void {
    this.selectedRegularization = regularization;
    this.approvalReason = '';
    if (approve) {
      this.approveRegularization(regularization);
    } else {
      this.showApprovalModal = true;
    }
  }

  async approveRegularization(regularization: RegularizationResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Approve Request?',
      text: `Approve regularization for ${regularization.employeeName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, approve!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      this.regularizationService.approveRegularization(regularization.id, { isApproved: true }).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire({ title: 'Approved!', text: 'Request approved successfully.', icon: 'success', confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false });
            this.loadRegularizations();
          } else {
            Swal.fire({ title: 'Error!', text: response.message || 'Failed to approve', icon: 'error', confirmButtonColor: '#ef4444' });
          }
        },
        error: (err) => {
          Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred', icon: 'error', confirmButtonColor: '#ef4444' });
        }
      });
    }
  }

  submitRejection(): void {
    if (!this.selectedRegularization || !this.approvalReason.trim()) return;

    this.regularizationService.approveRegularization(this.selectedRegularization.id, {
      isApproved: false,
      rejectionReason: this.approvalReason
    }).subscribe({
      next: (response) => {
        if (response.success) {
          Swal.fire({ title: 'Rejected!', text: 'Request has been rejected.', icon: 'success', confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false });
          this.closeApprovalModal();
          this.loadRegularizations();
        } else {
          Swal.fire({ title: 'Error!', text: response.message || 'Failed to reject', icon: 'error', confirmButtonColor: '#ef4444' });
        }
      },
      error: (err) => {
        Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred', icon: 'error', confirmButtonColor: '#ef4444' });
      }
    });
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedRegularization = null;
    this.approvalReason = '';
  }

  async cancelRegularization(regularization: RegularizationResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Cancel Request?',
      text: 'Cancel this regularization request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No'
    });

    if (result.isConfirmed) {
      this.regularizationService.cancelRegularization(regularization.id).subscribe({
        next: (response) => {
          if (response.success) {
            Swal.fire({ title: 'Cancelled!', text: 'Request cancelled.', icon: 'success', confirmButtonColor: '#3b82f6', timer: 2000, showConfirmButton: false });
            this.loadRegularizations();
          } else {
            Swal.fire({ title: 'Error!', text: response.message || 'Failed to cancel', icon: 'error', confirmButtonColor: '#ef4444' });
          }
        },
        error: (err) => {
          Swal.fire({ title: 'Error!', text: err.error?.message || 'An error occurred', icon: 'error', confirmButtonColor: '#ef4444' });
        }
      });
    }
  }

  // ─── Export ───────────────
  exportToExcel(): void {
    if (this.rowData.length === 0) {
      Swal.fire({ title: 'No Data', text: 'No requests to export.', icon: 'info', confirmButtonColor: '#3b82f6' });
      return;
    }

    const exportData = this.rowData.map(reg => ({
      'Employee Code': reg.employeeCode,
      'Employee Name': reg.employeeName,
      'Date': reg.attendanceDate ? new Date(reg.attendanceDate).toLocaleDateString() : '—',
      'Type': reg.regularizationTypeName,
      'Requested Check-In': reg.requestedCheckIn ? new Date(reg.requestedCheckIn).toLocaleTimeString() : '—',
      'Requested Check-Out': reg.requestedCheckOut ? new Date(reg.requestedCheckOut).toLocaleTimeString() : '—',
      'Original Check-In': reg.originalCheckIn ? new Date(reg.originalCheckIn).toLocaleTimeString() : '—',
      'Original Check-Out': reg.originalCheckOut ? new Date(reg.originalCheckOut).toLocaleTimeString() : '—',
      'Reason': reg.reason,
      'Status': reg.statusName,
      'Approved By': reg.approvedByName || '—',
      'Approved At': reg.approvedAt ? new Date(reg.approvedAt).toLocaleString() : '—',
      'Rejection Reason': reg.rejectionReason || '—',
      'Requested At': new Date(reg.requestedAt).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Regularizations');
    const fileName = `Regularizations_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    Swal.fire({ title: 'Exported!', text: `File "${fileName}" downloaded.`, icon: 'success', confirmButtonColor: '#3b82f6', timer: 3000, showConfirmButton: false });
  }

  // ─── Helpers ──────────────
  getTypeOptions(): { value: RegularizationType | null; label: string }[] {
    return [
      { value: null, label: 'All Types' },
      { value: RegularizationType.MissedPunch, label: 'Missed Punch' },
      { value: RegularizationType.LateEntry, label: 'Late Entry' },
      { value: RegularizationType.EarlyExit, label: 'Early Exit' },
      { value: RegularizationType.FullDayRegularization, label: 'Full Day Regularization' }
    ];
  }

  getStatusOptions(): { value: RegularizationStatus | null; label: string }[] {
    return [
      { value: null, label: 'All Statuses' },
      { value: RegularizationStatus.Pending, label: 'Pending' },
      { value: RegularizationStatus.Approved, label: 'Approved' },
      { value: RegularizationStatus.Rejected, label: 'Rejected' },
      { value: RegularizationStatus.Cancelled, label: 'Cancelled' }
    ];
  }
}