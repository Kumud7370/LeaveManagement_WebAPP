import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-leave-type-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">
      <button class="btn-icon btn-edit" (click)="onEdit()" title="Edit">
        <i class="bi bi-pencil"></i>
      </button>
      <button
        class="btn-icon"
        [class.btn-activate]="!params.data?.isActive"
        [class.btn-deactivate]="params.data?.isActive"
        (click)="onToggle()"
        [title]="params.data?.isActive ? 'Deactivate' : 'Activate'"
      >
        <i class="bi" [class.bi-toggle-on]="params.data?.isActive" [class.bi-toggle-off]="!params.data?.isActive"></i>
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
    .btn-edit       { background:#fef3c7; color:#92400e; } .btn-edit:hover       { background:#f59e0b; color:white; transform:scale(1.1); }
    .btn-activate   { background:#d1fae5; color:#065f46; } .btn-activate:hover   { background:#10b981; color:white; transform:scale(1.1); }
    .btn-deactivate { background:#e0e7ff; color:#3730a3; } .btn-deactivate:hover { background:#6366f1; color:white; transform:scale(1.1); }
    .btn-delete     { background:#fee2e2; color:#991b1b; } .btn-delete:hover     { background:#ef4444; color:white; transform:scale(1.1); }
  `]
})
export class LeaveTypeActionCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;
  agInit(params: ICellRendererParams): void { this.params = params; }
  refresh(params: ICellRendererParams): boolean { this.params = params; return true; }
  onEdit()   { this.params.context?.componentParent?.editLeaveType(this.params.data); }
  onToggle() { this.params.context?.componentParent?.toggleStatus(this.params.data); }
  onDelete() { this.params.context?.componentParent?.deleteLeaveType(this.params.data); }
}