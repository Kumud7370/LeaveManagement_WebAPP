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
        class="pill-toggle"
        [class.pill-on]="params?.data?.isActive"
        (click)="onToggle()"
        [title]="params?.data?.isActive ? 'Deactivate' : 'Activate'">
        <span class="pill-thumb"></span>
      </button>

      <button class="btn-icon btn-delete" (click)="onDelete()" title="Delete">
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
      flex-shrink: 0;
    }
    .btn-edit         { color: #3b82f6; }
    .btn-edit:hover   { background: #eff6ff; }
    .btn-delete       { color: #ef4444; }
    .btn-delete:hover { background: #fef2f2; }

    .pill-toggle {
      position: relative; display: inline-flex; align-items: center;
      width: 32px; height: 18px; border-radius: 9999px;
      border: 1.5px solid #d1d5db; background: #ffffff;
      cursor: pointer; padding: 0; transition: border-color 0.2s ease;
      flex-shrink: 0; box-sizing: border-box;
    }
    .pill-toggle.pill-on { border-color: #22c55e; }
    .pill-thumb {
      position: absolute; left: 2px;
      width: 11px; height: 11px; border-radius: 50%;
      background: #d1d5db;
      transition: transform 0.2s ease, background 0.2s ease;
    }
    .pill-toggle.pill-on .pill-thumb { background: #22c55e; transform: translateX(13px); }
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