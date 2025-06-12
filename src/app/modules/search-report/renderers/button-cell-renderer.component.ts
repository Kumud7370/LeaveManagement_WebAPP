import { Component } from "@angular/core"
import { ICellRendererAngularComp } from "ag-grid-angular"

@Component({
  selector: "app-btn-cell-renderer",
  template: `
    <button 
      class="btn-image" 
      *ngIf="params.value" 
      (click)="viewImage()">
      <i class="fas fa-image"></i> View
    </button>
  `,
  styles: [
    `
    .btn-image {
      background-color: #1a2a6c;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .btn-image:hover {
      background-color: #2a3a7c;
    }
    
    .btn-image i {
      margin-right: 0.25rem;
    }
  `,
  ],
})
export class BtnCellRenderer implements ICellRendererAngularComp {
  public params: any

  agInit(params: any): void {
    this.params = params
  }

  refresh(): boolean {
    return false
  }

  viewImage(): void {
    if (this.params.value) {
      window.open(this.params.value, "_blank")
    }
  }
}
