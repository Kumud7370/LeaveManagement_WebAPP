import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-invitation-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="la-action-row">

      <button
        *ngIf="isEditable"
        class="la-btn la-btn-edit"
        title="Edit"
        (click)="onEdit()">
        <i class="bi bi-pencil"></i>
      </button>

      <button
        *ngIf="isEditable"
        class="la-btn la-btn-reject"
        title="Revoke"
        (click)="onRevoke()">
        <i class="bi bi-x-circle"></i>
      </button>

      <button class="la-btn la-btn-delete" title="Delete" (click)="onDelete()">
        <i class="bi bi-trash3"></i>
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
    .la-action-row {
      display: flex;
      align-items: center;
      gap: 1px;
      height: 100%;
      width: 100%;
      padding: 0 4px;
      box-sizing: border-box;
      overflow: visible;
    }
    .la-btn {
      width: 26px;
      height: 26px;
      min-width: 26px;
      border: none;
      background: transparent;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s, color 0.15s;
      padding: 0;
      flex-shrink: 0;
      line-height: 1;
    }
    .la-btn-edit         { color: #3b82f6; }
    .la-btn-edit:hover   { background: #eff6ff; }
    .la-btn-reject       { color: #dc2626; }
    .la-btn-reject:hover { background: #fee2e2; }
    .la-btn-delete       { color: #ef4444; }
    .la-btn-delete:hover { background: #fef2f2; }
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