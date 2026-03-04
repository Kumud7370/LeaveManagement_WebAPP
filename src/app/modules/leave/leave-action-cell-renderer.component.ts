import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-leave-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="la-action-row">

      <!-- View -->
      <button class="la-btn la-btn-view" title="View Details" (click)="onView()">
        <i class="bi bi-eye"></i>
      </button>

      <!-- Edit (only if Pending) -->
      <button
        *ngIf="isPending"
        class="la-btn la-btn-edit"
        title="Edit"
        (click)="onEdit()">
        <i class="bi bi-pencil"></i>
      </button>

      <!-- Approve (only if Pending) -->
      <button *ngIf="isPending && !isEmployee" class="la-btn la-btn-approve"
        title="Approve"
        (click)="onApprove()">
        <i class="bi bi-check-lg"></i>
      </button>

      <!-- Reject (only if Pending) -->
     <button *ngIf="isPending && !isEmployee" class="la-btn la-btn-reject"
        title="Reject"
        (click)="onReject()">
        <i class="bi bi-x-lg"></i>
      </button>

      <!-- Cancel (only if Pending or Approved) -->
      <button
        *ngIf="isCancellable"
        class="la-btn la-btn-cancel"
        title="Cancel"
        (click)="onCancel()">
        <i class="bi bi-slash-circle"></i>
      </button>

      <!-- Delete -->
      <button *ngIf="!isEmployee" class="la-btn la-btn-delete" title="Delete" (click)="onDelete()">
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

    .la-btn-view    { color: #10b981; }
    .la-btn-view:hover    { background: #ecfdf5; }

    .la-btn-edit    { color: #3b82f6; }
    .la-btn-edit:hover    { background: #eff6ff; }

    .la-btn-approve { color: #16a34a; }
    .la-btn-approve:hover { background: #dcfce7; }

    .la-btn-reject  { color: #dc2626; }
    .la-btn-reject:hover  { background: #fee2e2; }

    .la-btn-cancel  { color: #d97706; }
    .la-btn-cancel:hover  { background: #fef3c7; }

    .la-btn-delete  { color: #ef4444; }
    .la-btn-delete:hover  { background: #fef2f2; }
  `]
})
export class LeaveActionCellRendererComponent implements ICellRendererAngularComp {
  private params: any;

  get isPending(): boolean {
    const s = String(this.params?.data?.leaveStatus ?? '');
    return s === '0' || s.toLowerCase() === 'pending';
  }

  get isCancellable(): boolean {
    const s = String(this.params?.data?.leaveStatus ?? '');
    return s === '0' || s === '1'
      || s.toLowerCase() === 'pending'
      || s.toLowerCase() === 'approved';
  }

  get isEmployee(): boolean {
  return !!this.params?.context?.isEmployee;
}

  agInit(params: ICellRendererParams): void { this.params = params; }
  refresh(params: ICellRendererParams): boolean { this.params = params; return true; }

  private get parent(): any { return this.params?.context?.componentParent; }

  onView():    void { this.parent?.viewDetails(this.params.data); }
  onEdit():    void { this.parent?.editLeave(this.params.data); }
  onApprove(): void { this.parent?.approveLeave(this.params.data); }
  onReject():  void { this.parent?.rejectLeave(this.params.data); }
  onCancel():  void { this.parent?.cancelLeave(this.params.data); }
  onDelete():  void { this.parent?.deleteLeave(this.params.data); }
}