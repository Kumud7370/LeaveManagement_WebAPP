import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { ApprovalStatus } from '../../core/Models/work-from-home.model';

@Component({
  selector: 'app-wfh-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">

      <button class="btn-icon btn-view" title="View Details" (click)="onView()">
        <i class="bi bi-eye"></i>
      </button>

      <button *ngIf="isPending" class="btn-icon btn-edit" title="Edit" (click)="onEdit()">
        <i class="bi bi-pencil"></i>
      </button>

      <button *ngIf="isPending && !isEmployee" class="btn-icon btn-approve" title="Approve" (click)="onApprove()">
        <i class="bi bi-check-lg"></i>
      </button>

      <button *ngIf="isPending && !isEmployee" class="btn-icon btn-reject" title="Reject" (click)="onReject()">
        <i class="bi bi-x-lg"></i>
      </button>

      <button *ngIf="isCancellable" class="btn-icon btn-cancel" title="Cancel" (click)="onCancel()">
        <i class="bi bi-slash-circle"></i>
      </button>

      <button *ngIf="!isEmployee" class="btn-icon btn-delete" title="Delete" (click)="onDelete()">
        <i class="bi bi-trash"></i>
      </button>

    </div>
  `,
  styles: [`
    .action-buttons {
      display: flex; align-items: center; justify-content: flex-start;
      gap: 4px; height: 100%; padding: 0 4px;
    }
    .btn-icon {
      width: 28px; height: 28px; border: none; background: transparent;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 15px; transition: background 0.15s; padding: 0; border-radius: 4px;
      flex-shrink: 0; line-height: 1;
    }
    .btn-view         { color: #10b981; }
    .btn-view:hover   { background: #ecfdf5; }
    .btn-edit         { color: #3b82f6; }
    .btn-edit:hover   { background: #eff6ff; }
    .btn-approve      { color: #16a34a; }
    .btn-approve:hover{ background: #dcfce7; }
    .btn-reject       { color: #dc2626; }
    .btn-reject:hover { background: #fee2e2; }
    .btn-cancel       { color: #d97706; }
    .btn-cancel:hover { background: #fef3c7; }
    .btn-delete       { color: #ef4444; }
    .btn-delete:hover { background: #fef2f2; }
  `]
})
export class WfhActionCellRendererComponent implements ICellRendererAngularComp {
  private params: any;

  get isPending(): boolean {
    const s    = this.params?.data?.status;
    const name = String(this.params?.data?.statusName ?? '').toLowerCase();
    return Number(s) === ApprovalStatus.Pending
      || String(s).toLowerCase() === 'pending'
      || name === 'pending';
  }

  get isCancellable(): boolean {
    const s    = this.params?.data?.status;
    const name = String(this.params?.data?.statusName ?? '').toLowerCase();
    return Number(s) === ApprovalStatus.Pending
      || Number(s) === ApprovalStatus.Approved
      || name === 'pending'
      || name === 'approved'
      || !!this.params?.data?.canBeCancelled;
  }

  get isEmployee(): boolean {
    return !!this.params?.context?.isEmployee;
  }

  agInit(params: ICellRendererParams): void { this.params = params; }
  refresh(params: ICellRendererParams): boolean { this.params = params; return true; }

  private get parent(): any { return this.params?.context?.componentParent; }

  onView():    void { this.parent?.viewDetails(this.params.data); }
  onEdit():    void { this.parent?.editWfhRequest(this.params.data); }
  onApprove(): void { this.parent?.approveWfhRequest(this.params.data); }
  onReject():  void { this.parent?.rejectWfhRequest(this.params.data); }
  onCancel():  void { this.parent?.cancelWfhRequest(this.params.data); }
  onDelete():  void { this.parent?.deleteWfhRequest(this.params.data); }
}