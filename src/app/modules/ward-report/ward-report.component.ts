import { Component, OnInit, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { AgGridModule, AgGridAngular } from 'ag-grid-angular'
import * as XLSX from "xlsx";
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
  showReport = true // Always show report section
  activeView = "table" // Only table view now
  isFiltersOpen = false

  reportForm!: FormGroup

  weighBridgeOptions = [
    { id: "ALLWB", name: "All" },
    { id: "WBK1", name: "Kanjur" },
    { id: "WBD1", name: "Deonar" },
  ]

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
  ) { }

  ngOnInit() {
    this.initForm()
    this.setupColumnDefs()
    // Load initial data automatically with current month
    this.loadInitialData()
  }

  // NEW METHOD: Load initial data automatically
  loadInitialData() {
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

    this.isLoading = true

    const weighBridge = ""
    const fromDate = `${currentMonth}-01`
    const [year, month] = currentMonth.split("-")
    const lastDay = new Date(Number(year), Number(month), 0).getDate()
    const toDate = `${currentMonth}-${String(lastDay).padStart(2, "0")}`

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
          this.processDataForGrid()
          this.calculateSummaryFromProcessedData()
        } else {
          this.wardData = []
          this.lstReportData = []
          this.resetSummaryStatistics()
        }
        this.isLoading = false
      },
      error: (error) => {
        console.error("API Error:", error)
        this.wardData = []
        this.lstReportData = []
        this.resetSummaryStatistics()
        this.isLoading = false
      },
    })
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
          this.processDataForGrid()
          this.calculateSummaryFromProcessedData()
        } else {
          alert(response?.msg || "No data found")
          this.wardData = []
          this.lstReportData = []
          this.resetSummaryStatistics()
        }
        this.isLoading = false
      },
      error: (error) => {
        console.error("API Error:", error)
        alert("Failed to fetch data")
        this.wardData = []
        this.lstReportData = []
        this.resetSummaryStatistics()
        this.isLoading = false
      },
    })
  }

  processDataForGrid() {
    if (!this.wardData || this.wardData.length === 0) {
      this.lstReportData = []
      this.uniqueDates = []
      return
    }

    // Get unique dates and sort them
    this.uniqueDates = Array.from(new Set(this.wardData.map((d) => this.formatDate(d.transactionDate)))).sort()

    // Get unique ward names
    const uniqueWardNames = Array.from(new Set(this.wardData.map((d) => d.wardName)))

    // Create flattened data for grid
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

    this.setupDynamicColumns()
    this.lstReportData = this.flattenedData
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

  calculateSummaryFromProcessedData() {
    if (!this.flattenedData || this.flattenedData.length === 0) {
      this.resetSummaryStatistics()
      return
    }

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
    this.daysWithData = this.uniqueDates.length

    // Find top ward by weight
    let maxWeight = 0
    this.topWard = ""
    this.flattenedData.forEach((ward) => {
      const weight = Number.parseFloat(ward.TotalNetWeight)
      if (weight > maxWeight) {
        maxWeight = weight
        this.topWard = ward.wardName
      }
    })
  }

  resetSummaryStatistics() {
    this.totalVehicles = 0
    this.totalWeight = 0
    this.topWard = ""
    this.daysWithData = 0
    this.uniqueDates = []
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toISOString().split("T")[0] // yyyy-MM-dd
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

  //Export to Excel
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

    // Get unique dates from filtered data
    const filteredUniqueDates = Array.from(new Set(
      this.uniqueDates.filter(date => {
        // Check if any filtered ward has data for this date
        return filteredData.some(ward =>
          ward[`${date}_VehicleCount`] > 0 || parseFloat(ward[`${date}_TotalNetWeight`] || "0") > 0
        )
      })
    )).sort()

    
    const excelData: any[] = []

    // First row - only "Date" header and empty cell at first
    const headerRow1: any[] = ["Date"];

    filteredUniqueDates.forEach(date => {
      const formattedDate = this.formatDateForExcel(date);
      headerRow1.push(formattedDate, ""); // Keep one blank cell, will be merged
    });

    // Second row - Rowlabel + subheaders
    const headerRow2: any[] = ["Rowlabel"];
    filteredUniqueDates.forEach(() => {
      headerRow2.push("Vehicles", "Weight");
    });

    // Add header rows to data
    excelData.push(headerRow1)
    excelData.push(headerRow2)

    // Add filtered ward data rows
    filteredData.forEach(ward => {
      const row: any[] = [ward.wardName]
      filteredUniqueDates.forEach(date => {
        row.push(
          ward[`${date}_VehicleCount`] || 0,
          parseFloat(ward[`${date}_TotalNetWeight`] || "0")
        )
      })
      excelData.push(row)
    })

    // Add total row based on filtered data
    const totalRow: any[] = ["Total"]
    filteredUniqueDates.forEach(date => {
      let totalVehiclesForDate = 0
      let totalWeightForDate = 0

      filteredData.forEach(ward => {
        totalVehiclesForDate += ward[`${date}_VehicleCount`] || 0
        totalWeightForDate += parseFloat(ward[`${date}_TotalNetWeight`] || "0")
      })

      totalRow.push(totalVehiclesForDate, totalWeightForDate)
    })
    excelData.push(totalRow)

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(excelData)

    // Style the headers
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

    // Merge date cells across "Vehicles" and "Weight" columns
    worksheet['!merges'] = [];
    for (let i = 0; i < filteredUniqueDates.length; i++) {
      const startCol = 1 + (i * 2);
      worksheet['!merges'].push({
        s: { r: 0, c: startCol },
        e: { r: 0, c: startCol + 1 }
      });
    }

    // Style first header row ("Date")
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E6E6FA" } },
          alignment: { horizontal: "center", vertical: "center" }
        }
      }
    }

    // Style second header row
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col })
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "F0F0F0" } },
          alignment: { horizontal: "center", vertical: "center" }
        }
      }
    }

    // Style total row
    const totalRowIndex = excelData.length - 1
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex, c: col })
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "FFFF99" } }
        }
      }
    }

    // Style first column (Ward names)
    for (let row = 0; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 })
      if (worksheet[cellAddress]) {
        if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {}
        worksheet[cellAddress].s.font = { bold: true }
      }
    }

    // Set column widths
    const colWidths = [{ wch: 15 }] // First column width
    for (let i = 0; i < filteredUniqueDates.length; i++) {
      colWidths.push({ wch: 10 }, { wch: 12 }) // Vehicles and Weight columns
    }
    worksheet['!cols'] = colWidths

    // Create and save workbook
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ward Report")

    const fileName = `Ward_Report_${this.reportForm.value.month}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  formatDateForExcel(dateStr: string): string {
    // Convert yyyy-MM-dd to dd-MM-yyyy format for Excel
    const [year, month, day] = dateStr.split('-')
    return `${day}-${month}-${year}`
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