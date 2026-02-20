import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invitation-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">
      <button *ngIf="isValid" class="btn-icon btn-edit" (click)="onEdit()" title="Edit">
        <i class="bi bi-pencil"></i>
      </button>
      <button *ngIf="isValid" class="btn-icon btn-revoke" (click)="onRevoke()" title="Revoke">
        <i class="bi bi-x-circle"></i>
      </button>
      <button class="btn-icon btn-delete" (click)="onDelete()" title="Delete">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `,
  styles: [`
    .action-buttons { display:flex; gap:.4rem; justify-content:center; align-items:center; height:100%; }
    .btn-icon { width:1.9rem; height:1.9rem; border:none; border-radius:.375rem; cursor:pointer;
      display:flex; align-items:center; justify-content:center; transition:all .2s; font-size:.9rem; }
    .btn-edit   { background:#fef3c7; color:#92400e; } .btn-edit:hover   { background:#f59e0b; color:white; transform:scale(1.1); }
    .btn-revoke { background:#fee2e2; color:#991b1b; } .btn-revoke:hover { background:#ef4444; color:white; transform:scale(1.1); }
    .btn-delete { background:#fce7f3; color:#9d174d; } .btn-delete:hover { background:#ec4899; color:white; transform:scale(1.1); }
  `]
})
export class InvitationActionCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;

  get isValid(): boolean {
    return this.params.data?.status === 'Pending' &&
      new Date(this.params.data?.expiresAt) > new Date();
  }

  agInit(params: ICellRendererParams): void { this.params = params; }
  refresh(params: ICellRendererParams): boolean { this.params = params; return true; }
  onEdit()   { this.params.context?.componentParent?.editInvitation(this.params.data); }
  onRevoke() { this.params.context?.componentParent?.revokeInvitation(this.params.data); }
  onDelete() { this.params.context?.componentParent?.deleteInvitation(this.params.data); }
}