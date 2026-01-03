import { Component, OnInit, ViewChild, ElementRef, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { AgGridModule, AgGridAngular } from "ag-grid-angular"
import * as XLSX from "xlsx"
import { DbCallingService } from "src/app/core/services/db-calling.service"

declare const saveAs: (blob: Blob, filename: string) => void

@Component({
  selector: "app-ward-report",
  templateUrl: "./ward-report.component.html",
  styleUrls: ["./ward-report.component.scss"],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AgGridModule],
})
export class WardReportComponent implements OnInit {
  @ViewChild("reportContainer") reportContainer!: ElementRef
  @ViewChild("agGrid") agGrid!: AgGridAngular

  isLoading = false
  showReport = true
  activeView = "table"
  isFiltersOpen = false

  reportForm!: FormGroup

  weighBridgeOptions = [
    { id: "all", name: "All" },
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
    minWidth: 100,
    sortable: true,
    filter: true,
    wrapText: true,
    autoHeight: true,
    wrapHeaderText: true,
  }

  totalVehicles = 0
  totalWeight = 0
  topWard = ""
  daysWithData = 0
  userId = 0
  userSiteName = ""
  lstSiteNames: any[] = []
  isMobileView = false

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private dbCallingService: DbCallingService,
  ) {
    this.userId = Number(sessionStorage.getItem("UserId")) || 0
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || ""
    const obj = {
      UserId: Number(this.userId),
      SiteName: this.userSiteName,
    }
    console.log("Loading initial data with params:", obj)
    this.dbCallingService.GetSiteLocations(obj).subscribe({
      next: (response: any) => {
        console.log("response:", response)
        if (response && response.data) {
          this.lstSiteNames = response.data
        }
      },
      error: (error: any) => {
        console.error("Error loading site locations:", error)
      },
    })
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkMobileView()
    this.setupColumnDefs()
    if (this.agGrid && this.agGrid.api) {
      this.agGrid.api.sizeColumnsToFit()
    }
  }

  ngOnInit() {
    this.checkMobileView()
    this.initForm()
    this.setupColumnDefs()
    this.loadInitialData()
  }

  checkMobileView() {
    this.isMobileView = window.innerWidth <= 768
  }

  loadInitialData() {
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

    this.isLoading = true
    const fromDate = `${currentMonth}-01`

    const payload = {
      WeighBridge: "ALLWB",
      FromDate: fromDate,
      ToDate: "",
      FullDate: "",
      WardName: "",
      Act_Shift: "",
      TransactionDate: fromDate,
      UserId: this.userId,
      SiteName: this.userSiteName,
    }

    console.log("Loading initial wardwise data with payload:", payload)

    this.dbCallingService.getWardwiseReport(payload).subscribe({
      next: (response) => {
        console.log("Initial Wardwise API Response:", response)
        if (
          response &&
          (response.serviceResponse === 1 || response.ServiceResponse === "Successful") &&
          response.wardData?.length
        ) {
          console.log("Processing initial wardwise data:", response.wardData)
          this.wardData = response.wardData
          this.processDataForGrid()
          this.calculateSummaryFromProcessedData()
          console.log("Initial wardwise processed data:", this.lstReportData)
        } else {
          console.log("No initial wardwise data found")
          this.resetData()
        }
        this.isLoading = false
      },
      error: (error) => {
        console.error("Initial Wardwise API Error:", error)
        this.resetData()
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
    // Check if mobile view
    const isMobile = window.innerWidth <= 768

    this.columnDefs = [
      {
        headerName: "Ward Name",
        field: "wardName",
        pinned: isMobile ? null : "left", // Remove pinned on mobile
        width: 150,
        minWidth: 120,
        flex: isMobile ? 1 : 0,
        cellRenderer: (params: any) => `<strong>${params.value || "N/A"}</strong>`,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
    ]
  }

  onSubmit() {
    if (this.reportForm.invalid) return

    this.isLoading = true
    this.isFiltersOpen = false

    const formValues = this.reportForm.value
    const fromDate = `${formValues.month}-01`

    const payload = {
      WeighBridge: this.reportForm.value.weighBridge,
      FromDate: fromDate,
      ToDate: "",
      FullDate: "",
      WardName: "",
      Act_Shift: "",
      TransactionDate: fromDate,
      UserId: this.userId,
      SiteName: this.userSiteName,
    }

    console.log("Submitting wardwise with payload:", payload)

    this.dbCallingService.getWardwiseReport(payload).subscribe({
      next: (response) => {
        console.log("Wardwise API Response:", response)
        if (
          response &&
          (response.serviceResponse === 1 || response.ServiceResponse === "Successful") &&
          response.wardData?.length
        ) {
          console.log("Processing wardwise data:", response.wardData)
          this.wardData = response.wardData
          this.processDataForGrid()
          this.calculateSummaryFromProcessedData()
          console.log("Wardwise processed data:", this.lstReportData)
          alert("Wardwise data retrieved successfully!")
        } else {
          console.log("No wardwise data found or invalid response")
          alert(response?.msg || "No wardwise data found")
          this.resetData()
        }
        this.isLoading = false
      },
      error: (error) => {
        console.error("Wardwise API Error:", error)
        alert("Failed to fetch wardwise data")
        this.resetData()
        this.isLoading = false
      },
    })
  }

  private resetData() {
    this.wardData = []
    this.lstReportData = []
    this.flattenedData = []
    this.resetSummaryStatistics()
  }

  processDataForGrid() {
    if (!this.wardData || this.wardData.length === 0) {
      this.lstReportData = []
      this.uniqueDates = []
      return
    }

    this.uniqueDates = Array.from(
      new Set(this.wardData.map((d) => this.formatDate(d.transactionDate || d.TransactionDate))),
    ).sort()

    const uniqueWardNames = Array.from(new Set(this.wardData.map((d) => d.wardName || d.WardName)))

    this.flattenedData = uniqueWardNames.map((wardName) => {
      const row: any = { wardName }
      let totalVehicleCount = 0
      let totalNetWeight = 0

      this.uniqueDates.forEach((date) => {
        const dateData = this.wardData.filter((d) => {
          const itemDate = this.formatDate(d.transactionDate || d.TransactionDate)
          const itemWard = d.wardName || d.WardName
          return itemDate === date && itemWard === wardName
        })

        const vehicles = dateData.reduce((sum, item) => sum + (item.vehicleCount || item.VehicleCount || 0), 0)
        const weight = dateData.reduce((sum, item) => sum + (item.totalNetWeight || item.TotalNetWeight || 0), 0)

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
    this.lstReportData = [...this.flattenedData]
  }

  setupDynamicColumns() {
    const isMobile = window.innerWidth <= 768

    this.columnDefs = [
      {
        headerName: "Ward Name",
        field: "wardName",
        pinned: isMobile ? null : "left",
        width: 150,
        minWidth: 120,
        flex: isMobile ? 1 : 0,
        cellRenderer: (params: any) => `<strong>${params.value}</strong>`,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
    ]

    this.uniqueDates.forEach((date) => {
      this.columnDefs.push(
        {
          headerName: `${date} - Vehicles`,
          field: `${date}_VehicleCount`,
          width: 120,
          minWidth: 100,
          cellStyle: {
            display: "flex",
            alignItems: "center",
            paddingLeft: "12px",
          },
        },
        {
          headerName: `${date} - Weight`,
          field: `${date}_TotalNetWeight`,
          width: 120,
          minWidth: 100,
          cellStyle: {
            display: "flex",
            alignItems: "center",
            paddingLeft: "12px",
          },
        },
      )
    })

    this.columnDefs.push(
      {
        headerName: "Total Vehicles",
        field: "TotalVehicleCount",
        width: 130,
        minWidth: 110,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
          fontWeight: "600",
        },
      },
      {
        headerName: "Total Weight",
        field: "TotalNetWeight",
        width: 130,
        minWidth: 110,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
          fontWeight: "600",
        },
      },
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
    if (!dateStr) return ""
    return new Date(dateStr).toISOString().split("T")[0]
  }

  toggleFilters() {
    this.isFiltersOpen = !this.isFiltersOpen
  }

  closeFilters() {
    this.isFiltersOpen = false
  }

  navigateBack() {
    this.router.navigateByUrl("/dashboard")
  }

  printReport() {
    window.print()
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

    const filteredUniqueDates = Array.from(
      new Set(
        this.uniqueDates.filter((date) =>
          filteredData.some(
            (ward) => ward[`${date}_VehicleCount`] > 0 || Number.parseFloat(ward[`${date}_TotalNetWeight`] || "0") > 0,
          ),
        ),
      ),
    ).sort()

    const excelData: any[] = []
    const headerRow1: any[] = ["Date"]
    filteredUniqueDates.forEach((date) => {
      const formattedDate = this.formatDateForExcel(date)
      headerRow1.push(formattedDate, "")
    })
    const headerRow2: any[] = ["Rowlabel"]
    filteredUniqueDates.forEach(() => headerRow2.push("Vehicles", "Weight"))

    excelData.push(headerRow1)
    excelData.push(headerRow2)

    filteredData.forEach((ward) => {
      const row: any[] = [ward.wardName]
      filteredUniqueDates.forEach((date) => {
        row.push(ward[`${date}_VehicleCount`] || 0, Number.parseFloat(ward[`${date}_TotalNetWeight`] || "0"))
      })
      excelData.push(row)
    })

    const totalRow: any[] = ["Total"]
    filteredUniqueDates.forEach((date) => {
      let totalVehiclesForDate = 0
      let totalWeightForDate = 0
      filteredData.forEach((ward) => {
        totalVehiclesForDate += ward[`${date}_VehicleCount`] || 0
        totalWeightForDate += Number.parseFloat(ward[`${date}_TotalNetWeight`] || "0")
      })
      totalRow.push(totalVehiclesForDate, totalWeightForDate)
    })
    excelData.push(totalRow)

    const worksheet = XLSX.utils.aoa_to_sheet(excelData)
    worksheet["!merges"] = []
    for (let i = 0; i < filteredUniqueDates.length; i++) {
      const startCol = 1 + i * 2
      worksheet["!merges"].push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 1 } })
    }

    const colWidths = [{ wch: 15 }]
    for (let i = 0; i < filteredUniqueDates.length; i++) {
      colWidths.push({ wch: 10 }, { wch: 12 })
    }
    worksheet["!cols"] = colWidths

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ward Report")
    const fileName = `Ward_Report_${this.reportForm.value.month}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  formatDateForExcel(dateStr: string): string {
    const [year, month, day] = dateStr.split("-")
    return `${day}-${month}-${year}`
  }
}