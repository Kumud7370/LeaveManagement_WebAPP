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
  verificationAction?: "pending" | "approved" | "rejected" | "sent_back"
}

interface VerificationRequest {
  UserId: number
  VerifierId: number
  SlipSrNo: string
  Action: "approve" | "reject" | "send_back"
  Remark: string
  VerificationDate: string
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

  // Data
  verificationData: VerificationData[] = []
  filteredData: VerificationData[] = []
  selectedRowsCount = 0

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
    this.initVerifierInfo()
    this.initForms()
    this.setupColumnDefs()
    this.loadVerificationData()
  }

  ngOnDestroy(): void {
    this.resizeSubject.complete()
  }

  initVerifierInfo(): void {
    // Get verifier information from session storage or user service
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
          const isProcessed = data.verificationAction && data.verificationAction !== "pending"

          if (isProcessed) {
            return `<span class="action-status ${data.verificationAction}">${this.getActionText(data.verificationAction!)}</span>`
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
        field: "verificationAction",
        minWidth: 120,
        maxWidth: 150,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.data?.verificationAction || "pending"
          const statusClass = `status-${status}`
          const statusText = this.getActionText(status)

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
    this.isLoading = true

    // Get data from route parameters or load from API
    this.route.queryParams.subscribe((params) => {
      const fromDate = params["fromDate"]
      const toDate = params["toDate"]
      const slipNos = params["slipNos"]

      if (slipNos) {
        this.loadSpecificRecords(slipNos, fromDate, toDate)
      } else {
        this.loadPendingVerifications()
      }
    })
  }

  loadSpecificRecords(slipNos: string, fromDate: string, toDate: string): void {
    const obj = {
      UserId: this.verifierInfo.id,
      SlipSrNos: slipNos,
      FromDate: fromDate,
      ToDate: toDate,
      Status: 1, // Sent for verification
    }

    this.dbCallingService.getVerificationData(obj).subscribe({
      next: (response: any) => {
        console.log("Verification Data Response:", response)
        this.processVerificationResponse(response)
      },
      error: (error: any) => {
        console.error("Verification Data Error:", error)
        this.handleLoadError()
      },
    })
  }

  loadPendingVerifications(): void {
    const obj = {
      UserId: this.verifierInfo.id,
      Status: 1, // Pending verification
    }

    this.dbCallingService.getPendingVerifications(obj).subscribe({
      next: (response: any) => {
        console.log("Pending Verifications Response:", response)
        this.processVerificationResponse(response)
      },
      error: (error: any) => {
        console.error("Pending Verifications Error:", error)
        this.handleLoadError()
      },
    })
  }

  processVerificationResponse(response: any): void {
    let data: VerificationData[] = []
    let serviceResponse = 0

    if (response?.data && Array.isArray(response.data)) {
      data = response.data
      serviceResponse = response.serviceResponse || 1
    } else if (response?.Data && Array.isArray(response.Data)) {
      data = response.Data
      serviceResponse = response.ServiceResponse || 1
    }

    if (serviceResponse > 0 && data.length > 0) {
      // Add verification status to each record
      this.verificationData = data.map((item) => ({
        ...item,
        verificationAction: item.verificationAction || "pending",
      }))
      this.filteredData = [...this.verificationData]
      this.calculateSummary()
      this.scheduleColumnResize()
    } else {
      this.resetData()
    }

    this.isLoading = false
    this.cdr.detectChanges()
  }

  handleLoadError(): void {
    this.resetData()
    this.isLoading = false
    this.cdr.detectChanges()
    Swal.fire({
      text: "Failed to load verification data",
      icon: "error",
    })
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
        this.performVerificationAction(slipSrNo, "approve", "Approved by verifier")
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
        this.performVerificationAction(slipSrNo, "reject", result.value)
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
        this.performVerificationAction(slipSrNo, "send_back", result.value)
      }
    })
  }

  viewRecord(slipSrNo: string): void {
    const record = this.verificationData.find((r) => r.slipSrNo === slipSrNo)
    if (!record) return

    this.selectedRecord = record
    this.showVerificationPanel = true
  }

  performVerificationAction(slipSrNo: string, action: "approve" | "reject" | "send_back", remark: string): void {
    this.isLoading = true

    const obj: VerificationRequest = {
      UserId: Number(sessionStorage.getItem("UserId")) || 1,
      VerifierId: this.verifierInfo.id,
      SlipSrNo: slipSrNo,
      Action: action,
      Remark: remark || "",
      VerificationDate: new Date().toISOString(),
    }

    this.dbCallingService.performVerificationAction(obj).subscribe({
      next: (response: VerificationResponse) => {
        this.isLoading = false
        if (response.ServiceResponse === 1) {
          // Map action to verification status
          let verificationAction: "pending" | "approved" | "rejected" | "sent_back"
          switch (action) {
            case "approve":
              verificationAction = "approved"
              break
            case "reject":
              verificationAction = "rejected"
              break
            case "send_back":
              verificationAction = "sent_back"
              break
            default:
              verificationAction = "pending"
          }

          // Update local data
          const recordIndex = this.verificationData.findIndex((r) => r.slipSrNo === slipSrNo)
          if (recordIndex !== -1) {
            this.verificationData[recordIndex].verificationAction = verificationAction
            this.verificationData[recordIndex].billingRemark = remark
          }

          // Update filtered data
          const filteredIndex = this.filteredData.findIndex((r) => r.slipSrNo === slipSrNo)
          if (filteredIndex !== -1) {
            this.filteredData[filteredIndex].verificationAction = verificationAction
            this.filteredData[filteredIndex].billingRemark = remark
          }

          this.calculateSummary()
          this.gridApi?.refreshCells()

          Swal.fire({
            title: "Success!",
            text: response.msg || `Record ${slipSrNo} ${verificationAction} successfully!`,
            icon: "success",
            timer: 2000,
          })
        } else {
          Swal.fire({
            text: response.msg || `Failed to ${action} record`,
            icon: "error",
          })
        }
      },
      error: (error: any) => {
        this.isLoading = false
        console.error(`${action} Error:`, error)
        Swal.fire({
          text: `Failed to ${action} record`,
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
    const eligibleRows = selectedRows.filter(
      (row: VerificationData) => !row.verificationAction || row.verificationAction === "pending",
    )

    if (eligibleRows.length === 0) {
      Swal.fire({
        text: "Selected records are already processed",
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
      UserId: Number(sessionStorage.getItem("UserId")) || 1,
      VerifierId: this.verifierInfo.id,
      SlipSrNos: slipNos,
      Action: action,
      Remark: remark || "",
      VerificationDate: new Date().toISOString(),
    }

    this.dbCallingService.performBulkVerificationAction(obj).subscribe({
      next: (response: VerificationResponse) => {
        this.isLoading = false
        if (response.ServiceResponse === 1) {
          // Map action to verification status
          let verificationAction: "pending" | "approved" | "rejected" | "sent_back"
          switch (action) {
            case "approve":
              verificationAction = "approved"
              break
            case "reject":
              verificationAction = "rejected"
              break
            case "send_back":
              verificationAction = "sent_back"
              break
            default:
              verificationAction = "pending"
          }

          // Update local data
          records.forEach((record) => {
            const recordIndex = this.verificationData.findIndex((r) => r.slipSrNo === record.slipSrNo)
            if (recordIndex !== -1) {
              this.verificationData[recordIndex].verificationAction = verificationAction
              this.verificationData[recordIndex].billingRemark = remark
            }

            const filteredIndex = this.filteredData.findIndex((r) => r.slipSrNo === record.slipSrNo)
            if (filteredIndex !== -1) {
              this.filteredData[filteredIndex].verificationAction = verificationAction
              this.filteredData[filteredIndex].billingRemark = remark
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
        console.error("Bulk Action Error:", error)
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
      this.filteredData = this.verificationData.filter((item) => item.verificationAction === status)
    }

    this.calculateSummary()
    this.clearGridSelection()
    this.scheduleColumnResize()
  }

  // Utility methods
  getActionText(action: string): string {
    switch (action) {
      case "approve":
        return "Approved"
      case "reject":
        return "Rejected"
      case "send_back":
        return "Sent Back"
      case "pending":
        return "Pending"
      default:
        return "Unknown"
    }
  }

  getCurrentDateString(): string {
    return new Date().toLocaleDateString()
  }

  calculateSummary(): void {
    const dataToCalculate = this.filteredData.length > 0 ? this.filteredData : this.verificationData

    this.totalRecords = dataToCalculate.length
    this.pendingCount = dataToCalculate.filter(
      (item) => !item.verificationAction || item.verificationAction === "pending",
    ).length
    this.approvedCount = dataToCalculate.filter((item) => item.verificationAction === "approved").length
    this.rejectedCount = dataToCalculate.filter((item) => item.verificationAction === "rejected").length
    this.sentBackCount = dataToCalculate.filter((item) => item.verificationAction === "sent_back").length
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
    this.setupGlobalActions()

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
      Status: this.getActionText(item.verificationAction || "pending"),
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
}
