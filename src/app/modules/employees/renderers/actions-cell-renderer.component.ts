// // src/app/modules/dashboard/employees/renderers/actions-cell-renderer.component.ts

// import { Component } from '@angular/core';
// import { ICellRendererAngularComp } from 'ag-grid-angular';
// import { ICellRendererParams } from 'ag-grid-community';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-actions-cell-renderer',
//   standalone: true,
//   imports: [CommonModule],
//   template: `
//     <div class="d-flex align-items-center justify-content-center">
//       <button 
//         class="action-btn action-btn-view" 
//         (click)="onView()"
//         title="View Details"
//         type="button">
//         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
//           <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
//           <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
//         </svg>
//       </button>
      
//       <button 
//         class="action-btn action-btn-edit" 
//         (click)="onEdit()"
//         title="Edit Employee"
//         type="button">
//         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
//           <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
//         </svg>
//       </button>
      
//       <button 
//         class="action-btn action-btn-delete" 
//         (click)="onDelete()"
//         title="Delete Employee"
//         type="button">
//         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
//           <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
//           <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
//         </svg>
//       </button>
//     </div>
//   `,
//   styles: [`
//     .d-flex {
//       display: flex;
//       gap: 4px;
//     }

//     .align-items-center {
//       align-items: center;
//     }

//     .justify-content-center {
//       justify-content: center;
//     }

//     .action-btn {
//       display: inline-flex;
//       align-items: center;
//       justify-content: center;
//       width: 32px;
//       height: 32px;
//       border-radius: 4px;
//       border: none;
//       background: transparent;
//       cursor: pointer;
//       transition: all 0.15s ease;
//       padding: 0;
//       line-height: 1;
//     }

//     .action-btn svg {
//       display: block;
//       width: 18px;
//       height: 18px;
//       pointer-events: none;
//     }

//     .action-btn-view {
//       color: #3b82f6;
//     }

//     .action-btn-view:hover {
//       background-color: #dbeafe;
//       opacity: 0.9;
//     }

//     .action-btn-edit {
//       color: #4A90E2;
//     }

//     .action-btn-edit:hover {
//       background-color: #E3F2FD;
//       opacity: 0.9;
//     }

//     .action-btn-delete {
//       color: #D9534F;
//     }

//     .action-btn-delete:hover {
//       background-color: #FFEBEE;
//       opacity: 0.9;
//     }
//   `]
// })
// export class ActionsCellRendererComponent implements ICellRendererAngularComp {
//   params!: ICellRendererParams;

//   agInit(params: ICellRendererParams): void {
//     this.params = params;
//   }

//   refresh(params: ICellRendererParams): boolean {
//     this.params = params;
//     return true;
//   }

//   onView(): void {
//     if (this.params.context?.componentParent) {
//       this.params.context.componentParent.viewEmployee(this.params.data.id);
//     }
//   }

//   onEdit(): void {
//     if (this.params.context?.componentParent) {
//       this.params.context.componentParent.editEmployee(this.params.data.id);
//     }
//   }

//   onDelete(): void {
//     if (this.params.context?.componentParent) {
//       this.params.context.componentParent.deleteEmployee(this.params.data);
//     }
//   }
// }