import { Component } from "@angular/core"
import { ICellRendererAngularComp } from "ag-grid-angular"
import type { Router } from "@angular/router"

@Component({
  selector: "app-btn-view-cell-renderer",
  template: `
    <button 
      class="btn-view" 
      (click)="viewDetails()">
      <i class="fas fa-eye"></i> View
    </button>
  `,
  styles: [
    `
    .btn-view {
      background-color: #00ffcc;
      color: #1a2a6c;
      border: none;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
    }
    
    .btn-view:hover {
      background-color: #00e6b8;
    }
    
    .btn-view i {
      margin-right: 0.25rem;
    }
  `,
  ],
})
export class BtnViewCellRenderer implements ICellRendererAngularComp {
  public params: any

  constructor(private router: Router) { }

  agInit(params: any): void {
    this.params = params
  }

  refresh(): boolean {
    return false
  }

  viewDetails(): void {
    // For now, just show an alert
    alert(`View details for slip #${this.params.value}`)
  }
}
