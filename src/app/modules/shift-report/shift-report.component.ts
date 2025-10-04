import { Component, OnInit, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { ICellRendererParams } from "ag-grid-community"
import { AgGridModule, AgGridAngular } from "ag-grid-angular"
import * as XLSX from "xlsx"
import { DbCallingService } from "src/app/core/services/db-calling.service"

@Component({
  selector: "app-shift-report",
  templateUrl: "./shift-report.component.html",
  styleUrls: ["./shift-report.component.scss"],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AgGridModule],
})
export class ShiftReportComponent implements OnInit {
  @ViewChild("reportContainer") reportContainer!: ElementRef
  @ViewChild("agGrid") agGrid!: AgGridAngular

  // UI state
  isLoading = false
  showReport = true
  isFiltersOpen = false

  // Form
  reportForm!: FormGroup

  // Data
  weighBridgeOptions = [
    { id: "all", name: "All" },
    { id: "WBK1", name: "Kanjur" },
    { id: "WBD1", name: "Deonar" },
  ]

  // Raw data from API
  shiftData: any[] = []
  flattenedData: any[] = []
  uniqueWards: string[] = []
  uniqueShifts: string[] = ["Shift I", "Shift II", "Shift III"]

  // AG Grid configuration
  lstReportData: any[] = []
  columnDefs: any[] = []
  defaultColDef = {
    resizable: true,
    flex: 1,
    sortable: true,
    filter: true,
  }

