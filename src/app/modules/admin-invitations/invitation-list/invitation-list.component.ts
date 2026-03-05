import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef,
  GridOptions,
  GridReadyEvent,
  GridApi,
  ICellRendererParams,
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz
} from 'ag-grid-community';
import { AdminInvitationService } from '../../../core/services/api/admin-invitation.api';
import {
  InvitationResponseDto,
  SendInvitationDto,
  EditInvitationDto,
  InvitationStats
} from '../../../core/Models/admin-invitation.model';
import { PaginationManager, PagedResultDto } from '../../../core/Models/pagination.model';
import { InvitationActionCellRendererComponent } from '../invitation-action-cell-renderer.component';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

const invitationGridTheme = themeQuartz.withParams({
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
  headerFontWeight:               500,
  headerFontSize:                 13,
  rowBorder:                      true,
});

@Component({
  selector: 'app-invitation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, InvitationActionCellRendererComponent],
  templateUrl: './invitation-list.component.html',
  styleUrls: ['./invitation-list.component.scss']
})
export class InvitationListComponent implements OnInit, OnDestroy {

  @ViewChild('agGrid', { read: ElementRef }) agGridElement!: ElementRef<HTMLElement>;

  readonly gridTheme = invitationGridTheme;
  context = { componentParent: this };

  // Raw full list from API (never mutated)
  private allInvitations: InvitationResponseDto[] = [];

  // Current page slice shown in the grid
  invitations: InvitationResponseDto[] = [];

  gridApi!: GridApi;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Pagination
  paginationManager = new PaginationManager(1, 10);
  pagedResult: PagedResultDto<InvitationResponseDto> | null = null;
  pageSizeOptions = [5, 10, 25, 50];

  // Filters
  searchTerm = '';

  // Modal States
  showAddModal  = false;
  showEditModal = false;
  submitting    = false;

  // Form Data
  formData: SendInvitationDto = { email: '', role: 'Admin', notes: undefined };
  editFormData: EditInvitationDto & { id: string } = {
    id: '', email: undefined, role: undefined, notes: undefined
  };

  // Stats
  stats: InvitationStats = { total: 0, pending: 0, accepted: 0, expired: 0 };

