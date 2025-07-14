import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { ICellRendererParams } from "ag-grid-community"
import { AgGridModule, AgGridAngular } from "ag-grid-angular"
import * as XLSX from "xlsx"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import Swal from "sweetalert2"
import { Subject } from "rxjs"
import { debounceTime, distinctUntilChanged } from "rxjs/operators"


interface BillingData {
  slipSrNo: string
  slipSrNoNew: string | null
  weighbridge: string
  dC_No: string
  trans_Date: string
  agency_Name: string
  vehicle_No: string
  ward: string
  gross_Weight: string | number
  act_Net_Weight: string | number
  billingStatus: number
  billingStatusLabel: string
  remark: string
  trans_Time: string
  type_of_Garbage: string
  area: string
  zone_Name: string
  section_Name: string
  route: string
  net_Weight: string | number
  unladen_Weight: string | number
  billingRemark: string
}

interface ApiResponse {
  data: BillingData[]
  serviceResponse: number
  msg: string
}

interface VerificationRequest {
  UserId: number
  SlipSrNoNew: string
  BillingStatus: number
  FromDate: string
  ToDate: string
}

interface VerificationResponse {
  ServiceResponse: number
  msg: string
}

@Component({
  selector: "app-billing-report",
  templateUrl: "./billing-report.component.html",
  styleUrls: ["./billing-report.component.scss"],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AgGridModule],
})
export class BillingReportComponent implements OnInit {
  @ViewChild("reportContainer") reportContainer!: ElementRef
  @ViewChild("agGrid") agGrid!: AgGridAngular

  // UI state
  isLoading = false
  showReport = true
  isFiltersOpen = false
  isQuickFiltersOpen = false

  // Form
  reportForm!: FormGroup
  quickFilterForm!: FormGroup

  // Data
  billableSearchData: BillingData[] = []
  filteredData: BillingData[] = []
  selectedRowsCount = 0

  // Filter state
  currentFilterType: "all" | "month" | "year" | "dateRange" = "all"
  selectedMonth: number | null = null
  selectedYear: number | null = null

  // Performance optimization
  private resizeSubject = new Subject<void>()
  private isGridReady = false
  private pendingResize = false

