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
      <button
        class="btn-icon btn-view"
        (click)="onView()"
        title="View"
      >
        <i class="bi bi-eye"></i>
      </button>
      <button
        class="btn-icon btn-edit"
        (click)="onEdit()"
        title="Edit"
      >
        <i class="bi bi-pencil"></i>
      </button>
      <button
        class="btn-icon btn-toggle"
        (click)="onToggleStatus()"
        [title]="params.data.employeeStatus === 1 ? 'Deactivate' : 'Activate'"
      >
        <i class="bi bi-power"></i>
      </button>
      <button
        class="btn-icon btn-delete"
        (click)="onDelete()"
        title="Delete"
      >
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `,
  styles: [`
    .action-buttons {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .btn-icon {
      width: 2rem;
      height: 2rem;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .btn-view {
      background: #dbeafe;
      color: #1e40af;

      &:hover {
        background: #3b82f6;
        color: white;
        transform: scale(1.1);
      }
    }

    .btn-edit {
      background: #fef3c7;
      color: #92400e;

      &:hover {
        background: #f59e0b;
        color: white;
        transform: scale(1.1);
      }
    }

    .btn-toggle {
      background: #e0e7ff;
      color: #4338ca;

      &:hover {
        background: #6366f1;
        color: white;
        transform: scale(1.1);
      }
    }

    .btn-delete {
      background: #fee2e2;
      color: #991b1b;

      &:hover {
        background: #ef4444;
        color: white;
        transform: scale(1.1);
      }
    }
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

  onDelete(): void {
    if (this.params.context?.componentParent?.deleteDepartment) {
      this.params.context.componentParent.deleteDepartment(this.params.data);
    }
  }
}