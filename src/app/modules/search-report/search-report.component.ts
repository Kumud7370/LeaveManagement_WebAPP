// import { Component, OnInit, ViewChild, ChangeDetectorRef } from "@angular/core"
// import { CommonModule } from "@angular/common"
// import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
// import { Router, RouterModule } from "@angular/router"
// import { AgGridModule, AgGridAngular } from "ag-grid-angular"
// import { MatDialog, MatDialogModule } from "@angular/material/dialog"
// import { DbCallingService } from "src/app/core/services/db-calling.service"
// import * as XLSX from "xlsx"
// import { BtnSearchViewCellRenderer } from "./viewSearch/buttonSearchView-cell-renderer.component"
// import { BtnSearchPdfCellRenderer } from "./viewSearch/buttonSearchPdf-cell-renderer.component"
// import { ViewSearchReportComponent } from "./viewSearch/viewsearchreport.component"
// import moment from "moment"

// @Component({
//   selector: "app-search-report",
//   templateUrl: "./search-report.component.html",
//   styleUrls: ["./search-report.component.scss"],
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     ReactiveFormsModule,
//     RouterModule,
//     AgGridModule,
//     MatDialogModule,
//     BtnSearchViewCellRenderer,
//     BtnSearchPdfCellRenderer,
//     ViewSearchReportComponent,
//   ],
// })
// export class SearchReportComponent implements OnInit {
//   @ViewChild("agGrid") agGrid!: AgGridAngular

//   // Form models
//   reportForm!: FormGroup
//   reportData: any[] = []
//   lstSiteNames: any[] = []

//   // UI state
//   isLoading = false
//   isFiltersOpen = false
//   filterText = ""

//   // Updated columnDefs with View and PDF buttons
//   columnDefs: any = [
//     {
//       headerName: "View",
//       field: "slipSrNo",
//       cellRenderer: BtnSearchViewCellRenderer,
//       width: 90,
//       minWidth: 90,
//       maxWidth: 90,
//       suppressMovable: true,
//       cellStyle: {
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: "0",
//       },
//     },
//     {
//       headerName: "Location",
//       field: "locationName",
//       minWidth: 120,
//     },
//     {
//       headerName: "Slip No",
//       field: "slipSrNo",
//       cellStyle: { fontWeight: "bold" },
//       minWidth: 100,
//     },
//     {
//       headerName: "Transaction Date",
//       field: "trans_Date",
//       minWidth: 130,
//     },
//     {
//       headerName: "Transaction Time",
//       field: "trans_Time",
//       minWidth: 130,
//     },
//     {
//       headerName: "Agency",
//       field: "agency_Name",
//       minWidth: 150,
//     },
//     {
//       headerName: "Vehicle No",
//       field: "vehicle_No",
//       minWidth: 120,
//     },
//     {
//       headerName: "Vehicle Type",
//       field: "vehicleType",
//       minWidth: 120,
//     },
//     {
//       headerName: "Ward",
//       field: "ward",
//       minWidth: 80,
//     },
//     {
//       headerName: "Route No.",
//       field: "route",
//       minWidth: 100,
//     },
//     {
//       headerName: "Type of Waste",
//       field: "type_of_Garbage",
//       minWidth: 130,
//     },
//     {
//       headerName: "Gross Weight",
//       field: "gross_Weight",
//       valueFormatter: (params: any) => (params.value ? Number(params.value).toLocaleString() : ""),
//       cellStyle: { fontWeight: "bold" },
//       minWidth: 120,
//     },
//     {
//       headerName: "Trans Date UL",
//       field: "trans_Date_UL",
//       minWidth: 130,
//     },
//     {
//       headerName: "Trans Time UL",
//       field: "trans_Time_UL",
//       minWidth: 130,
//     },
//     {
//       headerName: "Unladen Weight",
//       field: "unladen_Weight",
//       valueFormatter: (params: any) => (params.value ? Number(params.value).toLocaleString() : ""),
//       cellStyle: { fontWeight: "bold" },
//       minWidth: 130,
//     },
//     {
//       headerName: "Actual Net Weight",
//       field: "act_Net_Weight",
//       valueFormatter: (params: any) => (params.value ? Number(params.value).toLocaleString() : ""),
//       cellStyle: { fontWeight: "bold" },
//       minWidth: 150,
//     },
//   ]

//   defaultColDef = {
//     resizable: true,
//     flex: 1,
//     minWidth: 100,
//     sortable: true,
//     filter: true,
//     wrapText: true,
//     autoHeight: true,
//     wrapHeaderText: true,
//     suppressMovable: true,
//   }

//   // Context for AG Grid
//   context: any
//   gridApi: any

//   // Summary statistics
//   totalNoOfVehicles = 0
//   totalGrossWeightInKG = 0
//   totalUnladenWeightInKg = 0
//   totalActualNetWeightInKG = 0

//   userId = 0
//   userSiteName = ""

