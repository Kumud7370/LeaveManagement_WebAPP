import { Component, OnInit, ViewChild, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, ActivatedRoute, RouterModule } from "@angular/router"
import { ICellRendererParams } from "ag-grid-community"
import { AgGridModule, AgGridAngular } from "ag-grid-angular"
import * as XLSX from "xlsx"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import Swal from "sweetalert2"
import { debounceTime, distinctUntilChanged } from "rxjs/operators"
import { Subject } from "rxjs"

// Verification data interface
interface VerificationData {
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
  submittedBy?: string
  submittedDate?: string
  verifiedBy?: string
  verifiedDate?: string
  verificationAction?: "pending" | "approved" | "rejected" | "sent_back"
}

interface VerificationRequest {
  UserId: number
  SlipSrNoNew: string
  BillingStatus: number
  Remark?: string
}

interface VerificationResponse {
  ServiceResponse: number
  msg: string
}

interface VerifierInfo {
  id: number
  name: string
  designation: string
  department: string
}

@Component({
  selector: "app-verification",
  templateUrl: "./verification.component.html",
  styleUrls: ["./verification.component.scss"],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AgGridModule],
})
export class VerificationComponent implements OnInit {
  @ViewChild("agGrid") agGrid!: AgGridAngular

  // UI state
  isLoading = false
  showVerificationPanel = false
  selectedRecord: VerificationData | null = null

  // Forms
  verificationForm!: FormGroup
  bulkActionForm!: FormGroup
  dateFilterForm!: FormGroup

  // Data
  verificationData: VerificationData[] = []
  filteredData: VerificationData[] = []
  selectedRowsCount = 0

  // Route parameters
  routeParams = {
    slipNos: "",
    fromDate: "",
    toDate: "",
    source: "",
  }

  // Verifier information
  verifierInfo: VerifierInfo = {
    id: 0,
    name: "",
    designation: "",
    department: "",
  }

  // Filter state
  currentStatusFilter: "all" | "pending" | "approved" | "rejected" | "sent_back" = "all"

  // Performance optimization
  private resizeSubject = new Subject<void>()
  private isGridReady = false
  private pendingResize = false

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
  totalRecords = 0
  pendingCount = 0
  approvedCount = 0
  rejectedCount = 0
  sentBackCount = 0

