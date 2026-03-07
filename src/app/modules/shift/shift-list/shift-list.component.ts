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
import { ReactiveFormsModule } from '@angular/forms';
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
  themeQuartz,
  ICellRendererParams
} from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { ShiftService } from '../../../core/services/api/shift.api';
import { Shift, ShiftFilterDto } from '../../../core/Models/shift.model';
import { ShiftFormComponent } from '../shift-form/shift-form.component';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import {
  dateTimeFormatter,
  exportToCsv,
  clearAllFilters,
  refreshGrid,
  getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const shiftGridTheme = themeQuartz.withParams({
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
  selector: 'app-shift-list',
  standalone: true,
  templateUrl: './shift-list.component.html',
  styleUrls: ['./shift-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AgGridAngular,
    ShiftFormComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ShiftListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(AgGridAngular, { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;

  readonly gridTheme = shiftGridTheme;

  // ── Grid state 
  rowData: Shift[] = [];
  gridApi!: GridApi;
  searchTerm: string = '';

  private resizeObserver: ResizeObserver | null = null;

  // ── Modal state 
  showModal    = false;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  selectedShift: Shift | null = null;

  // ── Pagination 
  currentPage      = 1;
  pageSize         = 20;
  totalItems       = 0;
  totalPages       = 0;
  private isLoadingData    = false;
  private searchDebounceTimer: any = null;
  Math = Math;

  // ── Stats 
  stats = { total: 0, active: 0, nightShifts: 0 };

  // ── Loading flag 
  isLoading = false;

  context = { componentParent: this };

  // ── Active Filters 
  activeFilters = {
    hasActiveFilters: false,
    filters: [] as string[],
    count: 0
  };

  defaultColDef: ColDef = {
    sortable:          true,
    filter:            true,
    floatingFilter:    true,
    resizable:         true,
    minWidth:          80,
    flex:              1,         
    suppressSizeToFit: false,
    suppressAutoSize:  false
  };

  columnDefs: ColDef[] = [
    {
      headerName:                   'Actions',
      field:                        'actions',
      width:                        155,
      minWidth:                     155,
      maxWidth:                     155,
      flex:                         0,          
      sortable:                     false,
      filter:                       false,
      floatingFilter:               false,
      suppressFloatingFilterButton: true,
      cellClass:                    'actions-cell',
      cellRenderer:                 ActionCellRendererComponent,
      suppressSizeToFit:            true
    },
    {
      headerName:                   'Color',
      field:                        'color',
      width:                        75,
      minWidth:                     60,
      maxWidth:                     75,
      flex:                         0,          
      sortable:                     false,
      filter:                       false,
      floatingFilter:               false,
      suppressFloatingFilterButton: true,
      suppressSizeToFit:            true,
      cellRenderer: (params: ICellRendererParams) =>
        `<div style="width:26px;height:26px;border-radius:6px;background:${params.value};
         border:1px solid rgba(0,0,0,.15);margin-top:9px;"></div>`
    },
    {
      headerName: 'Shift Name',
      field:      'shiftName',
      minWidth:   160,
      flex:       2,
      cellStyle:  { fontWeight: '600', color: '#1f2937' },
      cellRenderer: (params: ICellRendererParams) => {
        const val       = params.value || '';
        const search    = params.context?.componentParent?.searchTerm || '';
        const highlighted = params.context?.componentParent?.highlightText(val, search) || val;
        return `<span style="font-weight:600;color:#1f2937;">${highlighted}</span>`;
      }
    },
    {
      headerName: 'Code',
      field:      'shiftCode',
      minWidth:   100,
      flex:       1,
      cellRenderer: (params: ICellRendererParams) =>
        `<span style="font-family:monospace;font-size:0.78rem;background:#f1f5f9;
         padding:2px 8px;border-radius:4px;font-weight:600;">${params.value ?? ''}</span>`
    },
    {
      headerName: 'Timing',
      field:      'shiftTimingDisplay',
      minWidth:   130,
      flex:       1.2,
      sortable:   false,
      cellStyle:  { fontWeight: '600', color: '#334155' }
    },
    {
      headerName: 'Net Working',
      field:      'netWorkingHours',
      minWidth:   110,
      flex:       1,
      sortable:   false,
      cellRenderer: (params: ICellRendererParams) =>
        `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;
         border-radius:4px;font-size:0.78rem;font-weight:600;">${params.value ?? ''}</span>`
    },
    {
      headerName:     'Grace Period',
      field:          'gracePeriodMinutes',
      minWidth:       110,
      flex:           1,
      sortable:       true,
      valueFormatter: (p) => p.value != null ? `${p.value} min` : ''
    },
    {
      headerName: 'Night Shift',
      field:      'isNightShift',
      minWidth:   100,
      flex:       1,
      sortable:   true,
      cellRenderer: (params: ICellRendererParams) =>
        params.value
          ? `<span style="background:#ede9fe;color:#4c1d95;padding:2px 8px;border-radius:4px;font-size:0.78rem;font-weight:600;">🌙 Yes</span>`
          : `<span style="background:#fef9c3;color:#713f12;padding:2px 8px;border-radius:4px;font-size:0.78rem;font-weight:600;">☀️ No</span>`
    },
    {
      headerName:     'Allowance %',
      field:          'nightShiftAllowancePercentage',
      minWidth:       110,
      flex:           1,
      sortable:       true,
      valueFormatter: (p) => p.data?.isNightShift ? `${p.value}%` : '—'
    },
    {
      headerName: 'Status',
      field:      'isActive',
      minWidth:   90,
      flex:       0.9,
      sortable:   true,
      cellRenderer: (params: ICellRendererParams) =>
        params.value
          ? `<span class="badge-status" style="background:#dcfce7;color:#166534;">Active</span>`
          : `<span class="badge-status" style="background:#fee2e2;color:#991b1b;">Inactive</span>`
    },
    {
      headerName: 'Order',
      field:      'displayOrder',
      minWidth:   70,
      flex:       0.7,
      sortable:   true
    },
    {
      headerName:     'Created',
      field:          'createdAt',
      minWidth:       150,
      flex:           1.3,
      sortable:       true,
      valueFormatter: dateTimeFormatter,
      cellStyle:      { color: '#6b7280', fontSize: '12px' }
    }
  ];

  constructor(
    private shiftService: ShiftService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadShifts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  // ── Grid events 

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('sortChanged',   this.onSortChanged.bind(this));
    this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));

    // Initial fit
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const hostEl   = this.agGridElement?.nativeElement;
    const container = (hostEl?.closest('.sl-grid-card') as HTMLElement) ?? hostEl;

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
    this.loadShifts();
  }

  onFilterChanged(_event: FilterChangedEvent): void {
    this.currentPage = 1;
    this.loadShifts();
    this.updateActiveFilters();
  }

  // ── Data Loading 

  loadStats(): void {
    const filter: ShiftFilterDto = {
      pageNumber:     1,
      pageSize:       1000,
      sortBy:         'DisplayOrder',
      sortDescending: false
    };

    this.shiftService.getFilteredShifts(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            const items: Shift[] = res.data.items || [];
            this.stats.total       = res.data.totalCount;
            this.stats.active      = items.filter(s => s.isActive).length;
            this.stats.nightShifts = items.filter(s => s.isNightShift).length;
            this.cdr.detectChanges();
          }
        },
        error: () => {}
      });
  }

  loadShifts(): void {
    if (this.isLoadingData) return;
    this.isLoadingData = true;
    this.isLoading     = true;

    const filter: ShiftFilterDto = {
      searchTerm:     this.searchTerm || undefined,
      pageNumber:     this.currentPage,
      pageSize:       this.pageSize,
      sortBy:         'DisplayOrder',
      sortDescending: false
    };

    this.shiftService.getFilteredShifts(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isLoadingData = false;
          this.isLoading     = false;

          if (res.success) {
            this.rowData    = res.data.items;
            this.totalItems = res.data.totalCount;
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);

            if (this.gridApi) {
              this.gridApi.setGridOption('rowData', this.rowData);
              refreshGrid(this.gridApi);
              requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
            }
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          this.isLoadingData = false;
          this.isLoading     = false;
          console.error('Error loading shifts:', err);
          Swal.fire({
            icon:               'error',
            title:              'Connection Error',
            text:               'Failed to load shifts. Please check your API connection.',
            confirmButtonColor: '#ef4444'
          });
        }
      });
  }

  // ── Search 

  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadShifts();
      this.updateActiveFilters();
    }, 350);
  }

  clearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.currentPage = 1;
    if (this.gridApi) clearAllFilters(this.gridApi);
    this.loadShifts();
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

  // ── Pagination 

  onPageSizeChanged(newPageSize: number): void {
    this.pageSize    = newPageSize;
    this.currentPage = 1;
    this.loadShifts();
  }

  goToPage(page: number | string): void {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(pageNum) || pageNum < 1 || pageNum > this.totalPages || pageNum === this.currentPage) return;
    this.currentPage = pageNum;
    this.loadShifts();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  get getMaxRecords(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  // ── Export 

  exportData(): void {
    exportToCsv(this.gridApi, 'shifts');
    Swal.fire({
      icon:              'success',
      title:             'Exported!',
      text:              'Shift data exported as CSV.',
      timer:             2000,
      showConfirmButton: false
    });
  }

  // ── Modal 

  openCreateModal(): void {
    this.modalMode     = 'create';
    this.selectedShift = null;
    this.showModal     = true;
  }

  viewDetails(shift: Shift): void {
    this.modalMode     = 'view';
    this.selectedShift = shift;
    this.showModal     = true;
  }

  editDepartment(shift: Shift): void {
    this.modalMode     = 'edit';
    this.selectedShift = shift;
    this.showModal     = true;
  }

  toggleStatus(shift: Shift): void {
    const action   = shift.isActive ? 'Deactivate' : 'Activate';
    const btnColor = shift.isActive ? '#f59e0b' : '#10b981';

    Swal.fire({
      title:              `${action} Shift?`,
      html:               `Are you sure you want to <b>${action.toLowerCase()}</b> <b>"${shift.shiftName}"</b>?`,
      icon:               'question',
      showCancelButton:   true,
      confirmButtonColor: btnColor,
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  `Yes, ${action.toLowerCase()} it!`
    }).then(result => {
      if (!result.isConfirmed) return;

      this.shiftService.toggleShiftStatus(shift.id, !shift.isActive)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.success) {
              const idx = this.rowData.findIndex(s => s.id === shift.id);
              if (idx > -1) {
                this.rowData[idx] = { ...this.rowData[idx], isActive: !this.rowData[idx].isActive };
                this.gridApi.setGridOption('rowData', [...this.rowData]);
                refreshGrid(this.gridApi);
              }
              this.loadStats();
              this.cdr.detectChanges();
              Swal.fire({
                icon:               'success',
                title:              `${action}d!`,
                text:               `"${shift.shiftName}" has been ${action.toLowerCase()}d.`,
                confirmButtonColor: '#3b82f6',
                timer:              1800,
                timerProgressBar:   true,
                showConfirmButton:  false
              });
            }
          },
          error: () => Swal.fire({
            icon:               'error',
            title:              'Error',
            text:               'Failed to update shift status.',
            confirmButtonColor: '#ef4444'
          })
        });
    });
  }

  deleteDepartment(shift: Shift): void {
    Swal.fire({
      title:              'Delete Shift?',
      html:               `
        <div style="text-align:left;padding:10px;">
          <p>Are you sure you want to delete <strong>"${shift.shiftName}"</strong>?</p>
          <p style="color:#ef4444;margin-top:15px;padding:10px;background:#fee2e2;border-radius:6px;">
            <strong>Warning:</strong> This action cannot be undone.
          </p>
        </div>`,
      icon:               'warning',
      showCancelButton:   true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor:  '#6b7280',
      confirmButtonText:  'Yes, delete it!'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.isLoading = true;
      this.shiftService.deleteShift(shift.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.success) {
              const idx = this.rowData.findIndex(s => s.id === shift.id);
              if (idx > -1) {
                this.rowData.splice(idx, 1);
                this.gridApi.setGridOption('rowData', [...this.rowData]);
                refreshGrid(this.gridApi);
              }
              this.totalItems = Math.max(0, this.totalItems - 1);
              this.totalPages = Math.ceil(this.totalItems / this.pageSize);
              if (this.rowData.length === 0 && this.currentPage > 1) {
                this.currentPage--;
                this.loadShifts();
              }
              this.isLoading = false;
              this.loadStats();
              this.cdr.detectChanges();
              Swal.fire({
                icon:             'success',
                title:            'Deleted!',
                text:             `"${shift.shiftName}" has been deleted.`,
                timer:            2000,
                timerProgressBar: true,
                showConfirmButton: false
              });
            } else {
              this.isLoading = false;
              Swal.fire({
                icon:               'error',
                title:              'Failed',
                text:               'Could not delete this shift.',
                confirmButtonColor: '#ef4444'
              });
            }
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Delete error:', err);
            Swal.fire({
              icon:               'error',
              title:              'Error',
              text:               'An error occurred while deleting.',
              confirmButtonColor: '#ef4444'
            });
          }
        });
    });
  }

  // ── Modal events 
  onModalClose(): void   { this.showModal = false; this.selectedShift = null; }
  onModalSuccess(): void { this.showModal = false; this.selectedShift = null; this.loadShifts(); this.loadStats(); }

  // ── Highlight search term 
  highlightText(text: string, term: string): string {
    if (!term || !term.trim() || !text) return String(text);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex   = new RegExp(`(${escaped})`, 'gi');
    return String(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // ── Utils 
  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}