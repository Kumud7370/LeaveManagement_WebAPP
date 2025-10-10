// import { Component, OnInit, ViewChild, ElementRef } from "@angular/core"
// import { CommonModule } from "@angular/common"
// import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
// import { Router, RouterModule } from "@angular/router"
// import { AgGridModule, AgGridAngular } from 'ag-grid-angular'
// import * as XLSX from "xlsx";
// import { DbCallingService } from "src/app/core/services/db-calling.service"

// declare const saveAs: (blob: Blob, filename: string) => void

// @Component({
//   selector: "app-ward-report",
//   templateUrl: "./ward-report.component.html",
//   styleUrls: ["./ward-report.component.scss"],
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule, RouterModule, AgGridModule],
// })
// export class WardReportComponent implements OnInit {
//   @ViewChild("reportContainer") reportContainer!: ElementRef
//   @ViewChild("agGrid") agGrid!: AgGridAngular

//   isLoading = false
//   showReport = true
//   activeView = "table"
//   isFiltersOpen = false

//   reportForm!: FormGroup

//   weighBridgeOptions = [
//     { id: "all", name: "All" },
//     { id: "WBK1", name: "Kanjur" },
//     { id: "WBD1", name: "Deonar" },
//   ]

//   wardData: any[] = []
//   uniqueDates: string[] = []
//   flattenedData: any[] = []
//   lstReportData: any[] = []

//   columnDefs: any[] = []
//   defaultColDef = {
//     resizable: true,
//     flex: 1,
//     sortable: true,
//     filter: true,
//   }

//   totalVehicles = 0
//   totalWeight = 0
//   topWard = ""
//   daysWithData = 0
// userId=0;
// userSiteName="";
// lstSiteNames:any[]=[];
//   constructor(
//     private fb: FormBuilder,
//     private router: Router,
//     private dbCallingService: DbCallingService,
//   ) {

//     this.userId = Number(sessionStorage.getItem("UserId")) || 0
//     this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";
//     let obj = {
//       UserId: Number(this.userId),
//       SiteName: this.userSiteName,
//     }
//     console.log("Loading initial data with params:", obj);
//     this.dbCallingService.GetSiteLocations(obj).subscribe({
//       next: (response: any) => {
//         console.log("response:", response);
//         if (response && response.data) {
//           this.lstSiteNames = response.data;

//         }
//       },
//       error: (error: any) => {
//         console.error('Error loading site locations:', error);
//       }
//     });
//   }

//   ngOnInit() {
//     this.initForm()
//     this.setupColumnDefs()
//     this.loadInitialData()
//   }

//   loadInitialData() {
//     const currentDate = new Date()
//     const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

//     this.isLoading = true
//     const weighBridge = ""
//     const fromDate = `${currentMonth}-01`

//     const payload = {
//       WeighBridge: "ALLWB",
//       FromDate: fromDate,
//       ToDate: "", // Not used by Wardwise SP
//       FullDate: "",
//       WardName: "",
//       Act_Shift: "",
//       TransactionDate: fromDate,
//       UserId: this.userId,
//       SiteName: this.userSiteName
//     }

//     console.log("Loading initial wardwise data with payload:", payload)

//     this.dbCallingService.getWardwiseReport(payload).subscribe({
//       next: (response) => {
//         console.log("Initial Wardwise API Response:", response)

//         // Check for success - consistent with shiftwise logic
//         if (
//           response &&
//           (response.serviceResponse === 1 || response.ServiceResponse === "Successful") &&
//           response.wardData?.length
//         ) {
//           console.log("Processing initial wardwise data:", response.wardData)
//           this.wardData = response.wardData
//           this.processDataForGrid()
//           this.calculateSummaryFromProcessedData()
//           console.log("Initial wardwise processed data:", this.lstReportData)
//         } else {
//           console.log("No initial wardwise data found")
//           this.resetData()
//         }
//         this.isLoading = false
//       },
//       error: (error) => {
//         console.error("Initial Wardwise API Error:", error)
//         this.resetData()
//         this.isLoading = false
//       },
//     })
//   }

//   initForm() {
//     const currentDate = new Date()
//     const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

//     this.reportForm = this.fb.group({
//       weighBridge: ["all", Validators.required],
//       month: [currentMonth, Validators.required],
//     })
//   }

