import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="status-badge"
      [class.active]="params.value"
      [class.inactive]="!params.value"
    >
      {{ params.value ? "Active" : "Inactive" }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      border-radius: 1rem;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .status-badge.active {
      background: #d1fae5;
      color: #065f46;
    }

    .status-badge.inactive {
      background: #fee2e2;
      color: #991b1b;
    }
  `]
})
export class StatusCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    return true;
  }
}