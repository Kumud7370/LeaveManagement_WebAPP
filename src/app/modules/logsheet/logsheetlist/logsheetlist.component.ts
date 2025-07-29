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
import { BtnLogsheetViewCellRenderer } from "src/app/modules/logsheet/logsheetlist/viewlogsheet/buttonLogsheetView-cell-renderer.component"
import { ViewlogsheetComponent } from "src/app/modules/logsheet/logsheetlist/viewlogsheet/viewlogsheet.component"
import { HttpClientModule, HttpClient } from '@angular/common/http'
import { environment } from 'src/environments/environment'
import { BtnPdfCellRenderer } from "src/app/modules/logsheet/logsheetlist/pdf/buttonPdf-cell-renderer.component"

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
  // NEW: Transaction fields
  Trans_Date?: string
  Trans_Time?: string
  Trans_Date_UL?: string
  Trans_Time_UL?: string
  Gross_Weight?: string
  Unladen_Weight?: string
  Act_Net_Weight?: string
  // API response fields (lowercase)
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
  // NEW: Transaction fields (lowercase)
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
    // REMOVED: ViewlogsheetComponent - it's opened as dialog, not imported
  ],
})
export class LogsheetlistComponent implements OnInit {
  @ViewChild("agGrid", { static: false }) agGrid!: AgGridAngular
  @ViewChild("excelexporttable") excelexporttable!: ElementRef

  // Offcanvas state
  isFiltersOpen = false
  activeFilter = 9
  filterText = ""
  lstSearchResults: LogsheetData[] = []
  lstReportData: LogsheetData[] = []
  lstFilterData: LogsheetData[] = []
  resultData: any
  Form!: FormGroup
  lstZone: any[] = []
  wardList: WardData[] = []
  lstFilteredWard: WardData[] = []
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