//   setupColumnDefs() {
//     this.columnDefs = [
//       {
//         headerName: "Ward Name",
//         field: "wardName",
//         pinned: "left",
//         width: 150,
//         flex: 0,
//         cellRenderer: (params: any) => `<strong>${params.value || "N/A"}</strong>`,
//       },
//     ]
//   }

//   onSubmit() {
//     if (this.reportForm.invalid) return

//     this.isLoading = true
//     this.isFiltersOpen = false

//     const formValues = this.reportForm.value   
//     const fromDate = `${formValues.month}-01`

//     const payload = {
//       WeighBridge: this.reportForm.value,
//       FromDate: fromDate,
//       ToDate: "", // Not used by Wardwise SP
//       FullDate: "",
//       WardName: "",
//       Act_Shift: "",
//       TransactionDate: fromDate,
//     }

//     console.log("Submitting wardwise with payload:", payload)

//     this.dbCallingService.getWardwiseReport(payload).subscribe({
//       next: (response) => {
//         console.log("Wardwise API Response:", response)

//         // Check for success - consistent with shiftwise logic
//         if (
//           response &&
//           (response.serviceResponse === 1 || response.ServiceResponse === "Successful") &&
//           response.wardData?.length
//         ) {
//           console.log("Processing wardwise data:", response.wardData)
//           this.wardData = response.wardData
//           this.processDataForGrid()
//           this.calculateSummaryFromProcessedData()
//           console.log("Wardwise processed data:", this.lstReportData)
//           alert("Wardwise data retrieved successfully!")
//         } else {
//           console.log("No wardwise data found or invalid response")
//           alert(response?.msg || "No wardwise data found")
//           this.resetData()
//         }
//         this.isLoading = false
//       },
//       error: (error) => {
//         console.error("Wardwise API Error:", error)
//         alert("Failed to fetch wardwise data")
//         this.resetData()
//         this.isLoading = false
//       },
//     })
//   }

//   private resetData() {
//     this.wardData = []
//     this.lstReportData = []
//     this.flattenedData = []
//     this.resetSummaryStatistics()
//   }

//   processDataForGrid() {
//     if (!this.wardData || this.wardData.length === 0) {
//       this.lstReportData = []
//       this.uniqueDates = []
//       return
//     }

//     console.log("Processing wardwise data for grid:", this.wardData)

//     // Get unique dates and sort them - FIXED: use correct property name
//     this.uniqueDates = Array.from(
//       new Set(this.wardData.map((d) => this.formatDate(d.transactionDate || d.TransactionDate))),
//     ).sort()
//     console.log("Unique dates:", this.uniqueDates)

//     // Get unique ward names - FIXED: use correct property name
//     const uniqueWardNames = Array.from(new Set(this.wardData.map((d) => d.wardName || d.WardName)))
//     console.log("Unique ward names:", uniqueWardNames)

//     // Create flattened data for grid
//     this.flattenedData = uniqueWardNames.map((wardName) => {
//       const row: any = { wardName }
//       let totalVehicleCount = 0
//       let totalNetWeight = 0

//       this.uniqueDates.forEach((date) => {
//         // FIXED: Find data for this ward and date using correct property names
//         const dateData = this.wardData.filter((d) => {
//           const itemDate = this.formatDate(d.transactionDate || d.TransactionDate)
//           const itemWard = d.wardName || d.WardName
//           return itemDate === date && itemWard === wardName
//         })

//         console.log(`Data for ${wardName} - ${date}:`, dateData)

//         // FIXED: Use correct property names from API response
//         const vehicles = dateData.reduce((sum, item) => sum + (item.vehicleCount || item.VehicleCount || 0), 0)
//         const weight = dateData.reduce((sum, item) => sum + (item.totalNetWeight || item.TotalNetWeight || 0), 0)

//         row[`${date}_VehicleCount`] = vehicles
//         row[`${date}_TotalNetWeight`] = weight.toFixed(2)

//         totalVehicleCount += vehicles
//         totalNetWeight += weight
//       })

//       row["TotalVehicleCount"] = totalVehicleCount
//       row["TotalNetWeight"] = totalNetWeight.toFixed(2)

//       return row
//     })

