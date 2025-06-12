import { Component, type OnInit, ViewChild, type ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { AgGridModule } from 'ag-grid-angular'
import { ICellRendererParams, ValueFormatterParams, ColDef } from 'ag-grid-community'

@Component({
  selector: "app-export",
  templateUrl: "./export.component.html",
  styleUrls: ["./export.component.scss"],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, AgGridModule],
})
export class ExportComponent implements OnInit {
  @ViewChild("fileTable") fileTable!: ElementRef

  // UI state
  isLoading = false
  activeTab = "export"
  showAdvancedFilters = false
  exportHistory: any[] = []
  selectedFile: any = null
  isFiltersOpen = false

  // AG Grid configuration
  columnDefs: ColDef[] = []
  defaultColDef = {
    resizable: true,
    flex: 1,
    sortable: true,
    filter: true,
  }

  // Filter states
  filters = {
    weighbridge: "all",
    fromDate: "",
    toDate: "",
    reportType: "",
    grossWeight: {
      enabled: false,
      from: 0,
      to: 0,
    },
    agency: {
      enabled: false,
      value: "",
    },
    vehicleNumber: {
      enabled: false,
      value: "",
    },
    shift: {
      enabled: false,
      value: "",
      shift1: false,
      shift2: false,
      shift3: false,
    },
    hourly: {
      enabled: false,
      morning: false,
      afternoon: false,
      night: false,
      timeValue: "",
    },
    garbageType: {
      enabled: false,
      value: "",
    },
    ward: {
      enabled: false,
      value: "",
    },
    workCode: {
      enabled: false,
      value: "",
    },
  }
  
    // Mock data sources
  weighbridgeOptions = [
    { id: "all", name: "All" },
    { id: "K", name: "Kanjur" },
    { id: "D", name: "Deonar" },
  ]

  reportTypeOptions = [
    { id: 0, name: "Out" },
    { id: 1, name: "In" },
  ]

  agencyOptions = [
    { id: 1, name: "ABC Waste Management" },
    { id: 2, name: "XYZ Disposal Services" },
    { id: 3, name: "City Sanitation Department" },
  ]

  vehicleOptions = [
    { id: 1, number: "MH01-AB-1234" },
    { id: 2, number: "MH01-CD-5678" },
    { id: 3, number: "MH01-EF-9012" },
  ]

  garbageTypeOptions = [
    { id: 1, name: "Solid Waste" },
    { id: 2, name: "Recyclable" },
    { id: 3, name: "Hazardous" },
  ]

  wardOptions = [
    { id: 1, name: "Ward A" },
    { id: 2, name: "Ward B" },
    { id: 3, name: "Ward C" },
  ]

  workCodeOptions = ["WC001", "WC002", "WC003"]

  timeOptions = {
    morning: ["7 AM-7:59:59 AM", "8 AM-8:59:59 AM", "9 AM-9:59:59 AM", "10 AM-10:59:59 AM", "11 AM-11:59:59 AM"],
    afternoon: ["12 PM-12:59:59 PM", "1 PM-1:59:59 PM", "2 PM-2:59:59 PM", "3 PM-3:59:59 PM", "4 PM-4:59:59 PM"],
    night: ["6 PM-6:59:59 PM", "7 PM-7:59:59 PM", "8 PM-8:59:59 PM", "9 PM-9:59:59 PM", "10 PM-10:59:59 PM"],
  }


  constructor(private router: Router) {}

  ngOnInit() {
    // Set default dates (current month)
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

    this.filters.fromDate = this.formatDateForInput(firstDay)
    this.filters.toDate = this.formatDateForInput(today)

    // Initialize AG Grid column definitions
    this.setupColumnDefs()

    // Initialize export history with mock data
    this.initExportHistory()
  }

  setupColumnDefs() {
    this.columnDefs = [
      {
        headerName: "Slip No",
        field: "slipNo",
        width: 120,
        flex: 0,
        cellRenderer: (params: ICellRendererParams) => {
          return `<span style="font-weight: bold; color: #1a2a6c;">${params.value}</span>`
        },
      },
      {
        headerName: "Date",
        field: "date",
        width: 130,
        flex: 0,
      },
      {
        headerName: "Agency",
        field: "agency",
        flex: 1,
      },
      {
        headerName: "Vehicle No",
        field: "vehicleNo",
        width: 140,
        flex: 0,
      },
      {
        headerName: "Type of Waste",
        field: "wasteType",
        flex: 1,
      },
      {
        headerName: "Gross Weight",
        field: "grossWeight",
        width: 140,
        flex: 0,
        valueFormatter: this.weightFormatter,
        cellRenderer: (params: ICellRendererParams) => {
          const value = params.value ? Number(params.value).toFixed(2) : "0.00"
          return `<span style="font-family: 'Courier New', monospace;">${value} kg</span>`
        },
      },
      {
        headerName: "Net Weight",
        field: "netWeight",
        width: 140,
        flex: 0,
        valueFormatter: this.weightFormatter,
        cellRenderer: (params: ICellRendererParams) => {
          const value = params.value ? Number(params.value).toFixed(2) : "0.00"
          return `<span style="font-weight: bold; font-family: 'Courier New', monospace;">${value} kg</span>`
        },
      },
    ]
  }

  weightFormatter(params: ValueFormatterParams) {
    if (params.value != null) {
      return Number(params.value).toFixed(2) + " kg"
    }
    return "0.00 kg"
  }

