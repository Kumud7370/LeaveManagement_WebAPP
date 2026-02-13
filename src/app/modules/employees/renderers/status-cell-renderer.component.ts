// src/app/modules/dashboard/employees/renderers/status-cell-renderer.component.ts

import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { EmployeeStatus } from '../../../core/Models/employee.model';

@Component({
  selector: 'app-status-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [ngClass]="getBadgeClass()">
      {{ getStatusName() }}
    </span>
  `,
  styles: [`
    .status-badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      border-radius: 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .status-badge.badge-success {
      background: #d1fae5;
      color: #065f46;
    }

    .status-badge.badge-danger {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-badge.badge-warning {
      background: #fef3c7;
      color: #92400e;
    }

    .status-badge.badge-info {
      background: #dbeafe;
      color: #1e40af;
    }

    .status-badge.badge-secondary {
      background: #f3f4f6;
      color: #4b5563;
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

  getBadgeClass(): string {
    const status = this.params.data?.employeeStatus;
    
    switch (status) {
      case EmployeeStatus.Active:
        return 'badge-success';
      case EmployeeStatus.Inactive:
        return 'badge-secondary';
      case EmployeeStatus.OnLeave:
        return 'badge-info';
      case EmployeeStatus.Suspended:
        return 'badge-warning';
      case EmployeeStatus.Terminated:
      case EmployeeStatus.Resigned:
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getStatusName(): string {
    return this.params.data?.employeeStatusName || 'N/A';
  }
}