//     console.log("Flattened wardwise data:", this.flattenedData)

//     this.setupDynamicColumns()
//     this.lstReportData = [...this.flattenedData]

//     console.log("Final wardwise lstReportData:", this.lstReportData)
//   }

//   setupDynamicColumns() {
//     this.columnDefs = [
//       {
//         headerName: "Ward Name",
//         field: "wardName",
//         pinned: "left",
//         width: 150,
//         flex: 0,
//         cellRenderer: (params: any) => `<strong>${params.value}</strong>`,
//       },
//     ]

//     this.uniqueDates.forEach((date) => {
//       this.columnDefs.push(
//         {
//           headerName: `${date} - Vehicles`,
//           field: `${date}_VehicleCount`,
//           width: 120,
//         },
//         {
//           headerName: `${date} - Weight`,
//           field: `${date}_TotalNetWeight`,
//           width: 120,
//         },
//       )
//     })

//     this.columnDefs.push(
//       { headerName: "Total Vehicles", field: "TotalVehicleCount", width: 130 },
//       { headerName: "Total Weight", field: "TotalNetWeight", width: 130 },
//     )
//   }

//   calculateSummaryFromProcessedData() {
//     if (!this.flattenedData || this.flattenedData.length === 0) {
//       this.resetSummaryStatistics()
//       return
//     }

//     const totalRow = this.flattenedData.reduce(
//       (acc, curr) => {
//         acc.TotalVehicleCount += curr.TotalVehicleCount
//         acc.TotalNetWeight += Number.parseFloat(curr.TotalNetWeight)
//         return acc
//       },
//       { TotalVehicleCount: 0, TotalNetWeight: 0 },
//     )

//     this.totalVehicles = totalRow.TotalVehicleCount
//     this.totalWeight = Number.parseFloat(totalRow.TotalNetWeight.toFixed(2))
//     this.daysWithData = this.uniqueDates.length

//     // Find top ward by weight
//     let maxWeight = 0
//     this.topWard = ""
//     this.flattenedData.forEach((ward) => {
//       const weight = Number.parseFloat(ward.TotalNetWeight)
//       if (weight > maxWeight) {
//         maxWeight = weight
//         this.topWard = ward.wardName
//       }
//     })

//     console.log("Wardwise summary calculated:", {
//       totalVehicles: this.totalVehicles,
//       totalWeight: this.totalWeight,
//       topWard: this.topWard,
//       daysWithData: this.daysWithData,
//     })
//   }

//   resetSummaryStatistics() {
//     this.totalVehicles = 0
//     this.totalWeight = 0
//     this.topWard = ""
//     this.daysWithData = 0
//     this.uniqueDates = []
//   }

//   formatDate(dateStr: string): string {
//     if (!dateStr) return ""
//     return new Date(dateStr).toISOString().split("T")[0] // yyyy-MM-dd
//   }

//   toggleFilters() {
//     this.isFiltersOpen = !this.isFiltersOpen
//   }

//   closeFilters() {
//     this.isFiltersOpen = false
//   }

//   navigateBack() {
//     this.router.navigateByUrl("/dashboard")
//   }

//   printReport() {
//     window.print()
//   }

//   exportToExcel() {
//     if (!this.lstReportData || this.lstReportData.length === 0) {
//       alert("There is no data to export")
//       return
//     }

//     // Get filtered data from AG Grid
//     const filteredData: any[] = []
//     this.agGrid.api.forEachNodeAfterFilter((node: any) => {
//       if (node.data) {
//         filteredData.push(node.data)
//       }
//     })

//     if (filteredData.length === 0) {
//       alert("No filtered data to export")
//       return
//     }

//     // Get unique dates from filtered data
//     const filteredUniqueDates = Array.from(
//       new Set(
//         this.uniqueDates.filter((date) => {
//           return filteredData.some(
//             (ward) => ward[`${date}_VehicleCount`] > 0 || Number.parseFloat(ward[`${date}_TotalNetWeight`] || "0") > 0,
//           )
//         }),
//       ),
//     ).sort()

//     const excelData: any[] = []

//     // First row - Date headers
//     const headerRow1: any[] = ["Date"]
//     filteredUniqueDates.forEach((date) => {
//       const formattedDate = this.formatDateForExcel(date)
//       headerRow1.push(formattedDate, "")
//     })

