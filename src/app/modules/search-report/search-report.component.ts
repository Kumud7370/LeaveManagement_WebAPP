import { Component, OnInit, ViewChild, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { AgGridModule, AgGridAngular } from "ag-grid-angular"
import { MatDialog, MatDialogModule } from "@angular/material/dialog"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import * as XLSX from "xlsx"
import { BtnSearchViewCellRenderer } from "./viewSearch/buttonSearchView-cell-renderer.component"
import { BtnSearchPdfCellRenderer } from "./viewSearch/buttonSearchPdf-cell-renderer.component"
import { ViewSearchReportComponent } from "./viewSearch/viewsearchreport.component"
import moment from "moment"
import { wrap } from "module"

@Component({
  selector: "app-search-report",
  templateUrl: "./search-report.component.html",
  styleUrls: ["./search-report.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    AgGridModule,
    MatDialogModule,
    BtnSearchViewCellRenderer,
    BtnSearchPdfCellRenderer,
    ViewSearchReportComponent,
  ],
})
export class SearchReportComponent implements OnInit {
  @ViewChild("agGrid") agGrid!: AgGridAngular

  // Form models
  reportForm!: FormGroup
  reportData: any[] = []
  lstSiteNames: any[] = []
  // UI state
  isLoading = false
  isAdvancedSearch = false
  activeTab = "search"
  isFiltersOpen = false
  filterText = ""
  // Filter states
  GrossWeightInKAactive = false
  AgencynameIsAactive = false
  vehicleNumberIsAactive = false
  TypeOfGarbageIsAactive = false
  WardIsAactive = false
  WorkCodeIsAactive = false
  ShiftIsAactive = false
  ShiftIsAactive1 = false
  ShiftIsAactive2 = false
  ShiftIsAactive3 = false
  HourlyIsAactive = false
  morningHourlyIsAactive = false
  afternoonHourlyIsAactive = false
  nightHourlyIsAactive = false
  ReportTypesAactive = false

  // Mock data for UI demonstration
  formData = {
    WeighBridge: "",
    FromDate: "",
    todate: "",
    reportType: 0,
    Gross_Weight_From: 0,
    Gross_Weight_To: 0,
    agencyName: "",
    Vehicle_No: "",
    TypeOfGarbage: "",
    Ward: "",
    Work_code: "",
    Act_Shift: "",
    Act_Shift_UL: "",
    Trans_Time: "",
    Trans_Time_UL: "",
    ShiftTimeFrom: "",
    ShiftTimeTo: "",
    selectNallah: "",
  }

  // Updated columnDefs with View and PDF buttons
  columnDefs:any = [
    {
      headerName: "View",
      field: "slipSrNo",
      cellRenderer: BtnSearchViewCellRenderer,
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      suppressMovable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0",
      },
    },
    {
      headerName: "Location",
      field: "locationName",
    },
    {
      headerName: "Slip No",
      field: "slipSrNo",
      cellStyle: { fontWeight: "bold", },
    },
    {
      headerName: "Transaction Date",
      field: "trans_Date",
    },
    {
      headerName: "Transaction Time",
      field: "trans_Time",
    },
    {
      headerName: "Agency",
      field: "agency_Name",
    },
    {
      headerName: "Vehicle No",
      field: "vehicle_No",
    },
    {
      headerName: "Vehicle Type",
      field: "vehicleType",
    },
    {
      headerName: "Ward",
      field: "ward",
    },
    {
      headerName: "Route No.",
      field: "route",
    },
    {
      headerName: "Type of Waste",
      field: "type_of_Garbage",
    },
    {
      headerName: "Gross Weight",
      field: "gross_Weight",
      valueFormatter: (params:any) => (params.value ? Number(params.value).toLocaleString() : ""),
      cellStyle: { fontWeight: "bold" },
    },
    {
      headerName: "Trans Date UL",
      field: "trans_Date_UL",
    },
    {
      headerName: "Trans Time UL",
      field: "trans_Time_UL",
    },
    {
      headerName: "Unladen Weight",
      field: "unladen_Weight",
      valueFormatter: (params:any) => (params.value ? Number(params.value).toLocaleString() : ""),
      cellStyle: { fontWeight: "bold" },
    },
    {
      headerName: "Actual Net Weight",
      field: "act_Net_Weight",
      valueFormatter: (params:any) => (params.value ? Number(params.value).toLocaleString() : ""),
      cellStyle: { fontWeight: "bold" },
    },
  ];

  defaultColDef = {
    resizable: true,
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    wrapText: true,
    autoHeight: true,
    wrapHeaderText: true,
  };

  // Context for AG Grid
  context: any
  gridApi: any

  weightFormatter(params: any) {
    if (params.value != null) {
      return params.value.toFixed(2)
    }
    return ""
  }


  // Results (mock data)
  lstReportData: any[] = []
  reportmodel: {
    WeighBridge: string
    reportType: number | null
    FromDate: string
    todate: string
    selectNallah: string
  } = {
      WeighBridge: "",
      reportType: null,
      FromDate: "",
      todate: "",
      selectNallah: "",
    }

  // Summary statistics
  totalNoOfVehicles = 0
  totalInVehicles = 0
  totalOutVehicles = 0
  totalGrossWeightInKG = 0
  totalGrossWeightInTon = 0
  totalUnladenWeightInKg = 0
  totalUnladenWeightInTon = 0
  totalActualNetWeightInKG = 0
  totalActualNetWeightInTon = 0
  userId = 0
  userSiteName = ""
  constructor(
    public router: Router,
    private fb: FormBuilder,
    private dbService: DbCallingService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {
    fetch('https://swm.mcgm.gov.in/RTS/VehicleImage/grts/rts/in/44019.jpg')
      .then(r => console.log(r))

    // this.uRole = Number(sessionStorage.getItem("Role")) || 0
    // this.userType = Number(sessionStorage.getItem("UserType")) || 0
    this.userId = Number(sessionStorage.getItem("UserId")) || 0
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";
    let obj = {
      UserId: Number(this.userId),
      SiteName: this.userSiteName,
    }
    //  console.log("Loading initial data with params:", obj);
    this.dbService.GetSiteLocations(obj).subscribe({
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
    // Load initial data automatically with current month
    this.loadInitialData()
    // Set context for AG Grid
    this.context = { componentParent: this }
  }

  // NEW METHOD: Load initial data automatically with current month
  loadInitialData() {
    const today = moment().format('YYYY-MM-DD');
    const fromDate = moment().format('YYYY-MM-DD');

    const basicPayload = {
      WeighBridge: "ALLWB",
      FromDate: this.reportForm.get("FromDate")?.value,
      todate: this.reportForm.get("todate")?.value,
      reportType: 0,
      UserID: Number(this.userId),
      SiteName: this.userSiteName,
    }

    this.isLoading = true
    this.dbService.getSearchReports(basicPayload).subscribe(
      (response) => {
        this.isLoading = false
        if (response && (response as any).data) {
          this.reportData = (response as any).data
          this.calculateSummaryStatistics()
        } else {
          this.reportData = []
          this.resetSummaryStatistics()
        }
        this.cdr.detectChanges()
      },
      (error) => {
        console.error("API Error:", error)
        this.isLoading = false
        this.reportData = []
        this.resetSummaryStatistics()
        this.cdr.detectChanges()
      },
    )
  }

  formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  initForm() {
    const today = new Date()
    const firstDay = moment().format('YYYY-MM-DD');
    this.reportForm = this.fb.group({
      WeighBridge: ["ALLWB", Validators.required],
      FromDate: [firstDay],
      todate: [firstDay],
      reportType: [1],
    })
  }

  toggleAdvancedSearch() {
    this.isAdvancedSearch = !this.isAdvancedSearch
  }

  setActiveTab(tab: string) {
    this.activeTab = tab
  }

  // Toggle filters offcanvas
  toggleFilters(): void {
    this.isFiltersOpen = !this.isFiltersOpen
  }

  // Close filters offcanvas
  closeFilters(): void {
    this.isFiltersOpen = false
  }

  // Get selected period text for display
  getSelectedPeriod(): string {
    const formValues = this.reportForm.value
    if (formValues.FromDate && formValues.todate) {
      const fromDate = new Date(formValues.FromDate)
      const toDate = new Date(formValues.todate)

      if (fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()) {
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ]
        const monthName = monthNames[fromDate.getMonth()]
        return `${monthName} ${fromDate.getFullYear()}`
      } else {
        return `${formValues.FromDate} to ${formValues.todate}`
      }
    }
    return "Current Period"
  }


  // NEW METHODS: View and PDF functionality for Search Report
  viewSearchReportDetails(data: any) {

    let obj = { SlipSrNo: data.slipSrNo, SiteName: data.locationName }
    console.log("View Search Report method called with data:", data, obj)
    this.dbService.GetTripDetailsForSlipGeneartion(obj).subscribe(
      (response) => {
        console.log("Trip Details response:", response)
        if (response && response.data) {
          const Tdata = response.data[0]?.rtsData
          console.log("Trip Details Tdata:", Tdata)
          const dialogRef = this.dialog.open(ViewSearchReportComponent, {
            width: "90%",
            maxWidth: "1200px",
            height: "90%",
            data: Tdata,
            disableClose: false,
            panelClass: "custom-dialog-container",
          })
          dialogRef.afterClosed().subscribe((result) => {
            console.log("Search Report Dialog closed", result)
          })
        }
      },
      (error) => {
        console.error("Error fetching Trip Details:", error)
      }

    );

  }

  downloadSearchReportPDF(data: any) {
    console.log("Download Search Report PDF method called with data:", data)
    let obj = { SlipSrNo: data.slipSrNo, SiteName: data.locationName }
    console.log("View Search Report method called with data:", data, obj)
    this.dbService.GetTripDetailsForSlipGeneartion(obj).subscribe(
      (response) => {
        console.log("Trip Details response:", response)
        if (response && response.data) {
          const Tdata = response.data[0]?.rtsData
          console.log("Trip Details Tdata:", Tdata)
          // Create and open the view component to generate PDF
          const dialogRef = this.dialog.open(ViewSearchReportComponent, {
            width: "90%",
            maxWidth: "1200px",
            height: "90%",
            data: data,
            disableClose: false,
            panelClass: "custom-dialog-container",
          })

          // Automatically trigger PDF download after dialog opens
          dialogRef.afterOpened().subscribe(() => {
            setTimeout(() => {
              const componentInstance = dialogRef.componentInstance
              componentInstance.downloadPDF()
              dialogRef.close()
            }, 500)
          })
        }
      },
      (error) => {
        console.error("Error fetching Trip Details:", error)
      }

    );

  }

  // Grid methods
  onGridReady(params: any): void {
    this.gridApi = params.api
    console.log("Grid is ready")
  }
  onFilterTextBoxChanged() {
    if (this.gridApi) {
      const filterValue = (document.getElementById("filter-text-box") as HTMLInputElement)?.value || ""
      this.gridApi.setGridOption("quickFilterText", filterValue)
    }
  }

  // Auto Size and Fixed Width buttons functionality
  autoSizeAllColumns(): void {
    if (this.gridApi) {
      const allColumnIds = this.gridApi.getColumns()?.map((column: any) => column.getId()) || []
      this.gridApi.autoSizeColumns(allColumnIds, false)
    }
  }

  sizeColumnsToFit(): void {
    if (this.gridApi) {
      this.gridApi.sizeColumnsToFit()
    }
  }
  // Search submission
  onSubmit() {
    const formValues = this.reportForm.value
    // Validation
    if (!formValues.FromDate || !formValues.todate) {
      alert("Please enter From Date and To Date")
      return
    }
    if (new Date(formValues.FromDate) > new Date(formValues.todate)) {
      alert("From Date must be less than To Date")
      return
    }

    // Close filters
    this.closeFilters()

    // Create payload with explicit value extraction
    const basicPayload = {
      WeighBridge: this.reportForm.get("WeighBridge")?.value || "",
      FromDate: this.reportForm.get("FromDate")?.value,
      todate: this.reportForm.get("todate")?.value,
      reportType: 0,
      UserID: Number(this.userId),
      SiteName: this.userSiteName,
    }
    console.log("Submitting search with payload:", basicPayload)
    this.isLoading = true
    this.dbService.getSearchReports(basicPayload).subscribe(
      (response) => {
        this.isLoading = false
        if (response && (response as any).data) {
          this.reportData = (response as any).data
          // Calculate summary statistics after data is loaded
          this.calculateSummaryStatistics()
        } else {
          this.reportData = []
          this.resetSummaryStatistics()
        }
        this.activeTab = "search"
        this.cdr.detectChanges()
      },
      (error) => {
        console.error("API Error:", error)
        this.isLoading = false
        this.reportData = []
        this.resetSummaryStatistics()
        this.cdr.detectChanges()
      },
    )
  }

  formatDisplayDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  // FIXED: Updated to use reportData instead of lstReportData
  calculateSummaryStatistics() {
    if (!this.reportData || this.reportData.length === 0) {
      this.resetSummaryStatistics()
      return
    }

    // Use reportData (from API) instead of lstReportData
    const dataToCalculate = this.reportData
    this.totalNoOfVehicles = dataToCalculate.length

    // Count In and Out vehicles based on reportType or trans_Type field
    this.totalInVehicles = dataToCalculate.filter(
      (item) => item.trans_Type === "I" || item.reportType === 1 || item.type === "In",
    ).length
    this.totalOutVehicles = dataToCalculate.filter(
      (item) => item.trans_Type === "O" || item.reportType === 0 || item.type === "Out",
    ).length

    // Calculate gross weight totals
    const grossWeightTotal = dataToCalculate.reduce((sum, item) => {
      const weight = Number(item.gross_Weight || item.Gross_Weight || 0)
      return sum + weight
    }, 0)
    this.totalGrossWeightInKG = Number.parseFloat(grossWeightTotal.toFixed(2))
    this.totalGrossWeightInTon = Number.parseFloat((this.totalGrossWeightInKG / 1000).toFixed(2))

    // Calculate net weight totals
    const netWeightTotal = dataToCalculate.reduce((sum, item) => {
      const weight = Number(item.net_Weight || item.Act_Net_Weight || 0)
      return sum + weight
    }, 0)
    this.totalActualNetWeightInKG = Number.parseFloat(netWeightTotal.toFixed(2))
    this.totalActualNetWeightInTon = Number.parseFloat((this.totalActualNetWeightInKG / 1000).toFixed(2))

    // Calculate unladen weight totals
    const unladenWeightTotal = dataToCalculate.reduce((sum, item) => {
      const weight = Number(item.unladen_Weight || item.Unladen_Weight || 0)
      return sum + weight
    }, 0)
    this.totalUnladenWeightInKg = Number.parseFloat(unladenWeightTotal.toFixed(2))
    this.totalUnladenWeightInTon = Number.parseFloat((this.totalUnladenWeightInKg / 1000).toFixed(2))
  }

  // ADDED: Method to reset summary statistics
  resetSummaryStatistics() {
    this.totalNoOfVehicles = 0
    this.totalInVehicles = 0
    this.totalOutVehicles = 0
    this.totalGrossWeightInKG = 0
    this.totalGrossWeightInTon = 0
    this.totalUnladenWeightInKg = 0
    this.totalUnladenWeightInTon = 0
    this.totalActualNetWeightInKG = 0
    this.totalActualNetWeightInTon = 0
  }

  // Navigation
  back() {
    this.router.navigateByUrl("/dashboard")
  }

  exportToExcel() {
  if (!this.reportData || this.reportData.length === 0) {
    alert("There is no data to export");
    return;
  }

  const filteredData: any[] = [];
  this.agGrid.api.forEachNodeAfterFilter((node: any) => {
    if (node.data) {
      filteredData.push(node.data);
    }
  });

  if (filteredData.length === 0) {
    alert("No filtered data to export");
    return;
  }

  // Define which columns to export and their headers
  const columnMapping: any = {
    locationName: "Location",
    slipSrNo: "Slip No",
    trans_Date: "Transaction Date",
    trans_Time: "Transaction Time",
    agency_Name: "Agency",
    vehicle_No: "Vehicle No",
    vehicleType: "Vehicle Type",
    ward: "Ward",
    route: "Route No.",
    type_of_Garbage: "Type of Waste",
    gross_Weight: "Gross Weight (kg)",
    trans_Date_UL: "Trans Date UL",
    trans_Time_UL: "Trans Time UL",
    unladen_Weight: "Unladen Weight (kg)",
    act_Net_Weight: "Actual Net Weight (kg)",
  };

  // Transform data to match header order
  // Transform and clean data
  const transformedData = filteredData.map((item) => {
    const row: any = {};
    for (const key of Object.keys(columnMapping)) {
      let val = item[key];
      // Convert SlipNo and Weights to numbers
      if (["slipSrNo", "gross_Weight", "unladen_Weight", "act_Net_Weight"].includes(key)) {
        val = val ? Number(val) : 0;
      }
      row[columnMapping[key]] = val ?? "";
    }
    return row;
  });

  // Calculate totals for weight columns
  const totalGross = filteredData.reduce(
    (sum, row) => sum + (Number(row.gross_Weight) || 0),
    0
  );
  const totalUnladen = filteredData.reduce(
    (sum, row) => sum + (Number(row.unladen_Weight) || 0),
    0
  );
  const totalActualNet = filteredData.reduce(
    (sum, row) => sum + (Number(row.act_Net_Weight) || 0),
    0
  );

  // Create a total row
  const totalRow: any = {};
  Object.keys(columnMapping).forEach((key) => {
    const header = columnMapping[key];
    if (key === "gross_Weight") totalRow[header] = totalGross.toLocaleString() + " kg";
    else if (key === "unladen_Weight")
      totalRow[header] = totalUnladen.toLocaleString() + " kg";
    else if (key === "act_Net_Weight")
      totalRow[header] = totalActualNet.toLocaleString() + " kg";
    else if (key === "locationName")
      totalRow[header] = "TOTAL"; // Label cell
    else totalRow[header] = "";
  });

  transformedData.push(totalRow);

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(transformedData);

  // Prepend header row (first row)
  const headerRow = Object.values(columnMapping);
  XLSX.utils.sheet_add_aoa(worksheet, [headerRow], { origin: "A1" });

  // Adjust column widths dynamically
  const colWidths = headerRow.map((header:any) => {
    const columnContent = [header, ...transformedData.map((row) => String(row[header] ?? ""))];
    const maxLength = Math.max(...columnContent.map((val) => val.length));
    return { wch: maxLength + 2 };
  });
  worksheet["!cols"] = colWidths;

  // Apply basic Excel styling for the total row (bold text)
  const totalRowIndex = transformedData.length + 1; // +1 for header
  headerRow.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: totalRowIndex - 1, c: colIndex });
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = {
        font: { bold: true },
      };
    }
  });

  // Create workbook and export
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "SearchReport");

  XLSX.writeFile(workbook, "SearchReport.xlsx");
}

  resetForm() {
    const today = new Date()

    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    this.reportForm.reset({
      WeighBridge: "",
      FromDate: moment().format('YYYY-MM-DD'),
      todate: moment().format('YYYY-MM-DD'),
      reportType: "",
      Gross_Weight_From: 0,
      Gross_Weight_To: 0,
      agencyName: "",
      Vehicle_No: "",
      TypeOfGarbage: "",
      Ward: "",
      Work_code: "",
      Act_Shift: "",
      Act_Shift_UL: "",
      Trans_Time: "",
      Trans_Time_UL: "",
      ShiftTimeFrom: "",
      ShiftTimeTo: "",
      selectNallah: "",
    })

    // Reset all filter states
    this.GrossWeightInKAactive = false
    this.AgencynameIsAactive = false
    this.vehicleNumberIsAactive = false
    this.TypeOfGarbageIsAactive = false
    this.WardIsAactive = false
    this.WorkCodeIsAactive = false
    this.ShiftIsAactive = false
    this.ShiftIsAactive1 = false
    this.ShiftIsAactive2 = false
    this.ShiftIsAactive3 = false
    this.HourlyIsAactive = false
    this.morningHourlyIsAactive = false
    this.afternoonHourlyIsAactive = false
    this.nightHourlyIsAactive = false
    this.ReportTypesAactive = false

    // Reset results and summary
    this.reportData = []
    this.lstReportData = []
    this.resetSummaryStatistics()
    this.activeTab = "search"
  }

  printReport() {
    window.print()
  }
}
