import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { ApprovalStatus } from '../../core/Models/work-from-home.model';

@Component({
  selector: 'app-wfh-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">
      <button class="btn-icon btn-view" (click)="onView()" title="View Details">
        <i class="bi bi-eye"></i>
      </button>
      <button *ngIf="isPending" class="btn-icon btn-edit" (click)="onEdit()" title="Edit">
        <i class="bi bi-pencil"></i>
      </button>
      <button *ngIf="isPending" class="btn-icon btn-approve" (click)="onApprove()" title="Approve">
        <i class="bi bi-check-lg"></i>
      </button>
      <button *ngIf="isPending" class="btn-icon btn-reject" (click)="onReject()" title="Reject">
        <i class="bi bi-x-lg"></i>
      </button>
      <button
        *ngIf="params.data?.canBeCancelled && !isPending"
        class="btn-icon btn-cancel"
        (click)="onCancel()"
        title="Cancel"
      >
        <i class="bi bi-slash-circle"></i>
      </button>
      <button *ngIf="isPending" class="btn-icon btn-delete" (click)="onDelete()" title="Delete">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `,
  styles: [`
    .action-buttons {
      display: flex;
      gap: 0.4rem;
      justify-content: center;
      align-items: center;
      height: 100%;
      flex-wrap: wrap;
    }
    .btn-icon {
      width: 1.9rem;
      height: 1.9rem;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 0.85rem;
    }
    .btn-view    { background: #dbeafe; color: #1e40af; }
    .btn-view:hover    { background: #3b82f6; color: white; transform: scale(1.1); }
    .btn-edit    { background: #fef3c7; color: #92400e; }
    .btn-edit:hover    { background: #f59e0b; color: white; transform: scale(1.1); }
    .btn-approve { background: #d1fae5; color: #065f46; }
    .btn-approve:hover { background: #10b981; color: white; transform: scale(1.1); }
    .btn-reject  { background: #fee2e2; color: #991b1b; }
    .btn-reject:hover  { background: #ef4444; color: white; transform: scale(1.1); }
    .btn-cancel  { background: #fef3c7; color: #92400e; }
    .btn-cancel:hover  { background: #f59e0b; color: white; transform: scale(1.1); }
    .btn-delete  { background: #fee2e2; color: #991b1b; }
    .btn-delete:hover  { background: #ef4444; color: white; transform: scale(1.1); }
  `]
})
export class WfhActionCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;

  get isPending(): boolean {
    const status = this.params.data?.status;
    return status === ApprovalStatus.Pending || status === 'Pending';
  }

  agInit(params: ICellRendererParams): void { this.params = params; }
  refresh(params: ICellRendererParams): boolean { this.params = params; return true; }

  onView()    { this.params.context?.componentParent?.viewDetails(this.params.data); }
  onEdit()    { this.params.context?.componentParent?.editWfhRequest(this.params.data); }
  onApprove() { this.params.context?.componentParent?.approveWfhRequest(this.params.data); }
  onReject()  { this.params.context?.componentParent?.rejectWfhRequest(this.params.data); }
  onCancel()  { this.params.context?.componentParent?.cancelWfhRequest(this.params.data); }
  onDelete()  { this.params.context?.componentParent?.deleteWfhRequest(this.params.data); }
}