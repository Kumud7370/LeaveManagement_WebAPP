import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { ShiftService } from '../../../core/services/api/shift.api';
import { Shift, ShiftFilterDto } from '../../../core/Models/shift.model';
import { ShiftFormComponent } from '../shift-form/shift-form.component';
import { ActionCellRendererComponent } from '../../../shared/action-cell-renderer.component';

@Component({
    selector: 'app-shift-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AgGridModule,
        ShiftFormComponent,
        ActionCellRendererComponent
    ],
    templateUrl: './shift-list.component.html',
    styleUrls: ['./shift-list.component.scss']
})
export class ShiftListComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private gridApi!: GridApi;

    // ── Data ─────────────────────────────────────────────────
    shifts: Shift[] = [];
    totalRecords = 0;
    currentPage = 1;
    pageSize = 10;
    isLoading = false;

    // ── Filter — search only (no dropdowns) ──────────────────
    searchTerm = '';

    // ── Modal ─────────────────────────────────────────────────
    showModal = false;
    modalMode: 'create' | 'edit' | 'view' = 'create';
    selectedShift: Shift | null = null;

    // ── AG Grid columns ───────────────────────────────────────
    columnDefs: ColDef[] = [
        {
            headerName: 'Actions',
            field: 'id',
            cellRenderer: ActionCellRendererComponent,
            width: 160,
            pinned: 'left',
            sortable: false,
            filter: false,
            resizable: false
        },
        {
            headerName: 'Color',
            field: 'color',
            width: 75,
            sortable: false,
            filter: false,
            resizable: false,
            cellRenderer: (params: ICellRendererParams) =>
                `<div style="width:28px;height:28px;border-radius:6px;background:${params.value};
                 border:1px solid rgba(0,0,0,.15);margin-top:9px;"></div>`
        },
        {
            headerName: 'Shift Name',
            field: 'shiftName',
            flex: 1,
            minWidth: 150,
            sortable: true,
            filter: true
        },
        {
            headerName: 'Code',
            field: 'shiftCode',
            width: 120,
            sortable: true,
            filter: true,
            cellRenderer: (params: ICellRendererParams) =>
                `<span style="font-family:monospace;font-size:0.78rem;background:#f1f5f9;
                 padding:2px 8px;border-radius:4px;font-weight:600;">${params.value}</span>`
        },
        {
            headerName: 'Timing',
            field: 'shiftTimingDisplay',
            width: 145,
            sortable: false,
            cellStyle: { fontWeight: '600', color: '#334155' }
        },
        {
            headerName: 'Net Working',
            field: 'netWorkingHours',
            width: 125,
            sortable: false,
            cellRenderer: (params: ICellRendererParams) =>
                `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;
                 border-radius:4px;font-size:0.78rem;font-weight:600;">${params.value}</span>`
        },
        {
            headerName: 'Grace Period',
            field: 'gracePeriodMinutes',
            width: 125,
            sortable: true,
            valueFormatter: (p) => `${p.value} min`
        },
        {
            headerName: 'Night Shift',
            field: 'isNightShift',
            width: 120,
            sortable: true,
            cellRenderer: (params: ICellRendererParams) =>
                params.value
                    ? `<span style="background:#ede9fe;color:#4c1d95;padding:2px 8px;border-radius:4px;font-size:0.78rem;font-weight:600;">🌙 Yes</span>`
                    : `<span style="background:#fef9c3;color:#713f12;padding:2px 8px;border-radius:4px;font-size:0.78rem;font-weight:600;">☀️ No</span>`
        },
        {
            headerName: 'Allowance %',
            field: 'nightShiftAllowancePercentage',
            width: 125,
            sortable: true,
            valueFormatter: (p) => p.data?.isNightShift ? `${p.value}%` : '—'
        },
        {
            headerName: 'Status',
            field: 'isActive',
            width: 105,
            sortable: true,
            cellRenderer: (params: ICellRendererParams) =>
                params.value
                    ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:0.78rem;font-weight:600;">Active</span>`
                    : `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:0.78rem;font-weight:600;">Inactive</span>`
        },
        {
            headerName: 'Order',
            field: 'displayOrder',
            width: 85,
            sortable: true
        },
        {
            headerName: 'Created',
            field: 'createdAt',
            width: 135,
            sortable: true,
            valueFormatter: (p) => this.formatDate(p.value)
        }
    ];

    defaultColDef: ColDef = { resizable: true, sortable: true, filter: true };

    context = { componentParent: this };

    constructor(private shiftService: ShiftService, private router: Router) { }

    ngOnInit(): void { this.loadShifts(); }
    ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

    onGridReady(params: GridReadyEvent): void {
        this.gridApi = params.api;
        this.gridApi.sizeColumnsToFit();
    }

    // ── Load ──────────────────────────────────────────────────
    loadShifts(): void {
        this.isLoading = true;
        const filter: ShiftFilterDto = {
            searchTerm: this.searchTerm || undefined,
            // Removed: isActive and isNightShift filters (dropdowns removed)
            pageNumber: this.currentPage,
            pageSize: this.pageSize,
            sortBy: 'DisplayOrder',
            sortDescending: false
        };

        this.shiftService.getFilteredShifts(filter)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    if (res.success) {
                        this.shifts = res.data.items;
                        this.totalRecords = res.data.totalCount;
                        setTimeout(() => { if (this.gridApi) this.gridApi.sizeColumnsToFit(); }, 100);
                    }
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error('Error loading shifts:', err);
                    this.isLoading = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Connection Error',
                        text: 'Failed to load shifts. Please check your API connection.',
                        confirmButtonColor: '#ef4444'
                    });
                }
            });
    }

    // ── Filters ───────────────────────────────────────────────
    onSearch(): void { this.currentPage = 1; this.loadShifts(); }

    clearFilters(): void {
        this.searchTerm = '';
        this.currentPage = 1;
        this.loadShifts();
    }

    // ── Pagination ────────────────────────────────────────────
    onPageChange(page: number): void { this.currentPage = page; this.loadShifts(); }
    onPageSizeChange(size: number): void { this.pageSize = size; this.currentPage = 1; this.loadShifts(); }
    get totalPages(): number { return Math.ceil(this.totalRecords / this.pageSize); }
    getMaxRecords(): number { return Math.min(this.currentPage * this.pageSize, this.totalRecords); }

    // ── Export ────────────────────────────────────────────────
    exportData(): void {
        if (this.gridApi) this.gridApi.exportDataAsCsv({ fileName: `shifts_${Date.now()}.csv` });
    }

    // ── Modal ─────────────────────────────────────────────────
    openCreateModal(): void {
        this.modalMode = 'create'; this.selectedShift = null; this.showModal = true;
    }

    viewDetails(shift: Shift): void {
        this.modalMode = 'view'; this.selectedShift = shift; this.showModal = true;
    }

    editDepartment(shift: Shift): void {
        this.modalMode = 'edit'; this.selectedShift = shift; this.showModal = true;
    }

    toggleStatus(shift: Shift): void {
        const action = shift.isActive ? 'Deactivate' : 'Activate';
        const btnColor = shift.isActive ? '#f59e0b' : '#10b981';

        Swal.fire({
            title: `${action} Shift?`,
            html: `Are you sure you want to <b>${action.toLowerCase()}</b> <b>"${shift.shiftName}"</b>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: btnColor,
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Yes, ${action.toLowerCase()} it!`
        }).then(result => {
            if (!result.isConfirmed) return;

            this.shiftService.toggleShiftStatus(shift.id, !shift.isActive)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (res) => {
                        if (res.success) {
                            const idx = this.shifts.findIndex(s => s.id === shift.id);
                            if (idx > -1) {
                                this.shifts[idx] = { ...this.shifts[idx], isActive: !this.shifts[idx].isActive };
                                this.shifts = [...this.shifts];
                            }
                            Swal.fire({
                                icon: 'success',
                                title: `${action}d!`,
                                text: `"${shift.shiftName}" has been ${action.toLowerCase()}d.`,
                                confirmButtonColor: '#3b82f6',
                                timer: 1800,
                                timerProgressBar: true,
                                showConfirmButton: false
                            });
                        }
                    },
                    error: () => Swal.fire({
                        icon: 'error', title: 'Error',
                        text: 'Failed to update shift status.',
                        confirmButtonColor: '#ef4444'
                    })
                });
        });
    }

    deleteDepartment(shift: Shift): void {
        Swal.fire({
            title: 'Delete Shift?',
            html: `Are you sure you want to delete <b>"${shift.shiftName}"</b>?<br>
                   <span style="color:#ef4444;font-size:0.85rem;">This action cannot be undone.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        }).then(result => {
            if (!result.isConfirmed) return;

            this.isLoading = true;
            this.shiftService.deleteShift(shift.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (res) => {
                        if (res.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: `"${shift.shiftName}" has been deleted.`,
                                confirmButtonColor: '#3b82f6',
                                timer: 2000,
                                timerProgressBar: true,
                                showConfirmButton: false
                            });
                            this.loadShifts();
                        } else {
                            this.isLoading = false;
                            Swal.fire({
                                icon: 'error', title: 'Failed',
                                text: 'Could not delete this shift.',
                                confirmButtonColor: '#ef4444'
                            });
                        }
                    },
                    error: (err) => {
                        this.isLoading = false;
                        console.error('Delete error:', err);
                        Swal.fire({
                            icon: 'error', title: 'Error',
                            text: 'An error occurred while deleting.',
                            confirmButtonColor: '#ef4444'
                        });
                    }
                });
        });
    }

    // ── Modal events ──────────────────────────────────────────
    onModalClose(): void { this.showModal = false; this.selectedShift = null; }
    onModalSuccess(): void { this.showModal = false; this.selectedShift = null; this.loadShifts(); }

    // ── Utils ─────────────────────────────────────────────────
    formatDate(date: any): string {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }
}