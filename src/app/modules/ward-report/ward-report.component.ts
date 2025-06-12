import { Component, OnInit, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community'
import { AgGridModule } from 'ag-grid-angular'
import * as XLSX from "xlsx"
import { MaxPipe } from "src/app/shared/max.pipe"

// Using a type-only declaration since we're not actually using the library in this demo
declare const saveAs: (blob: Blob, filename: string) => void

@Component({
    selector: "app-ward-report",
    templateUrl: "./ward-report.component.html",
    styleUrls: ["./ward-report.component.scss"],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, AgGridModule, MaxPipe],
})
export class WardReportComponent implements OnInit {
  @ViewChild("reportContainer") reportContainer!: ElementRef

  // UI state
  isLoading = false
  showReport = false
  activeView = "table" // 'table' or 'chart'
  isFiltersOpen = false // New state for offcanvas

  // Form
  reportForm!: FormGroup

  // Data
  weighBridgeOptions = [
    { id: "all", name: "All" },
    { id: "K", name: "Kanjur" },
    { id: "D", name: "Deonar" },
  ]

  // Mock data for demonstration
  wardData: any[] = []
  uniqueDates: string[] = []
  flattenedData: any[] = []

  // AG Grid configuration - Following search-report pattern
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

  // Chart data
  chartData: any = {}

  constructor(
    private fb: FormBuilder,
    private router: Router,
  ) {}

  ngOnInit() {
    this.initForm()
    this.setupColumnDefs()
  }

  initForm() {
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

    this.reportForm = this.fb.group({
      weighBridge: ["all", Validators.required],
      month: [currentMonth, Validators.required],
    })
  }

