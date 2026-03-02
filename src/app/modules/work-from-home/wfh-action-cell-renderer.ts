// 


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
    <div class="wfh-action-row">

      <!-- View -->
      <button class="wfh-btn wfh-btn-view" title="View Details" (click)="onView()">
        <i class="bi bi-eye"></i>
      </button>

      <!-- Edit (only if Pending) -->
      <button
        *ngIf="isPending"
        class="wfh-btn wfh-btn-edit"
        title="Edit"
        (click)="onEdit()">
        <i class="bi bi-pencil"></i>
      </button>

      <!-- Approve (only if Pending) -->
      <button
        *ngIf="isPending"
        class="wfh-btn wfh-btn-approve"
        title="Approve"
        (click)="onApprove()">
        <i class="bi bi-check-lg"></i>
      </button>

      <!-- Reject (only if Pending) -->
      <button
        *ngIf="isPending"
        class="wfh-btn wfh-btn-reject"
        title="Reject"
        (click)="onReject()">
        <i class="bi bi-x-lg"></i>
      </button>

      <!-- Cancel (only if canBeCancelled and not Pending) -->
      <button
        *ngIf="isCancellable"
        class="wfh-btn wfh-btn-cancel"
        title="Cancel"
        (click)="onCancel()">
        <i class="bi bi-slash-circle"></i>
      </button>

      <!-- Delete (only if Pending) -->
      <button
        *ngIf="isPending"
        class="wfh-btn wfh-btn-delete"
        title="Delete"
        (click)="onDelete()">
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

    .wfh-action-row {
      display: flex;
      align-items: center;
      gap: 1px;
      height: 100%;
      width: 100%;
      padding: 0 4px;
      box-sizing: border-box;
      overflow: visible;
    }

    .wfh-btn {
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

    .wfh-btn-view         { color: #10b981; }
    .wfh-btn-view:hover   { background: #ecfdf5; }

    .wfh-btn-edit         { color: #3b82f6; }
    .wfh-btn-edit:hover   { background: #eff6ff; }

    .wfh-btn-approve         { color: #16a34a; }
    .wfh-btn-approve:hover   { background: #dcfce7; }

    .wfh-btn-reject          { color: #dc2626; }
    .wfh-btn-reject:hover    { background: #fee2e2; }

    .wfh-btn-cancel          { color: #d97706; }
    .wfh-btn-cancel:hover    { background: #fef3c7; }

    .wfh-btn-delete          { color: #ef4444; }
    .wfh-btn-delete:hover    { background: #fef2f2; }
  `]
})
export class WfhActionCellRendererComponent implements ICellRendererAngularComp {
  private params: any;

  get isPending(): boolean {
    const s = this.params?.data?.status;
    const name = String(this.params?.data?.statusName ?? '').toLowerCase();
    return Number(s) === ApprovalStatus.Pending
      || String(s).toLowerCase() === 'pending'
      || name === 'pending';
  }

  get isCancellable(): boolean {
    return !!this.params?.data?.canBeCancelled;
  }

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }
  refresh(params: ICellRendererParams): boolean { this.params = params; return true; }

  private get parent(): any { return this.params?.context?.componentParent; }

  onView():    void { this.parent?.viewDetails(this.params.data); }
  onEdit():    void { this.parent?.editWfhRequest(this.params.data); }
  onApprove(): void { this.parent?.approveWfhRequest(this.params.data); }
  onReject():  void { this.parent?.rejectWfhRequest(this.params.data); }
  onCancel():  void { this.parent?.cancelWfhRequest(this.params.data); }
  onDelete():  void { this.parent?.deleteWfhRequest(this.params.data); }
}