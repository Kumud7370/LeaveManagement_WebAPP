import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { LeaveBalance } from '../../core/Models/leave-balance.model';
import { LanguageService } from '../../core/services/api/language.api';

@Component({
  selector: 'app-leave-balance-action-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-buttons">
      <button class="btn-icon btn-edit"   (click)="onEdit()"
        [title]="langService.t('lb.action.edit')">
        <i class="bi bi-pencil"></i>
      </button>
      <button class="btn-icon btn-adjust" (click)="onAdjust()"
        [title]="langService.t('lb.action.adjust')">
        <i class="bi bi-sliders"></i>
      </button>
      <button class="btn-icon btn-recalc" (click)="onRecalculate()"
        [title]="langService.t('lb.action.recalculate')">
        <i class="bi bi-arrow-repeat"></i>
      </button>
      <button class="btn-icon btn-delete" (click)="onDelete()"
        [title]="langService.t('lb.action.delete')">
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
    }
    .btn-edit   { color: #3b82f6; }
    .btn-edit:hover   { background: #eff6ff; }
    .btn-adjust { color: #10b981; }
    .btn-adjust:hover { background: #ecfdf5; }
    .btn-recalc { color: #0284c7; }
    .btn-recalc:hover { background: #e0f2fe; }
    .btn-delete { color: #ef4444; }
    .btn-delete:hover { background: #fef2f2; }
  `]
})
export class LeaveBalanceActionCellRendererComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams;
  balance!: LeaveBalance;

  constructor(public langService: LanguageService) {}

  agInit(params: ICellRendererParams): void {
    this.params  = params;
    this.balance = params.data as LeaveBalance;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params  = params;
    this.balance = params.data as LeaveBalance;
    return true;
  }

  onEdit():        void { this.params.context.componentParent.editBalance(this.balance); }
  onAdjust():      void { this.params.context.componentParent.adjustBalance(this.balance); }
  onRecalculate(): void { this.params.context.componentParent.recalculateBalance(this.balance); }
  onDelete():      void { this.params.context.componentParent.deleteBalance(this.balance); }
}