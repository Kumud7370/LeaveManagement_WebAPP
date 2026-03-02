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
  GridApi, GridReadyEvent, ColDef,
  ModuleRegistry, AllCommunityModule,
  SortChangedEvent, FilterChangedEvent, themeQuartz
} from 'ag-grid-community';
import Swal from 'sweetalert2';
import { HolidayService } from '../../../core/services/api/holiday.api';
import { DepartmentService } from '../../../core/services/api/department.api';
import {
  CreateHolidayDto, UpdateHolidayDto,
  HolidayFilterDto, HolidayType
} from '../../../core/Models/holiday.model';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';
import {
  dateTimeFormatter, exportToCsv,
  clearAllFilters, refreshGrid, getActiveFiltersSummary
} from '../../../utils/ag-grid-helpers';

ModuleRegistry.registerModules([AllCommunityModule]);

const holidayGridTheme = themeQuartz.withParams({
  backgroundColor: '#ffffff', foregroundColor: '#1f2937',
  borderColor: '#e5e7eb', headerBackgroundColor: '#f9fafb',
  headerTextColor: '#374151', oddRowBackgroundColor: '#ffffff',
  rowHoverColor: '#f8faff', selectedRowBackgroundColor: '#dbeafe',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize: 13, columnBorder: true, headerColumnBorder: true,
  headerColumnBorderHeight: '50%', headerColumnResizeHandleColor: '#9ca3af',
  headerColumnResizeHandleHeight: '50%', headerColumnResizeHandleWidth: 2,
  cellHorizontalPaddingScale: 0.8,
});