  // Month and Year options
  months = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" },
  ]

  years: number[] = []

  // AG Grid configuration
  columnDefs: any[] = []
  defaultColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    suppressSizeToFit: false,
    minWidth: 80,
  }
  rowSelection: "single" | "multiple" = "multiple"
  gridApi: any

  // Summary metrics
  totalNoOfVehicles = 0
  totalGrossWeightInKG = 0
  totalGrossWeightInTon = 0
  totalActualNetWeightInKG = 0
  totalActualNetWeightInTon = 0

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dbCallingService: DbCallingService,
    private cdr: ChangeDetectorRef,
  ) {
    // Debounce resize operations for performance
    this.resizeSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.performColumnResize()
    })
  }

  ngOnDestroy(): void {
    this.resizeSubject.complete()
  }

  ngOnInit(): void {
    this.initYears()
    this.initForms()
    this.setupColumnDefs()
    this.loadDefaultData()
  }

  initYears(): void {
    const currentYear = new Date().getFullYear()
    for (let year = currentYear; year >= currentYear - 10; year--) {
      this.years.push(year)
    }
  }

  initForms(): void {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    // Set first and last day of current month as default
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const lastDay = new Date(currentYear, currentMonth, 0)

    // Main report form
    this.reportForm = this.fb.group({
      fromDate: [this.formatDateForInput(firstDay), Validators.required],
      toDate: [this.formatDateForInput(lastDay), Validators.required],
    })

    // Quick filter form
    this.quickFilterForm = this.fb.group({
      filterType: ["all"],
      selectedMonth: [currentMonth],
      selectedYear: [currentYear],
      customFromDate: [this.formatDateForInput(firstDay)],
      customToDate: [this.formatDateForInput(lastDay)],
    })
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0]
  }

  setupColumnDefs(): void {
    this.columnDefs = [
      {
        headerName: "Select",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 60,
        minWidth: 60,
        maxWidth: 80,
        pinned: "left",
        suppressSizeToFit: true,
        lockPosition: true,
      },
      {
        headerName: "Status",
        field: "billingStatusLabel",
        minWidth: 120,
        maxWidth: 180,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.data?.billingStatus
          let statusText = "Pending"
          let statusClass = "status-pending"

          switch (status) {
            case 1:
              statusText = "Sent for Verification"
              statusClass = "status-verification"
              break
            case 2:
              statusText = "Verified"
              statusClass = "status-verified"
              break
            case 3:
              statusText = "Approved"
              statusClass = "status-approved"
              break
            default:
              statusText = "Pending"
              statusClass = "status-pending"
          }

          return `<span class="${statusClass}">${statusText}</span>`
        },
      },
      {
        headerName: "Location",
        field: "weighbridge",
        minWidth: 100,
        maxWidth: 150,
      },
      {
        headerName: "Slip No",
        field: "slipSrNo",
        minWidth: 100,
        maxWidth: 130,
        cellStyle: { "font-weight": "bold" },
      },
      {
        headerName: "DC No",
        field: "dC_No",
        minWidth: 100,
        maxWidth: 130,
      },
      {
        headerName: "Trans Date",
        field: "trans_Date",
        minWidth: 120,
        maxWidth: 150,
        sortable: true,
        valueFormatter: (params: any) => {
          if (params.value) {
            return new Date(params.value).toLocaleDateString()
          }
          return ""
        },
      },
      {
        headerName: "Month",
        field: "trans_Date",
        minWidth: 100,
        maxWidth: 120,
        valueGetter: (params: any) => {
          if (params.data?.trans_Date) {
            const date = new Date(params.data.trans_Date)
            return this.months[date.getMonth()]?.name || ""
          }
          return ""
        },
        sortable: true,
      },
      {
        headerName: "Year",
        field: "trans_Date",
        minWidth: 80,
        maxWidth: 100,
        valueGetter: (params: any) => {
          if (params.data?.trans_Date) {
            return new Date(params.data.trans_Date).getFullYear()
          }
          return ""
        },
        sortable: true,
      },
      {
        headerName: "Agency",
        field: "agency_Name",
        minWidth: 150,
        maxWidth: 250,
      },
      {
        headerName: "Vehicle No",
        field: "vehicle_No",
        minWidth: 120,
        maxWidth: 150,
      },
      {
        headerName: "Ward",
        field: "ward",
        minWidth: 100,
        maxWidth: 130,
      },
      {
        headerName: "Gross Weight (Kg)",
        field: "gross_Weight",
        minWidth: 140,
        maxWidth: 180,
        type: "numericColumn",
        valueFormatter: (params: any) => {
          return params.value ? Number(params.value).toLocaleString() : "0"
        },
      },
      {
        headerName: "Net Weight (Kg)",
        field: "act_Net_Weight",
        minWidth: 140,
        maxWidth: 180,
        type: "numericColumn",
        valueFormatter: (params: any) => {
          return params.value ? Number(params.value).toLocaleString() : "0"
        },
      },
      {
        headerName: "Remark",
        field: "remark",
        minWidth: 150,
        maxWidth: 300,
      },
    ]
  }

  // Load default data (current month) on component initialization
  loadDefaultData(): void {
    const formValues = this.reportForm.value
    this.loadBillingData(formValues.fromDate, formValues.toDate)
  }

  loadBillingData(fromDate: string, toDate: string): void {
    this.isLoading = true

    const obj = {
      UserId: Number(sessionStorage.getItem("UserId")) || 1,
      Zone: null,
      Parentcode: null,
      Workcode: null,
      FromDate: fromDate,
      ToDate: toDate,
    }

    this.dbCallingService.getBillableSearchData(obj).subscribe({
      next: (response: any) => {
        console.log("API Response:", response)

        // Handle different response formats
        let data: BillingData[] = []
        let serviceResponse = 0

        if (response?.data && Array.isArray(response.data)) {
          data = response.data
          serviceResponse = response.serviceResponse || 1
        } else if (response?.Data && Array.isArray(response.Data)) {
          data = response.Data
          serviceResponse = response.ServiceResponse || 1
        }

        if (serviceResponse > 0 && data.length > 0) {
          this.billableSearchData = data
          this.filteredData = [...data]
          this.calculateSummary()

          // Trigger resize only once after data is loaded
          this.scheduleColumnResize()
        } else {
          this.resetData()
        }
        this.isLoading = false
        this.cdr.detectChanges()
      },
      error: (error: any) => {
        console.error("API Error:", error)
        this.resetData()
        this.isLoading = false
        this.cdr.detectChanges()
        Swal.fire({
          text: "Failed to fetch data",
          icon: "error",
        })
      },
    })
  }

  // Quick Filter Methods
  toggleQuickFilters(): void {
    this.isQuickFiltersOpen = !this.isQuickFiltersOpen
  }

  closeQuickFilters(): void {
    this.isQuickFiltersOpen = false
  }

  applyQuickFilter(): void {
    const filterValues = this.quickFilterForm.value
    this.currentFilterType = filterValues.filterType

    // Check if we need to load new data or just filter existing data
    const needsNewData = this.shouldLoadNewData(filterValues)

    if (needsNewData) {
      // Load new data from API
      let fromDate: string, toDate: string

      switch (filterValues.filterType) {
        case "month":
          const monthStart = new Date(filterValues.selectedYear, filterValues.selectedMonth - 1, 1)
          const monthEnd = new Date(filterValues.selectedYear, filterValues.selectedMonth, 0)
          fromDate = this.formatDateForInput(monthStart)
          toDate = this.formatDateForInput(monthEnd)
          break
        case "year":
          const yearStart = new Date(filterValues.selectedYear, 0, 1)
          const yearEnd = new Date(filterValues.selectedYear, 11, 31)
          fromDate = this.formatDateForInput(yearStart)
          toDate = this.formatDateForInput(yearEnd)
          break
        case "dateRange":
          fromDate = filterValues.customFromDate
          toDate = filterValues.customToDate
          break
        default:
          // For "all", use current form values
          const formValues = this.reportForm.value
          fromDate = formValues.fromDate
          toDate = formValues.toDate
      }

      // Update main form and load data
      this.reportForm.patchValue({ fromDate, toDate })
      this.loadBillingData(fromDate, toDate)
    } else {
      // Just filter existing data
      this.applyClientSideFilter(filterValues)
    }

    this.clearGridSelection()
    this.closeQuickFilters()
  }

  private shouldLoadNewData(filterValues: any): boolean {
    // Always load new data for different filter types to ensure we have the right date range
    return true
  }

  private applyClientSideFilter(filterValues: any): void {
    switch (filterValues.filterType) {
      case "all":
        this.filteredData = [...this.billableSearchData]
        break
      case "month":
        this.filterByMonth(filterValues.selectedMonth, filterValues.selectedYear)
        break
      case "year":
        this.filterByYear(filterValues.selectedYear)
        break
      case "dateRange":
        this.filterByDateRange(filterValues.customFromDate, filterValues.customToDate)
        break
    }

    this.calculateSummary()
    this.scheduleColumnResize()
  }

  filterByMonth(month: number, year: number): void {
    this.selectedMonth = month
    this.selectedYear = year
    this.filteredData = this.billableSearchData.filter((item) => {
      const itemDate = new Date(item.trans_Date)
      return itemDate.getMonth() + 1 === month && itemDate.getFullYear() === year
    })
  }

  filterByYear(year: number): void {
    this.selectedYear = year
    this.selectedMonth = null
    this.filteredData = this.billableSearchData.filter((item) => {
      const itemDate = new Date(item.trans_Date)
      return itemDate.getFullYear() === year
    })
  }

  filterByDateRange(fromDate: string, toDate: string): void {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    this.filteredData = this.billableSearchData.filter((item) => {
      const itemDate = new Date(item.trans_Date)
      return itemDate >= from && itemDate <= to
    })
  }

  // Quick selection methods
  selectCurrentMonthData(): void {
    const currentDate = new Date()
    this.quickFilterForm.patchValue({
      filterType: "month",
      selectedMonth: currentDate.getMonth() + 1,
      selectedYear: currentDate.getFullYear(),
    })
    this.applyQuickFilter()
    setTimeout(() => this.selectFilteredRows(), 500)
  }

  selectCurrentYearData(): void {
    this.quickFilterForm.patchValue({
      filterType: "year",
      selectedYear: new Date().getFullYear(),
    })
    this.applyQuickFilter()
    setTimeout(() => this.selectFilteredRows(), 500)
  }

  selectAllVisibleData(): void {
    this.selectFilteredRows()
  }

  selectFilteredRows(): void {
    if (this.gridApi && this.isGridReady) {
      this.gridApi.forEachNode((node: any) => {
        const dataToCheck = this.filteredData.length > 0 ? this.filteredData : this.billableSearchData
        if (dataToCheck.some((item) => item.slipSrNo === node.data?.slipSrNo)) {
          node.setSelected(true)
        }
      })
    }
  }

  clearGridSelection(): void {
    if (this.gridApi && this.isGridReady) {
      this.gridApi.deselectAll()
    }
  }

  calculateSummary(): void {
    const dataToCalculate = this.filteredData.length > 0 ? this.filteredData : this.billableSearchData

    if (!dataToCalculate || dataToCalculate.length === 0) {
      this.resetSummaryStatistics()
      return
    }

    this.totalNoOfVehicles = dataToCalculate.length
    this.totalGrossWeightInKG = dataToCalculate.reduce((sum, item) => sum + Number(item.gross_Weight || 0), 0)
    this.totalGrossWeightInTon = this.totalGrossWeightInKG / 1000
    this.totalActualNetWeightInKG = dataToCalculate.reduce((sum, item) => sum + Number(item.act_Net_Weight || 0), 0)
    this.totalActualNetWeightInTon = this.totalActualNetWeightInKG / 1000
  }

  resetSummaryStatistics(): void {
    this.totalNoOfVehicles = 0
    this.totalGrossWeightInKG = 0
    this.totalGrossWeightInTon = 0
    this.totalActualNetWeightInKG = 0
    this.totalActualNetWeightInTon = 0
  }

  resetData(): void {
    this.billableSearchData = []
    this.filteredData = []
    this.resetSummaryStatistics()
  }

  // Toggle filters offcanvas
  toggleFilters(): void {
    this.isFiltersOpen = !this.isFiltersOpen
  }

  // Close filters offcanvas
  closeFilters(): void {
    this.isFiltersOpen = false
  }

  onSubmit(): void {
    if (this.reportForm.invalid) {
      return
    }

    this.closeFilters()
    const formValues = this.reportForm.value

    if (new Date(formValues.fromDate) > new Date(formValues.toDate)) {
      Swal.fire({
        text: "From Date must be less than To Date",
        icon: "warning",
      })
      return
    }

    this.loadBillingData(formValues.fromDate, formValues.toDate)
  }

  resetForm(): void {
    this.reportForm.reset()
    this.quickFilterForm.reset()
    this.initForms()
    this.loadDefaultData()
    this.currentFilterType = "all"
    this.selectedMonth = null
    this.selectedYear = null
  }

  onGridReady(params: any): void {
    this.gridApi = params.api
    this.isGridReady = true

    // Initial column sizing
    setTimeout(() => {
      this.scheduleColumnResize()
    }, 100)
  }

  onSelectionChanged(event: any): void {
    if (this.gridApi && this.isGridReady) {
      const selectedRows = this.gridApi.getSelectedRows()
      this.selectedRowsCount = selectedRows.length
    }
  }

  hasSelectedRows(): boolean {
    return this.selectedRowsCount > 0
  }

  // Enhanced verification method for selected rows
  goForVerification(): void {
    if (!this.hasSelectedRows()) {
      Swal.fire({
        text: "Please select records to send for verification",
        icon: "warning",
      })
      return
    }

    const selectedRows = this.gridApi.getSelectedRows()
    const eligibleRows = selectedRows.filter((row: BillingData) => !row.billingStatus || row.billingStatus === 0)

    if (eligibleRows.length === 0) {
      Swal.fire({
        text: "Selected records are already processed or not eligible for verification",
        icon: "warning",
      })
      return
    }

    const filterTypeText = this.getFilterTypeText()

    Swal.fire({
      title: "Confirm Verification",
      text: `Send ${eligibleRows.length} selected records (${filterTypeText}) for verification?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Send Selected",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        this.performSelectedVerification(eligibleRows)
      }
    })
  }

  getFilterTypeText(): string {
    switch (this.currentFilterType) {
      case "month":
        const monthName = this.months.find((m) => m.value === this.selectedMonth)?.name
        return `${monthName} ${this.selectedYear}`
      case "year":
        return `Year ${this.selectedYear}`
      case "dateRange":
        const formValues = this.reportForm.value
        return `${formValues.fromDate} to ${formValues.toDate}`
      default:
        return "All Data"
    }
  }

  performSelectedVerification(eligibleRows: BillingData[]): void {
    this.isLoading = true

    const slipNos = eligibleRows.map((row: BillingData) => row.slipSrNo).join(",")
    const formValues = this.reportForm.value

    const obj: VerificationRequest = {
      UserId: Number(sessionStorage.getItem("UserId")) || 1,
      SlipSrNoNew: slipNos,
      BillingStatus: 1,
      FromDate: formValues.fromDate,
      ToDate: formValues.toDate,
    }

    this.dbCallingService.sendToVerifyBillingData(obj).subscribe({
      next: (response: VerificationResponse) => {
        this.isLoading = false
        if (response.ServiceResponse === 1) {
          Swal.fire({
            title: "Success!",
            text: response.msg || `${eligibleRows.length} selected records sent for verification successfully!`,
            icon: "success",
          })
          // Reload data to reflect changes
          this.loadBillingData(formValues.fromDate, formValues.toDate)
        } else {
          Swal.fire({
            text: response.msg || "Failed to send selected records for verification",
            icon: "error",
          })
        }
      },
      error: (error: any) => {
        this.isLoading = false
        console.error("Verification Error:", error)
        Swal.fire({
          text: "Failed to send selected records for verification",
          icon: "error",
        })
      },
    })
  }

  // Legacy method - kept for backward compatibility
  sendToVerification(): void {
    this.goForVerification()
  }

  // New method for monthly verification (all records)
  sendForMonthlyVerification(): void {
    if (!this.billableSearchData || this.billableSearchData.length === 0) {
      Swal.fire({
        text: "No data available to send for verification",
        icon: "warning",
      })
      return
    }

    const eligibleRows = this.billableSearchData.filter(
      (row: BillingData) => !row.billingStatus || row.billingStatus === 0,
    )

    if (eligibleRows.length === 0) {
      Swal.fire({
        text: "All records in the current period are already processed",
        icon: "warning",
      })
      return
    }

    const formValues = this.reportForm.value
    const fromDate = new Date(formValues.fromDate)
    const toDate = new Date(formValues.toDate)

    const monthName = this.months[fromDate.getMonth()]?.name
    const year = fromDate.getFullYear()
    const periodText =
      fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()
        ? `${monthName} ${year}`
        : `${formValues.fromDate} to ${formValues.toDate}`

    Swal.fire({
      title: "Confirm Monthly Verification",
      text: `Send entire monthly record for ${periodText} (${eligibleRows.length} records) for verification?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Send All",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        this.performMonthlyVerification(eligibleRows, formValues.fromDate, formValues.toDate)
      }
    })
  }

  performMonthlyVerification(eligibleRows: BillingData[], fromDate: string, toDate: string): void {
    this.isLoading = true

    const slipNos = eligibleRows.map((row: BillingData) => row.slipSrNo).join(",")

    const obj: VerificationRequest = {
      UserId: Number(sessionStorage.getItem("UserId")) || 1,
      SlipSrNoNew: slipNos,
      BillingStatus: 1,
      FromDate: fromDate,
      ToDate: toDate,
    }

    this.dbCallingService.sendToVerifyBillingData(obj).subscribe({
      next: (response: VerificationResponse) => {
        this.isLoading = false
        if (response.ServiceResponse === 1) {
          Swal.fire({
            title: "Success!",
            text:
              response.msg ||
              `Monthly record sent for verification successfully! ${eligibleRows.length} records updated.`,
            icon: "success",
          })
          this.loadBillingData(fromDate, toDate)
        } else {
          Swal.fire({
            text: response.msg || "Failed to send monthly record for verification",
            icon: "error",
          })
        }
      },
      error: (error: any) => {
        this.isLoading = false
        console.error("Monthly Verification Error:", error)
        Swal.fire({
          text: "Failed to send monthly record for verification",
          icon: "error",
        })
      },
    })
  }

  getPendingVerificationCount(): number {
    const dataToCheck = this.filteredData.length > 0 ? this.filteredData : this.billableSearchData
    return dataToCheck.filter((item) => !item.billingStatus || item.billingStatus === 0).length
  }

  getVerifiedCount(): number {
    const dataToCheck = this.filteredData.length > 0 ? this.filteredData : this.billableSearchData
    return dataToCheck.filter((item) => item.billingStatus === 2).length
  }

  getApprovedCount(): number {
    const dataToCheck = this.filteredData.length > 0 ? this.filteredData : this.billableSearchData
    return dataToCheck.filter((item) => item.billingStatus === 3).length
  }

  getSelectedMonthYear(): string {
    const formValues = this.reportForm.value
    if (formValues.fromDate && formValues.toDate) {
      const fromDate = new Date(formValues.fromDate)
      const toDate = new Date(formValues.toDate)

      if (fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()) {
        const monthName = this.months[fromDate.getMonth()]?.name
        return `${monthName} ${fromDate.getFullYear()}`
      } else {
        return `${formValues.fromDate} to ${formValues.toDate}`
      }
    }

    return "Current Period"
  }

  exportToExcel(): void {
    const dataToExport = this.filteredData.length > 0 ? this.filteredData : this.billableSearchData

    if (!dataToExport || dataToExport.length === 0) {
      Swal.fire({
        text: "No data to export",
        icon: "warning",
      })
      return
    }

    const exportData = dataToExport.map((item) => ({
      Location: item.weighbridge,
      "Slip No": item.slipSrNo,
      "DC No": item.dC_No,
      "Trans Date": item.trans_Date,
      Month: this.months[new Date(item.trans_Date).getMonth()]?.name || "",
      Year: new Date(item.trans_Date).getFullYear(),
      Agency: item.agency_Name,
      "Vehicle No": item.vehicle_No,
      Ward: item.ward,
      "Gross Weight (Kg)": Number(item.gross_Weight),
      "Net Weight (Kg)": Number(item.act_Net_Weight),
      "Billing Status": this.getBillingStatusText(item.billingStatus),
      Remark: item.remark,
    }))

    exportData.push({
      Location: "SUMMARY",
      "Slip No": "",
      "DC No": "",
      "Trans Date": "",
      Month: "",
      Year: 0,
      Agency: "",
      "Vehicle No": "",
      Ward: "",
      "Gross Weight (Kg)": this.totalGrossWeightInKG,
      "Net Weight (Kg)": this.totalActualNetWeightInKG,
      "Billing Status": "",
      Remark: `Total Vehicles: ${this.totalNoOfVehicles}`,
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Billing Report")

    const fileName = `Billing_Report_${this.getSelectedMonthYear().replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  getBillingStatusText(status: number): string {
    switch (status) {
      case 1:
        return "Sent for Verification"
      case 2:
        return "Verified"
      case 3:
        return "Approved"
      default:
        return "Pending"
    }
  }

  printReport(): void {
    window.print()
  }

  navigateBack(): void {
    this.router.navigateByUrl("/dashboard")
  }

  // Optimized column sizing methods
  private scheduleColumnResize(): void {
    if (!this.pendingResize) {
      this.pendingResize = true
      this.resizeSubject.next()
    }
  }

  private performColumnResize(): void {
    if (this.gridApi && this.isGridReady) {
      try {
        // Simple auto-size without complex calculations
        this.gridApi.sizeColumnsToFit()
        this.pendingResize = false
      } catch (error) {
        console.warn("Column resize error:", error)
        this.pendingResize = false
      }
    }
  }

  // Manual column control methods (simplified)
  autoSizeAllColumns(): void {
    if (this.gridApi && this.isGridReady) {
      const allColumnIds = this.gridApi.getColumns()?.map((column: any) => column.getId()) || []
      this.gridApi.autoSizeColumns(allColumnIds, false)
    }
  }

  sizeColumnsToFit(): void {
    if (this.gridApi && this.isGridReady) {
      this.gridApi.sizeColumnsToFit()
    }
  }

  onFirstDataRendered(params: any): void {
    // Simple resize after data is rendered
    setTimeout(() => {
      this.scheduleColumnResize()
    }, 200)
  }
}
