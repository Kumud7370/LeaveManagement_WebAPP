import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ICellRendererAngularComp } from "ag-grid-angular"
import { ICellRendererParams } from "ag-grid-community"
import jsPDF from "jspdf"
import moment from "moment"
import autoTable from 'jspdf-autotable';

@Component({
  selector: "app-btn-pdf-cell-renderer",
  template: `
    <div class="cell-button-container">
      <button 
        class="btn-pdf"
        (click)="onClick()"
        title="Download PDF"
      >
        <i class="fas fa-file-pdf"></i>
        <span>PDF</span>
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
    
    .btn-pdf {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      border-radius: 6px;
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
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
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
export class BtnPdfCellRenderer implements ICellRendererAngularComp {
  private params!: ICellRendererParams
  private normalizedData: any

  agInit(params: ICellRendererParams): void {
    this.params = params
    // IMPORTANT: Normalize data exactly like ViewlogsheetComponent does
    this.normalizedData = this.normalizeData(params.data)
    console.log("Grid PDF - Original data:", params.data)
    console.log("Grid PDF - Normalized data:", this.normalizedData)
  }

  refresh(): boolean {
    return false
  }

  onClick(): void {
    this.downloadPDF()
  }

  // Check if logsheet is closed (status = 1) - same as ViewlogsheetComponent
  private isLogsheetClosed(): boolean {
    return this.normalizedData.IsClosed === 1
  }

  // EXACT COPY from ViewlogsheetComponent - normalize data keys to handle case sensitivity
  private normalizeData(data: any): any {
    if (!data) return {}
    // Create a standardized object with expected property names
    return {
      LogsheetNumber: data.logsheetNumber || data.LogsheetNumber || "",
      VehicleNumber: data.vehicleNumber || data.VehicleNumber || "",
      Ward: data.ward || data.Ward || "",
      RouteNumber: data.routeNumber || data.RouteNumber || "",
      TypeOfWaste: data.typeOfWaste || data.TypeOfWaste || "",
      DriverName: data.driverName || data.DriverName || "",
      CreatedOn: data.createdOn || data.CreatedOn || "",
      CreatedBy: data.createdBy || data.CreatedBy || "",
      ClosedBy: data.closedBy || data.ClosedBy || null,
      ClosedDestination: data.closedDestination || data.ClosedDestination || null,
      ClosedOn: data.closedOn || data.ClosedOn || null,
      IsClosed: data.isClosed !== undefined ? data.isClosed : data.IsClosed !== undefined ? data.IsClosed : 0,
      Remark: data.remark || data.Remark || "",
      // Transaction fields
      Trans_Date: data.trans_Date || data.Trans_Date || "",
      Trans_Time: data.trans_Time || data.Trans_Time || "",
      Trans_Date_UL: data.trans_Date_UL || data.Trans_Date_UL || "",
      Trans_Time_UL: data.trans_Time_UL || data.Trans_Time_UL || "",
      Gross_Weight: data.gross_Weight || data.Gross_Weight || "",
      Unladen_Weight: data.unladen_Weight || data.Unladen_Weight || "",
      Act_Net_Weight: data.act_Net_Weight || data.Act_Net_Weight || "",
    }
  }

  // EXACT COPY from ViewlogsheetComponent
  private getInTimeOfTransact(): string {
    if (this.normalizedData.Trans_Date && this.normalizedData.Trans_Time) {
      return `${this.normalizedData.Trans_Date} ${this.normalizedData.Trans_Time}`
    }
    return "N/A"
  }

  // EXACT COPY from ViewlogsheetComponent
  private getOutTimeOfTransact(): string {
    if (this.normalizedData.Trans_Date_UL && this.normalizedData.Trans_Time_UL) {
      return `${this.normalizedData.Trans_Date_UL} ${this.normalizedData.Trans_Time_UL}`
    }
    return "N/A"
  }

  // EXACT COPY from ViewlogsheetComponent
  private formatWeight(weight: string | number): string {
    if (!weight || weight === "N/A" || weight === "") {
      return "N/A"
    }
    // If it's already formatted with 'kg', return as is
    if (typeof weight === "string" && weight.includes("kg")) {
      return weight
    }
    // Otherwise, add 'kg' suffix
    return `${weight} kg`
  }

  // UPDATED: Enhanced PDF generation with conditional Trip Details table
  downloadPDF(): void {
    const doc = new jsPDF("landscape")
    const fileName = `Logsheet_${this.normalizedData.LogsheetNumber || "Unknown"}_${moment().format("DDMMYYYY_HHmmss")}`

    console.log("PDF Generation - Status:", this.normalizedData.IsClosed, "Is Closed:", this.isLogsheetClosed())

    // SWM MIS Header
    autoTable(doc, {
      body: [
        [{ content: "SWM MIS", colSpan: 6, styles: { halign: "center", fontSize: 14, fontStyle: "bold" } }],
        [{ content: "VEHICLE LOGSHEET", colSpan: 6, styles: { halign: "center", fontSize: 12, fontStyle: "bold" } }],
      ],
      theme: "grid",
      styles: {
        lineWidth: 0.3,
        textColor: 0,
        fontSize: 12,
        halign: "center",
        lineColor: [0, 0, 0],
      },
      margin: { top: 10 },
    })

    // Section 1: Main information table
    autoTable(doc, {
      body: [
        [
          { content: "Date & Time :", styles: { fontStyle: "bold" } },
          this.normalizedData.CreatedOn || "N/A",
          { content: "", rowSpan: 4 }, // merged vertical cell
          { content: "Name of Ward :", styles: { fontStyle: "bold" } },
          this.normalizedData.Ward || "N/A",
        ],
        [
          { content: "Logsheet Number :", styles: { fontStyle: "bold" } },
          this.normalizedData.LogsheetNumber || "N/A",
          { content: "Route Number :", styles: { fontStyle: "bold" } },
          this.normalizedData.RouteNumber || "N/A",
        ],
        [
          { content: "Type Of Waste :", styles: { fontStyle: "bold" } },
          this.normalizedData.TypeOfWaste || "N/A",
          { content: "Vehicle Number :", styles: { fontStyle: "bold" } },
          this.normalizedData.VehicleNumber || "N/A",
        ],
        [
          { content: "Driver's Name :", styles: { fontStyle: "bold" } },
          this.normalizedData.DriverName || "N/A",
          { content: "Status :", styles: { fontStyle: "bold" } },
          this.normalizedData.IsClosed === 0 ? "Open" : this.normalizedData.IsClosed === 2 ? "Cancelled" : "Closed",
        ],
      ],
      theme: "grid",
      startY: doc.lastAutoTable.finalY + 2,
      styles: {
        fontSize: 10,
        textColor: 0,
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 70 },
        2: { cellWidth: 29 },
        3: { cellWidth: 50 },
        4: { cellWidth: 70 },
      },
    })

    // CONDITIONAL: Transaction Details Table - only show if status is 1 (Closed)
    if (this.isLogsheetClosed()) {
      console.log("Adding Trip Details table to PDF - Status is Closed")
      autoTable(doc, {
        head: [
          [
            {
              content: "Trip Details",
              rowSpan: 2,
              styles: {
                fontStyle: "bold",
                halign: "center",
                valign: "middle",
                fillColor: [240, 240, 240],
              },
            },
            { content: "In Time of Transact", styles: { fontStyle: "bold", halign: "center" } },
            { content: "Out Time of Transact", styles: { fontStyle: "bold", halign: "center" } },
            { content: "Gross Weight", styles: { fontStyle: "bold", halign: "center" } },
            { content: "Unladen Weight", styles: { fontStyle: "bold", halign: "center" } },
            { content: "Actual Net Weight", styles: { fontStyle: "bold", halign: "center" } },
          ],
        ],
        body: [
          [
            {
              content: "Trip Details",
              rowSpan: 2,
              styles: {
                fontStyle: "bold",
                halign: "center",
                valign: "middle",
                fillColor: [248, 249, 250],
              },
            },
            this.getInTimeOfTransact(),
            this.getOutTimeOfTransact(),
            this.formatWeight(this.normalizedData.Gross_Weight),
            this.formatWeight(this.normalizedData.Unladen_Weight),
            this.formatWeight(this.normalizedData.Act_Net_Weight),
          ],
        ],
        theme: "grid",
        startY: doc.lastAutoTable.finalY + 5,
        styles: {
          fontSize: 10,
          textColor: 0,
          lineWidth: 0.3,
          lineColor: [0, 0, 0],
          halign: "center",
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 44.83 }, // Trip Details column
          1: { cellWidth: 44.83 }, // In Time of Transact
          2: { cellWidth: 44.83 }, // Out Time of Transact
          3: { cellWidth: 44.83 }, // Gross Weight
          4: { cellWidth: 44.83 }, // Unladen Weight
          5: { cellWidth: 44.83 }, // Actual Net Weight
        },
      })
    } else {
      console.log("Skipping Trip Details table - Status is not Closed:", this.normalizedData.IsClosed)

      // Add a note in the PDF explaining why Trip Details are not included
      autoTable(doc, {
        body: [
          [
            {
              content: "Trip Details are only available for closed logsheets.",
              colSpan: 6,
              styles: {
                halign: "center",
                fontSize: 11,
                fontStyle: "italic",
                textColor: [100, 100, 100],
                fillColor: [248, 249, 250],
              },
            },
          ],
          [
            {
              content: `Current Status: ${this.normalizedData.IsClosed === 0 ? "Open" : this.normalizedData.IsClosed === 2 ? "Cancelled" : "Unknown"}`,
              colSpan: 6,
              styles: {
                halign: "center",
                fontSize: 10,
                fontStyle: "bold",
                textColor: this.normalizedData.IsClosed === 0 ? [245, 158, 11] : [239, 68, 68], // Orange for Open, Red for Cancelled
                fillColor: [248, 249, 250],
              },
            },
          ],
        ],
        theme: "grid",
        startY: doc.lastAutoTable.finalY + 5,
        styles: {
          lineWidth: 0.3,
          lineColor: [200, 200, 200],
        },
      })
    }

    // Section 3: Closure information table
    autoTable(doc, {
      body: [
        [
          { content: "Logsheet Closed Date & Time :", styles: { fontStyle: "bold" } },
          this.normalizedData.ClosedOn || "N/A",
        ],
        [
          { content: "Waste Processing Plant:", styles: { fontStyle: "bold" } },
          this.normalizedData.ClosedDestination || "N/A",
        ],
        [{ content: "Signature & Stamp :", styles: { fontStyle: "bold" } }, this.normalizedData.ClosedBy || "N/A"],
        [{ content: "Remark :", styles: { fontStyle: "bold" } }, this.normalizedData.Remark || "N/A"],
      ],
      theme: "grid",
      styles: {
        fontSize: 10,
        textColor: 0,
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 199 },
      },
      startY: doc.lastAutoTable.finalY + 5,
    })

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    doc.setFontSize(8)
    doc.text("1 of 1", pageWidth / 2, pageHeight - 8, { align: "center" })

    // Save the PDF
    doc.save(`${fileName}.pdf`)

    console.log(`PDF generated: ${fileName}.pdf`)
  }
}
