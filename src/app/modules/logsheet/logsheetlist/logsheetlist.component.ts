import { Component, ElementRef, ViewChild, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule, FormsModule } from "@angular/forms"
import { AgGridModule } from "ag-grid-angular"
import { AgGridAngular } from "ag-grid-angular"
import { Router } from "@angular/router"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import { GridApi, ColDef, GridReadyEvent } from "ag-grid-community"
import { MatDialog, MatDialogModule } from "@angular/material/dialog"
import Swal from "sweetalert2"
import moment from "moment"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { GState } from "jspdf"
import { CellHookData } from "jspdf-autotable"
import { BtnLogsheetViewCellRenderer } from "src/app/modules/logsheet/logsheetlist/viewlogsheet/buttonLogsheetView-cell-renderer.component"
import { ViewlogsheetComponent } from "src/app/modules/logsheet/logsheetlist/viewlogsheet/viewlogsheet.component"
import { HttpClientModule, HttpClient } from "@angular/common/http"
import { environment } from "src/environments/environment"
import { BtnPdfCellRenderer } from "src/app/modules/logsheet/logsheetlist/pdf/buttonPdf-cell-renderer.component"
import { DbCallingService } from "src/app/core/services/db-calling.service"

import { RowStyle, RowClassParams } from 'ag-grid-community';

interface LogsheetData {
  id: number
  IsClosed: number
  LogsheetNumber: string
  VehicleNumber: string
  Ward: string
  RouteNumber: string
  TypeOfWaste: string
  DriverName: string
  CreatedOn: string
  CreatedBy: string
  ClosedBy: string | null
  ClosedDestination: string | null
  ClosedOn: string | null
  Remark?: string
  Trans_Date?: string
  Trans_Time?: string
  Trans_Date_UL?: string
  Trans_Time_UL?: string
  Gross_Weight?: string
  Unladen_Weight?: string
  Act_Net_Weight?: string
  logsheetID?: number
  isClosed?: number
  logsheetNumber?: string
  vehicleNumber?: string
  ward?: string
  routeNumber?: string
  typeOfWaste?: string
  driverName?: string
  createdOn?: string
  createdBy?: string
  closedBy?: string | null
  closedDestination?: string | null
  closedOn?: string | null
  fromdate?: string
  todate?: string
  trans_Date?: string
  trans_Time?: string
  trans_Date_UL?: string
  trans_Time_UL?: string
  gross_Weight?: string
  unladen_Weight?: string
  act_Net_Weight?: string
}

interface WardData {
  WardName: string
}

interface LogsheetSearchParams {
  LogsheetID?: number | null
  Ward: string
  FromDate: string
  ToDate: string
  UserId?: number | null
}

interface LogsheetResponse {
  msg: string
  data: LogsheetData[]
}

@Component({
  selector: "app-logsheetlist",
  templateUrl: "./logsheetlist.component.html",
  styleUrls: ["./logsheetlist.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AgGridModule,
    MatDialogModule,
    BtnLogsheetViewCellRenderer,
    BtnPdfCellRenderer,
    HttpClientModule,
  ],
})
export class LogsheetlistComponent implements OnInit {
  @ViewChild("agGrid", { static: false }) agGrid!: AgGridAngular
  @ViewChild("excelexporttable") excelexporttable!: ElementRef

  isLoadingWardData = false
  loadingMessage = "Loading logsheet data..."
  isFiltersOpen = false
  activeFilter = 9
  filterText = ""
  lstSearchResults: LogsheetData[] = []
  lstReportData: LogsheetData[] = []
  lstFilterData: LogsheetData[] = []
  resultData: any
  Form!: FormGroup
  lstZone: any[] = []
  wardList: any[] = []
  lstFilteredWard: WardData[] = []
  siteLocations: any[] = []
  columnDefs: ColDef[] = []
  context: any
  gridApi!: GridApi
  defaultColDef: ColDef = {}
  public rowSelection: "single" | "multiple" = "multiple"
  components: any
  ttlQUantity = 0
  ttlSubQUantity = 0
  ttlRemQantity = 0
  tDate = ""
  eDate = ""
  uRole = 0
  userType = 0
  userId = 0;
  userSiteName = "";

