import { Component } from "@angular/core"
import { ICellRendererAngularComp } from "ag-grid-angular"

@Component({
  selector: "app-btn-more-cell-renderer",
  template: `
    <button 
      class="btn-more" 
      (click)="viewMore()">
      <i class="fas fa-ellipsis-h"></i>
    </button>
  `,
  styles: [
    `
    .btn-more {
      background-color: #f5f7fb;
      color: #1a2a6c;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .btn-more:hover {
      background-color: #e5e7eb;
    }
  `,
  ],
})
export class BtnMoreCellRenderer implements ICellRendererAngularComp {
  public params: any

  agInit(params: any): void {
    this.params = params
  }

  refresh(): boolean {
    return false
  }

  viewMore(): void {
    // Show more options for this record
    alert(`More options for slip #${this.params.value}`)
  }
}
