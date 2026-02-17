import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { LeaveBalance } from '../../core/Models/leave-balance.model';

@Component({
  selector: 'app-leave-balance-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">
      <button class="btn-action edit"   (click)="onEdit()"      title="Edit Balance">
        <i class="bi bi-pencil"></i>
      </button>
      <button class="btn-action adjust" (click)="onAdjust()"    title="Adjust Days">
        <i class="bi bi-sliders"></i>
      </button>
      <button class="btn-action recalc" (click)="onRecalculate()" title="Recalculate">
        <i class="bi bi-arrow-repeat"></i>
      </button>
      <button class="btn-action delete" (click)="onDelete()"    title="Delete">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `,
  styles: [`
    .action-buttons { display: flex; align-items: center; justify-content: center; gap: 0.35rem; height: 100%; }
    .btn-action {
      width: 2rem; height: 2rem; border: none; border-radius: 0.375rem;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .18s; font-size: 0.8rem;
    }
    .btn-action.edit    { background: #eff6ff; color: #3b82f6; }
    .btn-action.adjust  { background: #f0fdf4; color: #16a34a; }
    .btn-action.recalc  { background: #f0f9ff; color: #0284c7; }
    .btn-action.delete  { background: #fef2f2; color: #ef4444; }
    .btn-action:hover   { filter: brightness(0.92); transform: scale(1.08); }
  `]
})
export class LeaveBalanceActionCellRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams;
  balance!: LeaveBalance;

  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.balance = params.data as LeaveBalance;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.balance = params.data as LeaveBalance;
    return true;
  }

  onEdit():        void { this.params.context.componentParent.editBalance(this.balance); }
  onAdjust():      void { this.params.context.componentParent.adjustBalance(this.balance); }
  onRecalculate(): void { this.params.context.componentParent.recalculateBalance(this.balance); }
  onDelete():      void { this.params.context.componentParent.deleteBalance(this.balance); }
}