  // Add month and year options:
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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private dbCallingService: DbCallingService,
    private cdr: ChangeDetectorRef,
  ) {
    // Debounce resize operations for performance
    this.resizeSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.performColumnResize()
    })
  }

  ngOnInit(): void {
    console.log("🚀 Verification Component Initialized")
    this.initYears()
    this.initVerifierInfo()
    this.initForms()
    this.setupColumnDefs()
    this.loadVerificationData()
    this.setupGlobalActions()
  }

  ngOnDestroy(): void {
    this.resizeSubject.complete()
  }

  initVerifierInfo(): void {
    // Get verifier information from session storage
    const userId = Number(sessionStorage.getItem("UserId")) || 1
    const userName = sessionStorage.getItem("UserName") || "Verifier"
    const userDesignation = sessionStorage.getItem("UserDesignation") || "Senior Officer"
    const userDepartment = sessionStorage.getItem("UserDepartment") || "Waste Management"

    this.verifierInfo = {
      id: userId,
      name: userName,
      designation: userDesignation,
      department: userDepartment,
    }

    console.log("👤 Verifier Info:", this.verifierInfo)
  }

  initForms(): void {
    // Verification form for individual records
    this.verificationForm = this.fb.group({
      action: ["", Validators.required],
      remark: [""],
      verificationDate: [new Date().toISOString().split("T")[0], Validators.required],
    })

    // Bulk action form
    this.bulkActionForm = this.fb.group({
      bulkAction: ["", Validators.required],
      bulkRemark: [""],
    })

    // Date filter form - start with current year as default
    const currentDate = new Date()
    this.dateFilterForm = this.fb.group({
      filterType: ["year"], // Default to current year instead of "all"
      selectedMonth: [currentDate.getMonth() + 1],
      selectedYear: [currentDate.getFullYear()],
      customFromDate: [""],
      customToDate: [""],
    })
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
        headerName: "Actions",
        field: "actions",
        minWidth: 200,
        maxWidth: 250,
        pinned: "left",
        cellRenderer: (params: ICellRendererParams) => {
          const data = params.data as VerificationData
          const isProcessed = data.billingStatus && data.billingStatus > 1

          if (isProcessed) {
            return `<span class="action-status ${this.getStatusClass(data.billingStatus)}">${this.getBillingStatusText(data.billingStatus)}</span>`
          }

          return `
            <div class="action-buttons">
              <button class="btn-action approve" onclick="window.approveRecord('${data.slipSrNo}')" title="Approve">
                <i class="fas fa-check"></i>
              </button>
              <button class="btn-action reject" onclick="window.rejectRecord('${data.slipSrNo}')" title="Reject">
                <i class="fas fa-times"></i>
              </button>
              <button class="btn-action send-back" onclick="window.sendBackRecord('${data.slipSrNo}')" title="Send Back">
                <i class="fas fa-undo"></i>
              </button>
              <button class="btn-action view" onclick="window.viewRecord('${data.slipSrNo}')" title="View Details">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          `
        },
        suppressSizeToFit: true,
      },
      {
        headerName: "Status",
        field: "billingStatus",
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.data?.billingStatus || 0
          const statusClass = this.getStatusClass(status)
          const statusText = this.getBillingStatusText(status)
          return `<span class="${statusClass}">${statusText}</span>`
        },
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
        headerName: "Location",
        field: "weighbridge",
        minWidth: 120,
        maxWidth: 150,
      },
      {
        headerName: "Remark",
        field: "remark",
        minWidth: 150,
        maxWidth: 300,
      },
    ]
  }

  loadVerificationData(): void {
    console.log("📊 Loading ALL verification data...")
    this.isLoading = true

    // Get route parameters but don't restrict by date
    this.route.queryParams.subscribe((params) => {
      console.log("🔗 Route params received:", params)

      this.routeParams = {
        slipNos: params["slipNos"] || "",
        fromDate: params["fromDate"] || "",
        toDate: params["toDate"] || "",
        source: params["source"] || "",
      }

      // Load all pending verification records
      this.loadAllPendingRecords()
    })
  }

  async loadAllPendingRecords(): Promise<void> {
    console.log("📋 Loading verification records with proper date filtering...")

    // Determine the appropriate date range
    const dateRange = this.getDateRangeForLoading()

    const obj = {
      UserId: this.verifierInfo.id,
      Zone: null,
      Parentcode: null,
      Workcode: null,
      FromDate: dateRange.fromDate,
      ToDate: dateRange.toDate,
    }

    console.log("📤 API Call - getBillableSearchData with date range:", obj)

    this.dbCallingService.getBillableSearchData(obj).subscribe({
      next: (response: any) => {
        console.log("📥 Records Response:", response)
        this.processAllRecordsResponse(response)
      },
      error: (error: any) => {
        console.error("❌ Records Error:", error)
        this.handleNoData()
      },
    })
  }

  private getDateRangeForLoading(): { fromDate: string; toDate: string } {
    // If we have route parameters with dates, use those
    if (this.routeParams.fromDate && this.routeParams.toDate) {
      console.log("🎯 Using route parameter dates:", this.routeParams.fromDate, "to", this.routeParams.toDate)
      return {
        fromDate: this.routeParams.fromDate,
        toDate: this.routeParams.toDate,
      }
    }

    // Check current date filter settings
    const filterValues = this.dateFilterForm.value
    if (filterValues.filterType !== "all") {
      return this.getDateRangeFromFilter(filterValues)
    }

    // Default: Load current year data
    const currentYear = new Date().getFullYear()
    const fromDate = `${currentYear}-01-01`
    const toDate = `${currentYear}-12-31`

    console.log("📅 Using default current year range:", fromDate, "to", toDate)
    return { fromDate, toDate }
  }

  private getDateRangeFromFilter(filterValues: any): { fromDate: string; toDate: string } {
    switch (filterValues.filterType) {
      case "month":
        const monthStart = new Date(filterValues.selectedYear, filterValues.selectedMonth - 1, 1)
        const monthEnd = new Date(filterValues.selectedYear, filterValues.selectedMonth, 0)
        return {
          fromDate: this.formatDateForInput(monthStart),
          toDate: this.formatDateForInput(monthEnd),
        }
      case "year":
        return {
          fromDate: `${filterValues.selectedYear}-01-01`,
          toDate: `${filterValues.selectedYear}-12-31`,
        }
      case "dateRange":
        return {
          fromDate: filterValues.customFromDate,
          toDate: filterValues.customToDate,
        }
      default:
        // Default to current year
        const currentYear = new Date().getFullYear()
        return {
          fromDate: `${currentYear}-01-01`,
          toDate: `${currentYear}-12-31`,
        }
    }
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0]
  }

  processAllRecordsResponse(response: any): void {
    console.log("🔄 Processing all records response:", response)

    let data: VerificationData[] = []
    let serviceResponse = 0

    // Handle different response formats
    if (response?.data && Array.isArray(response.data)) {
      data = response.data
      serviceResponse = response.serviceResponse || 1
    } else if (response?.Data && Array.isArray(response.Data)) {
      data = response.Data
      serviceResponse = response.ServiceResponse || 1
    } else if (Array.isArray(response)) {
      data = response
      serviceResponse = 1
    } else {
      console.log("❌ Unknown response format")
      this.handleNoData()
      return
    }

    console.log("📊 Total records from API:", data.length)

    if (serviceResponse > 0 && data.length > 0) {
      // Filter for records that need verification (status 1) or are already in verification process
      let verificationRecords = data.filter((item) => {
        // Include records with status 1 (sent for verification), 2 (verified), 3 (approved), -2 (rejected), 4 (sent back)
        return (
          item.billingStatus === 1 ||
          item.billingStatus === 2 ||
          item.billingStatus === 3 ||
          item.billingStatus === -2 ||
          item.billingStatus === 4
        )
      })

      console.log("📋 Records needing verification:", verificationRecords.length)

      // If we have specific slip numbers from route params, filter by those
      if (this.routeParams.slipNos) {
        const slipArray = this.routeParams.slipNos.split(",").map((s) => s.trim())
        const specificRecords = verificationRecords.filter((item) => slipArray.includes(item.slipSrNo))

        if (specificRecords.length > 0) {
          verificationRecords = specificRecords
          console.log("🎯 Filtered to specific slip numbers:", specificRecords.length)
        }
      }

      if (verificationRecords.length > 0) {
        console.log("✅ Setting verification data:", verificationRecords.length, "records")
        this.verificationData = verificationRecords
        this.filteredData = [...this.verificationData]
        this.calculateSummary()
        this.scheduleColumnResize()
      } else {
        console.log("⚠️ No verification records found")
        this.handleNoData()
      }
    } else {
      console.log("❌ No data or service response failed")
      this.handleNoData()
    }

    this.isLoading = false
    this.cdr.detectChanges()
  }

  handleNoData(): void {
    console.log("📭 No verification data found")
    this.resetData()

    setTimeout(() => {
      if (this.verificationData.length === 0) {
        Swal.fire({
          title: "No Verification Data",
          text: "No records found that require verification. All records may already be processed.",
          icon: "info",
          confirmButtonText: "Go Back to Billing Report",
        }).then((result) => {
          if (result.isConfirmed) {
            this.navigateBack()
          }
        })
      }
    }, 1000)
  }

  getCurrentMonthStart(): string {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return start.toISOString().split("T")[0]
  }

  getCurrentMonthEnd(): string {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return end.toISOString().split("T")[0]
  }

  // Action methods exposed to window for button clicks
  setupGlobalActions(): void {
    ;(window as any).approveRecord = (slipSrNo: string) => this.approveRecord(slipSrNo)
    ;(window as any).rejectRecord = (slipSrNo: string) => this.rejectRecord(slipSrNo)
    ;(window as any).sendBackRecord = (slipSrNo: string) => this.sendBackRecord(slipSrNo)
    ;(window as any).viewRecord = (slipSrNo: string) => this.viewRecord(slipSrNo)
  }

  approveRecord(slipSrNo: string): void {
    const record = this.verificationData.find((r) => r.slipSrNo === slipSrNo)
    if (!record) return

    Swal.fire({
      title: "Approve Record",
      text: `Are you sure you want to approve record ${slipSrNo}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Approve",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        this.performVerificationAction(slipSrNo, "3", "Approved by verifier")
      }
    })
  }

  rejectRecord(slipSrNo: string): void {
    const record = this.verificationData.find((r) => r.slipSrNo === slipSrNo)
    if (!record) return

    Swal.fire({
      title: "Reject Record",
      input: "textarea",
      inputLabel: "Rejection Reason",
      inputPlaceholder: "Please provide reason for rejection...",
      inputValidator: (value) => {
        if (!value) {
          return "Rejection reason is required!"
        }
        return null
      },
      showCancelButton: true,
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        this.performVerificationAction(slipSrNo, "-2", result.value)
      }
    })
  }

  sendBackRecord(slipSrNo: string): void {
    const record = this.verificationData.find((r) => r.slipSrNo === slipSrNo)
    if (!record) return

    Swal.fire({
      title: "Send Back for Corrections",
      input: "textarea",
      inputLabel: "Correction Instructions",
      inputPlaceholder: "Please provide instructions for corrections...",
      inputValidator: (value) => {
        if (!value) {
          return "Correction instructions are required!"
        }
        return null
      },
      showCancelButton: true,
      confirmButtonText: "Send Back",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        this.performVerificationAction(slipSrNo, "4", result.value)
      }
    })
  }

  viewRecord(slipSrNo: string): void {
    const record = this.verificationData.find((r) => r.slipSrNo === slipSrNo)
    if (!record) return

    this.selectedRecord = record
    this.showVerificationPanel = true
  }

  performVerificationAction(slipSrNo: string, status: string, remark: string): void {
    this.isLoading = true

    const obj = {
      UserId: this.verifierInfo.id,
      SlipSrNoNew: slipSrNo,
      BillingStatus: Number.parseInt(status),
      Remark: remark || "",
    }

    console.log("🔄 Performing verification action:", obj)

    // Use the appropriate service method based on status
    const serviceCall =
      status === "3" ? this.dbCallingService.sendToVerifyBillingData(obj) : this.dbCallingService.rejectBillingData(obj)

    serviceCall.subscribe({
      next: (response: any) => {
        this.isLoading = false
        console.log("✅ Verification action response:", response)

        if (response.ServiceResponse === 1) {
          // Update local data
          const recordIndex = this.verificationData.findIndex((r) => r.slipSrNo === slipSrNo)
          if (recordIndex !== -1) {
            this.verificationData[recordIndex].billingStatus = Number.parseInt(status)
            this.verificationData[recordIndex].billingRemark = remark
            this.verificationData[recordIndex].verifiedBy = this.verifierInfo.name
            this.verificationData[recordIndex].verifiedDate = new Date().toISOString()
          }

          // Update filtered data
          const filteredIndex = this.filteredData.findIndex((r) => r.slipSrNo === slipSrNo)
          if (filteredIndex !== -1) {
            this.filteredData[filteredIndex].billingStatus = Number.parseInt(status)
            this.filteredData[filteredIndex].billingRemark = remark
            this.filteredData[filteredIndex].verifiedBy = this.verifierInfo.name
            this.filteredData[filteredIndex].verifiedDate = new Date().toISOString()
          }

          this.calculateSummary()
          this.gridApi?.refreshCells()

          Swal.fire({
            title: "Success!",
            text: response.msg || `Record ${slipSrNo} processed successfully!`,
            icon: "success",
            timer: 2000,
          })
        } else {
          Swal.fire({
            text: response.msg || `Failed to process record`,
            icon: "error",
          })
        }
      },
      error: (error: any) => {
        this.isLoading = false
        console.error("❌ Verification Error:", error)
        Swal.fire({
          text: `Failed to process record`,
          icon: "error",
        })
      },
    })
  }

  // Bulk actions
  performBulkAction(): void {
    if (!this.hasSelectedRows()) {
      Swal.fire({
        text: "Please select records to perform bulk action",
        icon: "warning",
      })
      return
    }

    const formValues = this.bulkActionForm.value
    const selectedRows = this.gridApi.getSelectedRows()
    const eligibleRows = selectedRows.filter((row: VerificationData) => row.billingStatus === 1)

    if (eligibleRows.length === 0) {
      Swal.fire({
        text: "Selected records are not eligible for verification",
        icon: "warning",
      })
      return
    }

    const actionText = this.getActionText(formValues.bulkAction)
    Swal.fire({
      title: `Confirm Bulk ${actionText}`,
      text: `${actionText} ${eligibleRows.length} selected records?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionText}`,
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        this.processBulkAction(eligibleRows, formValues.bulkAction, formValues.bulkRemark)
      }
    })
  }

  processBulkAction(records: VerificationData[], action: string, remark: string): void {
    this.isLoading = true
    const slipNos = records.map((r) => r.slipSrNo).join(",")

    const obj = {
      UserId: this.verifierInfo.id,
      SlipSrNoNew: slipNos,
      BillingStatus: Number.parseInt(action),
      Remark: remark || "",
    }

    console.log("🔄 Performing bulk action:", obj)

    // Use the appropriate service method based on action
    const serviceCall =
      action === "3" ? this.dbCallingService.sendToVerifyBillingData(obj) : this.dbCallingService.rejectBillingData(obj)

    serviceCall.subscribe({
      next: (response: any) => {
        this.isLoading = false
        console.log("✅ Bulk action response:", response)

        if (response.ServiceResponse === 1) {
          // Update local data for all processed records
          records.forEach((record) => {
            const recordIndex = this.verificationData.findIndex((r) => r.slipSrNo === record.slipSrNo)
            if (recordIndex !== -1) {
              this.verificationData[recordIndex].billingStatus = Number.parseInt(action)
              this.verificationData[recordIndex].billingRemark = remark
              this.verificationData[recordIndex].verifiedBy = this.verifierInfo.name
              this.verificationData[recordIndex].verifiedDate = new Date().toISOString()
            }

            const filteredIndex = this.filteredData.findIndex((r) => r.slipSrNo === record.slipSrNo)
            if (filteredIndex !== -1) {
              this.filteredData[filteredIndex].billingStatus = Number.parseInt(action)
              this.filteredData[filteredIndex].billingRemark = remark
              this.filteredData[filteredIndex].verifiedBy = this.verifierInfo.name
              this.filteredData[filteredIndex].verifiedDate = new Date().toISOString()
            }
          })

          this.calculateSummary()
          this.gridApi?.refreshCells()
          this.clearGridSelection()

          Swal.fire({
            title: "Success!",
            text: response.msg || `${records.length} records processed successfully!`,
            icon: "success",
          })
        } else {
          Swal.fire({
            text: response.msg || "Failed to process bulk action",
            icon: "error",
          })
        }
      },
      error: (error: any) => {
        this.isLoading = false
        console.error("❌ Bulk Action Error:", error)
        Swal.fire({
          text: "Failed to process bulk action",
          icon: "error",
        })
      },
    })
  }

  // Filter methods
  filterByStatus(status: "all" | "pending" | "approved" | "rejected" | "sent_back"): void {
    this.currentStatusFilter = status

    if (status === "all") {
      this.filteredData = [...this.verificationData]
    } else {
      let statusValue: number
      switch (status) {
        case "pending":
          statusValue = 1
          break
        case "approved":
          statusValue = 3
          break
        case "rejected":
          statusValue = -2
          break
        case "sent_back":
          statusValue = 4
          break
        default:
          statusValue = 1
      }

      this.filteredData = this.verificationData.filter((item) => item.billingStatus === statusValue)
    }

    this.calculateSummary()
    this.clearGridSelection()
    this.scheduleColumnResize()
  }

  applyDateFilter(): void {
    const filterValues = this.dateFilterForm.value
    console.log("🔄 Applying date filter:", filterValues)

    // For 'all' filter type, just show existing data
    if (filterValues.filterType === "all") {
      this.filteredData = [...this.verificationData]
      this.calculateSummary()
      this.clearGridSelection()
      this.scheduleColumnResize()
      return
    }

    // For specific date filters, reload data from API
    this.isLoading = true
    const dateRange = this.getDateRangeFromFilter(filterValues)

    const obj = {
      UserId: this.verifierInfo.id,
      Zone: null,
      Parentcode: null,
      Workcode: null,
      FromDate: dateRange.fromDate,
      ToDate: dateRange.toDate,
    }

    console.log("📤 API Call for date filter:", obj)

    this.dbCallingService.getBillableSearchData(obj).subscribe({
      next: (response: any) => {
        console.log("📥 Filtered Records Response:", response)
        this.processFilteredRecordsResponse(response)
      },
      error: (error: any) => {
        console.error("❌ Filtered Records Error:", error)
        this.isLoading = false
        this.cdr.detectChanges()
        Swal.fire({
          text: "Failed to load filtered data",
          icon: "error",
        })
      },
    })
  }

  private processFilteredRecordsResponse(response: any): void {
    let data: VerificationData[] = []
    let serviceResponse = 0

    // Handle different response formats
    if (response?.data && Array.isArray(response.data)) {
      data = response.data
      serviceResponse = response.serviceResponse || 1
    } else if (response?.Data && Array.isArray(response.Data)) {
      data = response.Data
      serviceResponse = response.ServiceResponse || 1
    } else if (Array.isArray(response)) {
      data = response
      serviceResponse = 1
    }

    if (serviceResponse > 0 && data.length > 0) {
      // Filter for records that need verification
      const verificationRecords = data.filter((item) => {
        return (
          item.billingStatus === 1 ||
          item.billingStatus === 2 ||
          item.billingStatus === 3 ||
          item.billingStatus === -2 ||
          item.billingStatus === 4
        )
      })

      console.log("📋 Filtered verification records:", verificationRecords.length)

      // Update both main data and filtered data
      this.verificationData = verificationRecords
      this.filteredData = [...verificationRecords]

      // Apply current status filter if any
      if (this.currentStatusFilter !== "all") {
        this.filterByStatus(this.currentStatusFilter)
      }

      this.calculateSummary()
      this.scheduleColumnResize()
    } else {
      // No data found for the selected filter
      this.verificationData = []
      this.filteredData = []
      this.calculateSummary()
    }

    this.isLoading = false
    this.cdr.detectChanges()
  }

  filterByMonth(month: number, year: number): void {
    this.filteredData = this.verificationData.filter((item) => {
      const itemDate = new Date(item.trans_Date)
      return itemDate.getMonth() + 1 === month && itemDate.getFullYear() === year
    })
  }

  filterByYear(year: number): void {
    this.filteredData = this.verificationData.filter((item) => {
      const itemDate = new Date(item.trans_Date)
      return itemDate.getFullYear() === year
    })
  }

  filterByDateRange(fromDate: string, toDate: string): void {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    this.filteredData = this.verificationData.filter((item) => {
      const itemDate = new Date(item.trans_Date)
      return itemDate >= from && itemDate <= to
    })
  }

  // Utility methods
  getActionText(action: string): string {
    switch (action) {
      case "3":
        return "Approved"
      case "-2":
        return "Rejected"
      case "4":
        return "Sent Back"
      case "1":
        return "Pending"
      default:
        return "Unknown"
    }
  }

  getBillingStatusText(status: number): string {
    switch (status) {
      case 1:
        return "Sent for Verification"
      case 2:
        return "Verified"
      case 3:
        return "Approved"
      case -2:
        return "Rejected"
      case 4:
        return "Sent Back"
      default:
        return "Pending"
    }
  }

  getStatusClass(status: number): string {
    switch (status) {
      case 1:
        return "status-pending"
      case 2:
        return "status-verified"
      case 3:
        return "status-approved"
      case -2:
        return "status-rejected"
      case 4:
        return "status-sent_back"
      default:
        return "status-pending"
    }
  }

  getCurrentDateString(): string {
    return new Date().toLocaleDateString()
  }

  calculateSummary(): void {
    const dataToCalculate = this.filteredData.length > 0 ? this.filteredData : this.verificationData
    this.totalRecords = dataToCalculate.length
    this.pendingCount = dataToCalculate.filter((item) => item.billingStatus === 1).length
    this.approvedCount = dataToCalculate.filter((item) => item.billingStatus === 3).length
    this.rejectedCount = dataToCalculate.filter((item) => item.billingStatus === -2).length
    this.sentBackCount = dataToCalculate.filter((item) => item.billingStatus === 4).length
  }

  resetData(): void {
    this.verificationData = []
    this.filteredData = []
    this.totalRecords = 0
    this.pendingCount = 0
    this.approvedCount = 0
    this.rejectedCount = 0
    this.sentBackCount = 0
  }

  // Grid methods
  onGridReady(params: any): void {
    this.gridApi = params.api
    this.isGridReady = true
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

  clearGridSelection(): void {
    if (this.gridApi && this.isGridReady) {
      this.gridApi.deselectAll()
    }
  }

  // Column sizing methods
  private scheduleColumnResize(): void {
    if (!this.pendingResize) {
      this.pendingResize = true
      this.resizeSubject.next()
    }
  }

  private performColumnResize(): void {
    if (this.gridApi && this.isGridReady) {
      try {
        this.gridApi.sizeColumnsToFit()
        this.pendingResize = false
      } catch (error) {
        console.warn("Column resize error:", error)
        this.pendingResize = false
      }
    }
  }

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
    setTimeout(() => {
      this.scheduleColumnResize()
    }, 200)
  }

  // Export and print methods
  exportToExcel(): void {
    const dataToExport = this.filteredData.length > 0 ? this.filteredData : this.verificationData
    if (!dataToExport || dataToExport.length === 0) {
      Swal.fire({
        text: "No data to export",
        icon: "warning",
      })
      return
    }

    const exportData = dataToExport.map((item) => ({
      "Slip No": item.slipSrNo,
      "DC No": item.dC_No,
      "Trans Date": item.trans_Date,
      Agency: item.agency_Name,
      "Vehicle No": item.vehicle_No,
      Ward: item.ward,
      "Gross Weight (Kg)": Number(item.gross_Weight),
      "Net Weight (Kg)": Number(item.act_Net_Weight),
      Location: item.weighbridge,
      Status: this.getBillingStatusText(item.billingStatus),
      Remark: item.billingRemark || item.remark,
      "Verified By": this.verifierInfo.name,
      "Verification Date": this.getCurrentDateString(),
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Verification Report")
    const fileName = `Verification_Report_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  printReport(): void {
    window.print()
  }

  // Navigation methods
  navigateBack(): void {
    this.router.navigateByUrl("/billing-report")
  }

  closeVerificationPanel(): void {
    this.showVerificationPanel = false
    this.selectedRecord = null
  }

  // Get current route info for display
  getRouteInfo(): string {
    if (this.routeParams.source === "billing-report") {
      return `Showing specific records sent from Billing Report (${this.verificationData.length} total verification records loaded)`
    } else if (this.routeParams.source === "billing-report-view") {
      return `Showing all verification records (${this.verificationData.length} total records loaded)`
    } else {
      return `Showing all pending verification records (${this.verificationData.length} total records loaded)`
    }
  }

  initYears(): void {
    const currentYear = new Date().getFullYear()
    for (let year = currentYear; year >= currentYear - 10; year--) {
      this.years.push(year)
    }
  }

  // Add method to display current filter text
  getFilterDisplayText(): string {
    const filterValues = this.dateFilterForm.value

    switch (filterValues.filterType) {
      case "month":
        const monthName = this.months.find((m) => m.value === filterValues.selectedMonth)?.name
        return `${monthName} ${filterValues.selectedYear}`
      case "year":
        return `Year ${filterValues.selectedYear}`
      case "dateRange":
        return `${filterValues.customFromDate} to ${filterValues.customToDate}`
      default:
        return "All Records"
    }
  }
}