//   constructor(
//     public router: Router,
//     private fb: FormBuilder,
//     private dbService: DbCallingService,
//     private dialog: MatDialog,
//     private cdr: ChangeDetectorRef,
//   ) {
//     this.userId = Number(sessionStorage.getItem("UserId")) || 0
//     this.userSiteName = String(sessionStorage.getItem("SiteName")) || ""

//     let obj = {
//       UserId: Number(this.userId),
//       SiteName: this.userSiteName,
//     }

//     this.dbService.GetSiteLocations(obj).subscribe({
//       next: (response: any) => {
//         if (response && response.data) {
//           this.lstSiteNames = response.data
//         }
//       },
//       error: (error: any) => {
//         console.error('Error loading site locations:', error)
//       }
//     })
//   }

//   ngOnInit() {
//     this.initForm()
//     this.loadInitialData()
//     this.context = { componentParent: this }
//   }

//   loadInitialData() {
//     const basicPayload = {
//       WeighBridge: "ALLWB",
//       FromDate: this.reportForm.get("FromDate")?.value,
//       todate: this.reportForm.get("todate")?.value,
//       reportType: 0,
//       UserID: Number(this.userId),
//       SiteName: this.userSiteName,
//     }

//     this.isLoading = true
//     this.dbService.getSearchReports(basicPayload).subscribe(
//       (response) => {
//         this.isLoading = false
//         if (response && (response as any).data) {
//           this.reportData = (response as any).data
//           this.calculateSummaryStatistics()
//         } else {
//           this.reportData = []
//           this.resetSummaryStatistics()
//         }
//         this.cdr.detectChanges()
//       },
//       (error) => {
//         console.error("API Error:", error)
//         this.isLoading = false
//         this.reportData = []
//         this.resetSummaryStatistics()
//         this.cdr.detectChanges()
//       },
//     )
//   }

//   initForm() {
//     const firstDay = moment().format('YYYY-MM-DD')
//     this.reportForm = this.fb.group({
//       WeighBridge: ["ALLWB", Validators.required],
//       FromDate: [firstDay],
//       todate: [firstDay],
//       reportType: [1],
//     })
//   }

//   toggleFilters(): void {
//     this.isFiltersOpen = !this.isFiltersOpen
//   }

//   closeFilters(): void {
//     this.isFiltersOpen = false
//   }

//   viewSearchReportDetails(data: any) {
//     let obj = { SlipSrNo: data.slipSrNo, SiteName: data.locationName }
//     this.dbService.GetTripDetailsForSlipGeneartion(obj).subscribe(
//       (response) => {
//         if (response && response.data) {
//           const Tdata = response.data[0]?.rtsData
//           const dialogRef = this.dialog.open(ViewSearchReportComponent, {
//             width: "90%",
//             maxWidth: "1200px",
//             height: "90%",
//             data: Tdata,
//             disableClose: false,
//             panelClass: "custom-dialog-container",
//           })
//           dialogRef.afterClosed().subscribe((result) => {
//             console.log("Search Report Dialog closed", result)
//           })
//         }
//       },
//       (error) => {
//         console.error("Error fetching Trip Details:", error)
//       }
//     )
//   }

//   onGridReady(params: any): void {
//     this.gridApi = params.api
//     // Auto-size columns on grid ready for better responsiveness
//     this.autoSizeColumns()
//   }

//   onFilterTextBoxChanged() {
//     if (this.gridApi) {
//       const filterValue = (document.getElementById("filter-text-box") as HTMLInputElement)?.value || ""
//       this.gridApi.setGridOption("quickFilterText", filterValue)
//     }
//   }

//   autoSizeColumns(): void {
//     if (this.gridApi) {
//       const allColumnIds = this.gridApi.getColumns()?.map((column: any) => column.getId()) || []
//       this.gridApi.autoSizeColumns(allColumnIds, false)
//     }
//   }

//   onSubmit() {
//     const formValues = this.reportForm.value

//     if (!formValues.FromDate || !formValues.todate) {
//       alert("Please enter From Date and To Date")
//       return
//     }
//     if (new Date(formValues.FromDate) > new Date(formValues.todate)) {
//       alert("From Date must be less than To Date")
//       return
//     }

//     this.closeFilters()

//     const basicPayload = {
//       WeighBridge: this.reportForm.get("WeighBridge")?.value || "",
//       FromDate: this.reportForm.get("FromDate")?.value,
//       todate: this.reportForm.get("todate")?.value,
//       reportType: 0,
//       UserID: Number(this.userId),
//       SiteName: this.userSiteName,
//     }

//     this.isLoading = true
//     this.dbService.getSearchReports(basicPayload).subscribe(
//       (response) => {
//         this.isLoading = false
//         if (response && (response as any).data) {
//           this.reportData = (response as any).data
//           this.calculateSummaryStatistics()
//         } else {
//           this.reportData = []
//           this.resetSummaryStatistics()
//         }
//         this.cdr.detectChanges()
//       },
//       (error) => {
//         console.error("API Error:", error)
//         this.isLoading = false
//         this.reportData = []
//         this.resetSummaryStatistics()
//         this.cdr.detectChanges()
//       },
//     )
//   }

