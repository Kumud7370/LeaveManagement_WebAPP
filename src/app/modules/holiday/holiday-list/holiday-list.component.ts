// holiday-list.component.ts
// KEY FIX: Added onDepartmentChange() method that reads the checkbox's actual
// checked state instead of calling toggleDepartment() which could fire twice.

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
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
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
import Swal from 'sweetalert2';
import { HolidayService } from '../../../core/services/api/holiday.api';
import { DepartmentService } from '../../../core/services/api/department.api';
import {
  Holiday,
  CreateHolidayDto,
  UpdateHolidayDto,
  HolidayFilterDto,
  HolidayType
} from '../../../core/Models/holiday.model';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import {
  dateTimeFormatter,
  exportToCsv,
  clearAllFilters,
  refreshGrid,
  getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const holidayGridTheme = themeQuartz.withParams({
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
  selector: 'app-holiday-list',
  standalone: true,
  templateUrl: './holiday-list.component.html',
  styleUrls: ['./holiday-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AgGridAngular,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HolidayListComponent implements OnInit, OnDestroy {

  @ViewChild('agGrid', { read: ElementRef })
  agGridElement!: ElementRef<HTMLElement>;

  readonly gridTheme = holidayGridTheme;

  // ─── Grid state ───────────
  rowData: any[] = [];
  gridApi!: GridApi;
  searchTerm: string = '';

  // ─── Modal state ───────────
  isModalOpen: boolean = false;
  modalMode: 'add' | 'edit' | 'view' = 'add';
  selectedHoliday: any = null;

  // ─── Form ────────────
  holidayForm!: FormGroup;
  isSubmitting: boolean = false;
  formSubmitAttempted: boolean = false;

  // ─── Departments ────────
  departments: any[] = [];
  isLoadingDepartments: boolean = false;
  private selectedDepartmentSet = new Set<string>();

  // ─── Pagination ─────────
  currentPage: number = 1;
  pageSize: number = 20;
  totalItems: number = 0;
  totalPages: number = 0;
  private isLoadingData: boolean = false;
  private searchDebounceTimer: any = null;
  Math = Math;

  // ─── ResizeObserver ───────
  private resizeObserver: ResizeObserver | null = null;

  // ─── Lookup data ───────────
  holidayTypes = [
    { value: HolidayType.National, label: 'National'  },
    { value: HolidayType.Regional, label: 'Regional'  },
    { value: HolidayType.Optional, label: 'Optional'  }
  ];

  stats = { total: 0, upcoming: 0, past: 0 };

  context = { componentParent: this };

  // ─── Grid config ──────────────
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
      suppressSizeToFit: true
    },
    {
      headerName: 'Holiday Name',
      field: 'holidayName',
      width: 220,
      minWidth: 180,
      cellStyle: { fontWeight: '600', color: '#1f2937' },
      cellRenderer: (params: any) => {
        const val    = params.value || '';
        const search = params.context?.componentParent?.searchTerm || '';
        const highlighted = params.context?.componentParent?.highlightText(val, search) || val;
        return `<span style="font-weight:600;color:#1f2937;">${highlighted}</span>`;
      }
    },
    {
      headerName: 'Date',
      field: 'holidayDate',
      width: 160,
      minWidth: 130,
      valueFormatter: (params: any) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      },
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Type',
      field: 'holidayTypeName',
      width: 140,
      minWidth: 120,
      cellRenderer: (params: any) => {
        const type: string = params.value ?? '';
        const cls = type === 'National' ? 'holiday-type-badge hl-type-national'
                  : type === 'Regional' ? 'holiday-type-badge hl-type-regional'
                  : type === 'Optional' ? 'holiday-type-badge hl-type-optional'
                  : 'holiday-type-badge hl-type-national';
        const search      = params.context?.componentParent?.searchTerm || '';
        const highlighted = params.context?.componentParent?.highlightText(type, search) || type;
        return `<span class="${cls}">${highlighted}</span>`;
      }
    },
    {
      headerName: 'Optional',
      field: 'isOptional',
      width: 110,
      minWidth: 90,
      cellRenderer: (params: any) => {
        return params.value
          ? '<span class="hl-status-badge" style="background:#fef3c7;color:#92400e;">Yes</span>'
          : '<span class="hl-status-badge" style="background:#dbeafe;color:#1e40af;">No</span>';
      }
    },
    {
      headerName: 'Departments',
      field: 'applicableDepartments',
      width: 180,
      minWidth: 140,
      cellRenderer: (params: any) => {
        const depts: any[] = params.value || [];
        if (depts.length === 0) {
          return '<span style="color:#9ca3af;font-size:11px;">All Departments</span>';
        }
        return `<span style="color:#4338ca;font-size:11px;font-weight:600;">${depts.length} Department(s)</span>`;
      }
    },
    {
      headerName: 'Days Until',
      field: 'daysUntilHoliday',
      width: 130,
      minWidth: 100,
      cellRenderer: (params: any) => {
        if (params.data?.isToday) {
          return '<span class="hl-status-badge" style="background:#dcfce7;color:#166534;font-weight:600;">Today</span>';
        }
        if (params.value < 0) {
          return '<span style="color:#9ca3af;font-size:12px;">Past</span>';
        }
        if (params.value <= 7) {
          return `<span class="holiday-type-badge hl-type-regional">${params.value} days</span>`;
        }
        return `<span style="color:#374151;">${params.value} days</span>`;
      }
    },
    {
      headerName: 'Status',
      field: 'isUpcoming',
      width: 120,
      minWidth: 100,
      cellRenderer: (params: any) => {
        const search = params.context?.componentParent?.searchTerm || '';
        const hl     = (t: string) => params.context?.componentParent?.highlightText(t, search) || t;
        return params.value
          ? `<span class="badge-status" style="background:#dcfce7;color:#166534;">${hl('Upcoming')}</span>`
          : `<span class="badge-status" style="background:#f1f5f9;color:#475569;">${hl('Past')}</span>`;
      }
    },
    {
      headerName: 'Active',
      field: 'isActive',
      width: 110,
      minWidth: 90,
      cellRenderer: (params: any) => {
        return params.value
          ? '<span class="badge-status" style="background:#dcfce7;color:#166534;">Active</span>'
          : '<span class="badge-status" style="background:#fee2e2;color:#991b1b;">Inactive</span>';
      }
    },
    {
      headerName: 'Created At',
      field: 'createdAt',
      width: 180,
      minWidth: 150,
      valueFormatter: dateTimeFormatter,
      cellStyle: { color: '#6b7280', fontSize: '12px' }
    }
  ];

  activeFilters = {
    hasActiveFilters: false,
    filters: [] as string[],
    count: 0
  };

  constructor(
    private holidayService: HolidayService,
    private departmentService: DepartmentService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadDepartments();
    this.loadHolidays();
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

  // ─── Form ────────

  initializeForm(): void {
    this.holidayForm = this.fb.group({
      holidayName:          ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      holidayDate:          ['', Validators.required],
      holidayType:          ['', Validators.required],
      isOptional:           [false],
      isActive:             [true],
      description:          ['', [Validators.maxLength(500)]],
      applicableDepartments:[[]]
    });

    this.holidayForm.get('holidayType')?.valueChanges.subscribe((type: string) => {
      if (type === HolidayType.National || type === String(HolidayType.National)) {
        this.selectedDepartmentSet.clear();
        this.syncDepartmentsToForm();
      }
    });
  }

  get selectedDepartments(): string[] {
    return Array.from(this.selectedDepartmentSet);
  }

  get isNationalHoliday(): boolean {
    const val = this.holidayForm.get('holidayType')?.value;
    return val === HolidayType.National || val === 'National' || val === 0;
  }

  // ══════════════════════════════════════════════════════════════
  // FIX: onDepartmentChange — reads the actual checkbox checked
  // state from the DOM event instead of blindly toggling.
  //
  // Root cause of the bug:
  //   The old template had BOTH (click) on the <label> AND
  //   (change) on the <input type="checkbox">. When the user
  //   clicked the card:
  //     1. The checkbox's (change) fired → toggleDepartment(id)
  //        → department added to Set ✓
  //     2. The label's (click) ALSO fired → toggleDepartment(id)
  //        → department REMOVED from Set ✗
  //   Net result: one click = two calls = item added then removed.
  //
  // Fix: Remove (click) from the outer <label>.  The <label [for]>
  // attribute already handles click→checkbox sync natively.
  // Use (change) on the checkbox only, and READ the event's
  // checked value to set/clear — not toggle — the department.
  // ══════════════════════════════════════════════════════════════
  onDepartmentChange(departmentId: string, event: Event): void {
    if (this.modalMode === 'view') return;

    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedDepartmentSet.add(departmentId);
    } else {
      this.selectedDepartmentSet.delete(departmentId);
    }
    this.syncDepartmentsToForm();
  }

  // Keep toggleDepartment for programmatic use (e.g. removeDepartment chips)
  toggleDepartment(departmentId: string): void {
    if (this.modalMode === 'view') return;
    if (this.selectedDepartmentSet.has(departmentId)) {
      this.selectedDepartmentSet.delete(departmentId);
    } else {
      this.selectedDepartmentSet.add(departmentId);
    }
    this.syncDepartmentsToForm();
  }

  isDepartmentSelected(departmentId: string): boolean {
    return this.selectedDepartmentSet.has(departmentId);
  }

  removeDepartment(departmentId: string): void {
    this.selectedDepartmentSet.delete(departmentId);
    this.syncDepartmentsToForm();
  }

  private syncDepartmentsToForm(): void {
    this.holidayForm.patchValue({ applicableDepartments: Array.from(this.selectedDepartmentSet) });
    this.cdr.detectChanges();
  }

  getDepartmentName(id: string): string {
    return this.departments.find(d => d.id === id)?.departmentName || id;
  }

  // ─── Data Loading ──────

  loadStats(): void {
    const filter: HolidayFilterDto = {
      year: new Date().getFullYear(),
      pageNumber: 1,
      pageSize: 1000,
      sortBy: 'HolidayDate',
      sortDescending: false
    };

    this.holidayService.getFilteredHolidays(filter).subscribe({
      next: (response: any) => {
        if (response.success) {
          const items: any[] = response.data.items || [];
          const now = new Date();
          this.stats.total    = response.data.totalCount;
          this.stats.upcoming = items.filter(h => new Date(h.holidayDate) >= now).length;
          this.stats.past     = items.filter(h => new Date(h.holidayDate) <  now).length;
          this.cdr.detectChanges();
        }
      },
      error: () => {}
    });
  }

  loadDepartments(): void {
    this.isLoadingDepartments = true;
    this.departmentService.getActiveDepartments().subscribe({
      next: (response: any) => {
        this.isLoadingDepartments = false;
        if (response.success) {
          this.departments = response.data;
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        this.isLoadingDepartments = false;
        console.error('Failed to load departments:', error);
      }
    });
  }

  loadHolidays(): void {
    if (this.isLoadingData) return;
    this.isLoadingData = true;

    const filter: HolidayFilterDto = {
      searchTerm:     this.searchTerm || undefined,
      year:           new Date().getFullYear(),
      pageNumber:     this.currentPage,
      pageSize:       this.pageSize,
      sortBy:         'HolidayDate',
      sortDescending: false
    };

    this.holidayService.getFilteredHolidays(filter).subscribe({
      next: (response: any) => {
        this.isLoadingData = false;
        if (response.success) {
          this.rowData     = response.data.items;
          this.totalItems  = response.data.totalCount;
          this.totalPages  = Math.ceil(this.totalItems / this.pageSize);

          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            refreshGrid(this.gridApi);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
          this.cdr.detectChanges();
        }
      },
      error: (error: any) => {
        this.isLoadingData = false;
        if (error.status !== 401) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load holidays. Please try again.' });
        }
      }
    });
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('sortChanged',   this.onSortChanged.bind(this));
    this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const hostEl = this.agGridElement?.nativeElement;
    const container = (hostEl?.closest('.hl-grid-container') as HTMLElement) ?? hostEl;

    if (container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.gridApi) {
          requestAnimationFrame(() => {
            this.gridApi?.sizeColumnsToFit();
          });
        }
      });
      this.resizeObserver.observe(container);
    }
  }

  onSortChanged(_event: SortChangedEvent): void {
    this.currentPage = 1;
    this.loadHolidays();
  }

  onFilterChanged(_event: FilterChangedEvent): void {
    this.currentPage = 1;
    this.loadHolidays();
    this.updateActiveFilters();
  }

  highlightText(text: string, term: string): string {
    if (!term || !term.trim() || !text) return String(text);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex   = new RegExp(`(${escaped})`, 'gi');
    return String(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // ─── Pagination ─────────

  onPageSizeChanged(newPageSize: number): void {
    this.pageSize    = newPageSize;
    this.currentPage = 1;
    this.loadHolidays();
  }

  goToPage(page: number | string): void {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(pageNum) || pageNum < 1 || pageNum > this.totalPages || pageNum === this.currentPage) return;
    this.currentPage = pageNum;
    this.loadHolidays();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
  }

  // ─── Search ──────────

  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadHolidays();
      this.updateActiveFilters();
    }, 350);
  }

  clearSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.currentPage = 1;
    this.loadHolidays();
    this.updateActiveFilters();
  }

  handleClearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm  = '';
    this.currentPage = 1;
    clearAllFilters(this.gridApi);
    this.loadHolidays();
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

  // ─── Modal ────────────

  openAddModal(): void {
    this.modalMode           = 'add';
    this.selectedHoliday     = null;
    this.formSubmitAttempted = false;
    this.selectedDepartmentSet.clear();
    this.holidayForm.reset({
      holidayName:           '',
      holidayDate:           '',
      holidayType:           '',
      isOptional:            false,
      isActive:              true,
      description:           '',
      applicableDepartments: []
    });
    this.holidayForm.markAsPristine();
    this.holidayForm.markAsUntouched();
    this.holidayForm.enable();
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  openEditModal(holiday: any): void {
    this.modalMode           = 'edit';
    this.selectedHoliday     = holiday;
    this.formSubmitAttempted = false;

    this.selectedDepartmentSet = new Set<string>(holiday.applicableDepartments || []);

    this.holidayForm.reset();
    this.holidayForm.patchValue({
      holidayName:           holiday.holidayName,
      holidayDate:           this.formatDateForInput(holiday.holidayDate),
      holidayType:           holiday.holidayType,
      isOptional:            holiday.isOptional,
      isActive:              holiday.isActive,
      description:           holiday.description ?? '',
      applicableDepartments: Array.from(this.selectedDepartmentSet)
    });
    this.holidayForm.markAsPristine();
    this.holidayForm.markAsUntouched();
    this.holidayForm.enable();
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  openViewModal(holiday: any): void {
    this.modalMode           = 'view';
    this.selectedHoliday     = holiday;
    this.formSubmitAttempted = false;

    this.selectedDepartmentSet = new Set<string>(holiday.applicableDepartments || []);

    this.holidayForm.reset();
    this.holidayForm.patchValue({
      holidayName:           holiday.holidayName,
      holidayDate:           this.formatDateForInput(holiday.holidayDate),
      holidayType:           holiday.holidayType,
      isOptional:            holiday.isOptional,
      isActive:              holiday.isActive,
      description:           holiday.description ?? '',
      applicableDepartments: Array.from(this.selectedDepartmentSet)
    });
    this.holidayForm.disable();
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.isModalOpen         = false;
    this.selectedHoliday     = null;
    this.isSubmitting        = false;
    this.formSubmitAttempted = false;
    this.selectedDepartmentSet.clear();
    this.holidayForm.reset();
    this.holidayForm.markAsPristine();
    this.holidayForm.markAsUntouched();
    this.holidayForm.enable();
    this.cdr.detectChanges();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.closeModal();
  }

  viewDetails(data: any): void      { this.openViewModal(data); }
  editDepartment(data: any): void    { this.openEditModal(data); }
  toggleStatus(data: any): void      { this.onToggleStatus(data); }
  deleteDepartment(data: any): void  { this.onDelete(data); }

  onGridAction(event: { action: string; data: any }): void {
    switch (event.action) {
      case 'edit':   this.openEditModal(event.data);  break;
      case 'view':   this.openViewModal(event.data);  break;
      case 'toggle': this.onToggleStatus(event.data); break;
      case 'delete': this.onDelete(event.data);       break;
    }
  }

  // ─── Submit ──────────
  onSubmit(): void {
    this.formSubmitAttempted = true;

    if (this.holidayForm.invalid) {
      this.holidayForm.markAllAsTouched();
      Swal.fire({ icon: 'warning', title: 'Form Invalid', text: 'Please fill in all required fields.' });
      return;
    }

    if (!this.isNationalHoliday && this.selectedDepartmentSet.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Department Selected',
        text: 'Please select at least one applicable department.'
      });
      return;
    }

    this.isSubmitting = true;
    if (this.modalMode === 'add') {
      this.handleCreate();
    } else if (this.modalMode === 'edit') {
      this.handleUpdate();
    }
  }

  private handleCreate(): void {
    const fv = this.holidayForm.value;
    const dto: CreateHolidayDto = {
      holidayName:           fv.holidayName,
      holidayDate:           this.toUtcIso(fv.holidayDate),
      description:           fv.description || undefined,
      holidayType:           fv.holidayType,
      isOptional:            fv.isOptional,
      isActive:              fv.isActive,
      applicableDepartments: Array.from(this.selectedDepartmentSet)
    };

    this.holidayService.createHoliday(dto).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        if (response.success) {
          this.closeModal();
          this.loadHolidays();
          this.loadStats();
          Swal.fire({ icon: 'success', title: 'Success!', text: 'Holiday created successfully.', timer: 2000, showConfirmButton: false });
        }
      },
      error: (error: any) => {
        this.isSubmitting = false;
        Swal.fire({ icon: 'error', title: 'Error', text: error.error?.message || 'Failed to create holiday.' });
      }
    });
  }

  private handleUpdate(): void {
    const fv = this.holidayForm.value;
    const dto: UpdateHolidayDto = {
      holidayName:           fv.holidayName,
      holidayDate:           fv.holidayDate ? this.toUtcIso(fv.holidayDate) : undefined,
      description:           fv.description ?? undefined,
      holidayType:           fv.holidayType,
      isOptional:            fv.isOptional,
      isActive:              fv.isActive,
      applicableDepartments: Array.from(this.selectedDepartmentSet)
    };

    this.holidayService.updateHoliday(this.selectedHoliday.id, dto).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        if (response.success) {
          this.closeModal();
          this.loadHolidays();
          this.loadStats();
          Swal.fire({ icon: 'success', title: 'Updated!', text: 'Holiday updated successfully.', timer: 2000, showConfirmButton: false });
        }
      },
      error: (error: any) => {
        this.isSubmitting = false;
        Swal.fire({ icon: 'error', title: 'Error', text: error.error?.message || 'Failed to update holiday.' });
      }
    });
  }

  // ─── Toggle Status ─────────
  onToggleStatus(holiday: any): void {
    const newStatus   = !holiday.isActive;
    const actionText  = newStatus ? 'activate' : 'deactivate';
    const statusLabel = newStatus ? 'Active' : 'Inactive';

    Swal.fire({
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Holiday?`,
      html: `
        <div style="text-align:left;padding:10px;">
          <p>Do you want to ${actionText} this holiday?</p>
          <p style="margin:10px 0;"><strong>Holiday:</strong> ${holiday.holidayName}</p>
          <p style="margin:10px 0;"><strong>New Status:</strong>
            <span style="color:${newStatus ? '#10b981' : '#6b7280'};font-weight:600;">${statusLabel}</span>
          </p>
        </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText}!`
    }).then(result => {
      if (!result.isConfirmed) return;

      const dto: UpdateHolidayDto = { isActive: newStatus };
      this.holidayService.updateHoliday(holiday.id, dto).subscribe({
        next: (response: any) => {
          if (response.success) {
            const idx = this.rowData.findIndex(r => r.id === holiday.id);
            if (idx !== -1) {
              this.rowData[idx].isActive = newStatus;
              this.gridApi.setGridOption('rowData', [...this.rowData]);
              refreshGrid(this.gridApi);
            }
            this.loadStats();
            this.cdr.detectChanges();
            Swal.fire({ icon: 'success', title: 'Status Updated!', text: `Holiday is now ${statusLabel}.`, timer: 2000, showConfirmButton: false });
          }
        },
        error: () => {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update holiday status.' });
        }
      });
    });
  }

  // ─── Delete ───────────
  onDelete(holiday: any): void {
    Swal.fire({
      title: 'Delete Holiday?',
      html: `
        <div style="text-align:left;padding:10px;">
          <p>Are you sure you want to delete <strong>"${holiday.holidayName}"</strong>?</p>
          <p style="color:#ef4444;margin-top:15px;padding:10px;background:#fee2e2;border-radius:6px;">
            <strong>Warning:</strong> This action cannot be undone.
          </p>
        </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete!'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.holidayService.deleteHoliday(holiday.id).subscribe({
        next: (response: any) => {
          if (response.success) {
            const idx = this.rowData.findIndex(r => r.id === holiday.id);
            if (idx !== -1) {
              this.rowData.splice(idx, 1);
              this.gridApi.setGridOption('rowData', [...this.rowData]);
              refreshGrid(this.gridApi);
            }
            this.totalItems = Math.max(0, this.totalItems - 1);
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            if (this.rowData.length === 0 && this.currentPage > 1) {
              this.currentPage--;
              this.loadHolidays();
            }
            this.loadStats();
            this.cdr.detectChanges();
            Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Holiday has been deleted.', timer: 2500, showConfirmButton: false });
          }
        },
        error: () => {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete holiday. Please try again.' });
        }
      });
    });
  }

  exportData(): void {
    exportToCsv(this.gridApi, 'holidays');
    Swal.fire({ icon: 'success', title: 'Exported!', text: 'Holiday data exported as CSV.', timer: 2000, showConfirmButton: false });
  }

  formatDateForInput(date: any): string {
    const d     = new Date(date);
    const year  = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day   = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private toUtcIso(dateStr: string): string {
    return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
  }
}