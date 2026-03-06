import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { RegularizationStatus } from '../../core/Models/attendance-regularization.model';

@Component({
  selector: 'app-regularization-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rl-ac-row">

      <!-- 👁 View — always visible -->
      <button class="rl-ac-btn rl-ac-view" title="View Details" (click)="onView()">
        <i class="bi bi-eye"></i>
      </button>

      <!-- ✏️ Edit — Admin / Manager / SuperAdmin only, Pending only -->
      <button
        *ngIf="isAdminOrManager && isPending"
        class="rl-ac-btn rl-ac-edit"
        title="Edit"
        (click)="onEdit()">
        <i class="bi bi-pencil"></i>
      </button>

      <!-- ✅ Approve — Admin / Manager / SuperAdmin only, Pending only -->
      <button
        *ngIf="isAdminOrManager && isPending"
        class="rl-ac-btn rl-ac-approve"
        title="Approve"
        (click)="onApprove()">
        <i class="bi bi-check-lg"></i>
      </button>

      <!-- ❌ Reject — Admin / Manager / SuperAdmin only, Pending only -->
      <button
        *ngIf="isAdminOrManager && isPending"
        class="rl-ac-btn rl-ac-reject"
        title="Reject"
        (click)="onReject()">
        <i class="bi bi-x-lg"></i>
      </button>

      <!-- ⊘ Cancel — ALL roles, Pending only -->
      <button
        *ngIf="isPending"
        class="rl-ac-btn rl-ac-cancel"
        title="Cancel Request"
        (click)="onCancel()">
        <i class="bi bi-slash-circle"></i>
      </button>

      <!-- 🗑️ Delete — ALL roles, always visible -->
      <button
        class="rl-ac-btn rl-ac-delete"
        title="Delete"
        (click)="onDelete()">
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
    .rl-ac-row {
      display: flex;
      align-items: center;
      gap: 1px;
      height: 100%;
      width: 100%;
      padding: 0 4px;
      box-sizing: border-box;
      overflow: visible;
    }
    .rl-ac-btn {
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
    .rl-ac-view          { color: #10b981; }
    .rl-ac-view:hover    { background: #ecfdf5; }
    .rl-ac-edit          { color: #3b82f6; }
    .rl-ac-edit:hover    { background: #eff6ff; }
    .rl-ac-approve       { color: #16a34a; }
    .rl-ac-approve:hover { background: #dcfce7; }
    .rl-ac-reject        { color: #dc2626; }
    .rl-ac-reject:hover  { background: #fee2e2; }
    .rl-ac-cancel        { color: #d97706; }
    .rl-ac-cancel:hover  { background: #fef3c7; }
    .rl-ac-delete        { color: #ef4444; }
    .rl-ac-delete:hover  { background: #fee2e2; }
  `]
})
export class RegularizationActionCellRendererComponent implements ICellRendererAngularComp {
  private params: any;

  get isPending(): boolean {
    const s    = this.params?.data?.status;
    const name = String(this.params?.data?.statusName ?? '').toLowerCase().trim();
    return (
      Number(s) === RegularizationStatus.Pending ||
      String(s).toLowerCase() === 'pending'      ||
      name === 'pending'
    );
  }

  get isAdminOrManager(): boolean {
    const role = String(this.params?.context?.userRole ?? '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '');
    return role === 'admin' || role === 'superadmin' || role === 'manager';
  }

  agInit(params: ICellRendererParams): void    { this.params = params; }
  refresh(params: ICellRendererParams): boolean { this.params = params; return true; }

  private get parent(): any { return this.params?.context?.componentParent; }

  onView():    void { this.parent?.viewDetails(this.params.data); }
  onEdit():    void { this.parent?.editDepartment(this.params.data); }
  onApprove(): void { this.parent?.approveRegularization(this.params.data); }
  onReject():  void { this.parent?.openApprovalModal(this.params.data, false); }
  onCancel():  void { this.parent?.deleteDepartment(this.params.data); }
  onDelete():  void { this.parent?.deleteRegularization(this.params.data); }
}