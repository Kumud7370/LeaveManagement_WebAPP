import { Component } from "@angular/core"
import { ICellRendererAngularComp } from "ag-grid-angular"

@Component({
  selector: "app-checkbox-cell-renderer",
  template: `
    <div class="checkbox-container">
      <input 
        type="checkbox" 
        [checked]="params.value === 'Y'" 
        [disabled]="true"
        class="custom-checkbox">
      <span class="status-text">{{ params.value === 'Y' ? 'Yes' : 'No' }}</span>
    </div>
  `,
  styles: [
    `
    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .custom-checkbox {
      width: 16px;
      height: 16px;
      accent-color: #00ffcc;
    }
    
    .status-text {
      font-size: 0.875rem;
      color: #6b7280;
    }
  `,
  ],
})
export class CheckBoxCellRenderer implements ICellRendererAngularComp {
  public params: any

  agInit(params: any): void {
    this.params = params
  }

  refresh(): boolean {
    return false
  }
}
