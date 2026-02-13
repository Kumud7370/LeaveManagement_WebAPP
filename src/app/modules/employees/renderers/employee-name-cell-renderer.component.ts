// src/app/modules/dashboard/employees/renderers/employee-name-cell-renderer.component.ts

import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-employee-name-cell-renderer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="employee-name-container">
      <div class="employee-avatar-wrapper">
        <div class="avatar" *ngIf="params.data?.profileImageUrl">
          <img [src]="params.data.profileImageUrl" [alt]="params.data.fullName" />
        </div>
        <div class="avatar avatar-placeholder" *ngIf="!params.data?.profileImageUrl">
          {{ getInitials() }}
        </div>
      </div>
      <div class="employee-info">
        <div class="employee-name-primary">{{ params.data?.fullName || 'N/A' }}</div>
        <div class="employee-code-secondary">{{ params.data?.employeeCode || '' }}</div>
      </div>
    </div>
  `,
  styles: [`
    .employee-name-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.25rem 0;
    }

    .employee-avatar-wrapper {
      flex-shrink: 0;
    }

    .avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar.avatar-placeholder {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .employee-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .employee-name-primary {
      font-weight: 600;
      font-size: 14px;
      color: #111827;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .employee-code-secondary {
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.3;
      font-weight: 500;
      font-family: 'Monaco', 'Courier New', monospace;
    }
  `]
})
export class EmployeeNameCellRendererComponent implements ICellRendererAngularComp {
  params!: ICellRendererParams;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  refresh(params: ICellRendererParams): boolean {
    this.params = params;
    return true;
  }

  getInitials(): string {
    const firstName = this.params.data?.firstName || '';
    const lastName = this.params.data?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
}