  get f() {
    return this.Form.controls
  }

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private http: HttpClient,
  ) {
    this.uRole = Number(sessionStorage.getItem("Role")) || 0
    this.userType = Number(sessionStorage.getItem("UserType")) || 0
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
      ward: [""],
    })
    this.getAGGridReady()
    this.fetchLogsheetData()
  }

  fetchLogsheetData() {
    if (!this.Form.valid) {
      return
    }
    const url = `${environment.apiUrl}/Logsheet/getLogsheetReport`
    // Format dates in YYYY-MM-DD
    const formatDate = (date: any): string => {
      if (!date) return ""
      const d = new Date(date)
      return moment(d).format("YYYY-MM-DD")
    }

    const payload: LogsheetSearchParams = {
      FromDate: formatDate(this.Form.value.fromdate),
      ToDate: formatDate(this.Form.value.todate),
      Ward: this.Form.value.ward || "",
      LogsheetID: null,
      UserId: Number(sessionStorage.getItem("UserID")) || null,
    }

    console.log("Sending payload:", payload)
    this.http.post<LogsheetResponse>(url, payload).subscribe({
      next: (response) => {
        if (response && response.data) {
          // Normalize the data to ensure consistent property names
          const normalizedData = response.data.map((item) => ({
            ...item,
            // Map API response fields to component expected fields
            id: item.logsheetID || item.id,
            IsClosed: item.isClosed !== undefined ? item.isClosed : item.IsClosed,
            LogsheetNumber: item.logsheetNumber || item.LogsheetNumber,
            VehicleNumber: item.vehicleNumber || item.VehicleNumber,
            Ward: item.ward || item.Ward,
            RouteNumber: item.routeNumber || item.RouteNumber,
            TypeOfWaste: item.typeOfWaste || item.TypeOfWaste,
            DriverName: item.driverName || item.DriverName,
            CreatedOn: item.createdOn || item.CreatedOn,
            CreatedBy: item.createdBy || item.CreatedBy,
            ClosedBy: item.closedBy || item.ClosedBy,
            ClosedDestination: item.closedDestination || item.ClosedDestination,
            ClosedOn: item.closedOn || item.ClosedOn,
            // NEW: Map transaction fields
            Trans_Date: item.trans_Date || item.Trans_Date,
            Trans_Time: item.trans_Time || item.Trans_Time,
            Trans_Date_UL: item.trans_Date_UL || item.Trans_Date_UL,
            Trans_Time_UL: item.trans_Time_UL || item.Trans_Time_UL,
            Gross_Weight: item.gross_Weight || item.Gross_Weight,
            Unladen_Weight: item.unladen_Weight || item.Unladen_Weight,
            Act_Net_Weight: item.act_Net_Weight || item.Act_Net_Weight,
          }))
          // IMPORTANT: Set both arrays to ensure filtering works correctly
          this.lstSearchResults = [...normalizedData] // Master copy for filtering
          this.lstReportData = [...normalizedData] // Display copy
          // Reset active filter to "All" when new data is loaded
          this.activeFilter = 9
          console.log("Data loaded successfully:", this.lstSearchResults.length, "records")
        } else {
          this.lstReportData = []
          this.lstSearchResults = []
        }
      },
      error: (error) => {
        console.error("Error fetching Logsheet data:", error)
        this.lstReportData = []
        this.lstSearchResults = []
      },
    })
  }

  // Offcanvas methods
  toggleFilters() {
    this.isFiltersOpen = !this.isFiltersOpen
  }

  closeFilters() {
    this.isFiltersOpen = false
  }

  // Get status count for summary cards - use lstSearchResults for accurate counts
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
    this.closeFilters() // Close filters panel after submission
    console.log("Form submitted with values:", this.Form.value)
    // Fetch new data based on form values
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
            return { ...baseStyle, color: "#10b981" }
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
      // Show all data
      this.lstReportData = [...this.lstSearchResults]
      console.log("Showing all records:", this.lstReportData.length)
    } else {
      // Filter by status
      this.lstReportData = this.lstSearchResults.filter((f: LogsheetData) => f.IsClosed === id)
      console.log("Filtered records for status", id, ":", this.lstReportData.length)
    }
    // Force grid to refresh
    if (this.gridApi) {
      this.gridApi.setGridOption("rowData", this.lstReportData)
    }
  }

  // UPDATED: Method to open ViewLogsheet dialog with transaction data
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
      // NEW: Include transaction data in Excel export
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

  // UPDATED: Method to fetch transaction details and then open dialog
  viewLogsheetDetails(data: LogsheetData) {
    console.log("View method called with data:", data)
    const logsheetNumber = data.LogsheetNumber
    const url = `${environment.apiUrl}/Report/GetTransactDetails/${logsheetNumber}`

    // Show loading indicator
    Swal.fire({
      title: "Loading...",
      text: "Fetching transaction details",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    this.http.get<any>(url).subscribe({
      next: (res) => {
        Swal.close() // Close loading indicator

        if (res && res.data && res.data.length > 0) {
          // Merge original data with transaction details
          const mergedData = {
            ...data, // original row data
            ...res.data[0], // transaction details from API
            // Ensure transaction fields are properly mapped
            Trans_Date: res.data[0].trans_Date || res.data[0].Trans_Date,
            Trans_Time: res.data[0].trans_Time || res.data[0].Trans_Time,
            Trans_Date_UL: res.data[0].trans_Date_UL || res.data[0].Trans_Date_UL,
            Trans_Time_UL: res.data[0].trans_Time_UL || res.data[0].Trans_Time_UL,
            Gross_Weight: res.data[0].gross_Weight || res.data[0].Gross_Weight,
            Unladen_Weight: res.data[0].unladen_Weight || res.data[0].Unladen_Weight,
            Act_Net_Weight: res.data[0].act_Net_Weight || res.data[0].Act_Net_Weight,
          }

          console.log("Merged data with transaction details:", mergedData)

          // Open dialog with merged data
          const dialogRef = this.dialog.open(ViewlogsheetComponent, {
            width: "90%",
            maxWidth: "1200px",
            height: "90%",
            data: mergedData, // Pass merged data instead of original data
            disableClose: false,
            panelClass: "custom-dialog-container",
          })

          dialogRef.afterClosed().subscribe((result) => {
            console.log("Dialog closed", result)
          })
        } else {
          // No transaction data found, open dialog with original data
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
          })
        }
      },
      error: (err) => {
        Swal.close() // Close loading indicator
        console.error("Error fetching transaction data:", err)

        // Show error and open dialog with original data
        Swal.fire({
          title: "Warning",
          text: "Could not fetch transaction details. Showing basic logsheet information.",
          icon: "warning",
          timer: 3000,
        })

        // Open dialog with original data even if API fails
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

// HELPER FOR DATE COMPARISON
function _monthToNum(date: string): number | null {
  if (date === undefined || date === null || date.length !== 10) {
    return null
  }
  var yearNumber = date.substring(6, 10)
  var monthNumber = date.substring(3, 5)
  var dayNumber = date.substring(0, 2)
  var result = Number(yearNumber) * 10000 + Number(monthNumber) * 100 + Number(dayNumber)
  // 29/08/2004 => 20040829
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
