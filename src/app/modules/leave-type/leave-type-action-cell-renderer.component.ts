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

      <!-- Edit: green pencil-square -->
      <button class="btn-icon btn-edit" (click)="onEdit()" title="Edit">
        <i class="bi bi-pencil-square"></i>
      </button>

      <!-- Active/Inactive: outlined pill toggle — matches Image 2 exactly -->
      <button
        class="pill-toggle"
        [class.pill-on]="params?.data?.isActive"
        (click)="onToggle()"
        [title]="params?.data?.isActive ? 'Deactivate' : 'Activate'">
        <span class="pill-thumb"></span>
      </button>

      <!-- Delete: red trash -->
      <button class="btn-icon btn-delete" (click)="onDelete()" title="Delete">
        <i class="bi bi-trash3"></i>
      </button>

    </div>
  `,
  styles: [`
    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      height: 100%;
      padding: 0 8px;
    }

    /* ── Icon buttons ─────────────────────────── */
    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      padding: 0;
      background: transparent;
      transition: background 0.15s;
    }
    .btn-edit         { color: #16a34a; }
    .btn-edit:hover   { background: #dcfce7; }
    .btn-delete       { color: #dc2626; }
    .btn-delete:hover { background: #fee2e2; }

    /* ── Outlined pill toggle — Image 2 style ─── */
    .pill-toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      width: 30px;
      height: 16px;
      border-radius: 9999px;
      border: 1.5px solid #d1d5db;   /* gray border when inactive */
      background: #ffffff;            /* white fill */
      cursor: pointer;
      padding: 0;
      transition: border-color 0.2s ease;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    /* Active state: green border */
    .pill-toggle.pill-on {
      border-color: #22c55e;
    }

    /* The dot/thumb */
    .pill-thumb {
      position: absolute;
      left: 2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #d1d5db;            /* gray dot when inactive */
      transition: transform 0.2s ease, background 0.2s ease;
    }

    /* Active: green dot slides right */
    .pill-toggle.pill-on .pill-thumb {
      background: #22c55e;
      transform: translateX(13px);
    }
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