  // Summary metrics
  totalVehicles = 0
  totalWeight = 0
  topWard = ""
  topShift = ""
  userId = 0;
  userSiteName = "";
  lstSiteNames: any[] = [];
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dbCallingService: DbCallingService,
  ) {

    this.userId = Number(sessionStorage.getItem("UserId")) || 0
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";
    let obj = {
      UserId: Number(this.userId),
      SiteName: this.userSiteName,
    }
    console.log("Loading initial data with params:", obj);
    this.dbCallingService.GetSiteLocations(obj).subscribe({
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
    this.setupColumnDefs()
    // Load initial data automatically
    this.loadInitialData()
  }

  // Load initial data automatically with current month
  loadInitialData() {
    const currentDate = new Date()
    const lastMonth = new Date(currentDate)
    lastMonth.setMonth(currentDate.getMonth() - 1)

    this.isLoading = true
    const weighBridge = "ALLWB"
    const fromDate = this.formatDateForInput(lastMonth)
    const toDate = this.formatDateForInput(currentDate)

    const payload = {
      WeighBridge: weighBridge,
      FromDate: fromDate,
      ToDate: toDate,
      FullDate: "",
      WardName: "",
      Act_Shift: "",
      TransactionDate: fromDate,
    }

    console.log("Loading initial data with payload:", payload)

    this.dbCallingService.getShiftwiseReport(payload).subscribe({
      next: (response) => {
        console.log("Initial API Response:", response)

        // Check for success - your API returns serviceResponse: 1 for success
        if (
          response &&
          (response.serviceResponse === 1 || response.ServiceResponse === "Successful") &&
          response.wardData?.length
        ) {
          console.log("Processing initial ward data:", response.wardData)

          // Assign the data to shiftData for processing
          this.shiftData = response.wardData
          this.processDataForGrid()
          this.calculateSummaryFromProcessedData()

          console.log("Initial processed data:", this.lstReportData)
        } else {
          console.log("No initial data found")
          this.resetData()
        }
        this.isLoading = false
      },
      error: (error) => {
        console.error("Initial API Error:", error)
        this.resetData()
        this.isLoading = false
      },
    })
  }

  initForm() {
    const currentDate = new Date()
    const lastMonth = new Date(currentDate)
    lastMonth.setMonth(currentDate.getMonth() - 1)

    this.reportForm = this.fb.group({
      weighBridge: ["all", Validators.required],
      fromDate: [this.formatDateForInput(lastMonth), Validators.required],
      toDate: [this.formatDateForInput(currentDate), Validators.required],
    })
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0]
  }

  setupColumnDefs() {
    // Initialize with basic ward name column
    this.columnDefs = [
      {
        headerName: "Ward Name",
        field: "WardName",
        pinned: "left",
        width: 150,
        flex: 0,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.data?.WardName === "Total") {
            return `<strong style="color: #1a2a6c; background-color: rgba(26, 42, 108, 0.05);">${params.value}</strong>`
          }
          return `<strong>${params.value}</strong>`
        },
      },
    ]
  }

  // Toggle filters offcanvas
  toggleFilters() {
    this.isFiltersOpen = !this.isFiltersOpen
  }

  // Close filters offcanvas
  closeFilters() {
    this.isFiltersOpen = false
  }

  onSubmit() {
    if (this.reportForm.invalid) {
      return
    }

    this.isLoading = true
    this.closeFilters() // Close filters panel after submission

    const formValues = this.reportForm.value
    const weighBridge = formValues.weighBridge
    const fromDate = formValues.fromDate
    const toDate = formValues.toDate

    const payload = {
      WeighBridge: weighBridge,
      FromDate: fromDate,
      ToDate: toDate,
      FullDate: "",
      WardName: "",
      Act_Shift: "",
      TransactionDate: fromDate,
    }

    console.log("Submitting with payload:", payload)

    this.dbCallingService.getShiftwiseReport(payload).subscribe({
      next: (response) => {
        console.log("API Response:", response)

        // Check for success - your API returns serviceResponse: 1 for success
        if (
          response &&
          (response.serviceResponse === 1 || response.ServiceResponse === "Successful") &&
          response.wardData?.length
        ) {
          console.log("Processing ward data:", response.wardData)

          // Assign the data to shiftData for processing
          this.shiftData = response.wardData
          this.processDataForGrid()
          this.calculateSummaryFromProcessedData()

          console.log("Processed data:", this.lstReportData)
          alert("Data retrieved successfully!")
        } else {
          console.log("No data found or invalid response")
          alert(response?.msg || "No data found")
          this.resetData()
        }
        this.isLoading = false
      },
      error: (error) => {
        console.error("API Error:", error)
        alert("Failed to fetch data")
        this.resetData()
        this.isLoading = false
      },
    })
  }

  private handleApiResponse(response: any) {
    // Check for different possible response structures
    let dataArray: any[] = []

    if (response && response.ServiceResponse === "Successful") {
      // Try WardData first (based on your C# code)
      if (response.WardData && Array.isArray(response.WardData)) {
        dataArray = response.WardData
      }
      // Fallback to ShiftData if WardData doesn't exist
      else if (response.ShiftData && Array.isArray(response.ShiftData)) {
        dataArray = response.ShiftData
      }
    }

    if (dataArray && dataArray.length > 0) {
      console.log("Processing data array:", dataArray)
      this.shiftData = dataArray
      this.processDataForGrid()
      this.calculateSummaryFromProcessedData()
      alert("Data retrieved successfully!")
    } else {
      console.log("No data found in response")
      alert(response?.msg || "No data found for the selected criteria")
      this.resetData()
    }
  }

  private handleApiError() {
    alert("Failed to fetch data. Please try again.")
    this.resetData()
  }

  private resetData() {
    this.shiftData = []
    this.lstReportData = []
    this.flattenedData = []
    this.resetSummaryStatistics()
  }

  processDataForGrid() {
    if (!this.shiftData || this.shiftData.length === 0) {
      this.lstReportData = []
      this.flattenedData = []
      this.uniqueWards = []
      return
    }

    console.log("Processing data for grid:", this.shiftData)

    // Get unique ward names - FIXED: your API returns wardName, not Ward
    this.uniqueWards = Array.from(new Set(this.shiftData.map((d) => d.wardName))).filter(
      (ward) => ward && ward.trim() !== "",
    )

    console.log("Unique wards:", this.uniqueWards)

    // Get unique shifts from the actual data - FIXED: Use actual shift values from API
    this.uniqueShifts = Array.from(new Set(this.shiftData.map((d) => d.act_Shift))).filter(
      (shift) => shift && shift.trim() !== "",
    )

    console.log("Unique shifts:", this.uniqueShifts)

    // Create flattened data structure
    this.flattenedData = this.uniqueWards.map((wardName) => {
      const row: any = { WardName: wardName }
      let totalVehicleCount = 0
      let totalNetWeight = 0

      this.uniqueShifts.forEach((shift) => {
        // FIXED: Find data for this ward and shift using correct property names
        const shiftData = this.shiftData.filter((d) => {
          return d.wardName === wardName && d.act_Shift === shift
        })

        console.log(`Data for ${wardName} - ${shift}:`, shiftData)

        // FIXED: Use correct property names from API response
        const vehicleCount = shiftData.reduce((sum, item) => sum + (item.vehicleCount || 0), 0)
        const netWeight = shiftData.reduce((sum, item) => sum + (item.totalNetWeight || 0), 0)

        row[`${shift}_VehicleCount`] = vehicleCount
        row[`${shift}_TotalNetWeight`] = netWeight.toFixed(2)
        totalVehicleCount += vehicleCount
        totalNetWeight += netWeight
      })

      row["TotalVehicleCount"] = totalVehicleCount
      row["TotalNetWeight"] = totalNetWeight.toFixed(2)
      return row
    })

    // Add total row
    const totalRow: any = { WardName: "Total" }
    let grandTotalVehicles = 0
    let grandTotalWeight = 0

    this.uniqueShifts.forEach((shift) => {
      const shiftTotal = this.flattenedData.reduce(
        (sum, row) => {
          return {
            vehicles: sum.vehicles + (row[`${shift}_VehicleCount`] || 0),
            weight: sum.weight + Number.parseFloat(row[`${shift}_TotalNetWeight`] || 0),
          }
        },
        { vehicles: 0, weight: 0 },
      )

      totalRow[`${shift}_VehicleCount`] = shiftTotal.vehicles
      totalRow[`${shift}_TotalNetWeight`] = shiftTotal.weight.toFixed(2)
      grandTotalVehicles += shiftTotal.vehicles
      grandTotalWeight += shiftTotal.weight
    })

    totalRow["TotalVehicleCount"] = grandTotalVehicles
    totalRow["TotalNetWeight"] = grandTotalWeight.toFixed(2)
    this.flattenedData.push(totalRow)

    console.log("Flattened data:", this.flattenedData)

    this.setupDynamicColumns()
    this.lstReportData = [...this.flattenedData]

    console.log("Final lstReportData:", this.lstReportData)
  }

  setupDynamicColumns() {
    // Reset column definitions
    this.columnDefs = [
      {
        headerName: "Ward Name",
        field: "WardName",
        pinned: "left",
        width: 150,
        flex: 0,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.data?.WardName === "Total") {
            return `<strong style="color: #1a2a6c; background-color: rgba(26, 42, 108, 0.05);">${params.value}</strong>`
          }
          return `<strong>${params.value}</strong>`
        },
      },
    ]

    // Add shift columns
    this.uniqueShifts.forEach((shift) => {
      this.columnDefs.push({
        headerName: `${shift} - Vehicles`,
        field: `${shift}_VehicleCount`,
        width: 120,
        flex: 0,
        cellRenderer: (params: ICellRendererParams) => {
          const value = params.value || 0
          if (params.data?.WardName === "Total") {
            return `<span style="font-weight: bold; color: #1a2a6c;">${value}</span>`
          }
          return value
        },
      })

      this.columnDefs.push({
        headerName: `${shift} - Weight`,
        field: `${shift}_TotalNetWeight`,
        width: 120,
        flex: 0,
        cellRenderer: (params: ICellRendererParams) => {
          const value = params.value ? Number(params.value).toFixed(2) : "0.00"
          if (params.data?.WardName === "Total") {
            return `<span style="font-weight: bold; color: #1a2a6c;">${value}</span>`
          }
          return value
        },
      })
    })

    // Add total columns
    this.columnDefs.push({
      headerName: "Total Vehicles",
      field: "TotalVehicleCount",
      width: 130,
      flex: 0,
      cellRenderer: (params: ICellRendererParams) => {
        const value = params.value || 0
        if (params.data?.WardName === "Total") {
          return `<strong style="color: #1a2a6c; background-color: rgba(26, 42, 108, 0.05);">${value}</strong>`
        }
        return `<strong style="color: #1a2a6c;">${value}</strong>`
      },
    })

    this.columnDefs.push({
      headerName: "Total Weight",
      field: "TotalNetWeight",
      width: 130,
      flex: 0,
      cellRenderer: (params: ICellRendererParams) => {
        const value = params.value ? Number(params.value).toFixed(2) : "0.00"
        if (params.data?.WardName === "Total") {
          return `<strong style="color: #1a2a6c; background-color: rgba(26, 42, 108, 0.05);">${value}</strong>`
        }
        return `<strong style="color: #1a2a6c;">${value}</strong>`
      },
    })
  }

  calculateSummaryFromProcessedData() {
    if (!this.flattenedData || this.flattenedData.length === 0) {
      this.resetSummaryStatistics()
      return
    }

    // Calculate total vehicles and weight (excluding Total row)
    const dataWithoutTotal = this.flattenedData.filter((row) => row.WardName !== "Total")
    this.totalVehicles = dataWithoutTotal.reduce((sum, row) => sum + row.TotalVehicleCount, 0)
    this.totalWeight = dataWithoutTotal.reduce((sum, row) => sum + Number.parseFloat(row.TotalNetWeight), 0)

    // Find the ward with the highest weight
    if (dataWithoutTotal.length > 0) {
      const topWardRow = dataWithoutTotal.reduce((prev, current) =>
        Number.parseFloat(current.TotalNetWeight) > Number.parseFloat(prev.TotalNetWeight) ? current : prev,
      )
      this.topWard = topWardRow.WardName
    }

    // Find the shift with the highest weight
    const shiftTotals = new Map<string, number>()
    this.uniqueShifts.forEach((shift) => {
      const shiftTotal = dataWithoutTotal.reduce((sum, row) => {
        return sum + Number.parseFloat(row[`${shift}_TotalNetWeight`] || 0)
      }, 0)
      shiftTotals.set(shift, shiftTotal)
    })

    let maxWeight = 0
    shiftTotals.forEach((weight, shift) => {
      if (weight > maxWeight) {
        maxWeight = weight
        this.topShift = shift
      }
    })

    console.log("Summary calculated:", {
      totalVehicles: this.totalVehicles,
      totalWeight: this.totalWeight,
      topWard: this.topWard,
      topShift: this.topShift,
    })
  }

  resetSummaryStatistics() {
    this.totalVehicles = 0
    this.totalWeight = 0
    this.topWard = ""
    this.topShift = ""
    this.uniqueWards = []
  }

  exportToExcel() {
    if (!this.lstReportData || this.lstReportData.length === 0) {
      alert("There is no data to export")
      return
    }

    // Get filtered data from AG Grid
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

    // Create Excel data in the required format
    const excelData: any[] = []

    // First row - Headers with merged cells for shifts
    const headerRow1: any[] = ["Ward"]
    this.uniqueShifts.forEach((shift) => {
      headerRow1.push(shift, "") // Empty cell for merging
    })
    headerRow1.push("Total", "")

    // Second row - Sub-headers
    const headerRow2: any[] = [""]
    this.uniqueShifts.forEach(() => {
      headerRow2.push("Vehicle", "Net Weight")
    })
    headerRow2.push("Total Vehicles", "Net Weight KG")

    // Add header rows
    excelData.push(headerRow1)
    excelData.push(headerRow2)

    // Add filtered ward data rows (excluding Total row for now)
    const dataWithoutTotal = filteredData.filter((row) => row.WardName !== "Total")
    dataWithoutTotal.forEach((row) => {
      const dataRow = [row.WardName]
      this.uniqueShifts.forEach((shift) => {
        dataRow.push(row[`${shift}_VehicleCount`] || 0)
        dataRow.push(Number(row[`${shift}_TotalNetWeight`]) || 0)
      })
      dataRow.push(row.TotalVehicleCount || 0)
      dataRow.push(Number(row.TotalNetWeight) || 0)
      excelData.push(dataRow)
    })

    // Add total row
    const totalRowData = filteredData.find((row) => row.WardName === "Total")
    if (totalRowData) {
      const totalRow: string[] = ["Total"]
      this.uniqueShifts.forEach((shift) => {
        const vehicleCount = totalRowData[`${shift}_VehicleCount`] ?? 0
        const totalNetWeight = totalRowData[`${shift}_TotalNetWeight`] ?? 0
        totalRow.push(vehicleCount.toString())
        totalRow.push(Number(totalNetWeight).toString())
      })
      const totalVehicleCount = totalRowData.TotalVehicleCount ?? 0
      const totalNetWeight = totalRowData.TotalNetWeight ?? 0
      totalRow.push(totalVehicleCount.toString())
      totalRow.push(Number(totalNetWeight).toString())
      excelData.push(totalRow)
    }

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(excelData)

    // Set up merges for shift headers
    worksheet["!merges"] = []
    for (let i = 0; i < this.uniqueShifts.length; i++) {
      const startCol = 1 + i * 2
      worksheet["!merges"].push({
        s: { r: 0, c: startCol },
        e: { r: 0, c: startCol + 1 },
      })
    }

    // Merge Total header
    const totalStartCol = 1 + this.uniqueShifts.length * 2
    worksheet["!merges"].push({
      s: { r: 0, c: totalStartCol },
      e: { r: 0, c: totalStartCol + 1 },
    })

    // Auto-adjust column widths based on content length
    const colWidths = [];
    for (let col = 0; col < excelData[0].length; col++) {
      let maxLen = 10; // Minimum width
      for (let row = 0; row < excelData.length; row++) {
        const cellValue = excelData[row][col];
        if (cellValue != null) {
          const cellLen = cellValue.toString().length;
          if (cellLen > maxLen) {
            maxLen = cellLen;
          }
        }
      }
      colWidths.push({ wch: maxLen + 2 }); // Add some padding
    }
    worksheet["!cols"] = colWidths;

    // Create and save workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shift Report")
    const fileName = `Shift_Report_${this.reportForm.value.fromDate}_${this.reportForm.value.toDate}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  getShiftTotal(shift: string): { vehicleCount: number; totalNetWeight: number } {
    const dataWithoutTotal = this.flattenedData.filter((row) => row.WardName !== "Total")
    const vehicleCount = dataWithoutTotal.reduce((sum, row) => sum + (row[`${shift}_VehicleCount`] || 0), 0)
    const totalNetWeight = dataWithoutTotal.reduce(
      (sum, row) => sum + Number.parseFloat(row[`${shift}_TotalNetWeight`] || "0"),
      0,
    )
    return { vehicleCount, totalNetWeight }
  }

  printReport() {
    window.print()
  }

  navigateBack() {
    this.router.navigateByUrl("/dashboard")
  }
}
