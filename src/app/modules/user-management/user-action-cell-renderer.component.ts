import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'app-user-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">
      <button class="btn-icon btn-view" title="View Details" (click)="onView()">
        <i class="bi bi-eye"></i>
      </button>
      <button class="btn-icon btn-reset" title="Reset Password" (click)="onReset()">
        <i class="bi bi-key"></i>
      </button>
      <button class="btn-icon btn-toggle"
        [title]="isActive ? 'Deactivate' : 'Activate'"
        (click)="onToggle()">
        <i class="bi" [ngClass]="isActive ? 'bi-person-slash' : 'bi-person-check'"></i>
      </button>
      <button class="btn-icon btn-delete" title="Delete" (click)="onDelete()">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; overflow: visible; }
    .action-buttons {
      display: flex; align-items: center; justify-content: flex-start;
      gap: 4px; height: 100%; padding: 0 4px;
    }
    .btn-icon {
      width: 28px; height: 28px; border: none; background: transparent;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 15px; transition: background 0.15s; padding: 0;
      border-radius: 4px; flex-shrink: 0; line-height: 1;
    }
    .btn-view        { color: #10b981; }
    .btn-view:hover  { background: #ecfdf5; }
    .btn-reset       { color: #f59e0b; }
    .btn-reset:hover { background: #fef3c7; }
    .btn-toggle      { color: #3b82f6; }
    .btn-toggle:hover{ background: #eff6ff; }
    .btn-delete      { color: #ef4444; }
    .btn-delete:hover{ background: #fef2f2; }
  `]
})
export class UserActionCellRendererComponent implements ICellRendererAngularComp {
  private params: any;

  get isActive(): boolean {
    return !!this.params?.data?.isActive;
  }

  agInit(params: ICellRendererParams): void { this.params = params; }
  refresh(params: ICellRendererParams): boolean { this.params = params; return true; }

  private get parent(): any { return this.params?.context?.componentParent; }

  onView():   void { this.parent?.viewUserDetails(this.params.data); }
  onReset():  void { this.parent?.openResetModal(this.params.data); }
  onToggle(): void { this.parent?.toggleStatus(this.params.data); }
  onDelete(): void { this.parent?.deleteUser(this.params.data); }
}