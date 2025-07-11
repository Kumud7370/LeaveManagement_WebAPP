import { Component, OnInit, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { ICellRendererParams } from "ag-grid-community"
import { AgGridModule, AgGridAngular } from "ag-grid-angular"
import * as XLSX from "xlsx"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import Swal from "sweetalert2"

// Interface definitions for better type safety
interface BillingData {
  SlipSrNo: string
  SlipSrNoNew: string
  Weighbridge: string
  DC_No: string
  Trans_Date: string
  Agency_Name: string
  Vehicle_No: string
  Ward: string
  Gross_Weight: number
  Act_Net_Weight: number
  BillingStatus: number
  BillingStatusLabel: string
  Remark: string
}

interface ApiResponse {
  Data: BillingData[]
  ServiceResponse: number
  msg: string
}

interface VerificationRequest {
  UserId: number
  SlipSrNoNew: string
  BillingStatus: number
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

  // Form
  reportForm!: FormGroup

  // Data
  billableSearchData: BillingData[] = []
  selectedRowsCount = 0

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
    flex: 1,
    sortable: true,
    filter: true,
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
  ) {}

  ngOnInit(): void {
    this.initYears()
    this.initForm()
    this.setupColumnDefs()
    this.loadInitialData()
  }

  initYears(): void {
    const currentYear = new Date().getFullYear()
    for (let year = currentYear; year >= currentYear - 10; year--) {
      this.years.push(year)
    }
  }

  initForm(): void {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    // Set first and last day of current month
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const lastDay = new Date(currentYear, currentMonth, 0)

    this.reportForm = this.fb.group({
      month: [currentMonth, Validators.required],
      year: [currentYear, Validators.required],
      fromDate: [this.formatDateForInput(firstDay), Validators.required],
      toDate: [this.formatDateForInput(lastDay), Validators.required],
    })

    // Watch for month/year changes to update date range
    this.reportForm.get("month")?.valueChanges.subscribe(() => this.updateDateRange())
    this.reportForm.get("year")?.valueChanges.subscribe(() => this.updateDateRange())
  }

  updateDateRange(): void {
    const month = this.reportForm.get("month")?.value
    const year = this.reportForm.get("year")?.value

    if (month && year) {
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0)

      this.reportForm.patchValue({
        fromDate: this.formatDateForInput(firstDay),
        toDate: this.formatDateForInput(lastDay),
      })
    }
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
        width: 50,
        pinned: "left",
      },
      {
        headerName: "Billing Status",
        field: "BillingStatusLabel",
        width: 120,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.data?.BillingStatus
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
      { headerName: "Location", field: "Weighbridge", width: 100 },
      { headerName: "Slip No", field: "SlipSrNo", width: 100, cellStyle: { "font-weight": "bold" } },
      { headerName: "DC No", field: "DC_No", width: 100 },
      { headerName: "Trans Date", field: "Trans_Date", width: 120 },
      { headerName: "Agency", field: "Agency_Name", width: 150 },
      { headerName: "Vehicle No", field: "Vehicle_No", width: 120 },
      { headerName: "Ward", field: "Ward", width: 100 },
      { headerName: "Gross Weight (Kg)", field: "Gross_Weight", width: 130, type: "numericColumn" },
      { headerName: "Net Weight (Kg)", field: "Act_Net_Weight", width: 130, type: "numericColumn" },
      { headerName: "Remark", field: "Remark", width: 200 },
    ]
  }

  loadInitialData(): void {
    const formValues = this.reportForm.value
    this.loadBillingData(formValues.fromDate, formValues.toDate)
  }

  loadBillingData(fromDate: string, toDate: string): void {
    this.isLoading = true

    const obj = {
      UserId: Number(sessionStorage.getItem("UserId")),
      Zone: null,
      Parentcode: null,
      Workcode: null,
      FromDate: fromDate,
      ToDate: toDate,
    }

    this.dbCallingService.getBillableSearchData(obj).subscribe({
      next: (response: ApiResponse) => {
        console.log("API Response:", response)
        if (response && response.ServiceResponse > 0 && response.Data?.length) {
          this.billableSearchData = response.Data
          this.calculateSummary()
        } else {
          this.resetData()
        }
        this.isLoading = false
      },
      error: (error: any) => {
        console.error("API Error:", error)
        this.resetData()
        this.isLoading = false
        Swal.fire({
          text: "Failed to fetch data",
          icon: "error",
        })
      },
    })
  }

  calculateSummary(): void {
    if (!this.billableSearchData || this.billableSearchData.length === 0) {
      this.resetSummaryStatistics()
      return
    }

    this.totalNoOfVehicles = this.billableSearchData.length
    this.totalGrossWeightInKG = this.billableSearchData.reduce((sum, item) => sum + Number(item.Gross_Weight || 0), 0)
    this.totalGrossWeightInTon = this.totalGrossWeightInKG / 1000
    this.totalActualNetWeightInKG = this.billableSearchData.reduce(
      (sum, item) => sum + Number(item.Act_Net_Weight || 0),
      0,
    )
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
    this.initForm()
  }

  onGridReady(params: any): void {
    this.gridApi = params.api
  }

  onSelectionChanged(event: any): void {
    const selectedRows = this.gridApi.getSelectedRows()
    this.selectedRowsCount = selectedRows.length
  }

  hasSelectedRows(): boolean {
    return this.selectedRowsCount > 0
  }

  sendToVerification(): void {
    const selectedRows = this.gridApi.getSelectedRows()

    if (selectedRows.length === 0) {
      Swal.fire({
        text: "Please select records to send for verification",
        icon: "warning",
      })
      return
    }

    // Filter only records that are not already verified/approved
    const eligibleRows = selectedRows.filter((row: BillingData) => !row.BillingStatus || row.BillingStatus === 0)

    if (eligibleRows.length === 0) {
      Swal.fire({
        text: "Selected records are already processed",
        icon: "warning",
      })
      return
    }

    const slipNos = eligibleRows.map((row: BillingData) => row.SlipSrNo).join(",")

    Swal.fire({
      title: "Confirm Verification",
      text: `Send ${eligibleRows.length} records for verification?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Send",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        this.performVerification(slipNos)
      }
    })
  }

  performVerification(slipNos: string): void {
    this.isLoading = true

    const obj: VerificationRequest = {
      UserId: Number(sessionStorage.getItem("UserId")),
      SlipSrNoNew: slipNos,
      BillingStatus: 1,
    }

    this.dbCallingService.sendToVerifyBillingData(obj).subscribe({
      next: (response: VerificationResponse) => {
        this.isLoading = false
        if (response.ServiceResponse === 1) {
          Swal.fire({
            text: response.msg || "Records sent for verification successfully",
            icon: "success",
          })
          // Reload data to reflect changes
          const formValues = this.reportForm.value
          this.loadBillingData(formValues.fromDate, formValues.toDate)
        } else {
          Swal.fire({
            text: response.msg || "Failed to send records for verification",
            icon: "error",
          })
        }
      },
      error: (error: any) => {
        this.isLoading = false
        console.error("Verification Error:", error)
        Swal.fire({
          text: "Failed to send records for verification",
          icon: "error",
        })
      },
    })
  }

  getPendingVerificationCount(): number {
    return this.billableSearchData.filter((item) => !item.BillingStatus || item.BillingStatus === 0).length
  }

  getVerifiedCount(): number {
    return this.billableSearchData.filter((item) => item.BillingStatus === 2).length
  }

  getApprovedCount(): number {
    return this.billableSearchData.filter((item) => item.BillingStatus === 3).length
  }

  getSelectedMonthYear(): string {
    const month = this.reportForm.get("month")?.value
    const year = this.reportForm.get("year")?.value

    if (month && year) {
      const monthName = this.months.find((m) => m.value === month)?.name
      return `${monthName} ${year}`
    }

    return "Current Period"
  }

  exportToExcel(): void {
    if (!this.billableSearchData || this.billableSearchData.length === 0) {
      Swal.fire({
        text: "No data to export",
        icon: "warning",
      })
      return
    }

    // Prepare data for export
    const exportData = this.billableSearchData.map((item) => ({
      Location: item.Weighbridge,
      "Slip No": item.SlipSrNo,
      "DC No": item.DC_No,
      "Trans Date": item.Trans_Date,
      Agency: item.Agency_Name,
      "Vehicle No": item.Vehicle_No,
      Ward: item.Ward,
      "Gross Weight (Kg)": item.Gross_Weight,
      "Net Weight (Kg)": item.Act_Net_Weight,
      "Billing Status": this.getBillingStatusText(item.BillingStatus),
      Remark: item.Remark,
    }))

    // Add summary row
    exportData.push({
      Location: "SUMMARY",
      "Slip No": "",
      "DC No": "",
      "Trans Date": "",
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

    const fileName = `Billing_Report_${this.getSelectedMonthYear().replace(" ", "_")}.xlsx`
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
}
