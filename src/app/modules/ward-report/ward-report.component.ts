import { Component, OnInit, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { AgGridModule, AgGridAngular } from 'ag-grid-angular'
import * as XLSX from "xlsx"
import { MaxPipe } from "src/app/shared/max.pipe"
import { DbCallingService } from "src/app/core/services/db-calling.service"

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
  @ViewChild("agGrid") agGrid!: AgGridAngular
  isLoading = false
  showReport = false
  activeView = "table"
  isFiltersOpen = false
  reportForm!: FormGroup
  weighBridgeOptions = [
    { id: "ALLWB", name: "All" },
    { id: "WBK1", name: "Kanjur" },
    { id: "WBD1", name: "Deonar" },
  ]
  chartData: any = {}
  wardData: any[] = []
  uniqueDates: string[] = []
  flattenedData: any[] = []
  lstReportData: any[] = []
  columnDefs: any[] = []
  defaultColDef = {
    resizable: true,
    flex: 1,
    sortable: true,
    filter: true,
  }
  totalVehicles = 0
  totalWeight = 0
  topWard = ""
  daysWithData = 0

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dbCallingService: DbCallingService,
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
    this.columnDefs = [
      {
        headerName: "Ward Name",
        field: "wardName",
        pinned: "left",
        width: 150,
        flex: 0,
        cellRenderer: (params: any) => `<strong>${params.value || "N/A"}</strong>`,
      },
    ]
  }

  onSubmit() {
    if (this.reportForm.invalid) return
    this.isLoading = true
    this.isFiltersOpen = false
    const formValues = this.reportForm.value
    const weighBridge = formValues.weighBridge === "all" ? "" : formValues.weighBridge
    const fromDate = `${formValues.month}-01`
    const [year, month] = formValues.month.split("-")
    const lastDay = new Date(Number(year), Number(month), 0).getDate()
    const toDate = `${formValues.month}-${String(lastDay).padStart(2, "0")}`

    const payload = {
      WeighBrigde: weighBridge,
      FromDate: fromDate,
      ToDate: toDate,
      FullDate: "",
      WardName: "",
      Act_Shift: "",
      TransactionDate: fromDate,
    }

    this.dbCallingService.getWardwiseReport(payload).subscribe({
      next: (response) => {
        if (response && response.serviceResponse === 1 && response.wardData) {
          this.wardData = response.wardData
          // Directly bind raw API data
          this.lstReportData = this.wardData
          // Setup static columns (not dynamic)
          this.setupRawColumnDefs()
          // Calculate summary metrics from raw data
          this.calculateSummaryFromRawData()
          this.showReport = true
        } else {
          alert(response?.msg || "No data found")
          this.wardData = []
          this.lstReportData = []
          this.showReport = false
        }
        this.isLoading = false
      },
      error: (error) => {
        console.error("API Error:", error)
        alert("Failed to fetch data")
        this.isLoading = false
      },
    })
  }

  calculateSummaryFromRawData() {
    if (!this.wardData || this.wardData.length === 0) {
      this.totalVehicles = 0
      this.totalWeight = 0
      this.topWard = ""
      this.daysWithData = 0
      this.uniqueDates = []
      return
    }

    // Calculate total vehicles and weight
    this.totalVehicles = this.wardData.reduce((sum, item) => sum + (item.vehicleCount || 0), 0)
    this.totalWeight = this.wardData.reduce((sum, item) => sum + (item.totalNetWeight || 0), 0)

    // Calculate unique dates
    this.uniqueDates = Array.from(new Set(this.wardData.map((d) => this.formatDate(d.transactionDate)))).sort()
    this.daysWithData = this.uniqueDates.length

    // Calculate highest volume ward
    const wardTotals = this.wardData.reduce((acc, item) => {
      const wardName = item.wardName || "Unknown"
      if (!acc[wardName]) {
        acc[wardName] = { vehicles: 0, weight: 0 }
      }
      acc[wardName].vehicles += item.vehicleCount || 0
      acc[wardName].weight += item.totalNetWeight || 0
      return acc
    }, {} as any)

    let maxWeight = 0
    this.topWard = ""
    Object.keys(wardTotals).forEach((wardName) => {
      if (wardTotals[wardName].weight > maxWeight) {
        maxWeight = wardTotals[wardName].weight
        this.topWard = wardName
      }
    })
    this.processChartData()
  }

  processChartData() {
    if (!this.wardData || this.wardData.length === 0) {
      this.chartData = {}
      return
    }

    // Ward comparison data
    const wardTotals = this.wardData.reduce((acc, item) => {
      const wardName = item.wardName || "Unknown"
      if (!acc[wardName]) {
        acc[wardName] = { vehicles: 0, weight: 0 }
      }
      acc[wardName].vehicles += item.vehicleCount || 0
      acc[wardName].weight += item.totalNetWeight || 0
      return acc
    }, {} as any)

    const wardNames = Object.keys(wardTotals)
    const wardWeights = wardNames.map((name) => wardTotals[name].weight)
    const wardVehicles = wardNames.map((name) => wardTotals[name].vehicles)

    // Daily trend data
    const dailyTotals = this.wardData.reduce((acc, item) => {
      const date = this.formatDate(item.transactionDate)
      if (!acc[date]) {
        acc[date] = { vehicles: 0, weight: 0 }
      }
      acc[date].vehicles += item.vehicleCount || 0
      acc[date].weight += item.totalNetWeight || 0
      return acc
    }, {} as any)

    const dates = Object.keys(dailyTotals).sort()
    const dailyWeights = dates.map((date) => dailyTotals[date].weight)
    const dailyVehicles = dates.map((date) => dailyTotals[date].vehicles)

    this.chartData = {
      wardComparison: {
        labels: wardNames,
        weightData: wardWeights,
        vehicleData: wardVehicles,
      },
      trend: {
        labels: dates,
        datasets: [
          {
            label: "Weight",
            data: dailyWeights,
          },
          {
            label: "Vehicles",
            data: dailyVehicles,
          },
        ],
      },
    }
  }

  processData() {
    this.uniqueDates = Array.from(new Set(this.wardData.map((d) => this.formatDate(d.transactionDate)))).sort()
    const uniqueWardNames = Array.from(new Set(this.wardData.map((d) => d.wardName)))
    this.flattenedData = uniqueWardNames.map((wardName) => {
      const row: any = { wardName }
      let totalVehicleCount = 0
      let totalNetWeight = 0
      this.uniqueDates.forEach((date) => {
        const item = this.wardData.find((d) => this.formatDate(d.transactionDate) === date && d.wardName === wardName)
        const vehicles = item?.vehicleCount || 0
        const weight = item?.totalNetWeight || 0
        row[`${date}_VehicleCount`] = vehicles
        row[`${date}_TotalNetWeight`] = weight.toFixed(2)
        totalVehicleCount += vehicles
        totalNetWeight += weight
      })
      row["TotalVehicleCount"] = totalVehicleCount
      row["TotalNetWeight"] = totalNetWeight.toFixed(2)
      return row
    })
    this.calculateSummaryMetrics()
  }

  setupDynamicColumns() {
    this.columnDefs = [
      {
        headerName: "Ward Name",
        field: "wardName",
        pinned: "left",
        width: 150,
        flex: 0,
        cellRenderer: (params: any) => `<strong>${params.value}</strong>`,
      },
    ]
    this.uniqueDates.forEach((date) => {
      this.columnDefs.push(
        {
          headerName: `${date} - Vehicles`,
          field: `${date}_VehicleCount`,
          width: 120,
        },
        {
          headerName: `${date} - Weight`,
          field: `${date}_TotalNetWeight`,
          width: 120,
        },
      )
    })
    this.columnDefs.push(
      { headerName: "Total Vehicles", field: "TotalVehicleCount", width: 130 },
      { headerName: "Total Weight", field: "TotalNetWeight", width: 130 },
    )
  }

  prepareGridData() {
    this.lstReportData = this.flattenedData 
    console.log("Grid Data:", this.lstReportData)
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toISOString().split("T")[0] // yyyy-MM-dd
  }

  calculateSummaryMetrics() {
    const totalRow = this.flattenedData.reduce(
      (acc, curr) => {
        acc.TotalVehicleCount += curr.TotalVehicleCount
        acc.TotalNetWeight += Number.parseFloat(curr.TotalNetWeight)
        return acc
      },
      { TotalVehicleCount: 0, TotalNetWeight: 0 },
    )
    this.totalVehicles = totalRow.TotalVehicleCount
    this.totalWeight = Number.parseFloat(totalRow.TotalNetWeight.toFixed(2))
  }

  toggleFilters() {
    this.isFiltersOpen = !this.isFiltersOpen
  }

  closeFilters() {
    this.isFiltersOpen = false
  }

  setActiveView(view: string) {
    this.activeView = view
  }

  navigateBack() {
    this.router.navigateByUrl("/dashboard")
  }

  printReport() {
    window.print()
  }

  setupRawColumnDefs() {
    this.columnDefs = [
      { headerName: "Ward Name", field: "wardName" },
      { headerName: "Transaction Date", field: "transactionDate" },
      { headerName: "Full Date", field: "fullDate" },
      { headerName: "Vehicle Count", field: "vehicleCount" },
      { headerName: "Total Net Weight", field: "totalNetWeight" },
      { headerName: "Shift", field: "act_Shift" },
      { headerName: "Weighbridge", field: "weighBrigde" },
    ]
  }

  exportToExcel() {
    if (!this.lstReportData || this.lstReportData.length === 0) {
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
      wardName: "Ward Name",
      transactionDate: "Transaction Date",
      fullDate: "Full Date",
      vehicleCount: "Vehicle Count",
      totalNetWeight: "Total Net Weight (kg)",
      act_Shift: "Shift",
      weighBrigde: "Weighbridge",
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

    // Bold header styling
    headerRow.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex })
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true },
        }
      }
    })

    // Create summary sheet
    const summaryData = [
      { Metric: "Days with Data", Value: this.daysWithData },
      { Metric: "Highest Volume Ward", Value: this.topWard || "N/A" },
      { Metric: "Total Weight (kg)", Value: this.totalWeight },
      { Metric: "Total Vehicles", Value: this.totalVehicles },
    ]

    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData)
    const summaryHeaderRow = ["Metric", "Value"]
    XLSX.utils.sheet_add_aoa(summaryWorksheet, [summaryHeaderRow], { origin: "A1" })

    // Style summary headers
    summaryHeaderRow.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex })
      if (summaryWorksheet[cellAddress]) {
        summaryWorksheet[cellAddress].s = {
          font: { bold: true },
        }
      }
    })

    // Create and save workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ward Report Data")
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary")

    const fileName = `Ward_Report_${this.reportForm.value.month}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  getBarHeight(value: number, dataArray: number[]): number {
    if (!dataArray || dataArray.length === 0) return 0
    const maxValue = Math.max(...dataArray)
    return maxValue > 0 ? (value / maxValue) * 100 : 0
  }

  getTrendHeight(value: number, dataArray: number[]): number {
    if (!dataArray || dataArray.length === 0) return 2
    const maxValue = Math.max(...dataArray)
    return maxValue > 0 ? Math.max(2, (value / maxValue) * 50) : 2
  }
}