  private resizeObserver: ResizeObserver | null = null;
  private sidebarResizeTimer: any = null;

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
    minWidth: 80,
    suppressSizeToFit: false,
    suppressAutoSize: false,
  };

  columnDefs: ColDef[] = [];

  constructor(
    private invitationService: AdminInvitationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeColumnDefs();
    this.loadInvitations();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    clearTimeout(this.sidebarResizeTimer);
  }

  @HostListener('window:resize')
  onWindowResize(): void { this.scheduleSizeColumnsToFit(); }

  private scheduleSizeColumnsToFit(delay = 320): void {
    clearTimeout(this.sidebarResizeTimer);
    this.sidebarResizeTimer = setTimeout(() => {
      if (this.gridApi) this.gridApi.sizeColumnsToFit();
    }, delay);
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);

    const hostEl    = this.agGridElement?.nativeElement;
    const container = (hostEl?.closest('.il-grid-container') as HTMLElement) ?? hostEl;
    if (container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.gridApi) requestAnimationFrame(() => this.gridApi?.sizeColumnsToFit());
      });
      this.resizeObserver.observe(container);
    }
  }

  // ─── Pagination Getters ──────────────────────────────────────────────────

  get currentPage(): number  { return this.paginationManager.pageNumber; }
  get pageSize(): number     { return this.paginationManager.pageSize; }
  get totalPages(): number   { return this.pagedResult?.totalPages ?? 0; }
  get totalItems(): number   { return this.pagedResult?.totalCount ?? 0; }
  get hasNextPage(): boolean { return this.pagedResult?.hasNextPage ?? false; }
  get hasPrevPage(): boolean { return this.pagedResult?.hasPreviousPage ?? false; }

  get showingFrom(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      range.push(i);
    }
    return range;
  }

  // ─── Pagination Actions ──────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.paginationManager.goToPage(page);
    this.applyPagination();
  }

  onPageSizeChange(size: number): void {
    this.paginationManager.setPageSize(Number(size));
    this.applyPagination();
  }

  nextPage(): void {
    if (this.pagedResult?.hasNextPage) {
      this.paginationManager.nextPage(this.pagedResult);
      this.applyPagination();
    }
  }

  prevPage(): void {
    if (this.pagedResult?.hasPreviousPage) {
      this.paginationManager.prevPage(this.pagedResult);
      this.applyPagination();
    }
  }

  // ─── Data Loading ────────────────────────────────────────────────────────

  loadInvitations(): void {
    this.loading = true;
    this.error = null;

    this.invitationService.getAllInvitations().subscribe({
      next: (response) => {
        if (response.success) {
          this.allInvitations = response.data;
          this.calculateStats();
          this.paginationManager.goToPage(1);
          this.applyPagination();
        } else {
          this.error = response.message || 'Failed to load invitations';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'An error occurred while loading invitations';
        this.loading = false;
      }
    });
  }

  private applyPagination(): void {
    let filtered = [...this.allInvitations];

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.email.toLowerCase().includes(q) ||
        inv.invitedRole.toLowerCase().includes(q) ||
        inv.invitedByName.toLowerCase().includes(q)
      );
    }

    const start  = (this.paginationManager.pageNumber - 1) * this.paginationManager.pageSize;
    const sliced = filtered.slice(start, start + this.paginationManager.pageSize);

    this.pagedResult = new PagedResultDto<InvitationResponseDto>({
      items: sliced,
      totalCount: filtered.length,
      pageNumber: this.paginationManager.pageNumber,
      pageSize: this.paginationManager.pageSize
    });

    this.invitations = this.pagedResult.items;

    if (this.gridApi) {
      this.gridApi.setGridOption('rowData', this.invitations);
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
    }
  }

  calculateStats(): void {
    const all = this.allInvitations;
    this.stats.total    = all.length;
    this.stats.pending  = all.filter(inv => inv.status === 'Pending' && new Date(inv.expiresAt) > new Date()).length;
    this.stats.accepted = all.filter(inv => inv.status === 'Accepted').length;
    this.stats.expired  = all.filter(inv =>
      inv.status === 'Expired' || inv.status === 'Revoked' ||
      (inv.status === 'Pending' && new Date(inv.expiresAt) <= new Date())
    ).length;
  }

  onSearch(): void {
    this.paginationManager.goToPage(1);
    this.applyPagination();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.paginationManager.goToPage(1);
    this.applyPagination();
  }

  // ─── Column Definitions ──────────────────────────────────────────────────

  initializeColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: 'Actions',
        width: 110, minWidth: 110, maxWidth: 110,
        sortable: false, filter: false, floatingFilter: false,
        suppressFloatingFilterButton: true,
        suppressSizeToFit: true,
        cellClass: 'actions-cell',
        cellStyle: { display: 'flex', alignItems: 'center', padding: '0', overflow: 'visible' },
        cellRenderer: InvitationActionCellRendererComponent,
      },
      {
        headerName: 'Recipient',
        field: 'email',
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams) => p.value
          ? `<span style="font-weight:600;font-size:13px;color:#111827;">${p.value}</span>`
          : '—'
      },
      {
        headerName: 'Role',
        field: 'invitedRole',
        width: 130, minWidth: 100,
        cellRenderer: (p: ICellRendererParams) => {
          if (!p.value) return '';
          const roleColors: Record<string, [string, string]> = {
            SuperAdmin: ['#f3e8ff', '#7c3aed'],
            Admin:      ['#e0e7ff', '#4f46e5'],
            Manager:    ['#dbeafe', '#2563eb'],
            Employee:   ['#cffafe', '#0891b2']
          };
          const [bg, color] = roleColors[p.value] ?? ['#f3f4f6', '#6b7280'];
          return `<span style="display:inline-flex;align-items:center;padding:3px 10px;
            background:${bg};color:${color};border-radius:5px;
            font-size:12px;font-weight:600;">${p.value}</span>`;
        }
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 130, minWidth: 110,
        cellRenderer: (p: ICellRendererParams) => {
          const status    = p.data?.status;
          const expiresAt = p.data?.expiresAt;
          let bg = '', color = '', lbl = '', icon = '';
          if (status === 'Accepted') {
            bg = '#dcfce7'; color = '#166534'; lbl = 'Accepted'; icon = 'bi-check-circle';
          } else if (status === 'Revoked') {
            bg = '#fee2e2'; color = '#991b1b'; lbl = 'Revoked'; icon = 'bi-x-circle';
          } else if (status === 'Expired' || (expiresAt && new Date(expiresAt) <= new Date())) {
            bg = '#f1f5f9'; color = '#475569'; lbl = 'Expired'; icon = 'bi-clock';
          } else {
            bg = '#fef9c3'; color = '#92400e'; lbl = 'Pending'; icon = 'bi-clock-history';
          }
          return `<span style="display:inline-flex;align-items:center;gap:5px;padding:2px 12px;
            border-radius:9999px;font-size:12px;font-weight:600;background:${bg};color:${color};">
            <i class="bi ${icon}" style="font-size:11px;"></i>${lbl}</span>`;
        }
      },
      {
        headerName: 'Invited By',
        field: 'invitedByName',
        width: 170, minWidth: 130,
        cellRenderer: (p: ICellRendererParams) => p.value
          ? `<span style="font-size:13px;color:#374151;">${p.value}</span>`
          : `<span style="color:#d1d5db;font-size:13px;">—</span>`
      },
      {
        headerName: 'Created',
        field: 'createdAt',
        width: 145, minWidth: 120,
        valueFormatter: (p: any) => p.value
          ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
      },
      {
        headerName: 'Expires',
        field: 'expiresAt',
        width: 145, minWidth: 120,
        valueFormatter: (p: any) => p.value
          ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
      }
    ];
  }

  // ─── Modals ──────────────────────────────────────────────────────────────

  openAddModal(): void {
    this.formData = { email: '', role: 'Admin', notes: undefined };
    this.showAddModal = true;
    this.error = null;
  }
  closeAddModal(): void  { this.showAddModal  = false; this.error = null; }

  openEditModal(invitation: InvitationResponseDto): void {
    this.editFormData = {
      id: invitation.id, email: invitation.email,
      role: invitation.invitedRole, notes: invitation.notes
    };
    this.showEditModal = true;
    this.error = null;
  }
  closeEditModal(): void { this.showEditModal = false; this.error = null; }

  // ─── CRUD ────────────────────────────────────────────────────────────────

  handleSendInvitation(): void {
    if (!this.formData.email || !this.formData.role) {
      this.error = 'Please fill in all required fields';
      return;
    }
    this.submitting = true;
    this.error = null;
    this.invitationService.sendInvitation(this.formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `Invitation sent successfully to ${this.formData.email}`;
          this.closeAddModal();
          this.loadInvitations();
          Swal.fire({ icon: 'success', title: 'Sent!', text: 'Invitation sent successfully.', timer: 1500, showConfirmButton: false });
          setTimeout(() => this.successMessage = null, 3000);
        } else {
          this.error = response.message || 'Failed to send invitation';
        }
        this.submitting = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to send invitation';
        this.submitting = false;
      }
    });
  }

  handleEditInvitation(): void {
    if (!this.editFormData.id) return;
    this.submitting = true;
    this.error = null;
    const { id, ...updateData } = this.editFormData;
    this.invitationService.updateInvitation(id, updateData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Invitation updated successfully';
          this.closeEditModal();
          this.loadInvitations();
          Swal.fire({ icon: 'success', title: 'Updated!', text: 'Invitation updated successfully.', timer: 1500, showConfirmButton: false });
          setTimeout(() => this.successMessage = null, 3000);
        } else {
          this.error = response.message || 'Failed to update invitation';
        }
        this.submitting = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to update invitation';
        this.submitting = false;
      }
    });
  }

  editInvitation(invitation: InvitationResponseDto): void { this.openEditModal(invitation); }

  async revokeInvitation(invitation: InvitationResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Revoke Invitation?',
      html: `Revoke the invitation for <strong>${invitation.email}</strong>?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Revoke'
    });
    if (!result.isConfirmed) return;
    this.invitationService.revokeInvitation(invitation.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Revoked!', timer: 1500, showConfirmButton: false });
          this.loadInvitations();
        }
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'Failed to revoke.', 'error')
    });
  }

  async deleteInvitation(invitation: InvitationResponseDto): Promise<void> {
    const result = await Swal.fire({
      title: 'Delete Invitation?',
      html: `<p>Permanently delete the invitation for <strong>${invitation.email}</strong>?</p>
             <p style="color:#ef4444;padding:10px;background:#fee2e2;border-radius:6px;margin-top:10px;">
               <strong>Warning:</strong> This cannot be undone.</p>`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });
    if (!result.isConfirmed) return;
    this.invitationService.deleteInvitation(invitation.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
          this.loadInvitations();
        }
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'Failed to delete.', 'error')
    });
  }

  exportToExcel(): void {
    if (!this.allInvitations.length) { Swal.fire('No Data', 'Nothing to export.', 'info'); return; }
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const data = this.allInvitations.map(inv => ({
      'Email':      inv.email,
      'Role':       inv.invitedRole,
      'Status':     inv.status,
      'Invited By': inv.invitedByName,
      'Created At': new Date(inv.createdAt).toLocaleDateString(),
      'Expires At': new Date(inv.expiresAt).toLocaleDateString(),
      'Notes':      inv.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [30, 15, 12, 25, 15, 15, 40].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invitations');
    const fn = `Admin_Invitations_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fn);
    Swal.fire({ title: 'Done!', text: `${fn} downloaded.`, icon: 'success', timer: 2500, showConfirmButton: false });
  }
}