  get f() {
    return this.Form.controls
  }

  refreshFlag = false;

  getRowStyle = (params: RowClassParams): RowStyle | undefined => {
    if (params.data?.IsClosed === 2) {
      return { backgroundColor: '#f8d7da', color: '#721c24' };
    }
    if (params.data?.IsClosed === 1) {
      return { backgroundColor: '#28a745', color: 'white' };
    }
    if (params.data?.IsClosed === 0) {
      return { backgroundColor: '#ffe5b4' };
    }
    return undefined;
  };

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private dbService: DbCallingService,
    private http: HttpClient,
  ) {
    this.uRole = Number(sessionStorage.getItem("Role")) || 0
    this.userType = Number(sessionStorage.getItem("UserType")) || 0
    this.userId = Number(sessionStorage.getItem("UserId")) || 0
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";
    this.components = {
      btnLogsheetViewCellRenderer: BtnLogsheetViewCellRenderer,
      btnPdfCellRenderer: BtnPdfCellRenderer,
    }
  }

  ngOnInit() {
    const yDt = moment().subtract(5, "day").format("YYYY-MM-DD")
    const tDt = moment().subtract(0, "day").format("YYYY-MM-DD")
    this.Form = this.fb.group({
      fromdate: [yDt, Validators.required],
      todate: [tDt, Validators.required],
      sitename: [""],
      ward: [""],
    })

    this.isLoadingWardData = true

    let obj = {
      UserId: this.userId,
      SiteName: this.userSiteName,
    }

    this.dbService.GetSiteLocations(obj).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.siteLocations = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error loading site locations:', error);
      }
    });

    this.dbService.getWards(obj).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          console.log("Ward data loaded:", response.data);
          this.wardList = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error loading site locations:', error);
      }
    });

    this.getAGGridReady()
    this.fetchLogsheetData()
  }

  fetchLogsheetData() {
    if (!this.Form.valid) {
      return
    }

    this.isLoadingWardData = true

    const roleName = sessionStorage.getItem("RoleName") || null;
    const formatDate = (date: any): string => {
      if (!date) return ""
      const d = new Date(date)
      return moment(d).format("YYYY-MM-DD")
    }
    const payload: any = {
      FromDate: formatDate(this.Form.value.fromdate),
      ToDate: formatDate(this.Form.value.todate),
      LogsheetNumber: null,
      LogsheetID: null,
      SiteName: (roleName === "GENERATOR") ? sessionStorage.getItem("SiteName") : this.Form.value.sitename || null,
      UserId: Number(sessionStorage.getItem("UserId")) || null,
    }

    this.dbService.GetLogsheetReport(payload).subscribe({
      next: (response) => {
        console.log("API response received:", response)
        if (response && response.data) {
          const normalizedData = response.data.map((item: any) => ({
            id: item.logsheetID,
            IsClosed: item.isClosed,
            LogsheetNumber: item.logsheetNumber,
            VehicleNumber: item.vehicleNumber,
            Ward: item.ward,
            RouteNumber: item.routeNumber,
            TypeOfWaste: item.typeOfWaste,
            DriverName: item.driverName,
            CreatedOn: item.createdOn,
            CreatedBy: item.createdBy,
            ClosedBy: item.closedBy,
            ClosedDestination: item.closedDestination,
            ClosedOn: item.closedOn,
            SiteName: item.siteName,
            CleanerName: item.cleanerName,
            RCBookTareWeight: item.rcBookTareWeight,
            VerifyStatus: item.verifyStatus,
            VerifiedBy: item.verifiedBy,
            VerifiedOn: item.verifiedOn,
            Remark: item.remark,
            AgencyName: item.agencyName,
          }))
          this.lstSearchResults = [...normalizedData]
          this.lstReportData = [...normalizedData]
          this.activeFilter = 9
          console.log("Data loaded successfully:", this.lstSearchResults)
        } else {
          this.lstReportData = []
          this.lstSearchResults = []
        }

        this.isLoadingWardData = false
      },
      error: (error) => {
        console.error("Error fetching Logsheet data:", error)
        this.lstReportData = []
        this.lstSearchResults = []
        this.isLoadingWardData = false
      },
    })
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

  downloadLogsheetPDF(data: LogsheetData) {
    const logsheetNumber = data.LogsheetNumber

    this.loadingMessage = "Generating PDF..."
    this.isLoadingWardData = true

    let obj = { LogsheetNumber: logsheetNumber }
    this.dbService.GetTripDetails(obj).subscribe({
      next: async (res) => {
        console.log("Transaction details fetched for PDF:", res)
        this.isLoadingWardData = false
        this.loadingMessage = "Loading logsheet data..."

        let mergedData: LogsheetData
        if (res && res.data && res.data.length > 0) {
          let RTSData = res.data[0].rtsData;
          let DumpingData = res.data[0].dumpingData;
          mergedData = {
            ...data,
            ...res.data[0],
          }
          console.log("Merged data with transaction details for PDF:", mergedData)
        } else {
          console.log("No transaction data found, using original data for PDF")
          mergedData = data
        }
        await this.generatePDFWithData(mergedData)
      },
      error: async (err) => {
        this.isLoadingWardData = false
        this.loadingMessage = "Loading logsheet data..."
        console.error("Error fetching transaction data for PDF:", err)

        Swal.fire({
          title: "Warning",
          text: "Could not fetch transaction details. Generating PDF with available data.",
          icon: "warning",
          timer: 2000,
          showConfirmButton: false,
        })
        await this.generatePDFWithData(data)
      },
    })
  }

  async generatePDFWithData(data: LogsheetData) {
    const normalizedData = this.normalizeDataForPDF(data)
    console.log("Generating PDF with normalized data:", normalizedData)
    const doc = new jsPDF("landscape")
    const fileName = `Logsheet_${normalizedData.LogsheetNumber || "Unknown"}_${moment().format("DDMMYYYY_HHmmss")}`
    const logoBase64 = await this.getBase64ImageFromAssets("assets/images/mcgmlogo.png")

    autoTable(doc, {
      body: [
        [
          { content: "", rowSpan: 3, styles: { cellWidth: 30, minCellHeight: 30, fillColor: [255, 255, 255] } },
          {
            content: "MUNICIPAL CORPORATION OF GREATER MUMBAI",
            colSpan: 5,
            styles: { halign: "center", fontSize: 14, fontStyle: "bold" },
          },
        ],
        [
          {
            content: "SOLID WASTE MANAGEMENT",
            colSpan: 5,
            styles: { halign: "center", fontSize: 12, fontStyle: "bold" },
          },
        ],
        [{ content: "VEHICLE LOGSHEET", colSpan: 5, styles: { halign: "center", fontSize: 10, fontStyle: "bold" } }],
      ],
      theme: "grid",
      styles: {
        lineWidth: 0.1,
        textColor: 0,
        lineColor: [0, 0, 0],
      },
      margin: { top: 10, left: 15, right: 15 },
      didDrawCell: (hookData: CellHookData) => {
        if (hookData.row.index === 0 && hookData.column.index === 0 && logoBase64) {
          doc.addImage(logoBase64, "PNG", hookData.cell.x + 2, hookData.cell.y + 2, 25, 25)
        }
      },
    })

    autoTable(doc, {
      body: [
        [
          { content: "Logsheet Number :", styles: { fontStyle: "bold" } },
          normalizedData.LogsheetNumber || "N/A",
          { content: "", rowSpan: 6 },
          { content: "Date & Time :", styles: { fontStyle: "bold" } },
          normalizedData.CreatedOn || "N/A",
        ],
        [
          { content: "Vehicle Number :", styles: { fontStyle: "bold" } },
          normalizedData.VehicleNumber || "N/A",
          { content: "Name of Ward :", styles: { fontStyle: "bold" } },
          normalizedData.Ward || "N/A",
        ],
        [
          { content: "Driver's Name :", styles: { fontStyle: "bold" } },
          normalizedData.DriverName || "N/A",
          { content: "Type Of Waste :", styles: { fontStyle: "bold" } },
          normalizedData.TypeOfWaste || "N/A",
        ],
        [
          { content: "Cleaner's Name :", styles: { fontStyle: "bold" } },
          normalizedData.CleanerName || "N/A",
          { content: "Route Number :", styles: { fontStyle: "bold" } },
          normalizedData.RouteNumber || "N/A",
        ],
        [
          { content: "Agency Name:", styles: { fontStyle: "bold" } },
          normalizedData.AgencyName || "N/A",
          { content: "Tare Weight (RC Book) (KG):", styles: { fontStyle: "bold" } },
          normalizedData.RCBookTareWeight || "N/A",
        ],
        [
          { content: "Created By :", styles: { fontStyle: "bold" } },
          normalizedData.CreatedBy || "N/A",
          { content: "Status :", styles: { fontStyle: "bold" } },
          normalizedData.IsClosed === 0 ? "Open" : normalizedData.IsClosed === 2 ? "Cancelled" : "Closed",
        ],
      ],
      theme: "grid",
      startY: doc.lastAutoTable.finalY + 2,
      styles: {
        fontSize: 9,
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

    autoTable(doc, {
      head: [
        [
          {
            content: "Trip Details at RTS",
            colSpan: 7,
            styles: {
              fontStyle: "bold",
              halign: "left",
              valign: "middle",
              fillColor: [240, 240, 240],
              textColor: 20,
              fontSize: 12
            },
          },
        ],
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
          { content: "Slip Number", styles: { fontStyle: "bold", halign: "center" } },
          { content: "In Time of Transact", styles: { fontStyle: "bold", halign: "center" } },
          { content: "Out Time of Transact", styles: { fontStyle: "bold", halign: "center" } },
          { content: "Gross Weight (KG)", styles: { fontStyle: "bold", halign: "center" } },
          { content: "Unladen Weight (KG)", styles: { fontStyle: "bold", halign: "center" } },
          { content: "Actual Net Weight (KG)", styles: { fontStyle: "bold", halign: "center" } },
        ],
      ],
      body: [
        [{},
        normalizedData?.RTSData?.slipSrNo || 'N/A',
        `${normalizedData?.RTSData?.trans_Date || ''} ${normalizedData?.RTSData?.trans_Time || ''}`.trim() || 'N/A',
        `${normalizedData?.RTSData?.trans_Date_UL || ''} ${normalizedData?.RTSData?.trans_Time_UL || ''}`.trim() || 'N/A',
        normalizedData?.RTSData?.gross_Weight || 'N/A',
        normalizedData?.RTSData?.unladen_Weight || 'N/A',
        normalizedData?.RTSData?.act_Net_Weight || 'N/A',
        ],
      ],
      theme: "grid",
      startY: doc.lastAutoTable.finalY + 5,
      styles: {
        fontSize: 9,
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
        0: { cellWidth: 24 },
        1: { cellWidth: 40.83 },
        2: { cellWidth: 40.83 },
        3: { cellWidth: 40.83 },
        4: { cellWidth: 40.83 },
        5: { cellWidth: 40.83 },
        6: { cellWidth: 40.83 },
      },
    })

    autoTable(doc, {
      head: [
        [
          {
            content: "Trip Details at Dumping Ground",
            colSpan: 7,
            styles: {
              fontStyle: "bold",
              halign: "left",
              valign: "middle",
              fillColor: [240, 240, 240],
              textColor: 20,
              fontSize: 12
            },
          },
        ],
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
          { content: "Slip Number", styles: { fontStyle: "bold", halign: "center" } },
          { content: "In Time of Transact", styles: { fontStyle: "bold", halign: "center" } },
          { content: "Out Time of Transact", styles: { fontStyle: "bold", halign: "center" } },
          { content: "Gross Weight (KG)", styles: { fontStyle: "bold", halign: "center" } },
          { content: "Unladen Weight (KG)", styles: { fontStyle: "bold", halign: "center" } },
          { content: "Actual Net Weight (KG)", styles: { fontStyle: "bold", halign: "center" } },
        ],
      ],
      body: [
        [{},
        normalizedData?.DumpingData?.slipSrNo || 'N/A',
        `${normalizedData?.DumpingData?.trans_Date || ''} ${normalizedData?.DumpingData?.trans_Time || ''}`.trim() || 'N/A',
        `${normalizedData?.DumpingData?.trans_Date_UL || ''} ${normalizedData?.DumpingData?.trans_Time_UL || ''}`.trim() || 'N/A',
        normalizedData?.DumpingData?.gross_Weight || 'N/A',
        normalizedData?.DumpingData?.unladen_Weight || 'N/A',
        normalizedData?.DumpingData?.act_Net_Weight || 'N/A',
        ],
      ],
      theme: "grid",
      startY: doc.lastAutoTable.finalY + 5,
      styles: {
        fontSize: 9,
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
        0: { cellWidth: 24 },
        1: { cellWidth: 40.83 },
        2: { cellWidth: 40.83 },
        3: { cellWidth: 40.83 },
        4: { cellWidth: 40.83 },
        5: { cellWidth: 40.83 },
        6: { cellWidth: 40.83 },
      },
    })

    autoTable(doc, {
      body: [
        [
          { content: "Logsheet Closed Date & Time :", styles: { fontStyle: "bold" } },
          { content: normalizedData.ClosedOn || "N/A" }
        ],
        [
          { content: "Waste Processing Plant:", styles: { fontStyle: "bold" } },
          { content: normalizedData.ClosedDestination || "N/A" }
        ],
        [
          { content: "Signature & Stamp :", styles: { fontStyle: "bold" } },
          { content: normalizedData.ClosedBy || "N/A" }
        ],
        [
          { content: "Remark :", styles: { fontStyle: "bold" } },
          { content: normalizedData.Remark || "N/A" }
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 9,
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

    doc.setGState(new GState({ opacity: 0.1 }))
    const watermarkWidth = 150
    const watermarkHeight = 150
    const centerX = (doc.internal.pageSize.getWidth() - watermarkWidth) / 2
    const centerY = (doc.internal.pageSize.getHeight() - watermarkHeight) / 2
    doc.addImage(logoBase64, "PNG", centerX, centerY, watermarkWidth, watermarkHeight)
    doc.setGState(new GState({ opacity: 1 }))

    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    doc.setFontSize(8)
    doc.text("1 of 1", pageWidth / 2, pageHeight - 8, { align: "center" })

    doc.save(`${fileName}.pdf`)
    console.log(`PDF generated: ${fileName}.pdf`)
  }

  private normalizeDataForPDF(data: any): any {
    if (!data) return {}
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
      SiteName: data.siteName || data.SiteName,
      CleanerName: data.cleanerName || data.CleanerName,
      RTSData: data.rtsData,
      DumpingData: data.dumpingData,
      AgencyName: data.agencyName || data.AgencyName || "",
      RCBookTareWeight: data.rcBookTareWeight || data.RCBookTareWeight || "",
      VerifyStatus: data.verifyStatus || data.VerifyStatus,
      VerifiedBy: data.verifiedBy || data.VerifiedBy,
      VerifiedOn: data.verifiedOn || data.VerifiedOn,
    }
  }

  private isLogsheetClosedForPDF(data: any): boolean {
    return data.IsClosed === 1
  }

  private getPdfInTimeOfTransactForPDF(data: any): string {
    if (data.IsClosed !== 1) {
      return "N/A"
    }
    if (data.Trans_Date && data.Trans_Time) {
      return `${data.Trans_Date} ${data.Trans_Time}`
    }
    return "N/A"
  }

  private getPdfOutTimeOfTransactForPDF(data: any): string {
    if (data.IsClosed !== 1) {
      return "N/A"
    }
    if (data.Trans_Date_UL && data.Trans_Time_UL) {
      return `${data.Trans_Date_UL} ${data.Trans_Time_UL}`
    }
    return "N/A"
  }

  private formatPdfWeightForPDF(weight: string | number, data: any): string {
    if (data.IsClosed !== 1) {
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

  toggleFilters() {
    this.isFiltersOpen = !this.isFiltersOpen
  }

  closeFilters() {
    this.isFiltersOpen = false
  }

  getStatusCount(status: number): number {
    return this.lstSearchResults.filter((item: LogsheetData) => item.IsClosed === status).length
  }

  CreateReqHandler() {
    this.router.navigate(["/cdwaste/generatelogsheet"])
  }

  Back() {
    this.router.navigate(["/dashboard"])
  }

  onSubmit() {
    if (!this.Form.valid) {
      this.Form.markAllAsTouched()
      return
    }
    this.closeFilters()
    this.isLoadingWardData = true
    this.fetchLogsheetData()
  }

  resetFilters() {
    const yDt = moment().subtract(5, "day").format("YYYY-MM-DD")
    const tDt = moment().subtract(0, "day").format("YYYY-MM-DD")
    this.Form.patchValue({
      fromdate: yDt,
      todate: tDt,
      ward: "",
    })
    this.lstReportData = []
    this.lstSearchResults = []
  }

  QuantityValuechange(val: any): void {
    const ttl = this.ttlRemQantity
    const qua = Number(val.target.value)
    if (qua > ttl) {
      this.Form.patchValue({
        quantity: "5",
      })
      Swal.fire({
        text: "Quantity exceed!",
        icon: "warning",
      })
    } else if (qua < 5) {
      this.Form.patchValue({
        quantity: "5",
      })
      Swal.fire({
        text: "Quantity should be greater than or equal to 5!",
        icon: "warning",
      })
    }
  }

  OnGridReady(params: GridReadyEvent) {
    this.gridApi = params.api
    this.gridApi.sizeColumnsToFit()
  }

  headerHeightSetter(params: any) {
    var padding = 20
    var height = headerHeightGetter() + padding
    if (this.gridApi) {
      this.gridApi.setGridOption("headerHeight", height)
      this.gridApi.resetRowHeights()
    }
  }

  getAGGridReady() {
    this.columnDefs = [
      {
        headerName: "View",
        field: "id",
        cellRenderer: BtnLogsheetViewCellRenderer,
        width: 90,
        minWidth: 90,
        maxWidth: 90,
        flex: 0,
        sortable: false,
        filter: false,
        resizable: false,
        suppressMovable: true,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0",
        },
      },
      {
        headerName: "PDF",
        field: "id",
        cellRenderer: BtnPdfCellRenderer,
        width: 90,
        minWidth: 90,
        maxWidth: 90,
        flex: 0,
        sortable: false,
        filter: false,
        resizable: false,
        suppressMovable: true,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0",
        },
      },
      {
        headerName: "Status",
        field: "IsClosed",
        valueFormatter: (params) =>
          Number(params.value) === 0 ? "Open" : Number(params.value) === 2 ? "Cancelled" : "Closed",
        cellStyle: (params: any) => {
          const baseStyle = {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
          }
          if (params.value === 0) {
            return { ...baseStyle, color: "#f59e0b" }
          } else if (params.value === 1) {
            return { ...baseStyle, color: "#eef7f4ff" }
          } else if (params.value === 2) {
            return { ...baseStyle, color: "#ef4444" }
          }
          return { ...baseStyle, color: "#6b7280", fontWeight: "normal" }
        },
        width: 100,
        minWidth: 100,
        maxWidth: 100,
        flex: 0,
      },
      {
        headerName: "Location",
        field: "SiteName",
        width: 150,
        minWidth: 150,
        maxWidth: 150,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Logsheet Number",
        field: "LogsheetNumber",
        width: 150,
        minWidth: 150,
        maxWidth: 150,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Vehicle Number",
        field: "VehicleNumber",
        width: 140,
        minWidth: 140,
        maxWidth: 140,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Ward",
        field: "Ward",
        width: 100,
        minWidth: 100,
        maxWidth: 100,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Route Number",
        field: "RouteNumber",
        width: 130,
        minWidth: 130,
        maxWidth: 130,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Type Of Waste",
        field: "TypeOfWaste",
        minWidth: 140,
        flex: 1,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Driver Name",
        field: "DriverName",
        minWidth: 150,
        flex: 1,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Cleaner Name",
        field: "CleanerName",
        minWidth: 150,
        flex: 1,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Created On",
        field: "CreatedOn",
        width: 160,
        minWidth: 160,
        maxWidth: 160,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Closed On",
        field: "ClosedOn",
        width: 160,
        minWidth: 160,
        maxWidth: 160,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Verified By",
        field: "VerifiedBy",
        width: 160,
        minWidth: 160,
        maxWidth: 160,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
        hide: true
      },
      {
        headerName: "Verified On",
        field: "VerifiedOn",
        width: 160,
        minWidth: 160,
        maxWidth: 160,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
        hide: true
      },
      {
        headerName: "Verify Status",
        field: "VerifyStatus",
        width: 160,
        minWidth: 160,
        maxWidth: 160,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
        hide: true
      },
    ]
    this.context = { componentParent: this }
    this.defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center",
      },
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
    }
  }

  onFilterTextBoxChanged() {
    if (this.gridApi) {
      const filterValue = (document.getElementById("filter-text-box") as HTMLInputElement)?.value || ""
      this.gridApi.setGridOption("quickFilterText", filterValue)
    }
  }

  FilterData(id: number) {
    this.activeFilter = id
    console.log("Filtering data with id:", id, "Available records:", this.lstSearchResults.length)
    if (id === 9) {
      this.lstReportData = [...this.lstSearchResults]
      console.log("Showing all records:", this.lstReportData.length)
    } else {
      this.lstReportData = this.lstSearchResults.filter((f: LogsheetData) => f.IsClosed === id)
      console.log("Filtered records for status", id, ":", this.lstReportData.length)
    }
    if (this.gridApi) {
      this.gridApi.setGridOption("rowData", this.lstReportData)
    }
  }

  viewLogsheet(data: LogsheetData) {
    const dialogRef = this.dialog.open(ViewlogsheetComponent, {
      width: "80%",
      maxWidth: "1200px",
      data: data,
      disableClose: false,
    })
    dialogRef.afterClosed().subscribe((result) => {
      console.log("Dialog closed", result)
    })
  }

  lstExelData: any[] = []

  download() {
    this.lstExelData = []
    this.lstExelData = this.lstReportData.map((v: LogsheetData, i: number) => ({
      "Sr No": i + 1,
      Status: v.IsClosed === 0 ? "Open" : Number(v.IsClosed) === 2 ? "Cancelled" : "Closed",
      "Logsheet Number": v.LogsheetNumber,
      "Vehicle Number": v.VehicleNumber,
      Ward: v.Ward,
      "Route Number": v.RouteNumber,
      "Type Of Waste": v.TypeOfWaste,
      "Driver Name": v.DriverName,
      "Created By": v.CreatedBy,
      "Created On": v.CreatedOn,
      "Closed By": v.ClosedBy,
      "Closed Destination": v.ClosedDestination,
      "Closed On": v.ClosedOn,
      "In Time of Transact": v.Trans_Date && v.Trans_Time ? `${v.Trans_Date} ${v.Trans_Time}` : "N/A",
      "Out Time of Transact": v.Trans_Date_UL && v.Trans_Time_UL ? `${v.Trans_Date_UL} ${v.Trans_Time_UL}` : "N/A",
      "Gross Weight": v.Gross_Weight || "N/A",
      "Unladen Weight": v.Unladen_Weight || "N/A",
      "Actual Net Weight": v.Act_Net_Weight || "N/A",
    }))
    const fileName = "LogsheetReport_" + moment(new Date()).format("DDMMYYYY") + ".xlsx"
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.lstExelData)
    const wb: XLSX.WorkBook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
    XLSX.writeFile(wb, fileName)
  }

  viewLogsheetDetails(data: LogsheetData) {
    const logsheetNumber = data.LogsheetNumber

    this.loadingMessage = "Loading logsheet details..."
    this.isLoadingWardData = true

    let obj = { LogsheetNumber: logsheetNumber }
    this.dbService.GetTripDetails(obj).subscribe({
      next: (res) => {
        this.isLoadingWardData = false
        this.loadingMessage = "Loading logsheet data..."

        if (res && res.data && res.data.length > 0) {
          const mergedData = {
            ...data,
            ...res.data[0],
          }
          console.log("Merged data with transaction details:", mergedData)

          const dialogRef = this.dialog.open(ViewlogsheetComponent, {
            width: "90%",
            maxWidth: "1200px",
            height: "90%",
            data: mergedData,
            disableClose: false,
            panelClass: "custom-dialog-container",
          })
          dialogRef.afterClosed().subscribe((result) => {
            console.log("Dialog closed", result)
            this.fetchLogsheetData();
          })
        } else {
          console.log("No transaction data found, opening with original data")
          const dialogRef = this.dialog.open(ViewlogsheetComponent, {
            width: "90%",
            maxWidth: "1200px",
            height: "90%",
            data: data,
            disableClose: false,
            panelClass: "custom-dialog-container",
          })
          dialogRef.afterClosed().subscribe((result) => {
            console.log("Dialog closed", result)
            this.fetchLogsheetData();
          })
        }
      },
      error: (err) => {
        this.isLoadingWardData = false
        this.loadingMessage = "Loading logsheet data..."
        console.error("Error fetching transaction data:", err)

        Swal.fire({
          title: "Warning",
          text: "Could not fetch transaction details. Showing basic logsheet information.",
          icon: "warning",
          timer: 2000,
          showConfirmButton: false,
        })

        const dialogRef = this.dialog.open(ViewlogsheetComponent, {
          width: "90%",
          maxWidth: "1200px",
          height: "90%",
          data: data,
          disableClose: false,
          panelClass: "custom-dialog-container",
        })
        dialogRef.afterClosed().subscribe((result) => {
          console.log("Dialog closed", result)
          this.fetchLogsheetData();
        })
      },
    })
  }
}

function dateComparator(date1: string, date2: string): number {
  var date1Number = _monthToNum(date1)
  var date2Number = _monthToNum(date2)
  if (date1Number === null && date2Number === null) {
    return 0
  }
  if (date1Number === null) {
    return -1
  }
  if (date2Number === null) {
    return 1
  }
  return date1Number - date2Number
}

function _monthToNum(date: string): number | null {
  if (date === undefined || date === null || date.length !== 10) {
    return null
  }
  var yearNumber = date.substring(6, 10)
  var monthNumber = date.substring(3, 5)
  var dayNumber = date.substring(0, 2)
  var result = Number(yearNumber) * 10000 + Number(monthNumber) * 100 + Number(dayNumber)
  return result
}

function headerHeightGetter(): number {
  var columnHeaderTexts = document.querySelectorAll(".ag-header-cell-text")
  var columnHeaderTextsArray: HTMLElement[] = []
  columnHeaderTexts.forEach((node) => columnHeaderTextsArray.push(node as HTMLElement))
  var clientHeights = columnHeaderTextsArray.map((headerText: HTMLElement) => headerText.clientHeight)
  var tallestHeaderTextHeight = Math.max(...clientHeights)
  return tallestHeaderTextHeight
}