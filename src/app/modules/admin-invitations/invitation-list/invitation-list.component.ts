import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, GridReadyEvent } from 'ag-grid-community';
import { AdminInvitationService } from '../../../core/services/api/admin-invitation.api';
import {
    InvitationResponseDto,
    SendInvitationDto,
    EditInvitationDto,
    InvitationStats
} from '../../../core/Models/admin-invitation.model';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

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
        context: { componentParent: this }
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
    ) {
        this.initializeColumnDefs();
    }

    ngOnInit(): void {
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
                cellStyle: { textAlign: 'center' },
                cellRenderer: (params: any) => {
                    if (!params.data) return '';

                    const isValid = params.data.status === 'Pending' &&
                        new Date(params.data.expiresAt) > new Date();

                    const editBtn = isValid ?
                        `<button class="btn-icon btn-edit" data-action="edit" title="Edit">
        <i class="bi bi-pencil"></i>
       </button>` : '';

                    const revokeBtn = isValid ?
                        `<button class="btn-icon btn-revoke" data-action="revoke" title="Revoke">
        <i class="bi bi-x-circle"></i>
       </button>` : '';

                    return `
      <div class="action-buttons">
        ${editBtn}
        ${revokeBtn}
        <button class="btn-icon btn-delete" data-action="delete" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `;
                },
                onCellClicked: (params: any) => {
                    const target = params.event.target as HTMLElement;
                    const button = target.closest('button');
                    if (!button) return;

                    const action = button.getAttribute('data-action');
                    if (action === 'edit') {
                        this.editInvitation(params.data);
                    } else if (action === 'revoke') {
                        this.revokeInvitation(params.data);
                    } else if (action === 'delete') {
                        this.deleteInvitation(params.data);
                    }
                }
            },
            {
                headerName: 'RECIPIENT',
                field: 'email',
                minWidth: 250,
                flex: 2,
                cellRenderer: (params: any) => {
                    if (!params.value) return '';
                    return `
          <div class="recipient-cell">
            <div class="recipient-info">
              <div class="recipient-email" title="${params.value}">${params.value}</div>
            </div>
          </div>
        `;
                }
            },
            {
                headerName: 'ROLE',
                field: 'invitedRole',
                width: 120,
                cellRenderer: (params: any) => {
                    const roleColors: Record<string, { bg: string; text: string }> = {
                        SuperAdmin: { bg: '#f3e8ff', text: '#7c3aed' },
                        Admin: { bg: '#e0e7ff', text: '#4f46e5' },
                        Manager: { bg: '#dbeafe', text: '#2563eb' },
                        Employee: { bg: '#cffafe', text: '#0891b2' }
                    };
                    const color = roleColors[params.value] || { bg: '#f3f4f6', text: '#6b7280' };
                    return `
            <span class="role-badge" style="background: ${color.bg}; color: ${color.text};">
              ${params.value}
            </span>
          `;
                }
            },
            {
                headerName: 'STATUS',
                field: 'status',
                width: 120,
                cellStyle: { textAlign: 'center' },
                cellRenderer: (params: any) => {
                    const status = params.data?.status;
                    const expiresAt = params.data?.expiresAt;

                    let statusText = '';
                    let statusClass = '';
                    let statusIcon = '';

                    if (status === 'Accepted') {
                        statusText = 'Accepted';
                        statusClass = 'status-accepted';
                        statusIcon = 'bi bi-check-circle';
                    } else if (status === 'Revoked') {
                        statusText = 'Revoked';
                        statusClass = 'status-revoked';
                        statusIcon = 'bi bi-x-circle';
                    } else if (status === 'Expired' || (expiresAt && new Date(expiresAt) <= new Date())) {
                        statusText = 'Expired';
                        statusClass = 'status-expired';
                        statusIcon = 'bi bi-clock';
                    } else {
                        statusText = 'Pending';
                        statusClass = 'status-pending';
                        statusIcon = 'bi bi-clock-history';
                    }

                    return `
            <span class="status-badge ${statusClass}">
              <i class="${statusIcon}"></i>
              ${statusText}
            </span>
          `;
                }
            },
            {
                headerName: 'INVITED BY',
                field: 'invitedByName',
                width: 200,
                valueFormatter: (params) => params.value || '—'
            },
            {
                headerName: 'CREATED',
                field: 'createdAt',
                width: 150,
                valueFormatter: (params) => {
                    if (!params.value) return '—';
                    const date = new Date(params.value);
                    return date.toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });
                }
            },
            {
                headerName: 'EXPIRES',
                field: 'expiresAt',
                width: 150,
                valueFormatter: (params) => {
                    if (!params.value) return '—';
                    const date = new Date(params.value);
                    return date.toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
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

        // Apply status filter
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

        // Apply search filter
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

    onSearch(): void {
        // Trigger re-render by updating the grid
    }

    clearSearch(): void {
        this.searchTerm = '';
        this.statusFilter = 'all';
    }

    openAddModal(): void {
        this.formData = {
            email: '',
            role: 'Admin',
            notes: undefined
        };
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
                        title: 'Success!',
                        text: 'Invitation sent successfully!',
                        icon: 'success',
                        confirmButtonColor: '#3b82f6',
                        timer: 2000
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
                        title: 'Success!',
                        text: 'Invitation updated successfully!',
                        icon: 'success',
                        confirmButtonColor: '#3b82f6',
                        timer: 2000
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
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, revoke it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            this.invitationService.revokeInvitation(invitation.id).subscribe({
                next: (response) => {
                    if (response.success) {
                        Swal.fire({
                            title: 'Revoked!',
                            text: 'Invitation has been revoked successfully.',
                            icon: 'success',
                            confirmButtonColor: '#3b82f6',
                            timer: 2000
                        });
                        this.loadInvitations();
                    }
                },
                error: (err) => {
                    Swal.fire({
                        title: 'Error!',
                        text: err.error?.message || 'Failed to revoke invitation',
                        icon: 'error',
                        confirmButtonColor: '#ef4444'
                    });
                }
            });
        }
    }

    async deleteInvitation(invitation: InvitationResponseDto): Promise<void> {
        const result = await Swal.fire({
            title: 'Are you sure?',
            html: `You want to permanently delete the invitation for <strong>${invitation.email}</strong>?<br><span style="color: #dc2626; font-size: 14px;">This action cannot be undone.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            this.invitationService.deleteInvitation(invitation.id).subscribe({
                next: (response) => {
                    if (response.success) {
                        Swal.fire({
                            title: 'Deleted!',
                            text: 'Invitation has been deleted successfully.',
                            icon: 'success',
                            confirmButtonColor: '#3b82f6',
                            timer: 2000
                        });
                        this.loadInvitations();
                    }
                },
                error: (err) => {
                    Swal.fire({
                        title: 'Error!',
                        text: err.error?.message || 'Failed to delete invitation',
                        icon: 'error',
                        confirmButtonColor: '#ef4444'
                    });
                }
            });
        }
    }

    exportToExcel(): void {
        if (this.invitations.length === 0) {
            Swal.fire({
                title: 'No Data',
                text: 'There are no invitations to export.',
                icon: 'info',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        Swal.fire({
            title: 'Exporting...',
            text: 'Please wait while we prepare your file.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const exportData = this.invitations.map(inv => ({
            'Email': inv.email,
            'Role': inv.invitedRole,
            'Status': inv.status,
            'Invited By': inv.invitedByName,
            'Created At': new Date(inv.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            'Expires At': new Date(inv.expiresAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            'Notes': inv.notes || '—'
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const columnWidths = [
            { wch: 30 }, // Email
            { wch: 15 }, // Role
            { wch: 12 }, // Status
            { wch: 25 }, // Invited By
            { wch: 25 }, // Created At
            { wch: 20 }, // Expires At
            { wch: 40 }  // Notes
        ];
        worksheet['!cols'] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Invitations');

        const timestamp = new Date().toISOString().slice(0, 10);
        const fileName = `Admin_Invitations_${timestamp}.xlsx`;

        XLSX.writeFile(workbook, fileName);

        Swal.fire({
            title: 'Export Successful!',
            text: `File "${fileName}" has been downloaded.`,
            icon: 'success',
            confirmButtonColor: '#3b82f6',
            timer: 3000
        });
    }
}