//     // Second row - Sub-headers
//     const headerRow2: any[] = ["Rowlabel"]
//     filteredUniqueDates.forEach(() => {
//       headerRow2.push("Vehicles", "Weight")
//     })

//     excelData.push(headerRow1)
//     excelData.push(headerRow2)

//     // Add filtered ward data rows
//     filteredData.forEach((ward) => {
//       const row: any[] = [ward.wardName]
//       filteredUniqueDates.forEach((date) => {
//         row.push(ward[`${date}_VehicleCount`] || 0, Number.parseFloat(ward[`${date}_TotalNetWeight`] || "0"))
//       })
//       excelData.push(row)
//     })

//     // Add total row
//     const totalRow: any[] = ["Total"]
//     filteredUniqueDates.forEach((date) => {
//       let totalVehiclesForDate = 0
//       let totalWeightForDate = 0
//       filteredData.forEach((ward) => {
//         totalVehiclesForDate += ward[`${date}_VehicleCount`] || 0
//         totalWeightForDate += Number.parseFloat(ward[`${date}_TotalNetWeight`] || "0")
//       })
//       totalRow.push(totalVehiclesForDate, totalWeightForDate)
//     })
//     excelData.push(totalRow)

//     // Create worksheet
//     const worksheet = XLSX.utils.aoa_to_sheet(excelData)

//     // Merge date cells
//     worksheet["!merges"] = []
//     for (let i = 0; i < filteredUniqueDates.length; i++) {
//       const startCol = 1 + i * 2
//       worksheet["!merges"].push({
//         s: { r: 0, c: startCol },
//         e: { r: 0, c: startCol + 1 },
//       })
//     }

//     // Set column widths
//     const colWidths = [{ wch: 15 }]
//     for (let i = 0; i < filteredUniqueDates.length; i++) {
//       colWidths.push({ wch: 10 }, { wch: 12 })
//     }
//     worksheet["!cols"] = colWidths

//     // Create and save workbook
//     const workbook = XLSX.utils.book_new()
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Ward Report")
//     const fileName = `Ward_Report_${this.reportForm.value.month}.xlsx`
//     XLSX.writeFile(workbook, fileName)
//   }

//   formatDateForExcel(dateStr: string): string {
//     const [year, month, day] = dateStr.split("-")
//     return `${day}-${month}-${year}`
//   }
// }




import { Component, OnInit, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { AgGridModule, AgGridAngular } from 'ag-grid-angular'
import * as XLSX from "xlsx";
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
  // <CHANGE> grid-related: align with SearchReport for wrapping/auto height
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
    this.loadInitialData()
  }

  loadInitialData() {
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

    this.isLoading = true
    const fromDate = `${currentMonth}-01`

    const payload = {
      WeighBridge: "ALLWB",
      FromDate: fromDate,
      ToDate: "", // Not used by Wardwise SP
      FullDate: "",
      WardName: "",
      Act_Shift: "",
      TransactionDate: fromDate,
      UserId: this.userId,
      SiteName: this.userSiteName
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
    const fromDate = `${formValues.month}-01`

    const payload = {
      WeighBridge: this.reportForm.value,
      FromDate: fromDate,
      ToDate: "", // Not used by Wardwise SP
      FullDate: "",
      WardName: "",
      Act_Shift: "",
      TransactionDate: fromDate,
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

    // Get unique dates and sort them
    this.uniqueDates = Array.from(
      new Set(this.wardData.map((d) => this.formatDate(d.transactionDate || d.TransactionDate))),
    ).sort()

    // Get unique ward names
    const uniqueWardNames = Array.from(new Set(this.wardData.map((d) => d.wardName || d.WardName)))

    // Create flattened data for grid
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
        { headerName: `${date} - Vehicles`, field: `${date}_VehicleCount`, width: 120 },
        { headerName: `${date} - Weight`, field: `${date}_TotalNetWeight`, width: 120 },
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

  toggleFilters() { this.isFiltersOpen = !this.isFiltersOpen }
  closeFilters() { this.isFiltersOpen = false }
  navigateBack() { this.router.navigateByUrl("/dashboard") }
  printReport() { window.print() }

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