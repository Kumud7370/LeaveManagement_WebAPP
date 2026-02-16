// // src/app/modules/dashboard/employees/renderers/employment-type-cell-renderer.component.ts

// import { Component } from '@angular/core';
// import { ICellRendererAngularComp } from 'ag-grid-angular';
// import { ICellRendererParams } from 'ag-grid-community';
// import { CommonModule } from '@angular/common';
// import { EmploymentType } from '../../../core/Models/employee.model';

// @Component({
//   selector: 'app-employment-type-cell-renderer',
//   standalone: true,
//   imports: [CommonModule],
//   template: `
//     <span class="badge" [ngClass]="getBadgeClass()">
//       {{ getTypeName() }}
//     </span>
//   `,
//   styles: [`
//     .badge {
//       display: inline-block;
//       padding: 0.35rem 0.85rem;
//       border-radius: 1rem;
//       font-size: 0.8rem;
//       font-weight: 600;
//       white-space: nowrap;
//     }

//     .badge.badge-primary {
//       background: #dbeafe;
//       color: #1e40af;
//     }

//     .badge.badge-info {
//       background: #dbeafe;
//       color: #1e40af;
//     }

//     .badge.badge-warning {
//       background: #fef3c7;
//       color: #92400e;
//     }

//     .badge.badge-secondary {
//       background: #f3f4f6;
//       color: #4b5563;
//     }

//     .badge.badge-light {
//       background: #f9fafb;
//       color: #6b7280;
//       border: 1px solid #e5e7eb;
//     }
//   `]
// })
// export class EmploymentTypeCellRendererComponent implements ICellRendererAngularComp {
//   params!: ICellRendererParams;

//   agInit(params: ICellRendererParams): void {
//     this.params = params;
//   }

//   refresh(params: ICellRendererParams): boolean {
//     this.params = params;
//     return true;
//   }

//   getBadgeClass(): string {
//     const type = this.params.data?.employmentType;
    
//     switch (type) {
//       case EmploymentType.FullTime:
//         return 'badge-primary';
//       case EmploymentType.PartTime:
//         return 'badge-info';
//       case EmploymentType.Contract:
//         return 'badge-warning';
//       case EmploymentType.Intern:
//         return 'badge-secondary';
//       case EmploymentType.Temporary:
//         return 'badge-light';
//       default:
//         return 'badge-secondary';
//     }
//   }

//   getTypeName(): string {
//     return this.params.data?.employmentTypeName || 'N/A';
//   }
// }