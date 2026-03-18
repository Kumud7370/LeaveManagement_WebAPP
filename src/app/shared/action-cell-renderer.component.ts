import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">
      <button class="btn-icon btn-view" (click)="onView()" title="View">
        <i class="bi bi-eye"></i>
      </button>
      <button class="btn-icon btn-edit" (click)="onEdit()" title="Edit">
        <i class="bi bi-pencil"></i>
      </button>
      <button
        class="btn-icon btn-toggle"
        (click)="onToggleStatus()"
        [title]="params.data.employeeStatus === 1 ? 'Deactivate' : 'Activate'"
      >
        <i class="bi bi-power"></i>
      </button>
      <button class="btn-icon btn-reassign" (click)="onReassign()" title="Reassign">
        <i class="bi bi-arrow-left-right"></i>
      </button>
      <button class="btn-icon btn-history" (click)="onHistory()" title="Assignment History">
        <i class="bi bi-clock-history"></i>
      </button>
      <button class="btn-icon btn-delete" (click)="onDelete()" title="Delete">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `,
  styles: [`
    .action-buttons {
      display: flex;
      gap: 4px;
      justify-content: flex-start;
      align-items: center;
      height: 100%;
      padding: 0 4px;
    }

    .btn-icon {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      font-size: 14px;
      flex-shrink: 0;
      background: transparent;
    }

    .btn-view         { color: #10b981; }
    .btn-view:hover   { background: #ecfdf5; }

    .btn-edit         { color: #3b82f6; }
    .btn-edit:hover   { background: #eff6ff; }

    .btn-toggle       { color: #6366f1; }
    .btn-toggle:hover { background: #eef2ff; }

    .btn-reassign         { color: #8b5cf6; }
    .btn-reassign:hover   { background: #ede9fe; }

    .btn-history         { color: #f59e0b; }
    .btn-history:hover   { background: #fef3c7; }

    .btn-delete       { color: #ef4444; }
    .btn-delete:hover { background: #fef2f2; }
  `]
})
export class ActionCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    return true;
  }

  onView(): void {
    if (this.params.context?.componentParent?.viewDetails) {
      this.params.context.componentParent.viewDetails(this.params.data);
    }
  }

  onEdit(): void {
    if (this.params.context?.componentParent?.editDepartment) {
      this.params.context.componentParent.editDepartment(this.params.data);
    }
  }

  onToggleStatus(): void {
    if (this.params.context?.componentParent?.toggleStatus) {
      this.params.context.componentParent.toggleStatus(this.params.data);
    }
  }

  onReassign(): void {
    if (this.params.context?.componentParent?.openReassignModal) {
      this.params.context.componentParent.openReassignModal(this.params.data);
    }
  }

  onHistory(): void {
    if (this.params.context?.componentParent?.openHistoryModal) {
      this.params.context.componentParent.openHistoryModal(this.params.data);
    }
  }

  onDelete(): void {
    if (this.params.context?.componentParent?.deleteDepartment) {
      this.params.context.componentParent.deleteDepartment(this.params.data);
    }
  }
}