//   calculateSummaryStatistics() {
//     if (!this.reportData || this.reportData.length === 0) {
//       this.resetSummaryStatistics()
//       return
//     }

//     const dataToCalculate = this.reportData
//     this.totalNoOfVehicles = dataToCalculate.length

//     const grossWeightTotal = dataToCalculate.reduce((sum, item) => {
//       const weight = Number(item.gross_Weight || item.Gross_Weight || 0)
//       return sum + weight
//     }, 0)
//     this.totalGrossWeightInKG = Number.parseFloat(grossWeightTotal.toFixed(2))

//     const netWeightTotal = dataToCalculate.reduce((sum, item) => {
//       const weight = Number(item.net_Weight || item.Act_Net_Weight || 0)
//       return sum + weight
//     }, 0)
//     this.totalActualNetWeightInKG = Number.parseFloat(netWeightTotal.toFixed(2))

//     const unladenWeightTotal = dataToCalculate.reduce((sum, item) => {
//       const weight = Number(item.unladen_Weight || item.Unladen_Weight || 0)
//       return sum + weight
//     }, 0)
//     this.totalUnladenWeightInKg = Number.parseFloat(unladenWeightTotal.toFixed(2))
//   }

//   resetSummaryStatistics() {
//     this.totalNoOfVehicles = 0
//     this.totalGrossWeightInKG = 0
//     this.totalUnladenWeightInKg = 0
//     this.totalActualNetWeightInKG = 0
//   }

//   back() {
//     this.router.navigateByUrl("/dashboard")
//   }

//   exportToExcel() {
//     if (!this.reportData || this.reportData.length === 0) {
//       alert("There is no data to export")
//       return
//     }

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

//     const columnMapping: any = {
//       locationName: "Location",
//       slipSrNo: "Slip No",
//       trans_Date: "Transaction Date",
//       trans_Time: "Transaction Time",
//       agency_Name: "Agency",
//       vehicle_No: "Vehicle No",
//       vehicleType: "Vehicle Type",
//       ward: "Ward",
//       route: "Route No.",
//       type_of_Garbage: "Type of Waste",
//       gross_Weight: "Gross Weight (kg)",
//       trans_Date_UL: "Trans Date UL",
//       trans_Time_UL: "Trans Time UL",
//       unladen_Weight: "Unladen Weight (kg)",
//       act_Net_Weight: "Actual Net Weight (kg)",
//     }

//     const transformedData = filteredData.map((item) => {
//       const row: any = {}
//       for (const key of Object.keys(columnMapping)) {
//         let val = item[key]
//         if (["slipSrNo", "gross_Weight", "unladen_Weight", "act_Net_Weight"].includes(key)) {
//           val = val ? Number(val) : 0
//         }
//         row[columnMapping[key]] = val ?? ""
//       }
//       return row
//     })

//     const totalGross = filteredData.reduce(
//       (sum, row) => sum + (Number(row.gross_Weight) || 0),
//       0
//     )
//     const totalUnladen = filteredData.reduce(
//       (sum, row) => sum + (Number(row.unladen_Weight) || 0),
//       0
//     )
//     const totalActualNet = filteredData.reduce(
//       (sum, row) => sum + (Number(row.act_Net_Weight) || 0),
//       0
//     )

//     const totalRow: any = {}
//     Object.keys(columnMapping).forEach((key) => {
//       const header = columnMapping[key]
//       if (key === "gross_Weight") totalRow[header] = totalGross.toLocaleString() + " kg"
//       else if (key === "unladen_Weight")
//         totalRow[header] = totalUnladen.toLocaleString() + " kg"
//       else if (key === "act_Net_Weight")
//         totalRow[header] = totalActualNet.toLocaleString() + " kg"
//       else if (key === "locationName")
//         totalRow[header] = "TOTAL"
//       else totalRow[header] = ""
//     })

//     transformedData.push(totalRow)

//     const worksheet = XLSX.utils.json_to_sheet(transformedData)
//     const headerRow = Object.values(columnMapping)
//     XLSX.utils.sheet_add_aoa(worksheet, [headerRow], { origin: "A1" })

//     const colWidths = headerRow.map((header: any) => {
//       const columnContent = [header, ...transformedData.map((row) => String(row[header] ?? ""))]
//       const maxLength = Math.max(...columnContent.map((val) => val.length))
//       return { wch: maxLength + 2 }
//     })
//     worksheet["!cols"] = colWidths

//     const workbook = XLSX.utils.book_new()
//     XLSX.utils.book_append_sheet(workbook, worksheet, "SearchReport")

//     XLSX.writeFile(workbook, "SearchReport.xlsx")
//   }

//   resetForm() {
//     const today = new Date()
//     const firstDay = moment().format('YYYY-MM-DD')

//     this.reportForm.reset({
//       WeighBridge: "ALLWB",
//       FromDate: firstDay,
//       todate: firstDay,
//       reportType: 1,
//     })

//     this.reportData = []
//     this.resetSummaryStatistics()
//   }
// }