import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-invitation-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">

      <button
        *ngIf="isEditable"
        class="btn-icon btn-edit"
        title="Edit"
        (click)="onEdit()">
        <i class="bi bi-pencil"></i>
      </button>

      <button
        *ngIf="isEditable"
        class="btn-icon btn-revoke"
        title="Revoke"
        (click)="onRevoke()">
        <i class="bi bi-x-circle"></i>
      </button>

      <button class="btn-icon btn-delete" title="Delete" (click)="onDelete()">
        <i class="bi bi-trash"></i>
      </button>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 4px;
      height: 100%;
      padding: 0 4px;
    }

    .btn-icon {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      transition: background 0.15s;
      padding: 0;
      border-radius: 4px;
      flex-shrink: 0;
      line-height: 1;
    }

    .btn-edit         { color: #3b82f6; }
    .btn-edit:hover   { background: #eff6ff; }

    .btn-revoke       { color: #dc2626; }
    .btn-revoke:hover { background: #fee2e2; }

    .btn-delete       { color: #ef4444; }
    .btn-delete:hover { background: #fef2f2; }
  `]
})
export class InvitationActionCellRendererComponent implements ICellRendererAngularComp {
  private params: any;

  get isEditable(): boolean {
    const data = this.params?.data;
    if (!data) return false;
    return data.status === 'Pending' && new Date(data.expiresAt) > new Date();
  }

  agInit(params: ICellRendererParams): void { this.params = params; }
  refresh(params: ICellRendererParams): boolean { this.params = params; return true; }

  private get parent(): any { return this.params?.context?.componentParent; }

  onEdit():   void { this.parent?.editInvitation(this.params.data); }
  onRevoke(): void { this.parent?.revokeInvitation(this.params.data); }
  onDelete(): void { this.parent?.deleteInvitation(this.params.data); }
}