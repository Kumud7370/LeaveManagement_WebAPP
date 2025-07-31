import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ICellRendererAngularComp } from "ag-grid-angular"
import { ICellRendererParams } from "ag-grid-community"

@Component({
    selector: "app-btn-search-view-cell-renderer",
    template: `
    <div class="cell-button-container">
      <button 
        class="btn-view"
        (click)="onClick()"
        title="View Search Report Details"
      >
        <i class="fas fa-eye"></i>
        <span>View</span>
      </button>
    </div>
  `,
    styles: [
        `
    .cell-button-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 2px;
    }
    
    .btn-view {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      border-radius: 6px;
      background: linear-gradient(135deg, #1a2a6c 0%, #b21f1f 100%);
      color: white;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      min-width: 70px;
      white-space: nowrap;
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        background: linear-gradient(135deg, #2a3a7c 0%, #c22f2f 100%);
      }
      
      &:active {
        transform: translateY(0);
      }
      
      i {
        font-size: 0.7rem;
      }
      
      span {
        font-weight: 500;
      }
    }
  `,
    ],
    standalone: true,
    imports: [CommonModule],
})
export class BtnSearchViewCellRenderer implements ICellRendererAngularComp {
    private params!: ICellRendererParams

    agInit(params: ICellRendererParams): void {
        this.params = params
    }

    refresh(): boolean {
        return false
    }

    onClick(): void {
        console.log("Search View button clicked", this.params.data)
        // Check if context and componentParent exist
        if (this.params.context && this.params.context.componentParent) {
            this.params.context.componentParent.viewSearchReportDetails(this.params.data)
        } else {
            console.error("Context or componentParent not found")
        }
    }
}