  formatDateForInput(date: Date): string {
    return date.toISOString().split("T")[0]
  }

  formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters
  }

  setActiveTab(tab: string) {
    this.activeTab = tab
  }

  toggleFilters() {
    this.isFiltersOpen = !this.isFiltersOpen
  }

  closeFilters() {
    this.isFiltersOpen = false
  }

  resetFilters() {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

    this.filters = {
      weighbridge: "all",
      fromDate: this.formatDateForInput(firstDay),
      toDate: this.formatDateForInput(today),
      reportType: "",
      grossWeight: {
        enabled: false,
        from: 0,
        to: 0,
      },
      agency: {
        enabled: false,
        value: "",
      },
      vehicleNumber: {
        enabled: false,
        value: "",
      },
      shift: {
        enabled: false,
        value: "",
        shift1: false,
        shift2: false,
        shift3: false,
      },
      hourly: {
        enabled: false,
        morning: false,
        afternoon: false,
        night: false,
        timeValue: "",
      },
      garbageType: {
        enabled: false,
        value: "",
      },
      ward: {
        enabled: false,
        value: "",
      },
      workCode: {
        enabled: false,
        value: "",
      },
    }

    this.showAdvancedFilters = false
  }

  exportToExcel() {
    if (!this.filters.fromDate || !this.filters.toDate) {
      alert("Please enter From Date and To Date")
      return
    }

    if (new Date(this.filters.fromDate) > new Date(this.filters.toDate)) {
      alert("From Date must be less than To Date")
      return
    }

    if (!this.filters.reportType) {
      alert("Please select a Report Type")
      return
    }

    this.isLoading = true

    // Simulate API call with timeout
    setTimeout(() => {
      // Generate a new export file
      const newExport = this.generateMockExport()
      this.exportHistory.unshift(newExport)

      // Select the newly created file
      this.selectFile(newExport)

      this.isLoading = false
      this.activeTab = "history"
    }, 1500)
  }

  generateMockExport() {
    const reportType =
      this.reportTypeOptions.find((r) => r.id.toString() === this.filters.reportType)?.name || "Unknown"
    const weighbridge = this.weighbridgeOptions.find((w) => w.id === this.filters.weighbridge)?.name || "All"

    return {
      id: Math.floor(Math.random() * 10000),
      filename: `Export_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      createdAt: new Date().toISOString(),
      filters: {
        weighbridge: weighbridge,
        reportType: reportType,
        dateRange: `${this.formatDateForDisplay(this.filters.fromDate)} - ${this.formatDateForDisplay(this.filters.toDate)}`,
      },
      stats: {
        totalRecords: Math.floor(Math.random() * 500) + 50,
        totalVehicles: Math.floor(Math.random() * 100) + 20,
        totalWeight: Math.floor(Math.random() * 10000) + 1000,
      },
      previewData: this.generateMockPreviewData(),
    }
  }

  generateMockPreviewData() {
    return Array(10)
      .fill(0)
      .map((_, index) => ({
        slipNo: `SLP${10000 + index}`,
        date: this.formatDateForDisplay(new Date().toISOString()),
        agency: this.agencyOptions[Math.floor(Math.random() * this.agencyOptions.length)].name,
        vehicleNo: this.vehicleOptions[Math.floor(Math.random() * this.vehicleOptions.length)].number,
        wasteType: this.garbageTypeOptions[Math.floor(Math.random() * this.garbageTypeOptions.length)].name,
        grossWeight: Math.floor(Math.random() * 5000) + 1000,
        netWeight: Math.floor(Math.random() * 3000) + 500,
      }))
  }

  selectFile(file: any) {
    this.selectedFile = file
  }

  downloadFile(file: any) {
    alert(`Downloading file: ${file.filename}`)
  }

  deleteFile(file: any, event: Event) {
    event.stopPropagation()
    if (confirm(`Are you sure you want to delete ${file.filename}?`)) {
      this.exportHistory = this.exportHistory.filter((f) => f.id !== file.id)
      if (this.selectedFile && this.selectedFile.id === file.id) {
        this.selectedFile = this.exportHistory.length > 0 ? this.exportHistory[0] : null
      }
    }
  }

  navigateBack() {
    this.router.navigateByUrl("/dashboard")
  }

  initExportHistory() {
    // Generate some mock export history
    const today = new Date()

    for (let i = 1; i <= 5; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)

      this.exportHistory.push({
        id: i,
        filename: `Export_${i % 2 === 0 ? "In" : "Out"}_${date.toISOString().slice(0, 10)}.xlsx`,
        createdAt: date.toISOString(),
        filters: {
          weighbridge: i % 3 === 0 ? "Kanjur" : i % 3 === 1 ? "Deonar" : "All",
          reportType: i % 2 === 0 ? "In" : "Out",
          dateRange: `${this.formatDateForDisplay(new Date(date.getFullYear(), date.getMonth(), 1).toISOString())} - ${this.formatDateForDisplay(date.toISOString())}`,
        },
        stats: {
          totalRecords: Math.floor(Math.random() * 500) + 50,
          totalVehicles: Math.floor(Math.random() * 100) + 20,
          totalWeight: Math.floor(Math.random() * 10000) + 1000,
        },
        previewData: this.generateMockPreviewData(),
      })
    }

    // Select the first file by default
    if (this.exportHistory.length > 0) {
      this.selectedFile = this.exportHistory[0]
    }
  }
}
