import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { AdminInvitationService } from '../../../core/services/api/admin-invitation.api';
import {
    InvitationResponseDto,
    SendInvitationDto,
    EditInvitationDto,
    InvitationStats
} from '../../../core/Models/admin-invitation.model';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { StatusCellRendererComponent } from '../../../shared/status-cell-renderer.component';

@Component({
    selector: 'app-invitation-list',
    standalone: true,
    imports: [CommonModule, FormsModule, AgGridAngular],
    templateUrl: './invitation-list.component.html',
    styleUrls: ['./invitation-list.component.scss']
})
export class InvitationListComponent implements OnInit {
    invitations: InvitationResponseDto[] = [];
    loading = false;
    error: string | null = null;
    successMessage: string | null = null;

    // Filters
    searchTerm = '';
    statusFilter: 'all' | 'pending' | 'accepted' | 'expired' = 'all';

    // Modal States
    showAddModal = false;
    showEditModal = false;
    submitting = false;

    // Form Data
    formData: SendInvitationDto = {
        email: '',
        role: 'Admin',
        notes: undefined
    };

    editFormData: EditInvitationDto & { id: string } = {
        id: '',
        email: undefined,
        role: undefined,
        notes: undefined
    };

    // AG Grid
    columnDefs: ColDef[] = [];
    defaultColDef: ColDef = {
        sortable: true,
        filter: true,
        resizable: true,
        flex: 1,
        minWidth: 100,
    };
    gridOptions: GridOptions = {
        pagination: false,
        domLayout: 'autoHeight',
        rowSelection: 'single',
        suppressRowClickSelection: true,
        suppressCellFocus: true,
        onCellClicked: (event: any) => {
            const target = event.event?.target as HTMLElement;
            if (!target) return;

            const actionBtn = target.closest
                ? target.closest('[data-action]') as HTMLElement | null
                : null;

            const action = actionBtn?.getAttribute('data-action');
            if (!action || !event.data) return;

            const invitation: InvitationResponseDto = event.data;

            switch (action) {
                case 'edit':
                    this.editInvitation(invitation);
                    break;
                case 'revoke':
                    this.revokeInvitation(invitation);
                    break;
                case 'delete':
                    this.deleteInvitation(invitation);
                    break;
            }
        }
    };

    // Stats
    stats: InvitationStats = {
        total: 0,
        pending: 0,
        accepted: 0,
        expired: 0
    };

    constructor(
        private invitationService: AdminInvitationService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.initializeColumnDefs();
        this.loadInvitations();
    }

