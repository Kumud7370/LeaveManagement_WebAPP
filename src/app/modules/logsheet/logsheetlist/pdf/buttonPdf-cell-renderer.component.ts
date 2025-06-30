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

  agInit(params: ICellRendererParams): void {
    this.params = params
  }

  refresh(): boolean {
    return false
  }

  onClick(): void {
    this.generatePDF(this.params.data)
  }

  // private generatePDF(logsheetData: any): void {
  //     try {
  //         // Create new PDF document
  //         const doc = new jsPDF()

  //         // Set document properties
  //         doc.setProperties({
  //             title: `Logsheet ${logsheetData.LogsheetNumber}`,
  //             subject: "Vehicle Logsheet Report",
  //             author: "SWM WMS",
  //             creator: "SWM WMS Application",
  //         })

  //         // Header
  //         doc.setFillColor(26, 42, 108) // Primary color
  //         doc.rect(0, 0, 210, 30, "F")

  //         // Title
  //         doc.setTextColor(255, 255, 255)
  //         doc.setFontSize(20)
  //         doc.setFont("helvetica", "bold")
  //         doc.text("SWM WMS", 105, 12, { align: "center" })

  //         doc.setFontSize(16)
  //         doc.text("VEHICLE LOGSHEET", 105, 22, { align: "center" })

  //         // Reset text color
  //         doc.setTextColor(45, 55, 72) // Text color

  //         // Logsheet Information Section
  //         let yPos = 45

  //         // Section header
  //         doc.setFillColor(229, 231, 235) // Light gray
  //         doc.rect(15, yPos - 5, 180, 8, "F")
  //         doc.setFontSize(12)
  //         doc.setFont("helvetica", "bold")
  //         doc.text("LOGSHEET INFORMATION", 20, yPos)

  //         yPos += 15
  //         doc.setFont("helvetica", "normal")
  //         doc.setFontSize(10)

  //         // Two column layout for basic info
  //         const leftCol = 20
  //         const rightCol = 110
  //         const lineHeight = 8
  //         const labelDataMargin = 3;

  //         // Left column
  //         doc.setFont("helvetica", "bold")
  //         doc.text("Date & Time:", leftCol, yPos)
  //         let labelWidth = doc.getTextWidth("Date & Time:");
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.CreatedOn || "N/A", leftCol + labelWidth + labelDataMargin, yPos)

  //         // Right column
  //         doc.setFont("helvetica", "bold")
  //         doc.text("Name Of Ward:", rightCol, yPos)
  //         labelWidth = doc.getTextWidth("Name Of Ward:");
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.Ward || "N/A", rightCol + labelWidth + labelDataMargin, yPos)


  //         yPos += lineHeight

  //         doc.setFont("helvetica", "bold")
  //         doc.text("Logsheet Number:", leftCol, yPos)
  //         labelWidth = doc.getTextWidth("Logsheet Number:");
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.LogsheetNumber || "N/A", leftCol + labelWidth + labelDataMargin, yPos)

  //         doc.setFont("helvetica", "bold")
  //         doc.text("Route Number:", rightCol, yPos)
  //         labelWidth = doc.getTextWidth("Route Number:");
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.RouteNumber || "N/A", rightCol + labelWidth + labelDataMargin, yPos)

  //         yPos += lineHeight

  //         doc.setFont("helvetica", "bold")
  //         doc.text("Type Of Waste:", leftCol, yPos)
  //         labelWidth = doc.getTextWidth("Type Of Waste:");
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.TypeOfWaste || "N/A", leftCol + labelWidth + labelDataMargin, yPos)

  //         doc.setFont("helvetica", "bold")
  //         doc.text("Vehicle Number:", rightCol, yPos)
  //         labelWidth = doc.getTextWidth("Vehicle Number:");
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.VehicleNumber || "N/A", rightCol + labelWidth + labelDataMargin, yPos)

  //         yPos += lineHeight

  //         doc.setFont("helvetica", "bold")
  //         doc.text("Driver's Name:", leftCol, yPos)
  //         labelWidth = doc.getTextWidth("Driver's Name:");
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.DriverName || "N/A", leftCol + labelWidth + labelDataMargin, yPos)

  //         doc.setFont("helvetica", "bold")
  //         doc.text("Status:", rightCol, yPos)
  //         labelWidth = doc.getTextWidth("Status:");
  //         doc.setFont("helvetica", "normal")
  //         const status = logsheetData.IsClosed === 0 ? "Open" : logsheetData.IsClosed === 2 ? "Cancelled" : "Closed"
  //         doc.text(status, rightCol + labelWidth + labelDataMargin, yPos)

  //         // Always show these fields below main fields
  //         yPos += 20

  //         // Logsheet Closed Date & Time
  //         doc.setFont("helvetica", "bold")
  //         doc.text("Logsheet Closed Date & Time:", leftCol, yPos)
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.ClosedOn || "", leftCol + 55, yPos)

  //         yPos += lineHeight

  //         // Waste Processing Plant
  //         doc.setFont("helvetica", "bold")
  //         doc.text("Waste Processing Plant:", leftCol, yPos)
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.ClosedDestination || "", leftCol + 45, yPos)

  //         yPos += lineHeight

  //         // Signature & Stamp
  //         doc.setFont("helvetica", "bold")
  //         doc.text("Signature & Stamp:", leftCol, yPos)
  //         doc.setFont("helvetica", "normal")
  //         doc.text(logsheetData.ClosedBy || "", leftCol + 35, yPos)

  //         yPos += lineHeight

  //         // Remark
  //         doc.setFont("helvetica", "bold")
  //         doc.text("Remark:", leftCol, yPos)
  //         doc.setFont("helvetica", "normal")
  //         if (logsheetData.Remark) {
  //             // Handle long remarks with text wrapping
  //             const remarkLines = doc.splitTextToSize(logsheetData.Remark, 150)
  //             doc.text(remarkLines, leftCol + 20, yPos)
  //             yPos += remarkLines.length * 5
  //         } else {
  //             doc.text("", leftCol + 20, yPos)
  //         }

  //         // Created By Section
  //         // yPos += 20
  //         // doc.setFillColor(229, 231, 235) // Light gray
  //         // doc.rect(15, yPos - 5, 180, 8, "F")
  //         // doc.setFontSize(12)
  //         // doc.setFont("helvetica", "bold")
  //         // doc.text("CREATION DETAILS", 20, yPos)

  //         // yPos += 15
  //         // doc.setFont("helvetica", "normal")
  //         // doc.setFontSize(10)

  //         // doc.setFont("helvetica", "bold")
  //         // doc.text("Created By:", leftCol, yPos)
  //         // doc.setFont("helvetica", "normal")
  //         // doc.text(logsheetData.CreatedBy || "N/A", leftCol + 25, yPos)

  //         // Footer
  //         yPos = 280
  //         doc.setFillColor(26, 42, 108) // Primary color
  //         doc.rect(0, yPos, 210, 17, "F")

  //         doc.setTextColor(255, 255, 255)
  //         doc.setFontSize(8)
  //         doc.setFont("helvetica", "normal")
  //         doc.text("Generated by SWM WMS", 20, yPos + 8)
  //         doc.text(`Generated on: ${moment().format("DD/MM/YYYY HH:mm:ss")}`, 20, yPos + 13)

  //         // Page number
  //         doc.text("Page 1 of 1", 190, yPos + 10, { align: "right" })

  //         // Save the PDF
  //         const fileName = `Logsheet_${logsheetData.LogsheetNumber || "Unknown"}_${moment().format("DDMMYYYY_HHmmss")}.pdf`
  //         doc.save(fileName)
  //     } catch (error) {
  //         console.error("Error generating PDF:", error)
  //         alert("Error generating PDF. Please try again.")
  //     }
  // }
  private generatePDF(data: any): void {
    const doc = new jsPDF('landscape');
    const fileName = `Logsheet_${data.LogsheetNumber || 'Unknown'}_${moment().format("DDMMYYYY_HHmmss")}`;

    // SWM MIS Header
    autoTable(doc, {
      body: [
        [{ content: 'SWM MIS', colSpan: 6, styles: { halign: 'center', fontSize: 14, fontStyle: 'bold' } }],
        [{ content: 'VEHICLE LOGSHEET', colSpan: 6, styles: { halign: 'center', fontSize: 12, fontStyle: 'bold' } }]
      ],
      theme: 'grid',
      styles: {
        lineWidth: 0.3,
        textColor: 0,
        fontSize: 12,
        halign: 'center',
        lineColor: [0, 0, 0]
      },
      margin: { top: 10 }
    });

    // Section 1: Two-column layout with vertical merged cell in column 3
    autoTable(doc, {
      body: [
        [
          { content: 'Date & Time :', styles: { fontStyle: 'bold' } },
          data.CreatedOn || 'N/A',
          { content: '', rowSpan: 4 }, // merged vertical cell
          { content: 'Name of Ward :', styles: { fontStyle: 'bold' } },
          data.Ward || 'N/A'
        ],
        [
          { content: 'Logsheet Number :', styles: { fontStyle: 'bold' } },
          data.LogsheetNumber || 'N/A',
          { content: 'Route Number :', styles: { fontStyle: 'bold' } },
          data.RouteNumber || 'N/A'
        ],
        [
          { content: 'Type Of Waste :', styles: { fontStyle: 'bold' } },
          data.TypeOfWaste || 'N/A',
          { content: 'Vehicle Number :', styles: { fontStyle: 'bold' } },
          data.VehicleNumber || 'N/A'
        ],
        [
          { content: "Driver's Name :", styles: { fontStyle: 'bold' } },
          data.DriverName || 'N/A',
          { content: 'Status :', styles: { fontStyle: 'bold' } },
          data.IsClosed === 0 ? 'Open' : data.IsClosed === 2 ? 'Cancelled' : 'Closed'
        ]
      ],
      theme: 'grid',
      startY: doc.lastAutoTable.finalY + 2,
      styles: {
        fontSize: 10,
        textColor: 0,
        lineWidth: 0.3,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 70 },
        2: { cellWidth: 29 },
        3: { cellWidth: 50 },
        4: { cellWidth: 70 }
      }
    });

    // Section 2: Full-width single-column rows
    autoTable(doc, {
      body: [
        [
          { content: 'Logsheet Closed Date & Time :', styles: { fontStyle: 'bold' } },
          data.ClosedOn || 'N/A',


        ],
        [
          { content: 'Waste Processing Plant:', styles: { fontStyle: 'bold' } },
          data.ClosedDestination || 'N/A'
        ],
        [
          { content: 'Signature & Stamp :', styles: { fontStyle: 'bold' } },
          data.ClosedBy || 'N/A'
        ],
        [
          { content: 'Remark :', styles: { fontStyle: 'bold' } },
          data.Remark || 'N/A'
        ]
      ],
      theme: 'grid',
      styles: {
        fontSize: 10,
        textColor: 0,
        lineWidth: 0.3,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 199 }
      },
      startY: doc.lastAutoTable.finalY + 5
    });

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    // doc.text('Generated by SWM MIS', 10, pageHeight - 8);
    // doc.text(`Generated on: ${moment().format("DD/MM/YYYY HH:mm:ss")}`, 10, pageHeight - 3);
    doc.text('1 of 1', pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.save(`${fileName}.pdf`);
  }

}