  setupColumnDefs() {
    // Initialize with basic ward name column
    this.columnDefs = [
      {
        headerName: "Ward Name",
        field: "WardName",
        pinned: "left",
        width: 150,
        cellRenderer: (params: ICellRendererParams) => {
          if (params.data?.WardName === "Total") {
            return `<strong style="color: #1a2a6c;">${params.value}</strong>`
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

    // Simulate API call
    setTimeout(() => {
      this.generateMockData()
      this.processData()
      this.setupDynamicColumns()
      this.prepareGridData()
      this.prepareChartData()
      this.showReport = true
      this.isLoading = false
    }, 1000)
  }

  generateMockData() {
    const month = this.reportForm.value.month
    const [year, monthNum] = month.split("-")
    const daysInMonth = new Date(Number.parseInt(year), Number.parseInt(monthNum), 0).getDate()

    // Generate dates for the selected month (every 3 days for simplicity)
    const dates: string[] = []
    for (let i = 1; i <= daysInMonth; i += 3) {
      dates.push(`${year}-${monthNum}-${String(i).padStart(2, "0")}`)
    }

    // Generate ward names
    const wardNames = ["Ward A", "Ward B", "Ward C", "Ward D", "Ward E", "Ward F", "Total"]

    // Generate data for each ward and date
    this.wardData = []

    wardNames.forEach((ward) => {
      dates.forEach((date) => {
        // Skip some combinations to simulate missing data
        if (Math.random() > 0.9) return

        const vehicleCount =
          ward === "Total" ? Math.floor(Math.random() * 50) + 100 : Math.floor(Math.random() * 30) + 5

        const totalNetWeight =
          ward === "Total" ? Math.floor(Math.random() * 5000) + 10000 : Math.floor(Math.random() * 3000) + 500

        this.wardData.push({
          WardName: ward,
          TransactionDate: date,
          FullDate: new Date(date).toLocaleDateString(),
          VehicleCount: vehicleCount,
          TotalNetWeight: totalNetWeight,
          WeighBrigde: this.reportForm.value.weighBridge,
        })
      })
    })
  }

  processData() {
    // Extract unique dates
    this.uniqueDates = Array.from(new Set(this.wardData.map((item) => this.formatDate(item.TransactionDate)))).sort()

    // Extract unique ward names
    const uniqueWardNames = Array.from(new Set(this.wardData.map((item) => item.WardName)))

    // Create flattened data structure
    this.flattenedData = uniqueWardNames.map((wardName) => {
      const row: any = { WardName: wardName }
      let totalVehicleCount = 0
      let totalNetWeight = 0

      this.uniqueDates.forEach((date) => {
        const dateData = this.wardData.find(
          (d) => this.formatDate(d.TransactionDate) === date && d.WardName === wardName,
        )

        const vehicleCount = dateData?.VehicleCount || 0
        const netWeight = dateData?.TotalNetWeight || 0

        row[`${date}_VehicleCount`] = vehicleCount
        row[`${date}_TotalNetWeight`] = netWeight.toFixed(2)

        totalVehicleCount += vehicleCount
        totalNetWeight += netWeight
      })

      row["TotalVehicleCount"] = totalVehicleCount
      row["TotalNetWeight"] = totalNetWeight.toFixed(2)

      return row
    })

    // Move 'Total' row to the end
    const totalRow = this.flattenedData.find((row) => row.WardName === "Total")
    if (totalRow) {
      this.flattenedData = this.flattenedData.filter((row) => row.WardName !== "Total").concat(totalRow)
    }

    // Calculate summary metrics
    this.calculateSummaryMetrics()
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

    // Add date columns (simplified - individual columns)
    this.uniqueDates.forEach((date) => {
      this.columnDefs.push({
        headerName: `${date} - Vehicles`,
        field: `${date}_VehicleCount`,
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
        headerName: `${date} - Weight`,
        field: `${date}_TotalNetWeight`,
        width: 120,
        flex: 0,
        valueFormatter: this.weightFormatter,
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
      valueFormatter: this.weightFormatter,
      cellRenderer: (params: ICellRendererParams) => {
        const value = params.value ? Number(params.value).toFixed(2) : "0.00"
        if (params.data?.WardName === "Total") {
          return `<strong style="color: #1a2a6c; background-color: rgba(26, 42, 108, 0.05);">${value}</strong>`
        }
        return `<strong style="color: #1a2a6c;">${value}</strong>`
      },
    })
  }

  weightFormatter(params: any) {
    if (params.value != null) {
      return Number(params.value).toFixed(2)
    }
    return "0.00"
  }

  prepareGridData() {
    this.lstReportData = [...this.flattenedData]
  }

  calculateSummaryMetrics() {
    // Find the total row
    const totalRow = this.flattenedData.find((row) => row.WardName === "Total")

    if (totalRow) {
      this.totalVehicles = totalRow.TotalVehicleCount
      this.totalWeight = Number.parseFloat(totalRow.TotalNetWeight)
    } else {
      // Calculate from all rows if no total row exists
      this.totalVehicles = this.flattenedData.reduce((sum, row) => sum + row.TotalVehicleCount, 0)
      this.totalWeight = this.flattenedData.reduce((sum, row) => sum + Number.parseFloat(row.TotalNetWeight), 0)
    }

    // Find the ward with the highest weight (excluding Total)
    const wardsExcludingTotal = this.flattenedData.filter((row) => row.WardName !== "Total")
    if (wardsExcludingTotal.length > 0) {
      const topWardRow = wardsExcludingTotal.reduce((prev, current) =>
        Number.parseFloat(current.TotalNetWeight) > Number.parseFloat(prev.TotalNetWeight) ? current : prev,
      )
      this.topWard = topWardRow.WardName
    }
  }

  prepareChartData() {
    // Prepare data for the charts
    const wardsExcludingTotal = this.flattenedData.filter((row) => row.WardName !== "Total")

    // Data for the ward comparison chart
    this.chartData.wardComparison = {
      labels: wardsExcludingTotal.map((row) => row.WardName),
      vehicleData: wardsExcludingTotal.map((row) => row.TotalVehicleCount),
      weightData: wardsExcludingTotal.map((row) => Number.parseFloat(row.TotalNetWeight)),
    }

    // Data for the trend chart
    this.chartData.trend = {
      labels: this.uniqueDates,
      datasets: wardsExcludingTotal.map((ward) => {
        return {
          label: ward.WardName,
          data: this.uniqueDates.map((date) => {
            const key = `${date}_TotalNetWeight`
            return ward[key] ? Number.parseFloat(ward[key]) : 0
          }),
        }
      }),
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-GB") // DD/MM/YYYY format
  }

  setActiveView(view: string) {
    this.activeView = view
  }

  exportToExcel() {
    if (!this.lstReportData || this.lstReportData.length === 0) {
      alert("There is no data to export")
      return
    }

    const workbook = XLSX.utils.book_new()
    const worksheetData: any[][] = []

    // Create headers
    const headers = ["Ward Name"]
    const subHeaders = [""]

    this.uniqueDates.forEach((date) => {
      headers.push(date, "")
      subHeaders.push("Vehicles", "Weight")
    })

    headers.push("Total Vehicle Count", "Total Net Weight")
    subHeaders.push("", "")

    worksheetData.push(headers)
    worksheetData.push(subHeaders)

    // Add data rows
    this.flattenedData.forEach((row) => {
      const dataRow = [row.WardName]

      this.uniqueDates.forEach((date) => {
        dataRow.push(row[`${date}_VehicleCount`] || 0)
        dataRow.push(row[`${date}_TotalNetWeight`] || 0)
      })

      dataRow.push(row.TotalVehicleCount)
      dataRow.push(row.TotalNetWeight)

      worksheetData.push(dataRow)
    })

    // Create worksheet and append to workbook
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, "WardWiseReport")

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" })

    // Save file
    const fileName = `WardWiseReport_${this.reportForm.value.month}.xlsx`
    saveAs(blob, fileName)
  }

  printReport() {
    window.print()
  }

  navigateBack() {
    this.router.navigateByUrl("/dashboard")
  }

  // Add a helper method to find the maximum value in an array
  getMaxValue(values: number[]): number {
    if (!values || values.length === 0) {
      return 0
    }
    return Math.max(...values)
  }
}
