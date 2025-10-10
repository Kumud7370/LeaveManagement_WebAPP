import { Component, OnInit, ViewChild, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { AgGridModule, AgGridAngular } from "ag-grid-angular"
import { MatDialog, MatDialogModule } from "@angular/material/dialog"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import * as XLSX from "xlsx"
import { BtnSearchViewCellRenderer } from "./viewSearch/buttonSearchView-cell-renderer.component"
import { BtnSearchPdfCellRenderer } from "./viewSearch/buttonSearchPdf-cell-renderer.component"
import { ViewSearchReportComponent } from "./viewSearch/viewsearchreport.component"
import moment from "moment"
import { wrap } from "module"

@Component({
  selector: "app-search-report",
  templateUrl: "./search-report.component.html",
  styleUrls: ["./search-report.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AgGridModule,
    MatDialogModule,
    BtnSearchViewCellRenderer,
    BtnSearchPdfCellRenderer,
    ViewSearchReportComponent,
  ],
})
export class SearchReportComponent implements OnInit {
  @ViewChild("agGrid") agGrid!: AgGridAngular

  // Form models
  reportForm!: FormGroup
  reportData: any[] = []
  lstSiteNames: any[] = []
  // UI state
  isLoading = false
  isAdvancedSearch = false
  activeTab = "search"
  isFiltersOpen = false
  filterText = ""
  // Filter states
  GrossWeightInKAactive = false
  AgencynameIsAactive = false
  vehicleNumberIsAactive = false
  TypeOfGarbageIsAactive = false
  WardIsAactive = false
  WorkCodeIsAactive = false
  ShiftIsAactive = false
  ShiftIsAactive1 = false
  ShiftIsAactive2 = false
  ShiftIsAactive3 = false
  HourlyIsAactive = false
  morningHourlyIsAactive = false
  afternoonHourlyIsAactive = false
  nightHourlyIsAactive = false
  ReportTypesAactive = false

  // Mock data for UI demonstration
  formData = {
    WeighBridge: "",
    FromDate: "",
    todate: "",
    reportType: 0,
    Gross_Weight_From: 0,
    Gross_Weight_To: 0,
    agencyName: "",
    Vehicle_No: "",
    TypeOfGarbage: "",
    Ward: "",
    Work_code: "",
    Act_Shift: "",
    Act_Shift_UL: "",
    Trans_Time: "",
    Trans_Time_UL: "",
    ShiftTimeFrom: "",
    ShiftTimeTo: "",
    selectNallah: "",
  }

  // Updated columnDefs with View and PDF buttons
  columnDefs = [
    {
      headerName: "View",
      field: "slipSrNo",
      cellRenderer: BtnSearchViewCellRenderer,
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
      field: "slipSrNo",
      cellRenderer: BtnSearchPdfCellRenderer,
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
    { headerName: "Location", field: "locationName", sortable: true, filter: true, resizable: true },
    { headerName: "Slip No", field: "slipSrNo", sortable: true, filter: true, resizable: true },
    { headerName: "Transaction Date", field: "trans_Date", sortable: true, filter: true, resizable: true },
    { headerName: "Transaction Time", field: "trans_Time", sortable: true, filter: true, resizable: true },
    { headerName: "Agency", field: "agency_Name", sortable: true, filter: true, resizable: true },
    { headerName: "Vehicle No", field: "vehicle_No", sortable: true, filter: true, resizable: true },
    { headerName: "Vehicle Type", field: "vehicleType", sortable: true, filter: true, resizable: true },
    { headerName: "Ward", field: "ward", sortable: true, filter: true, resizable: true },
    { headerName: "Route No.", field: "route", sortable: true, filter: true, resizable: true },
    { headerName: "Type of Waste", field: "type_of_Garbage", sortable: true, filter: true, resizable: true },
    { headerName: "Gross Weight", field: "gross_Weight", sortable: true, filter: true, resizable: true },
    { headerName: "Trans Date UL", field: "trans_Date_UL", sortable: true, filter: true, resizable: true },
    { headerName: "Trans Time UL", field: "trans_Time_UL", sortable: true, filter: true, resizable: true },
    { headerName: "Unladen Weight", field: "unladen_Weight", sortable: true, filter: true, resizable: true },
    { headerName: "Actual Net Weight", field: "act_Net_Weight", sortable: true, filter: true, resizable: true },
  ]

  defaultColDef = {
    resizable: true,
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    wrapText: true,
    autoHeight: true,
    wrapHeaderText: true,
  }

  // Context for AG Grid
  context: any
  gridApi: any

  weightFormatter(params: any) {
    if (params.value != null) {
      return params.value.toFixed(2)
    }
    return ""
  }

  WeighBridgeData = [
    { id: "ALLWB", WeighBridge: "All" },
    { id: "WBK1", WeighBridge: "Kanjur" },
    { id: "D", WeighBridge: "Deonar" },
  ]

  reportTypeList = [
    { id: 1, value: "In" },
    { id: 0, value: "Out" },
  ]

  AgencyData = [
    { FirmName: "ABC Waste Management" },
    { FirmName: "XYZ Disposal Services" },
    { FirmName: "City Sanitation Department" },
  ]

  VehcleData = [{ Veh_Num: "MH01-AB-1234" }, { Veh_Num: "MH01-CD-5678" }, { Veh_Num: "MH01-EF-9012" }]

  GarbageData = [{ GarbageType: "Solid Waste" }, { GarbageType: "Recyclable" }, { GarbageType: "Hazardous" }]

  WardData = [{ WardName: "Ward A" }, { WardName: "Ward B" }, { WardName: "Ward C" }]

  uniqueWorkcode = ["WC001", "WC002", "WC003"]
  uniqueZone = ["North", "South", "East", "West"]
  morningHourDDL = ["7 AM-7:59:59 AM", "8 AM-8:59:59 AM", "9 AM-9:59:59 AM", "10 AM-10:59:59 AM", "11 AM-11:59:59 AM"]
  afternoonHourDDL = ["12 PM-12:59:59 PM", "1 PM-1:59:59 PM", "2 PM-2:59:59 PM", "3 PM-3:59:59 PM", "4 PM-4:59:59 PM"]
  nightHourDDL = ["6 PM-6:59:59 PM", "7 PM-7:59:59 PM", "8 PM-8:59:59 PM", "9 PM-9:59:59 PM", "10 PM-10:59:59 PM"]

  // Results (mock data)
  lstReportData: any[] = []
  reportmodel: {
    WeighBridge: string
    reportType: number | null
    FromDate: string
    todate: string
    selectNallah: string
  } = {
      WeighBridge: "",
      reportType: null,
      FromDate: "",
      todate: "",
      selectNallah: "",
    }

  // Summary statistics
  totalNoOfVehicles = 0
  totalInVehicles = 0
  totalOutVehicles = 0
  totalGrossWeightInKG = 0
  totalGrossWeightInTon = 0
  totalUnladenWeightInKg = 0
  totalUnladenWeightInTon = 0
  totalActualNetWeightInKG = 0
  totalActualNetWeightInTon = 0
  userId = 0
  userSiteName = ""
  constructor(
    public router: Router,
    private fb: FormBuilder,
    private dbService: DbCallingService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {
    // this.uRole = Number(sessionStorage.getItem("Role")) || 0
    // this.userType = Number(sessionStorage.getItem("UserType")) || 0
    this.userId = Number(sessionStorage.getItem("UserId")) || 0
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";
    let obj = {
      UserId: Number(this.userId),
      SiteName: this.userSiteName,
    }
    console.log("Loading initial data with params:", obj);
    this.dbService.GetSiteLocations(obj).subscribe({
      next: (response: any) => {
        console.log("response:", response);
        if (response && response.data) {
          this.lstSiteNames = response.data;

        }
      },
      error: (error: any) => {
        console.error('Error loading site locations:', error);
      }
    });

  }

  ngOnInit() {
    this.initForm()
    // Load initial data automatically with current month
    this.loadInitialData()
    // Set context for AG Grid
    this.context = { componentParent: this }
  }

  // NEW METHOD: Load initial data automatically with current month
  loadInitialData() {
    const today = moment().format('YYYY-MM-DD');
    const fromDate = moment().format('YYYY-MM-DD');

    const basicPayload = {
      WeighBridge: "ALLWB",
      FromDate: fromDate,
      todate: today,
      reportType: 1,
    }

    this.isLoading = true
    this.dbService.getSearchReports(basicPayload).subscribe(
      (response) => {
        this.isLoading = false
        if (response && (response as any).data) {
          this.reportData = (response as any).data
          this.calculateSummaryStatistics()
        } else {
          this.reportData = []
          this.resetSummaryStatistics()
        }
        this.cdr.detectChanges()
      },
      (error) => {
        console.error("API Error:", error)
        this.isLoading = false
        this.reportData = []
        this.resetSummaryStatistics()
        this.cdr.detectChanges()
      },
    )
  }

  formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  initForm() {
    const today = new Date()
    const firstDay = moment().format('DD-MM-YYYY')
    this.reportForm = this.fb.group({
      WeighBridge: ["ALLWB", Validators.required],
      FromDate: [firstDay],
      todate: [firstDay],
      reportType: [1],
    })
  }

  toggleAdvancedSearch() {
    this.isAdvancedSearch = !this.isAdvancedSearch
  }

  setActiveTab(tab: string) {
    this.activeTab = tab
  }

  // Toggle filters offcanvas
  toggleFilters(): void {
    this.isFiltersOpen = !this.isFiltersOpen
  }

  // Close filters offcanvas
  closeFilters(): void {
    this.isFiltersOpen = false
  }

  // Get selected period text for display
  getSelectedPeriod(): string {
    const formValues = this.reportForm.value
    if (formValues.FromDate && formValues.todate) {
      const fromDate = new Date(formValues.FromDate)
      const toDate = new Date(formValues.todate)

      if (fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()) {
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ]
        const monthName = monthNames[fromDate.getMonth()]
        return `${monthName} ${fromDate.getFullYear()}`
      } else {
        return `${formValues.FromDate} to ${formValues.todate}`
      }
    }
    return "Current Period"
  }

  // Get report type text for display
  getReportTypeText(): string {
    const reportType = this.reportForm.get("reportType")?.value
    const reportTypeObj = this.reportTypeList.find((rt) => rt.id === reportType)
    return reportTypeObj ? reportTypeObj.value : "All"
  }

  // NEW METHODS: View and PDF functionality for Search Report
  viewSearchReportDetails(data: any) {
    console.log("View Search Report method called with data:", data)

    const dialogRef = this.dialog.open(ViewSearchReportComponent, {
      width: "90%",
      maxWidth: "1200px",
      height: "90%",
      data: data,
      disableClose: false,
      panelClass: "custom-dialog-container",
    })

    dialogRef.afterClosed().subscribe((result) => {
      console.log("Search Report Dialog closed", result)
    })
  }

  downloadSearchReportPDF(data: any) {
    console.log("Download Search Report PDF method called with data:", data)
    
    // Create and open the view component to generate PDF
    const dialogRef = this.dialog.open(ViewSearchReportComponent, {
      width: "90%",
      maxWidth: "1200px",
      height: "90%",
      data: data,
      disableClose: false,
      panelClass: "custom-dialog-container",
    })

    // Automatically trigger PDF download after dialog opens
    dialogRef.afterOpened().subscribe(() => {
      setTimeout(() => {
        const componentInstance = dialogRef.componentInstance
        componentInstance.downloadPDF()
        dialogRef.close()
      }, 500)
    })
  }

  // Grid methods
  onGridReady(params: any): void {
    this.gridApi = params.api
    console.log("Grid is ready")
  }
  onFilterTextBoxChanged() {
    if (this.gridApi) {
      const filterValue = (document.getElementById("filter-text-box") as HTMLInputElement)?.value || ""
      this.gridApi.setGridOption("quickFilterText", filterValue)
    }
  }

  // Auto Size and Fixed Width buttons functionality
  autoSizeAllColumns(): void {
    if (this.gridApi) {
      const allColumnIds = this.gridApi.getColumns()?.map((column: any) => column.getId()) || []
      this.gridApi.autoSizeColumns(allColumnIds, false)
    }
  }

  sizeColumnsToFit(): void {
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit()
    }
  }

  // Form event handlers
  getWeighBridge(e: any) {
    const selected = e.target.value
    if (selected === "Kanjur") {
      this.reportmodel.WeighBridge = "K"
    } else if (selected === "Deonar") {
      this.reportmodel.WeighBridge = "D"
    } else {
      this.reportmodel.WeighBridge = ""
    }
  }

  getreportType(e: any) {
    this.reportmodel.reportType = Number(e.target.value)
  }

  getNallah(event: any) {
    this.formData.selectNallah = event.target.value
  }

  // Checkbox handlers
  isGrossWeightInKGChange(event: any) {
    this.GrossWeightInKAactive = event.target.checked
    if (!this.GrossWeightInKAactive) {
      this.formData.Gross_Weight_From = 0
      this.formData.Gross_Weight_To = 0
    }
  }

  isAgencynameChange(event: any) {
    this.AgencynameIsAactive = event.target.checked
    if (!this.AgencynameIsAactive) {
      this.formData.agencyName = ""
    }
  }

  isvehicleNumberChange(event: any) {
    this.vehicleNumberIsAactive = event.target.checked
    if (!this.vehicleNumberIsAactive) {
      this.formData.Vehicle_No = ""
    }
  }

  isTypeOfGarbageChange(event: any) {
    this.TypeOfGarbageIsAactive = event.target.checked
    if (!this.TypeOfGarbageIsAactive) {
      this.formData.TypeOfGarbage = ""
    }
  }

  isWardChange(event: any) {
    this.WardIsAactive = event.target.checked
    if (!this.WardIsAactive) {
      this.formData.Ward = ""
    }
  }

  isWorkCodeChange(event: any) {
    this.WorkCodeIsAactive = event.target.checked
    if (!this.WorkCodeIsAactive) {
      this.formData.Work_code = ""
    }
  }

  isShiftChange(event: any) {
    this.ShiftIsAactive = event.target.checked
    if (!this.ShiftIsAactive) {
      this.formData.Act_Shift = ""
      this.ShiftIsAactive1 = false
      this.ShiftIsAactive2 = false
      this.ShiftIsAactive3 = false
    } else {
      this.HourlyIsAactive = false
    }
  }

  isShift1Change(event: any) {
    this.ShiftIsAactive1 = event.target.checked
    if (this.ShiftIsAactive1) {
      this.formData.Act_Shift_UL = "I"
      this.ShiftIsAactive2 = false
      this.ShiftIsAactive3 = false
    }
  }

  isShift2Change(event: any) {
    this.ShiftIsAactive2 = event.target.checked
    if (this.ShiftIsAactive2) {
      this.formData.Act_Shift_UL = "II"
      this.ShiftIsAactive1 = false
      this.ShiftIsAactive3 = false
    }
  }

  isShift3Change(event: any) {
    this.ShiftIsAactive3 = event.target.checked
    if (this.ShiftIsAactive3) {
      this.formData.Act_Shift_UL = "III"
      this.ShiftIsAactive1 = false
      this.ShiftIsAactive2 = false
    }
  }

  isHourlyChange(event: any) {
    this.HourlyIsAactive = event.target.checked
    if (!this.HourlyIsAactive) {
      this.morningHourlyIsAactive = false
      this.afternoonHourlyIsAactive = false
      this.nightHourlyIsAactive = false
      this.formData.Trans_Time = ""
      this.formData.ShiftTimeFrom = ""
      this.formData.ShiftTimeTo = ""
    } else {
      this.ShiftIsAactive = false
    }
  }

  morningHourlyIsAactiveChange(event: any) {
    this.morningHourlyIsAactive = event.target.checked
    if (this.morningHourlyIsAactive) {
      this.formData.Trans_Time_UL = event.target.value
      this.afternoonHourlyIsAactive = false
      this.nightHourlyIsAactive = false
    }
  }

  afternoonHourlyIsAactiveChange(event: any) {
    this.afternoonHourlyIsAactive = event.target.checked
    if (this.afternoonHourlyIsAactive) {
      this.formData.Trans_Time_UL = event.target.value
      this.morningHourlyIsAactive = false
      this.nightHourlyIsAactive = false
    }
  }

  nightHourlyIsAactiveChange(event: any) {
    this.nightHourlyIsAactive = event.target.checked
    if (this.nightHourlyIsAactive) {
      this.formData.Trans_Time_UL = event.target.value
      this.afternoonHourlyIsAactive = false
      this.morningHourlyIsAactive = false
    }
  }

  // Dropdown selection handlers
  getAgencyname(event: any) {
    this.formData.agencyName = event.target.value
  }

  getvehicleNumber(event: any) {
    this.formData.Vehicle_No = event.target.value
  }

  getTypeOfGarbage(event: any) {
    this.formData.TypeOfGarbage = event.target.value
  }

  getWard(event: any) {
    this.formData.Ward = event.target.value
  }

  getWorkCode(event: any) {
    this.formData.Work_code = event.target.value
  }

  getMorningHour(event: any) {
    this.formData.Trans_Time = event.target.value
  }

  getafternoonHour(event: any) {
    this.formData.Trans_Time = event.target.value
  }

  getnightHour(event: any) {
    this.formData.Trans_Time = event.target.value
  }

  // Search submission
  onSubmit() {
    const formValues = this.reportForm.value
    // Validation
    if (!formValues.FromDate || !formValues.todate) {
      alert("Please enter From Date and To Date")
      return
    }
    if (new Date(formValues.FromDate) > new Date(formValues.todate)) {
      alert("From Date must be less than To Date")
      return
    }

    // Close filters
    this.closeFilters()

    // Create payload with explicit value extraction
    const basicPayload = {
      WeighBridge: this.reportForm.get("WeighBridge")?.value || "",
      FromDate: this.reportForm.get("FromDate")?.value,
      todate: this.reportForm.get("todate")?.value,
      reportType: 0,
      UserID: Number(this.userId),
      SiteName: this.userSiteName,
    }
    console.log("Submitting search with payload:", basicPayload)
    this.isLoading = true
    this.dbService.getSearchReports(basicPayload).subscribe(
      (response) => {
        this.isLoading = false
        if (response && (response as any).data) {
          this.reportData = (response as any).data
          // Calculate summary statistics after data is loaded
          this.calculateSummaryStatistics()
        } else {
          this.reportData = []
          this.resetSummaryStatistics()
        }
        this.activeTab = "search"
        this.cdr.detectChanges()
      },
      (error) => {
        console.error("API Error:", error)
        this.isLoading = false
        this.reportData = []
        this.resetSummaryStatistics()
        this.cdr.detectChanges()
      },
    )
  }

  formatDisplayDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  // FIXED: Updated to use reportData instead of lstReportData
  calculateSummaryStatistics() {
    if (!this.reportData || this.reportData.length === 0) {
      this.resetSummaryStatistics()
      return
    }

    // Use reportData (from API) instead of lstReportData
    const dataToCalculate = this.reportData
    this.totalNoOfVehicles = dataToCalculate.length

    // Count In and Out vehicles based on reportType or trans_Type field
    this.totalInVehicles = dataToCalculate.filter(
      (item) => item.trans_Type === "I" || item.reportType === 1 || item.type === "In",
    ).length
    this.totalOutVehicles = dataToCalculate.filter(
      (item) => item.trans_Type === "O" || item.reportType === 0 || item.type === "Out",
    ).length

    // Calculate gross weight totals
    const grossWeightTotal = dataToCalculate.reduce((sum, item) => {
      const weight = Number(item.gross_Weight || item.Gross_Weight || 0)
      return sum + weight
    }, 0)
    this.totalGrossWeightInKG = Number.parseFloat(grossWeightTotal.toFixed(2))
    this.totalGrossWeightInTon = Number.parseFloat((this.totalGrossWeightInKG / 1000).toFixed(2))

    // Calculate net weight totals
    const netWeightTotal = dataToCalculate.reduce((sum, item) => {
      const weight = Number(item.net_Weight || item.Act_Net_Weight || 0)
      return sum + weight
    }, 0)
    this.totalActualNetWeightInKG = Number.parseFloat(netWeightTotal.toFixed(2))
    this.totalActualNetWeightInTon = Number.parseFloat((this.totalActualNetWeightInKG / 1000).toFixed(2))

    // Calculate unladen weight totals
    const unladenWeightTotal = dataToCalculate.reduce((sum, item) => {
      const weight = Number(item.unladen_Weight || item.Unladen_Weight || 0)
      return sum + weight
    }, 0)
    this.totalUnladenWeightInKg = Number.parseFloat(unladenWeightTotal.toFixed(2))
    this.totalUnladenWeightInTon = Number.parseFloat((this.totalUnladenWeightInKg / 1000).toFixed(2))
  }

  // ADDED: Method to reset summary statistics
  resetSummaryStatistics() {
    this.totalNoOfVehicles = 0
    this.totalInVehicles = 0
    this.totalOutVehicles = 0
    this.totalGrossWeightInKG = 0
    this.totalGrossWeightInTon = 0
    this.totalUnladenWeightInKg = 0
    this.totalUnladenWeightInTon = 0
    this.totalActualNetWeightInKG = 0
    this.totalActualNetWeightInTon = 0
  }

  // Navigation
  back() {
    this.router.navigateByUrl("/dashboard")
  }

  exportToExcel() {
    if (!this.reportData || this.reportData.length === 0) {
      alert("There is no data to export")
      return
    }

    const filteredData: any[] = []
    this.agGrid.api.forEachNodeAfterFilter((node: any) => {
      if (node.data) {
        filteredData.push(node.data)
      }
    })

    if (filteredData.length === 0) {
      alert("No filtered data to export")
      return
    }

    // Column mapping from API fields to UI headers
    const columnMapping: { [key: string]: string } = {
      deliveryLocation: "Location",
      slipSrNo: "Slip No",
      trans_Date: "Transaction Date",
      trans_Time: "Transaction Time",
      agency_Name: "Agency",
      vehicle_No: "Vehicle No",
      vehicleType: "Vehicle Type",
      ward: "Ward",
      route: "Route No.",
      type_of_Garbage: "Type of Waste",
      gross_Weight: "Gross Weight",
      trans_Date_UL: "Trans Date UL",
      trans_Time_UL: "Trans Time UL",
      unladen_Weight: "Unladen Weight",
      act_Net_Weight: "Actual Net Weight",
    }

    // Convert to UI-based headers
    const transformedData = filteredData.map((item) => {
      const row: { [key: string]: any } = {}
      for (const field in columnMapping) {
        row[columnMapping[field]] = item[field]
      }
      return row
    })

    // Create worksheet without header
    const worksheet = XLSX.utils.json_to_sheet(transformedData)
    // Prepend UI-based header row at A1
    const headerRow = Object.values(columnMapping)
    XLSX.utils.sheet_add_aoa(worksheet, [headerRow], { origin: "A1" })

    // Adjust column widths
    const colWidths = headerRow.map((header) => {
      const columnContent = [header, ...transformedData.map((row) => String(row[header] ?? ""))]
      const maxLength = Math.max(...columnContent.map((val) => val.length))
      return { wch: maxLength + 2 }
    })
    worksheet["!cols"] = colWidths

    // Create and save workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "SearchReport.xlsx")
    XLSX.writeFile(workbook, "SearchReport.xlsx")
  }

  resetForm() {
    const today = new Date()

    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    this.reportForm.reset({
      WeighBridge: "",
      FromDate: moment().format('YYYY-MM-DD'),
      todate: moment().format('YYYY-MM-DD'),
      reportType: "",
      Gross_Weight_From: 0,
      Gross_Weight_To: 0,
      agencyName: "",
      Vehicle_No: "",
      TypeOfGarbage: "",
      Ward: "",
      Work_code: "",
      Act_Shift: "",
      Act_Shift_UL: "",
      Trans_Time: "",
      Trans_Time_UL: "",
      ShiftTimeFrom: "",
      ShiftTimeTo: "",
      selectNallah: "",
    })

    // Reset all filter states
    this.GrossWeightInKAactive = false
    this.AgencynameIsAactive = false
    this.vehicleNumberIsAactive = false
    this.TypeOfGarbageIsAactive = false
    this.WardIsAactive = false
    this.WorkCodeIsAactive = false
    this.ShiftIsAactive = false
    this.ShiftIsAactive1 = false
    this.ShiftIsAactive2 = false
    this.ShiftIsAactive3 = false
    this.HourlyIsAactive = false
    this.morningHourlyIsAactive = false
    this.afternoonHourlyIsAactive = false
    this.nightHourlyIsAactive = false
    this.ReportTypesAactive = false

    // Reset results and summary
    this.reportData = []
    this.lstReportData = []
    this.resetSummaryStatistics()
    this.activeTab = "search"
  }

  printReport() {
    window.print()
  }
}
