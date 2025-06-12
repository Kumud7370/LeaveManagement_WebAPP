import { Component, OnInit, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community'
import { AgGridModule } from 'ag-grid-angular'
import * as XLSX from "xlsx"

// Using a type-only declaration since we're not actually using the library in this demo
declare const saveAs: (blob: Blob, filename: string) => void

@Component({
    selector: "app-shift-report",
    templateUrl: "./shift-report.component.html",
    styleUrls: ["./shift-report.component.scss"],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule, AgGridModule],
})
export class ShiftReportComponent implements OnInit {
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
  shiftData: any[] = []
  flattenedData: any[] = []
  uniqueWards: string[] = []
  uniqueShifts: string[] = ["Shift I", "Shift II", "Shift III"]

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
  topShift = ""

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
    // Generate ward names
    const wardNames = ["Ward A", "Ward B", "Ward C", "Ward D", "Ward E", "Ward F"]
    this.uniqueWards = wardNames

    // Generate data for each ward and shift
    this.shiftData = []

    wardNames.forEach((ward) => {
      this.uniqueShifts.forEach((shift) => {
        // Skip some combinations to simulate missing data
        if (Math.random() > 0.9) return

        const vehicleCount = Math.floor(Math.random() * 30) + 5
        const totalNetWeight = Math.floor(Math.random() * 3000) + 500

        this.shiftData.push({
          WardName: ward,
          Shift: shift,
          VehicleCount: vehicleCount,
          TotalNetWeight: totalNetWeight,
          WeighBridge: this.reportForm.value.weighBridge,
        })
      })
    })
  }

  processData() {
    // Extract unique ward names
    const uniqueWardNames = Array.from(new Set(this.shiftData.map((item) => item.WardName)))

    // Create flattened data structure
    this.flattenedData = uniqueWardNames.map((wardName) => {
      const row: any = { WardName: wardName }
      let totalVehicleCount = 0
      let totalNetWeight = 0

      this.uniqueShifts.forEach((shift) => {
        const shiftData = this.shiftData.find((d) => d.WardName === wardName && d.Shift === shift)

        const vehicleCount = shiftData?.VehicleCount || 0
        const netWeight = shiftData?.TotalNetWeight || 0

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
    this.shiftData.forEach((item) => {
      const currentTotal = shiftTotals.get(item.Shift) || 0
      shiftTotals.set(item.Shift, currentTotal + item.TotalNetWeight)
    })

    let maxWeight = 0
    shiftTotals.forEach((weight, shift) => {
      if (weight > maxWeight) {
        maxWeight = weight
        this.topShift = shift
      }
    })
  }

  prepareChartData() {
    // Prepare data for the ward comparison chart
    const wardsExcludingTotal = this.flattenedData.filter((row) => row.WardName !== "Total")

    this.chartData.wardComparison = {
      labels: wardsExcludingTotal.map((row) => row.WardName),
      vehicleData: wardsExcludingTotal.map((row) => row.TotalVehicleCount),
      weightData: wardsExcludingTotal.map((row) => Number.parseFloat(row.TotalNetWeight)),
    }

    // Prepare data for the shift comparison chart
    const shiftTotals = new Map<string, { vehicleCount: number; totalNetWeight: number }>()

    this.shiftData.forEach((item) => {
      const shift = item.Shift
      if (!shiftTotals.has(shift)) {
        shiftTotals.set(shift, { vehicleCount: 0, totalNetWeight: 0 })
      }
      const current = shiftTotals.get(shift)!
      current.vehicleCount += item.VehicleCount
      current.totalNetWeight += item.TotalNetWeight
    })

    this.chartData.shiftComparison = {
      labels: Array.from(shiftTotals.keys()),
      vehicleData: Array.from(shiftTotals.values()).map((data) => data.vehicleCount),
      weightData: Array.from(shiftTotals.values()).map((data) => data.totalNetWeight),
    }
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

    this.uniqueShifts.forEach((shift) => {
      headers.push(shift, "")
      subHeaders.push("Vehicles", "Weight")
    })

    headers.push("Total Vehicle Count", "Total Net Weight")
    subHeaders.push("", "")

    worksheetData.push(headers)
    worksheetData.push(subHeaders)

    // Add data rows
    this.flattenedData.forEach((row) => {
      const dataRow = [row.WardName]

      this.uniqueShifts.forEach((shift) => {
        dataRow.push(row[`${shift}_VehicleCount`] || 0)
        dataRow.push(row[`${shift}_TotalNetWeight`] || 0)
      })

      dataRow.push(row.TotalVehicleCount)
      dataRow.push(row.TotalNetWeight)

      worksheetData.push(dataRow)
    })

    // Create worksheet and append to workbook
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    XLSX.utils.book_append_sheet(workbook, worksheet, "ShiftWiseReport")

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" })

    // Save file
    const fileName = `ShiftWiseReport_${this.reportForm.value.fromDate}_${this.reportForm.value.toDate}.xlsx`
    saveAs(blob, fileName)
  }

  getMaxValue(values: number[]): number {
    if (!values || values.length === 0) {
      return 0
    }
    return Math.max(...values)
  }

  getShiftTotal(shift: string): { vehicleCount: number; totalNetWeight: number } {
    const shiftData = this.shiftData.filter((item) => item.Shift === shift)
    const vehicleCount = shiftData.reduce((sum, item) => sum + item.VehicleCount, 0)
    const totalNetWeight = shiftData.reduce((sum, item) => sum + item.TotalNetWeight, 0)
    return { vehicleCount, totalNetWeight }
  }

  printReport() {
    window.print()
  }

  navigateBack() {
    this.router.navigateByUrl("/dashboard")
  }
}
