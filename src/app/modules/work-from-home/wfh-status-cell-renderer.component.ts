import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { ApprovalStatus } from '../../../app/core/Models/work-from-home.model';

@Component({
  selector: 'app-wfh-status-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="statusClass">
      <i class="bi" [ngClass]="statusIcon"></i>
      {{ label }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.85rem;
      border-radius: 2rem;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .pending   { background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; }
    .approved  { background: #dcfce7; color: #14532d; border: 1px solid #86efac; }
    .rejected  { background: #fee2e2; color: #7f1d1d; border: 1px solid #fca5a5; }
    .cancelled { background: #f1f5f9; color: #475569;  border: 1px solid #cbd5e1; }
  `]
})
export class WfhStatusCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;
  label = '';
  statusClass = '';
  statusIcon = '';

  private readonly classMap: Record<number, string> = {
    [ApprovalStatus.Pending]:   'pending',
    [ApprovalStatus.Approved]:  'approved',
    [ApprovalStatus.Rejected]:  'rejected',
    [ApprovalStatus.Cancelled]: 'cancelled'
  };

  private readonly iconMap: Record<number, string> = {
    [ApprovalStatus.Pending]:   'bi-clock-history',
    [ApprovalStatus.Approved]:  'bi-check-circle',
    [ApprovalStatus.Rejected]:  'bi-x-circle',
    [ApprovalStatus.Cancelled]: 'bi-slash-circle'
  };

  agInit(params: ICellRendererParams): void {
    this.params = params;
    this.setDisplay(params);
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    this.setDisplay(params);
    return true;
  }

  private setDisplay(params: ICellRendererParams): void {
    const status: ApprovalStatus = params.value;
    this.label      = params.data?.statusName ?? ApprovalStatus[status] ?? '';
    this.statusClass = this.classMap[status] ?? 'pending';
    this.statusIcon  = this.iconMap[status]  ?? 'bi-clock-history';
  }
}