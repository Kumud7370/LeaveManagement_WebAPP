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
        class="btn-icon btn-edit"
        (click)="onEdit()"
        title="Edit"
      >
        <i class="bi bi-pencil"></i>
      </button>
      <button
        class="btn-icon btn-toggle"
        (click)="onToggleStatus()"
        [title]="params.data.isActive ? 'Deactivate' : 'Activate'"
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
      width: 2.25rem;
      height: 2.25rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 0.95rem;

      i {
        font-size: 0.95rem;
      }
    }

    .btn-edit {
      background: #fef3c7;
      color: #92400e;

      &:hover {
        background: #fde047;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(234, 179, 8, 0.3);
      }
    }

    .btn-toggle {
      background: #dbeafe;
      color: #1e40af;

      &:hover {
        background: #93c5fd;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
      }
    }

    .btn-delete {
      background: #fee2e2;
      color: #991b1b;

      &:hover {
        background: #fca5a5;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
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