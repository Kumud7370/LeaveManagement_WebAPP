import { Component, EventEmitter, Inject, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { FormBuilder } from '@angular/forms'
import { MatDialogRef } from '@angular/material/dialog'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import moment from "moment"
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GState } from "jspdf" // Import GState for type reference
import { CellHookData } from "jspdf-autotable" // Import types for 
import { DbCallingService } from 'src/app/core/services/db-calling.service'
import { AgGridAngular, AgGridModule } from 'ag-grid-angular'
import { ButtonModule } from '@coreui/angular'
import { GridReadyEvent } from 'ag-grid-community'
import Swal from "sweetalert2"

@Component({
  selector: "app-viewlogsheet",
  templateUrl: "./viewlogsheet.component.html",
  styleUrls: ["./viewlogsheet.component.scss"],
  standalone: true,
  imports: [CommonModule, AgGridModule, AgGridAngular, ButtonModule],
})
export class ViewlogsheetComponent {
  @Output() refreshRequested = new EventEmitter<void>();
  filterText: any = ""
  lstSearchResults: any = []
  lstReportData: any = []
  lstPenaltyData: any = []
  lstFilterData: any
  ttlQuantity: any
  userId = 0
  userSiteName = ""
  userRole=""
  private gridApi: any;
  columnDefs: any[] = [
    {
      headerName: 'Select',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 100,
    },
    { field: 'pId', headerName: 'ID', width: 90, hide: true },
    { field: 'penaltyHeader', headerName: 'Header', flex: 1 },
    { field: 'penaltyDescription', headerName: 'Description', flex: 2, hide: true },


  ];
  constructor(
    public router: Router,
    public fb: FormBuilder,
    public dialogRef: MatDialogRef<ViewlogsheetComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private masterService: DbCallingService
  ) {
    this.userRole=String(sessionStorage.getItem("RoleName")) || "";
    this.userId = Number(sessionStorage.getItem("UserId")) || 0
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";
    // Normalize data keys to handle case sensitivity issues
    this.lstFilterData = this.normalizeData(data)
    console.log("View Dialog - Original data received:", data)
    console.log("View Dialog - Normalized data:", this.lstFilterData)
    let obj = {
      SiteName: this.userSiteName,
      UserId: this.userId,
    }
    this.masterService.GetPenaltyList(obj).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.lstPenaltyData = response.data
          console.log("Penalty List Data:", this.lstPenaltyData)
          // this.ttlQuantity = this.lstReportData.reduce((sum: number, item: any) => sum + (item.Quantity || 0), 0)
          // console.log("Total Quantity:", this.ttlQuantity)
        } else {
          this.lstPenaltyData = []
          // this.ttlQuantity = 0
        }
      },
      error: (error: any) => {
        console.error("Error fetching Penalty List data:", error)
        this.lstPenaltyData = []
        // this.ttlQuantity = 0
      }
    });
  }

  // This function normalizes the data keys to ensure consistent casing
  normalizeData(data: any): any {
    if (!data) return {}
    // Create a standardized object with expected property names
   // console.log("Normalizing data:", data)
    return {
      LogsheetNumber: data.logsheetNumber || data.LogsheetNumber || "",
      VehicleNumber: data.vehicleNumber || data.VehicleNumber || "",
      Ward: data.ward || data.Ward || "",
      RouteNumber: data.routeNumber || data.RouteNumber || "",
      TypeOfWaste: data.typeOfWaste || data.TypeOfWaste || "",
      DriverName: data.driverName || data.DriverName || "",
      CleanerName: data.cleanerName || data.CleanerName || "",
      CreatedOn: data.createdOn || data.CreatedOn || "",
      CreatedBy: data.createdBy || data.CreatedBy || "",
      ClosedBy: data.closedBy || data.ClosedBy || null,
      ClosedDestination: data.closedDestination || data.ClosedDestination || null,
      ClosedOn: data.closedOn || data.ClosedOn || null,
      IsClosed: data.isClosed !== undefined ? data.isClosed : data.IsClosed !== undefined ? data.IsClosed : 0,
      Remark: data.remark || data.Remark || "",
      RCBookTareWeight: data.rcBookTareWeight || data.RCBookTareWeight || "",
      AgencyName: data.agencyName || data.AgencyName || "",
      // Transaction fields - UPDATED to handle both cases
      RTSData: data.rtsData,
      DumpingData: data.dumpingData,
      VerifyStatus: data.verifyStatus || data.VerifyStatus,
      VerifiedBy: data.verifiedBy || data.VerifiedBy,
      VerifiedOn: data.verifiedOn || data.VerifiedOn,
    }
  }

  // Check if logsheet is closed (status = 1) - for UI display only
  isLogsheetClosed(): boolean {
    return this.lstFilterData.IsClosed === 1
  }

  // Get formatted In Time of Transact - for UI display
  getInTimeOfTransact(): string {
    const date = this.lstFilterData?.Trans_Date
    const time = this.lstFilterData?.Trans_Time
    // console.log("Getting In Time - Date:", date, "Time:", time)
    if (date && time) {
      return `${date} ${time}`
    }
    return "N/A"
  }

  // Get formatted Out Time of Transact - for UI display
  getOutTimeOfTransact(): string {
    const date = this.lstFilterData?.Trans_Date_UL
    const time = this.lstFilterData?.Trans_Time_UL
    // console.log("Getting Out Time - Date:", date, "Time:", time)
    if (date && time) {
      return `${date} ${time}`
    }
    return "N/A"
  }

  // Format weight values - for UI display
  formatWeight(weight: string): string {
    //  console.log("Formatting weight:", weight)
    if (!weight || weight === "N/A" || weight === "" || weight === null || weight === undefined) {
      return "N/A"
    }
    // If it's already formatted with 'kg', return as is
    if (typeof weight === "string" && weight.includes("kg")) {
      return weight
    }
    // Otherwise, add 'kg' suffix
    return `${weight} kg`
  }

  // UPDATED: PDF-specific methods that always show Trip Details but with N/A for non-closed logsheets
  private getPdfInTimeOfTransact(): string {
    if (this.lstFilterData.IsClosed !== 1) {
      return "N/A"
    }
    if (this.lstFilterData?.Trans_Date && this.lstFilterData?.Trans_Time) {
      return `${this.lstFilterData?.Trans_Date} ${this.lstFilterData?.Trans_Time}`
    }
    return "N/A"
  }

  private getPdfOutTimeOfTransact(): string {
    if (this.lstFilterData.IsClosed !== 1) {
      return "N/A"
    }
    if (this.lstFilterData?.Trans_Date_UL && this.lstFilterData?.Trans_Time_UL) {
      return `${this.lstFilterData?.Trans_Date_UL} ${this.lstFilterData?.Trans_Time_UL}`
    }
    return "N/A"
  }

  private formatPdfWeight(weight: string): string {
    if (this.lstFilterData.IsClosed !== 1) {
      return "N/A"
    }
    if (!weight || weight === "N/A" || weight === "" || weight === null || weight === undefined) {
      return "N/A"
    }
    // If it's already formatted with 'kg', return as is
    if (typeof weight === "string" && weight.includes("kg")) {
      return weight
    }
    // Otherwise, add 'kg' suffix
    return `${weight} kg`
  }

  // Helper to get base64 image from assets
  private getBase64ImageFromAssets(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = path
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const dataURL = canvas.toDataURL("image/png")
          resolve(dataURL)
        } else {
          reject("Canvas context not found")
        }
      }
      img.onerror = (err) => reject(err)
    })
  }

  // Print functionality
  printLogsheet(): void {
    window.print()
  }

  // UPDATED: PDF generation - ALWAYS includes Trip Details table, but shows N/A for non-closed logsheets
  // async downloadPDF(): Promise<void> {
  //   const doc = new jsPDF("landscape")
  //   const fileName = `Logsheet_${this.lstFilterData.LogsheetNumber || "Unknown"}_${moment().format("DDMMYYYY_HHmmss")}`
  //   const logoBase64 = await this.getBase64ImageFromAssets("assets/images/mcgmlogo.png")

  //   // Header table with logo and text
  //   autoTable(doc, {
  //     // Use autoTable as a function
  //     body: [
  //       [
  //         { content: "", rowSpan: 3, styles: { cellWidth: 30, minCellHeight: 30, fillColor: [255, 255, 255] } }, // Placeholder for logo
  //         {
  //           content: "MUNICIPAL CORPORATION OF GREATER MUMBAI",
  //           colSpan: 5,
  //           styles: { halign: "center", fontSize: 14, fontStyle: "bold" },
  //         },
  //       ],
  //       [
  //         {
  //           content: "SOLID WASTE MANAGEMENT",
  //           colSpan: 5,
  //           styles: { halign: "center", fontSize: 12, fontStyle: "bold" },
  //         },
  //       ],
  //       [{ content: "VEHICLE LOGSHEET", colSpan: 5, styles: { halign: "center", fontSize: 10, fontStyle: "bold" } }],
  //     ],
  //     theme: "grid",
  //     styles: {
  //       lineWidth: 0.1,
  //       textColor: 0,
  //       lineColor: [0, 0, 0],
  //     },
  //     margin: { top: 10, left: 15, right: 15 }, // Consistent margins
  //     didDrawCell: (hookData: CellHookData) => {
  //       // Explicitly type hookData
  //       if (hookData.row.index === 0 && hookData.column.index === 0 && logoBase64) {
  //         doc.addImage(logoBase64, "PNG", hookData.cell.x + 2, hookData.cell.y + 2, 25, 25) // Adjust position and size within cell
  //       }
  //     },
  //   })

  //   // Section 1: Main information table
  //   autoTable(doc, {
  //     // Use autoTable as a function
  //     body: [
  //       [
  //         { content: "Date & Time :", styles: { fontStyle: "bold" } },
  //         this.lstFilterData?.CreatedOn || "N/A",
  //         { content: "", rowSpan: 4 }, // merged vertical cell
  //         { content: "Name of Ward :", styles: { fontStyle: "bold" } },
  //         this.lstFilterData.Ward || "N/A",
  //       ],
  //       [
  //         { content: "Logsheet Number :", styles: { fontStyle: "bold" } },
  //         this.lstFilterData?.LogsheetNumber || "N/A",
  //         { content: "Route Number :", styles: { fontStyle: "bold" } },
  //         this.lstFilterData.RouteNumber || "N/A",
  //       ],
  //       [
  //         { content: "Type Of Waste :", styles: { fontStyle: "bold" } },
  //         this.lstFilterData?.TypeOfWaste || "N/A",
  //         { content: "Vehicle Number :", styles: { fontStyle: "bold" } },
  //         this.lstFilterData.VehicleNumber || "N/A",
  //       ],
  //       [
  //         { content: "Driver's Name :", styles: { fontStyle: "bold" } },
  //         this.lstFilterData.DriverName || "N/A",
  //         { content: "Status :", styles: { fontStyle: "bold" } },
  //         this.lstFilterData.IsClosed === 0 ? "Open" : this.lstFilterData.IsClosed === 2 ? "Cancelled" : "Closed",
  //       ],
  //     ],
  //     theme: "grid",
  //     startY: doc.lastAutoTable.finalY + 2,
  //     styles: {
  //       fontSize: 10,
  //       textColor: 0,
  //       lineWidth: 0.3,
  //       lineColor: [0, 0, 0],
  //     },
  //     columnStyles: {
  //       0: { cellWidth: 50 },
  //       1: { cellWidth: 70 },
  //       2: { cellWidth: 29 },
  //       3: { cellWidth: 50 },
  //       4: { cellWidth: 70 },
  //     },
  //   })

  //   // UPDATED: Trip Details Table - ALWAYS show in PDF, but display N/A for non-closed logsheets
  //   autoTable(doc, {
  //     // Use autoTable as a function
  //     head: [
  //       [
  //         {
  //           content: "Trip Details",
  //           rowSpan: 2,
  //           styles: {
  //             fontStyle: "bold",
  //             halign: "center",
  //             valign: "middle",
  //             fillColor: [240, 240, 240],
  //           },
  //         },
  //         { content: "In Time of Transact", styles: { fontStyle: "bold", halign: "center" } },
  //         { content: "Out Time of Transact", styles: { fontStyle: "bold", halign: "center" } },
  //         { content: "Gross Weight", styles: { fontStyle: "bold", halign: "center" } },
  //         { content: "Unladen Weight", styles: { fontStyle: "bold", halign: "center" } },
  //         { content: "Actual Net Weight", styles: { fontStyle: "bold", halign: "center" } },
  //       ],
  //     ],
  //     body: [
  //       [
  //         {
  //           content: "Trip Details",
  //           rowSpan: 2,
  //           styles: {
  //             fontStyle: "bold",
  //             halign: "center",
  //             valign: "middle",
  //             fillColor: [248, 249, 250],
  //           },
  //         },
  //         this.getPdfInTimeOfTransact(), // Will return N/A if not closed
  //         this.getPdfOutTimeOfTransact(), // Will return N/A if not closed
  //         this.formatPdfWeight(this.lstFilterData?.Gross_Weight), // Will return N/A if not closed
  //         this.formatPdfWeight(this.lstFilterData?.Unladen_Weight), // Will return N/A if not closed
  //         this.formatPdfWeight(this.lstFilterData?.Act_Net_Weight), // Will return N/A if not closed
  //       ],
  //     ],
  //     theme: "grid",
  //     startY: doc.lastAutoTable.finalY + 5,
  //     styles: {
  //       fontSize: 10,
  //       textColor: 0,
  //       lineWidth: 0.3,
  //       lineColor: [0, 0, 0],
  //       halign: "center",
  //     },
  //     headStyles: {
  //       fillColor: [240, 240, 240],
  //       textColor: 0,
  //       fontStyle: "bold",
  //     },
  //     columnStyles: {
  //       0: { cellWidth: 44.83 }, // Trip Details column
  //       1: { cellWidth: 44.83 }, // In Time of Transact
  //       2: { cellWidth: 44.83 }, // Out Time of Transact
  //       3: { cellWidth: 44.83 }, // Gross Weight
  //       4: { cellWidth: 44.83 }, // Unladen Weight
  //       5: { cellWidth: 44.83 }, // Actual Net Weight
  //     },
  //   })

  //   // Section 3: Closure information table
  //   autoTable(doc, {
  //     // Use autoTable as a function
  //     body: [
  //       [
  //         { content: "Logsheet Closed Date & Time :", styles: { fontStyle: "bold" } },
  //         this.lstFilterData.ClosedOn || "N/A",
  //       ],
  //       [
  //         { content: "Waste Processing Plant:", styles: { fontStyle: "bold" } },
  //         this.lstFilterData.ClosedDestination || "N/A",
  //       ],
  //       [{ content: "Signature & Stamp :", styles: { fontStyle: "bold" } }, this.lstFilterData.ClosedBy || "N/A"],
  //       [{ content: "Remark :", styles: { fontStyle: "bold" } }, this.lstFilterData.Remark || "N/A"],
  //     ],
  //     theme: "grid",
  //     styles: {
  //       fontSize: 10,
  //       textColor: 0,
  //       lineWidth: 0.3,
  //       lineColor: [0, 0, 0],
  //     },
  //     columnStyles: {
  //       0: { cellWidth: 70 },
  //       1: { cellWidth: 199 },
  //     },
  //     startY: doc.lastAutoTable.finalY + 5,
  //   })

  //   // Add watermark after all content
  //   doc.setGState(new GState({ opacity: 0.1 })) // Set opacity to 10% for a slightly darker watermark
  //   const watermarkWidth = 150 // Larger size for landscape
  //   const watermarkHeight = 150 // Larger size for landscape
  //   const centerX = (doc.internal.pageSize.getWidth() - watermarkWidth) / 2
  //   const centerY = (doc.internal.pageSize.getHeight() - watermarkHeight) / 2
  //   doc.addImage(logoBase64, "PNG", centerX, centerY, watermarkWidth, watermarkHeight)
  //   doc.setGState(new GState({ opacity: 1 })) // Reset opacity

  //   // Footer
  //   const pageHeight = doc.internal.pageSize.getHeight()
  //   const pageWidth = doc.internal.pageSize.getWidth()
  //   doc.setFontSize(8)
  //   doc.text("1 of 1", pageWidth / 2, pageHeight - 8, { align: "center" })

  //   doc.save(`${fileName}.pdf`)
  // }

  Close() {
    this.dialogRef.close()

  }

  getApprovedOnList(logsheet: any): string {
    console.log(logsheet)
    return logsheet.TicketList?.map((i: any) => i.ApprovedOnList).join(",") || ""
  }


  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }


  onVerify() {
    const selectedNodes = this.gridApi.getSelectedNodes();
    const selectedData = selectedNodes.map((node: any) => node.data);
    const penaltyHeaders = selectedData.map((d: any) => d.penaltyHeader).join(', ');
    console.log('Selected Data:', selectedData);
    let obj = {
      VerifiedBy: this.userId,
      LogsheetNumber: this.lstFilterData.LogsheetNumber,
      VerificationRemark: penaltyHeaders,
    }
    console.log("Verification Object:", obj);
    Swal.fire({
      title: 'Confirm Verification',
      text: `Do you want to verify these loghseet?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Verify',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.masterService.VerifyLogsheet(obj).subscribe({
          next: (res) => {
            if (res?.isSuccess) {
              this.refreshRequested.emit();
              Swal.fire({
                title: "success",
                text: "Verified Successfully",
                icon: "success",
              })
              this.dialogRef.close();
            } else {
              Swal.fire({
                title: "Error",
                text: res?.msg || "Failed to verify logsheet",
                icon: "error",
              })
            }

          },
          error: (err) => {
            Swal.fire({
              title: "Error",
              text: "Failed to verify logsheet",
              icon: "error",
            })
          },
        });
      }
    });
  }
  // this.http.post('/api/verify-penalty', selectedData).subscribe({
  //   next: (res) => console.log('API Response:', res),
  //   error: (err) => console.error('Error:', err),
  // });
}