@Component({
  selector: 'app-holiday-list',
  standalone: true,
  templateUrl: './holiday-list.component.html',
  styleUrls: ['./holiday-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AgGridAngular],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HolidayListComponent implements OnInit, OnDestroy {

  @ViewChild('agGrid', { read: ElementRef }) agGridElement!: ElementRef<HTMLElement>;
  readonly gridTheme = holidayGridTheme;

  // ─── Grid 
  rowData:    any[]  = [];
  gridApi!:   GridApi;
  searchTerm: string = '';

  // ─── Modal 
  isModalOpen     = false;
  modalMode: 'add' | 'edit' | 'view' = 'add';
  selectedHoliday: any = null;

  // ─── Form 
  holidayForm!:        FormGroup;
  isSubmitting        = false;
  formSubmitAttempted = false;

  // ─── Departments 
  departments:          any[]                   = [];
  isLoadingDepartments  = false;
  deptChecked: Record<string, boolean> = {};

  // ─── Pagination 
  currentPage  = 1;
  pageSize     = 20;
  totalItems   = 0;
  totalPages   = 0;
  private isLoadingData       = false;
  private searchDebounceTimer: any = null;
  Math = Math;

  private resizeObserver: ResizeObserver | null = null;

  holidayTypes = [
    { value: HolidayType.National, label: 'National' },
    { value: HolidayType.Regional, label: 'Regional' },
    { value: HolidayType.Optional, label: 'Optional' },
  ];

  stats   = { total: 0, upcoming: 0, past: 0 };
  context = { componentParent: this };
  activeFilters = { hasActiveFilters: false, filters: [] as string[], count: 0 };

  // ─── Column defs 
  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80,
    suppressSizeToFit: false, suppressAutoSize: false
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions', field: 'actions',
      width: 155, minWidth: 155, maxWidth: 155,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      cellClass: 'actions-cell',
      cellRenderer: ActionCellRendererComponent,
      suppressSizeToFit: true
    },
    {
      headerName: 'Holiday Name', field: 'holidayName', width: 220, minWidth: 180,
      cellRenderer: (p: any) => {
        const val = p.value || '';
        const hl  = p.context?.componentParent?.highlightText(val, p.context?.componentParent?.searchTerm || '') || val;
        return `<span style="font-weight:600;color:#1f2937;">${hl}</span>`;
      }
    },
    {
      headerName: 'Date', field: 'holidayDate', width: 160, minWidth: 130,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      cellStyle: { color: '#374151' }
    },
    {
      headerName: 'Type', field: 'holidayTypeName', width: 140, minWidth: 120,
      cellRenderer: (p: any) => {
        const t = p.value ?? '';
        const c = t === 'National' ? 'hl-type-national' : t === 'Regional' ? 'hl-type-regional' : t === 'Optional' ? 'hl-type-optional' : 'hl-type-national';
        const hl = p.context?.componentParent?.highlightText(t, p.context?.componentParent?.searchTerm || '') || t;
        return `<span class="holiday-type-badge ${c}">${hl}</span>`;
      }
    },
    {
      headerName: 'Optional', field: 'isOptional', width: 110, minWidth: 90,
      cellRenderer: (p: any) => p.value
        ? '<span class="hl-status-badge" style="background:#fef3c7;color:#92400e;">Yes</span>'
        : '<span class="hl-status-badge" style="background:#dbeafe;color:#1e40af;">No</span>'
    },
    {
      headerName: 'Departments', field: 'applicableDepartments', width: 180, minWidth: 140,
      cellRenderer: (p: any) => {
        const depts: any[] = p.value || [];
        return depts.length === 0
      ? '<span style="color:#4338ca;font-size:11px;font-weight:600;">All Departments</span>'
      : `<span style="color:#4338ca;font-size:11px;font-weight:600;">${depts.length} Department(s)</span>`;
  }
    },
    {
      headerName: 'Days Until', field: 'daysUntilHoliday', width: 130, minWidth: 100,
      cellRenderer: (p: any) => {
        if (p.data?.isToday) return '<span class="hl-status-badge" style="background:#dcfce7;color:#166534;font-weight:600;">Today</span>';
        if (p.value < 0)     return '<span style="color:#9ca3af;font-size:12px;">Past</span>';
        if (p.value <= 7)    return `<span class="holiday-type-badge hl-type-regional">${p.value} days</span>`;
        return `<span style="color:#374151;">${p.value} days</span>`;
      }
    },
    {
      headerName: 'Status', field: 'isUpcoming', width: 120, minWidth: 100,
      cellRenderer: (p: any) => p.value
        ? '<span class="badge-status" style="background:#dcfce7;color:#166534;">Upcoming</span>'
        : '<span class="badge-status" style="background:#f1f5f9;color:#475569;">Past</span>'
    },
    {
      headerName: 'Active', field: 'isActive', width: 110, minWidth: 90,
      cellRenderer: (p: any) => p.value
        ? '<span class="badge-status" style="background:#dcfce7;color:#166534;">Active</span>'
        : '<span class="badge-status" style="background:#fee2e2;color:#991b1b;">Inactive</span>'
    },
    {
      headerName: 'Created At', field: 'createdAt', width: 180, minWidth: 150,
      valueFormatter: dateTimeFormatter, cellStyle: { color: '#6b7280', fontSize: '12px' }
    }
  ];

  constructor(
    private holidayService: HolidayService,
    private departmentService: DepartmentService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
  }

  ngOnInit(): void { this.loadStats(); this.loadDepartments(); this.loadHolidays(); }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
  }
  getDeptId(dept: any): string {
    return String(
      dept.departmentId   ??   
      dept.DepartmentId   ??   
      dept.id             ??   
      dept.Id             ??  
      ''
    );
  }

  // ─── Form 

  initializeForm(): void {
    this.holidayForm = this.fb.group({
      holidayName:           ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      holidayDate:           ['', Validators.required],
      holidayType:           ['', Validators.required],
      isActive:              [true],
      description:           ['', [Validators.maxLength(500)]],
      applicableDepartments: [[]]
    });

    this.holidayForm.get('holidayType')?.valueChanges.subscribe((type: string) => {
      if (type === HolidayType.National || type === 'National') {
        this.clearAllDeptSelections();
      }
    });
  }

  private buildDeptChecked(selectedIds: string[]): void {
    const next: Record<string, boolean> = {};
    this.departments.forEach(d => {
      const id = this.getDeptId(d);
      if (id) next[id] = false;
    });
    selectedIds.forEach(id => {
      if (id && next.hasOwnProperty(id)) next[id] = true;
    });
    this.deptChecked = next;   
    this.syncDepartmentsToForm();
  }

  /** Called by (change) on each checkbox input — reads actual checked state. */
  onDepartmentChange(deptId: string, event: Event): void {
    if (this.modalMode === 'view') return;
    const checked = (event.target as HTMLInputElement).checked;
    this.deptChecked = { ...this.deptChecked, [deptId]: checked };
    this.syncDepartmentsToForm();
  }

  /** Remove via chip × button. */
  removeDepartment(deptId: string): void {
    this.deptChecked = { ...this.deptChecked, [deptId]: false };
    this.syncDepartmentsToForm();
  }

  private clearAllDeptSelections(): void {
    const next: Record<string, boolean> = {};
    this.departments.forEach(d => {
      const id = this.getDeptId(d);
      if (id) next[id] = false;
    });
    this.deptChecked = next;
    this.syncDepartmentsToForm();
  }

  private syncDepartmentsToForm(): void {
    const ids = Object.keys(this.deptChecked).filter(id => this.deptChecked[id]);
    this.holidayForm.patchValue({ applicableDepartments: ids });
    this.cdr.markForCheck();
  }

  get selectedDepartments(): string[] {
    return Object.keys(this.deptChecked).filter(id => this.deptChecked[id]);
  }

  isDepartmentSelected(deptId: string): boolean {
    return !!this.deptChecked[deptId];
  }

  get isNationalHoliday(): boolean {
    const v = this.holidayForm.get('holidayType')?.value;
    return v === HolidayType.National || v === 'National';
  }

  /** Lookup department name by its departmentId. */
  getDepartmentName(id: string): string {
    const dept = this.departments.find(d => this.getDeptId(d) === id);
    return dept?.departmentName ?? dept?.DepartmentName ?? id;
  }

  // ─── Data loading 

  loadStats(): void {
    const filter: HolidayFilterDto = {
      year: new Date().getFullYear(),
      pageNumber: 1, pageSize: 1000,
      sortBy: 'HolidayDate', sortDescending: false
    };
    this.holidayService.getFilteredHolidays(filter).subscribe({
      next: (res: any) => {
        if (res.success) {
          const items: any[] = res.data.items || [];
          const now = new Date();
          this.stats.total    = res.data.totalCount;
          this.stats.upcoming = items.filter(h => new Date(h.holidayDate) >= now).length;
          this.stats.past     = items.filter(h => new Date(h.holidayDate) <  now).length;
          this.cdr.markForCheck();
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

        let list: any[] = [];
        if (Array.isArray(response)) {
          list = response;
        } else if (response?.success === true && Array.isArray(response.data)) {
          list = response.data;
        } else if (response?.success === true && Array.isArray(response.data?.items)) {
          list = response.data.items;
        } else if (Array.isArray(response?.data)) {
          list = response.data;
        } else if (Array.isArray(response?.items)) {
          list = response.items;
        }

        console.log(`[Holiday] Loaded ${list.length} departments. First item:`, list[0]);

        this.departments = list;

        const cleared: Record<string, boolean> = {};
        list.forEach((d: any) => {
          const id = this.getDeptId(d);
          if (id) cleared[id] = false;
        });
        this.deptChecked = cleared;

        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isLoadingDepartments = false;
        console.error('[Holiday] Failed to load departments:', err);
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
      next: (res: any) => {
        this.isLoadingData = false;
        if (res.success) {
          this.rowData    = res.data.items;
          this.totalItems = res.data.totalCount;
          this.totalPages = Math.ceil(this.totalItems / this.pageSize);
          if (this.gridApi) {
            this.gridApi.setGridOption('rowData', this.rowData);
            refreshGrid(this.gridApi);
            setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
          }
          this.cdr.markForCheck();
        }
      },
      error: (err: any) => {
        this.isLoadingData = false;
        if (err.status !== 401) Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load holidays.' });
      }
    });
  }

  // ─── Grid events 

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    this.gridApi.addEventListener('sortChanged',   this.onSortChanged.bind(this));
    this.gridApi.addEventListener('filterChanged', this.onFilterChanged.bind(this));
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const hostEl    = this.agGridElement?.nativeElement;
    const container = (hostEl?.closest('.hl-grid-container') as HTMLElement) ?? hostEl;
    if (container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.gridApi) requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
      });
      this.resizeObserver.observe(container);
    }
  }

  onSortChanged(_e: SortChangedEvent):    void { this.currentPage = 1; this.loadHolidays(); }
  onFilterChanged(_e: FilterChangedEvent): void { this.currentPage = 1; this.loadHolidays(); this.updateActiveFilters(); }

  highlightText(text: string, term: string): string {
    if (!term?.trim() || !text) return String(text);
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(text).replace(new RegExp(`(${esc})`, 'gi'), '<mark class="search-highlight">$1</mark>');
  }

  // ─── Pagination 

  onPageSizeChanged(n: number): void { this.pageSize = n; this.currentPage = 1; this.loadHolidays(); }
  goToPage(page: number | string): void {
    const p = Number(page);
    if (!p || p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p; this.loadHolidays();
  }
  nextPage():     void { if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1); }
  previousPage(): void { if (this.currentPage > 1) this.goToPage(this.currentPage - 1); }

  // ─── Search 

  onSearchChange(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => { this.currentPage = 1; this.loadHolidays(); this.updateActiveFilters(); }, 350);
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
    const colCount = this.gridApi ? Object.keys(this.gridApi.getFilterModel()).length : 0;
    const extra    = colCount > 0 ? { 'Column filters': `${colCount} active` } : undefined;
    const filters  = getActiveFiltersSummary(this.searchTerm, undefined, extra);
    this.activeFilters = { hasActiveFilters: filters.length > 0, filters, count: filters.length };
  }

  // ─── Modal 

  private resetForm(): void {
    this.formSubmitAttempted = false;
    this.holidayForm.reset({
      holidayName: '', holidayDate: '', holidayType: '',
      isActive: true, description: '', applicableDepartments: []
    });
    this.holidayForm.markAsPristine();
    this.holidayForm.markAsUntouched();
  }

  openAddModal(): void {
    this.modalMode = 'add'; this.selectedHoliday = null;
    this.resetForm();
    this.buildDeptChecked([]);
    this.holidayForm.enable();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  openEditModal(holiday: any): void {
    this.modalMode = 'edit'; this.selectedHoliday = holiday;
    this.resetForm();
    this.holidayForm.patchValue({
      holidayName: holiday.holidayName,
      holidayDate: this.formatDateForInput(holiday.holidayDate),
      holidayType: holiday.holidayType,
      isActive:    holiday.isActive,
      description: holiday.description ?? '',
      applicableDepartments: holiday.applicableDepartments ?? []
    });
    this.buildDeptChecked(holiday.applicableDepartments ?? []);
    this.holidayForm.enable();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  openViewModal(holiday: any): void {
    this.modalMode = 'view'; this.selectedHoliday = holiday;
    this.resetForm();
    this.holidayForm.patchValue({
      holidayName: holiday.holidayName,
      holidayDate: this.formatDateForInput(holiday.holidayDate),
      holidayType: holiday.holidayType,
      isActive:    holiday.isActive,
      description: holiday.description ?? '',
      applicableDepartments: holiday.applicableDepartments ?? []
    });
    this.buildDeptChecked(holiday.applicableDepartments ?? []);
    this.holidayForm.disable();
    this.isModalOpen = true;
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.isModalOpen = false; this.selectedHoliday = null;
    this.isSubmitting = false;
    this.resetForm();
    this.buildDeptChecked([]);
    this.holidayForm.enable();
    this.cdr.markForCheck();
  }

  onOverlayClick(event: Event): void { if (event.target === event.currentTarget) this.closeModal(); }

  viewDetails(data: any):      void { this.openViewModal(data); }
  editDepartment(data: any):   void { this.openEditModal(data); }
  toggleStatus(data: any):     void { this.onToggleStatus(data); }
  deleteDepartment(data: any): void { this.onDelete(data); }

  onGridAction(event: { action: string; data: any }): void {
    const m: any = {
      edit:   () => this.openEditModal(event.data),
      view:   () => this.openViewModal(event.data),
      toggle: () => this.onToggleStatus(event.data),
      delete: () => this.onDelete(event.data)
    };
    m[event.action]?.();
  }

  // ─── Submit 

  onSubmit(): void {
    this.formSubmitAttempted = true;
    if (this.holidayForm.invalid) {
      this.holidayForm.markAllAsTouched();
      Swal.fire({ icon: 'warning', title: 'Form Invalid', text: 'Please fill in all required fields.' });
      return;
    }
    if (!this.isNationalHoliday && this.selectedDepartments.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Department Selected', text: 'Please select at least one department for Regional or Optional holidays.' });
      return;
    }
    this.isSubmitting = true;
    this.modalMode === 'add' ? this.handleCreate() : this.handleUpdate();
  }

  private handleCreate(): void {
    const fv = this.holidayForm.value;
    const dto: CreateHolidayDto = {
      holidayName: fv.holidayName,
      holidayDate: this.toUtcIso(fv.holidayDate),
      description: fv.description || undefined,
      holidayType: fv.holidayType,
      isOptional:  false,
      isActive:    fv.isActive,
      applicableDepartments: this.selectedDepartments
    };
    this.holidayService.createHoliday(dto).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        if (res.success) {
          this.closeModal(); this.loadHolidays(); this.loadStats();
          Swal.fire({ icon: 'success', title: 'Success!', text: 'Holiday created successfully.', timer: 2000, showConfirmButton: false });
        }
      },
      error: (err: any) => {
        this.isSubmitting = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || 'Failed to create holiday.' });
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
      isOptional:            this.selectedHoliday?.isOptional,
      isActive:              fv.isActive,
      applicableDepartments: this.selectedDepartments
    };
    this.holidayService.updateHoliday(this.selectedHoliday.id, dto).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        if (res.success) {
          this.closeModal(); this.loadHolidays(); this.loadStats();
          Swal.fire({ icon: 'success', title: 'Updated!', text: 'Holiday updated successfully.', timer: 2000, showConfirmButton: false });
        }
      },
      error: (err: any) => {
        this.isSubmitting = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err.error?.message || 'Failed to update holiday.' });
      }
    });
  }

  // ─── Toggle / Delete 

  onToggleStatus(holiday: any): void {
    const newStatus = !holiday.isActive;
    const label     = newStatus ? 'Active' : 'Inactive';
    Swal.fire({
      title: `${newStatus ? 'Activate' : 'Deactivate'} Holiday?`,
      html:  `<div style="text-align:left;padding:10px;"><p><strong>${holiday.holidayName}</strong></p><p>New Status: <strong style="color:${newStatus ? '#10b981' : '#6b7280'}">${label}</strong></p></div>`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: newStatus ? '#10b981' : '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${newStatus ? 'activate' : 'deactivate'}!`
    }).then(result => {
      if (!result.isConfirmed) return;
      this.holidayService.updateHoliday(holiday.id, { isActive: newStatus }).subscribe({
        next: (res: any) => {
          if (res.success) {
            const idx = this.rowData.findIndex(r => r.id === holiday.id);
            if (idx !== -1) {
              this.rowData[idx].isActive = newStatus;
              this.gridApi.setGridOption('rowData', [...this.rowData]);
              refreshGrid(this.gridApi);
            }
            this.loadStats(); this.cdr.markForCheck();
            Swal.fire({ icon: 'success', title: 'Updated!', text: `Holiday is now ${label}.`, timer: 2000, showConfirmButton: false });
          }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update status.' })
      });
    });
  }

  onDelete(holiday: any): void {
    Swal.fire({
      title: 'Delete Holiday?',
      html:  `<div style="text-align:left;padding:10px;"><p>Delete <strong>"${holiday.holidayName}"</strong>?</p><p style="color:#ef4444;margin-top:10px;padding:8px;background:#fee2e2;border-radius:6px;"><strong>Warning:</strong> Cannot be undone.</p></div>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete!'
    }).then(result => {
      if (!result.isConfirmed) return;
      this.holidayService.deleteHoliday(holiday.id).subscribe({
        next: (res: any) => {
          if (res.success) {
            const idx = this.rowData.findIndex(r => r.id === holiday.id);
            if (idx !== -1) {
              this.rowData.splice(idx, 1);
              this.gridApi.setGridOption('rowData', [...this.rowData]);
              refreshGrid(this.gridApi);
            }
            this.totalItems = Math.max(0, this.totalItems - 1);
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            if (this.rowData.length === 0 && this.currentPage > 1) { this.currentPage--; this.loadHolidays(); }
            this.loadStats(); this.cdr.markForCheck();
            Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Holiday deleted.', timer: 2500, showConfirmButton: false });
          }
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete holiday.' })
      });
    });
  }

  exportData(): void {
    exportToCsv(this.gridApi, 'holidays');
    Swal.fire({ icon: 'success', title: 'Exported!', text: 'Holiday data exported as CSV.', timer: 2000, showConfirmButton: false });
  }

  // ─── Date helpers 

  formatDateForInput(date: any): string {
    const d = new Date(date);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  formatDate(date: any): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private toUtcIso(dateStr: string): string {
    return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
  }
}