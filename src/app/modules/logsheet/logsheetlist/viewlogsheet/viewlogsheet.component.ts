import { Component, EventEmitter, Inject, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { FormBuilder } from '@angular/forms'
import { MatDialogRef } from '@angular/material/dialog'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import moment from "moment"
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GState } from "jspdf"
import { CellHookData } from "jspdf-autotable"
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
  userRole = ""
  isLoadingData = false
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
    this.userRole = String(sessionStorage.getItem("RoleName")) || "";
    this.userId = Number(sessionStorage.getItem("UserId")) || 0
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";
    this.lstFilterData = this.normalizeData(data)
    console.log("View Dialog - Original data received:", data)
    console.log("View Dialog - Normalized data:", this.lstFilterData)

    this.isLoadingData = true

    let obj = {
      SiteName: this.userSiteName,
      UserId: this.userId,
    }

    this.masterService.GetPenaltyList(obj).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.lstPenaltyData = response.data
          console.log("Penalty List Data:", this.lstPenaltyData)
        } else {
          this.lstPenaltyData = []
        }
        this.isLoadingData = false
      },
      error: (error: any) => {
        console.error("Error fetching Penalty List data:", error)
        this.lstPenaltyData = []
        this.isLoadingData = false
      }
    });
  }

  normalizeData(data: any): any {
    if (!data) return {}
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
      RTSData: data.rtsData,
      DumpingData: data.dumpingData,
      VerifyStatus: data.verifyStatus || data.VerifyStatus,
      VerifiedBy: data.verifiedBy || data.VerifiedBy,
      VerifiedOn: data.verifiedOn || data.VerifiedOn,
    }
  }

  isLogsheetClosed(): boolean {
    return this.lstFilterData.IsClosed === 1
  }

  getInTimeOfTransact(): string {
    const date = this.lstFilterData?.Trans_Date
    const time = this.lstFilterData?.Trans_Time
    if (date && time) {
      return `${date} ${time}`
    }
    return "N/A"
  }

  getOutTimeOfTransact(): string {
    const date = this.lstFilterData?.Trans_Date_UL
    const time = this.lstFilterData?.Trans_Time_UL
    if (date && time) {
      return `${date} ${time}`
    }
    return "N/A"
  }

  formatWeight(weight: string): string {
    if (!weight || weight === "N/A" || weight === "" || weight === null || weight === undefined) {
      return "N/A"
    }
    if (typeof weight === "string" && weight.includes("kg")) {
      return weight
    }
    return `${weight} kg`
  }

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
    if (typeof weight === "string" && weight.includes("kg")) {
      return weight
    }
    return `${weight} kg`
  }

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

  printLogsheet(): void {
    window.print()
  }

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
}