    initializeColumnDefs(): void {
        this.columnDefs = [
            {
                headerName: 'ACTIONS',
                width: 150,
                sortable: false,
                filter: false,
                pinned: 'left',
                suppressKeyboardEvent: () => true,
                cellStyle: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'visible'
                },
                cellRenderer: (params: ICellRendererParams) => {
                    if (!params.data) return '';

                    const isValid = params.data.status === 'Pending' &&
                        new Date(params.data.expiresAt) > new Date();

                    const editBtn = isValid
                        ? `<button
                            data-action="edit"
                            title="Edit"
                            style="width:2rem;height:2rem;border:none;border-radius:0.375rem;
                                   cursor:pointer;display:flex;align-items:center;justify-content:center;
                                   background:#fef3c7;color:#92400e;font-size:0.875rem;pointer-events:all;">
                            <i class="bi bi-pencil" style="pointer-events:none;"></i>
                          </button>`
                        : '';

                    const revokeBtn = isValid
                        ? `<button
                            data-action="revoke"
                            title="Revoke"
                            style="width:2rem;height:2rem;border:none;border-radius:0.375rem;
                                   cursor:pointer;display:flex;align-items:center;justify-content:center;
                                   background:#fee2e2;color:#991b1b;font-size:0.875rem;pointer-events:all;">
                            <i class="bi bi-x-circle" style="pointer-events:none;"></i>
                          </button>`
                        : '';

                    return `
                        <div style="display:flex;gap:0.4rem;align-items:center;height:100%;pointer-events:all;">
                            ${editBtn}
                            ${revokeBtn}
                            <button
                                data-action="delete"
                                title="Delete"
                                style="width:2rem;height:2rem;border:none;border-radius:0.375rem;
                                       cursor:pointer;display:flex;align-items:center;justify-content:center;
                                       background:#f3f4f6;color:#6b7280;font-size:0.875rem;pointer-events:all;">
                                <i class="bi bi-trash" style="pointer-events:none;"></i>
                            </button>
                        </div>
                    `;
                }
            },
            {
                headerName: 'RECIPIENT',
                field: 'email',
                minWidth: 250,
                flex: 2,
                cellStyle: { fontWeight: '500', color: '#1e293b' },
                cellRenderer: (params: ICellRendererParams) => params.value || '—'
            },
            {
                headerName: 'ROLE',
                field: 'invitedRole',
                width: 120,
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                cellRenderer: (params: ICellRendererParams) => {
                    const roleColors: Record<string, { bg: string; text: string }> = {
                        SuperAdmin: { bg: '#f3e8ff', text: '#7c3aed' },
                        Admin:      { bg: '#e0e7ff', text: '#4f46e5' },
                        Manager:    { bg: '#dbeafe', text: '#2563eb' },
                        Employee:   { bg: '#cffafe', text: '#0891b2' }
                    };
                    const color = roleColors[params.value] || { bg: '#f3f4f6', text: '#6b7280' };
                    return `<span style="display:inline-flex;align-items:center;justify-content:center;
                                        padding:0.3rem 0.65rem;border-radius:0.375rem;font-size:0.8rem;
                                        font-weight:600;background:${color.bg};color:${color.text};">
                                ${params.value ?? '—'}
                            </span>`;
                }
            },
            {
                headerName: 'STATUS',
                field: 'status',
                width: 130,
                cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
                cellRenderer: (params: ICellRendererParams) => {
                    const status = params.data?.status;
                    const expiresAt = params.data?.expiresAt;

                    let text = '', bg = '', color = '', icon = '';

                    if (status === 'Accepted') {
                        text = 'Accepted'; bg = '#d1fae5'; color = '#065f46'; icon = 'bi-check-circle';
                    } else if (status === 'Revoked') {
                        text = 'Revoked'; bg = '#fee2e2'; color = '#991b1b'; icon = 'bi-x-circle';
                    } else if (status === 'Expired' || (expiresAt && new Date(expiresAt) <= new Date())) {
                        text = 'Expired'; bg = '#f3f4f6'; color = '#6b7280'; icon = 'bi-clock';
                    } else {
                        text = 'Pending'; bg = '#dbeafe'; color = '#1e40af'; icon = 'bi-clock-history';
                    }

                    return `<span style="display:inline-flex;align-items:center;gap:0.35rem;
                                        padding:0.35rem 0.75rem;border-radius:0.5rem;font-size:0.8rem;
                                        font-weight:600;background:${bg};color:${color};">
                                <i class="bi ${icon}" style="font-size:0.85rem;"></i>
                                ${text}
                            </span>`;
                }
            },
            {
                headerName: 'INVITED BY',
                field: 'invitedByName',
                width: 200,
                cellRenderer: (params: ICellRendererParams) => params.value || '—'
            },
            {
                headerName: 'CREATED',
                field: 'createdAt',
                width: 150,
                valueFormatter: (params: any) => {
                    if (!params.value) return '—';
                    return new Date(params.value).toLocaleDateString('en-US', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    });
                }
            },
            {
                headerName: 'EXPIRES',
                field: 'expiresAt',
                width: 150,
                valueFormatter: (params: any) => {
                    if (!params.value) return '—';
                    return new Date(params.value).toLocaleDateString('en-US', {
                        day: 'numeric', month: 'short', year: 'numeric'
                    });
                }
            }
        ];
    }

    onGridReady(params: GridReadyEvent): void {
        params.api.sizeColumnsToFit();
    }

    loadInvitations(): void {
        this.loading = true;
        this.error = null;

        this.invitationService.getAllInvitations().subscribe({
            next: (response) => {
                if (response.success) {
                    this.invitations = response.data;
                    this.calculateStats();
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

    calculateStats(): void {
        this.stats.total = this.invitations.length;
        this.stats.pending = this.invitations.filter(inv =>
            inv.status === 'Pending' && new Date(inv.expiresAt) > new Date()
        ).length;
        this.stats.accepted = this.invitations.filter(inv =>
            inv.status === 'Accepted'
        ).length;
        this.stats.expired = this.invitations.filter(inv =>
            inv.status === 'Expired' || inv.status === 'Revoked' ||
            (inv.status === 'Pending' && new Date(inv.expiresAt) <= new Date())
        ).length;
    }

    get filteredInvitations(): InvitationResponseDto[] {
        let filtered = [...this.invitations];

        if (this.statusFilter === 'pending') {
            filtered = filtered.filter(inv =>
                inv.status === 'Pending' && new Date(inv.expiresAt) > new Date()
            );
        } else if (this.statusFilter === 'accepted') {
            filtered = filtered.filter(inv => inv.status === 'Accepted');
        } else if (this.statusFilter === 'expired') {
            filtered = filtered.filter(inv =>
                inv.status === 'Expired' || inv.status === 'Revoked' ||
                (inv.status === 'Pending' && new Date(inv.expiresAt) <= new Date())
            );
        }

        if (this.searchTerm.trim()) {
            const query = this.searchTerm.toLowerCase();
            filtered = filtered.filter(inv =>
                inv.email.toLowerCase().includes(query) ||
                inv.invitedRole.toLowerCase().includes(query) ||
                inv.invitedByName.toLowerCase().includes(query)
            );
        }

        return filtered;
    }

    onSearch(): void {}

    clearSearch(): void {
        this.searchTerm = '';
        this.statusFilter = 'all';
    }

    openAddModal(): void {
        this.formData = { email: '', role: 'Admin', notes: undefined };
        this.showAddModal = true;
        this.error = null;
    }

    closeAddModal(): void {
        this.showAddModal = false;
    }

    openEditModal(invitation: InvitationResponseDto): void {
        this.editFormData = {
            id: invitation.id,
            email: invitation.email,
            role: invitation.invitedRole,
            notes: invitation.notes
        };
        this.showEditModal = true;
        this.error = null;
    }

    closeEditModal(): void {
        this.showEditModal = false;
    }

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
                    Swal.fire({
                        icon: 'success',
                        title: 'Sent!',
                        text: 'Invitation sent successfully.',
                        timer: 1500,
                        showConfirmButton: false
                    });
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
                    Swal.fire({
                        icon: 'success',
                        title: 'Updated!',
                        text: 'Invitation updated successfully.',
                        timer: 1500,
                        showConfirmButton: false
                    });
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

    editInvitation(invitation: InvitationResponseDto): void {
        this.openEditModal(invitation);
    }

    async revokeInvitation(invitation: InvitationResponseDto): Promise<void> {
        const result = await Swal.fire({
            title: 'Revoke Invitation?',
            html: `Are you sure you want to revoke the invitation for <strong>${invitation.email}</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, revoke it!'
        });

        if (result.isConfirmed) {
            this.invitationService.revokeInvitation(invitation.id).subscribe({
                next: (response) => {
                    if (response.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Revoked!',
                            text: 'Invitation has been revoked successfully.',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        this.loadInvitations();
                    }
                },
                error: (err) => {
                    Swal.fire('Error', err.error?.message || 'Failed to revoke invitation.', 'error');
                }
            });
        }
    }

    async deleteInvitation(invitation: InvitationResponseDto): Promise<void> {
        const result = await Swal.fire({
            title: 'Delete Invitation?',
            html: `Are you sure you want to permanently delete the invitation for <strong>${invitation.email}</strong>?<br>This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            this.invitationService.deleteInvitation(invitation.id).subscribe({
                next: (response) => {
                    if (response.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Invitation has been deleted.',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        this.loadInvitations();
                    }
                },
                error: (err) => {
                    Swal.fire('Error', err.error?.message || 'Failed to delete invitation.', 'error');
                }
            });
        }
    }

    exportToExcel(): void {
        if (this.invitations.length === 0) {
            Swal.fire('No Data', 'There are no invitations to export.', 'info');
            return;
        }

        const exportData = this.invitations.map(inv => ({
            'Email': inv.email,
            'Role': inv.invitedRole,
            'Status': inv.status,
            'Invited By': inv.invitedByName,
            'Created At': new Date(inv.createdAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }),
            'Expires At': new Date(inv.expiresAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            }),
            'Notes': inv.notes || '—'
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [
            { wch: 30 }, { wch: 15 }, { wch: 12 },
            { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 40 }
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Invitations');

        const fileName = `Admin_Invitations_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        Swal.fire({
            icon: 'success',
            title: 'Export Successful!',
            text: `File "${fileName}" has been downloaded.`,
            timer: 2000,
            showConfirmButton: false
        });
    }
}