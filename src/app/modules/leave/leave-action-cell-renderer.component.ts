// import { Component } from '@angular/core';
// import { ICellRendererAngularComp } from 'ag-grid-angular';
// import { ICellRendererParams } from 'ag-grid-community';
// import { CommonModule } from '@angular/common';
// import { LeaveStatus } from '../../core/Models/leave.model';

// @Component({
//   selector: 'app-leave-action-cell-renderer',
//   standalone: true,
//   imports: [CommonModule],
//   template: `
//     <div class="action-buttons">
//       <button class="btn-icon btn-view" (click)="onView()" title="View Details">
//         <i class="bi bi-eye"></i>
//       </button>
//       <button *ngIf="isPending" class="btn-icon btn-edit" (click)="onEdit()" title="Edit">
//         <i class="bi bi-pencil"></i>
//       </button>
//       <button *ngIf="isPending" class="btn-icon btn-approve" (click)="onApprove()" title="Approve">
//         <i class="bi bi-check-lg"></i>
//       </button>
//       <button *ngIf="isPending" class="btn-icon btn-reject" (click)="onReject()" title="Reject">
//         <i class="bi bi-x-lg"></i>
//       </button>
//       <button *ngIf="params.data?.canBeCancelled && !isPending" class="btn-icon btn-cancel" (click)="onCancel()" title="Cancel">
//         <i class="bi bi-slash-circle"></i>
//       </button>
//       <button *ngIf="isPending" class="btn-icon btn-delete" (click)="onDelete()" title="Delete">
//         <i class="bi bi-trash"></i>
//       </button>
//     </div>
//   `,
//   styles: [`
//     .action-buttons { display:flex; gap:0.4rem; justify-content:center; align-items:center; height:100%; flex-wrap:wrap; }
//     .btn-icon { width:1.9rem; height:1.9rem; border:none; border-radius:0.375rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; font-size:0.85rem; }
//     .btn-view   { background:#dbeafe; color:#1e40af; } .btn-view:hover   { background:#3b82f6; color:white; transform:scale(1.1); }
//     .btn-edit   { background:#fef3c7; color:#92400e; } .btn-edit:hover   { background:#f59e0b; color:white; transform:scale(1.1); }
//     .btn-approve{ background:#d1fae5; color:#065f46; } .btn-approve:hover{ background:#10b981; color:white; transform:scale(1.1); }
//     .btn-reject { background:#fee2e2; color:#991b1b; } .btn-reject:hover { background:#ef4444; color:white; transform:scale(1.1); }
//     .btn-cancel { background:#fef3c7; color:#92400e; } .btn-cancel:hover { background:#f59e0b; color:white; transform:scale(1.1); }
//     .btn-delete { background:#fee2e2; color:#991b1b; } .btn-delete:hover { background:#ef4444; color:white; transform:scale(1.1); }
//   `]
// })
// export class LeaveActionCellRendererComponent implements ICellRendererAngularComp {
//   params!: ICellRendererParams;

//   get isPending(): boolean {
//   const status = this.params.data?.leaveStatus;
//   return status === LeaveStatus.Pending   
//       || status === 'Pending';            
// }

//   agInit(params: ICellRendererParams): void { this.params = params; }
//   refresh(params: ICellRendererParams): boolean { this.params = params; return true; }
//   onView()   { this.params.context?.componentParent?.viewDetails(this.params.data); }
//   onEdit()   { this.params.context?.componentParent?.editLeave(this.params.data); }
//   onApprove(){ this.params.context?.componentParent?.approveLeave(this.params.data); }
//   onReject() { this.params.context?.componentParent?.rejectLeave(this.params.data); }
//   onCancel() { this.params.context?.componentParent?.cancelLeave(this.params.data); }
//   onDelete() { this.params.context?.componentParent?.deleteLeave(this.params.data); }
// }


// leave-action-cell-renderer.component.ts
// Renders View / Edit / Approve / Reject / Cancel / Delete icon buttons
// in the AG Grid Actions column — styled to match the hl- design system.

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
      <button
        *ngIf="isPending"
        class="la-btn la-btn-approve"
        title="Approve"
        (click)="onApprove()">
        <i class="bi bi-check-lg"></i>
      </button>

      <!-- Reject (only if Pending) -->
      <button
        *ngIf="isPending"
        class="la-btn la-btn-reject"
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
      <button class="la-btn la-btn-delete" title="Delete" (click)="onDelete()">
        <i class="bi bi-trash3"></i>
      </button>

    </div>
  `,
  styles: [`
    .la-action-row {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 100%;
    }
    .la-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.15s, color 0.15s;
      padding: 0;
      flex-shrink: 0;
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