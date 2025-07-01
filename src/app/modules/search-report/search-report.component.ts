import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { DbCallingService } from "src/app/core/services/db-calling.service";
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import { ViewChild } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';


@Component({
  selector: "app-search-report",
  templateUrl: "./search-report.component.html",
  styleUrls: ["./search-report.component.scss"],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, AgGridModule],
})
export class SearchReportComponent implements OnInit {
  // Form models
  reportForm!: FormGroup
  reportData: any[] = []
  // UI state
  isLoading = false
  isAdvancedSearch = false
  activeTab = "search"
  isFiltersOpen = false

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
  // columnDefs = [
  //   {
  //     headerName: "Slip No",
  //     field: "SlipSrNo",
  //     sortable: true,
  //     filter: true,
  //     cellRenderer: (params: ICellRendererParams) => `<strong>${params.value}</strong>`,
  //   },
  //   { headerName: "Date", field: "Trans_Date", sortable: true, filter: true },
  //   { headerName: "Time", field: "Trans_Time", sortable: true, filter: true },
  //   { headerName: "Agency", field: "Agency_Name", sortable: true, filter: true },
  //   { headerName: "Vehicle No", field: "Vehicle_No", sortable: true, filter: true },
  //   { headerName: "Type of Waste", field: "Type_of_Garbage", sortable: true, filter: true },
  //   {
  //     headerName: "Gross Weight",
  //     field: "Gross_Weight",
  //     sortable: true,
  //     filter: true,
  //     valueFormatter: this.weightFormatter,
  //   },
  //   {
  //     headerName: "Net Weight",
  //     field: "Act_Net_Weight",
  //     sortable: true,
  //     filter: true,
  //     valueFormatter: this.weightFormatter,
  //   },
  //   {
  //     headerName: "Actions",
  //     cellRenderer: this.actionCellRenderer,
  //     colId: "actions",
  //     sortable: false,
  //     filter: false,
  //     width: 120,
  //   },
  // ]
  columnDefs = [
    { headerName: "Slip No", field: "slipSrNo", sortable: true, filter: true },
    { headerName: "Date", field: "trans_Date", sortable: true, filter: true },
    { headerName: "Time", field: "trans_Time", sortable: true, filter: true },
    { headerName: "Agency", field: "agency_Name", sortable: true, filter: true },
    { headerName: "Vehicle No", field: "vehicle_No", sortable: true, filter: true },
    { headerName: "Type of Waste", field: "type_of_Garbage", sortable: true, filter: true },
    { headerName: "Gross Weight", field: "gross_Weight", sortable: true, filter: true },
    { headerName: "Net Weight", field: "net_Weight", sortable: true, filter: true },
    {
      headerName: "Actions",
      cellRenderer: this.actionCellRenderer,
      colId: "actions",
      sortable: false,
      filter: false,
      width: 120,
    }
  ];

  defaultColDef = {
    resizable: true,
    flex: 1,
  }
  weightFormatter(params: any) {
    if (params.value != null) {
      return params.value.toFixed(2)
    }
    return ""
  }
  actionCellRenderer(params: any) {
    return `
      <button class="btn-view" title="View">
        <i class="fas fa-eye"></i>
      </button>
      <button class="btn-image" title="Image">
        <i class="fas fa-image"></i>
      </button>
    `
  }

  // Data sources (mock data)
  WeighBridgeData = [
    { id: "WBK1", WeighBridge: "Kanjur" },
    { id: "D", WeighBridge: "Deonar" },
    { id: "ALLWB", WeighBridge: "All" },
  ]

  reportTypeList = [
    { id: 0, value: "Out" },
    { id: 1, value: "In" },
  ]

  AgencyData = [
    { FirmName: "ABC Waste Management" },
    { FirmName: "XYZ Disposal Services" },
    { FirmName: "City Sanitation Department" },
  ]

  VehcleData = [{ Veh_Num: "MH01-AB-1234" }, { Veh_Num: "MH01-CD-5678" }, { Veh_Num: "MH01-EF-9012" }]

  GarbageData = [{ GarbageType: "Solid Waste" }, { GarbageType: "Recyclable" }, { GarbageType: "Hazardous" }]

  WardData = [{ WardName: "Ward A" }, { WardName: "Ward B" }, { WardName: "Ward C" }]

  uniqueWorkcode = ["WC001", "WC002", "WC003"]
  uniqueZone = ["North", "South", "East", "West"]

  morningHourDDL = ["7 AM-7:59:59 AM", "8 AM-8:59:59 AM", "9 AM-9:59:59 AM", "10 AM-10:59:59 AM", "11 AM-11:59:59 AM"]

  afternoonHourDDL = ["12 PM-12:59:59 PM", "1 PM-1:59:59 PM", "2 PM-2:59:59 PM", "3 PM-3:59:59 PM", "4 PM-4:59:59 PM"]

  nightHourDDL = ["6 PM-6:59:59 PM", "7 PM-7:59:59 PM", "8 PM-8:59:59 PM", "9 PM-9:59:59 PM", "10 PM-10:59:59 PM"]

  // Results (mock data)
  lstReportData: any[] = []
  reportmodel: {
    WeighBridge: string;
    reportType: number | null;
    FromDate: string;
    todate: string;
    selectNallah: string;
  } = {
      WeighBridge: '',
      reportType: null,
      FromDate: '',
      todate: '',
      selectNallah: ''
    };


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

  constructor(
    public router: Router,
    private fb: FormBuilder,
    private dbService: DbCallingService
  ) { }

  ngOnInit() {
    this.initForm()

    // // Set default dates (current month)
    // const today = new Date()
    // const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

    // this.formData.FormDate = this.formatDate(firstDay)
    // this.formData.todate = this.formatDate(today)
  }

  formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  initForm() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.reportForm = this.fb.group({
      WeighBridge: [''],
      FromDate: [this.formatDate(firstDay)],
      todate: [this.formatDate(today)],
      reportType: [0]
    });
  }

  toggleAdvancedSearch() {
    this.isAdvancedSearch = !this.isAdvancedSearch
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

  // Form event handlers
  getWeighBridge(e: any) {
    const selected = e.target.value;
    if (selected === 'Kanjur') {
      this.reportmodel.WeighBridge = 'K';
    } else if (selected === 'Deonar') {
      this.reportmodel.WeighBridge = 'D';
    } else {
      this.reportmodel.WeighBridge = '';
    }
  }

  getreportType(e: any) {
    this.reportmodel.reportType = Number(e.target.value);
  }

  getNallah(event: any) {
    this.formData.selectNallah = event.target.value
  }

  // Checkbox handlers
  isGrossWeightInKGChange(event: any) {
    this.GrossWeightInKAactive = event.target.checked
    if (!this.GrossWeightInKAactive) {
      this.formData.Gross_Weight_From = 0
      this.formData.Gross_Weight_To = 0
    }
  }

  isAgencynameChange(event: any) {
    this.AgencynameIsAactive = event.target.checked
    if (!this.AgencynameIsAactive) {
      this.formData.agencyName = ""
    }
  }

  isvehicleNumberChange(event: any) {
    this.vehicleNumberIsAactive = event.target.checked
    if (!this.vehicleNumberIsAactive) {
      this.formData.Vehicle_No = ""
    }
  }

  isTypeOfGarbageChange(event: any) {
    this.TypeOfGarbageIsAactive = event.target.checked
    if (!this.TypeOfGarbageIsAactive) {
      this.formData.TypeOfGarbage = ""
    }
  }

  isWardChange(event: any) {
    this.WardIsAactive = event.target.checked
    if (!this.WardIsAactive) {
      this.formData.Ward = ""
    }
  }

  isWorkCodeChange(event: any) {
    this.WorkCodeIsAactive = event.target.checked
    if (!this.WorkCodeIsAactive) {
      this.formData.Work_code = ""
    }
  }

  isShiftChange(event: any) {
    this.ShiftIsAactive = event.target.checked
    if (!this.ShiftIsAactive) {
      this.formData.Act_Shift = ""
      this.ShiftIsAactive1 = false
      this.ShiftIsAactive2 = false
      this.ShiftIsAactive3 = false
    } else {
      this.HourlyIsAactive = false
    }
  }

  isShift1Change(event: any) {
    this.ShiftIsAactive1 = event.target.checked
    if (this.ShiftIsAactive1) {
      this.formData.Act_Shift_UL = "I"
      this.ShiftIsAactive2 = false
      this.ShiftIsAactive3 = false
    }
  }

  isShift2Change(event: any) {
    this.ShiftIsAactive2 = event.target.checked
    if (this.ShiftIsAactive2) {
      this.formData.Act_Shift_UL = "II"
      this.ShiftIsAactive1 = false
      this.ShiftIsAactive3 = false
    }
  }

  isShift3Change(event: any) {
    this.ShiftIsAactive3 = event.target.checked
    if (this.ShiftIsAactive3) {
      this.formData.Act_Shift_UL = "III"
      this.ShiftIsAactive1 = false
      this.ShiftIsAactive2 = false
    }
  }

  isHourlyChange(event: any) {
    this.HourlyIsAactive = event.target.checked
    if (!this.HourlyIsAactive) {
      this.morningHourlyIsAactive = false
      this.afternoonHourlyIsAactive = false
      this.nightHourlyIsAactive = false
      this.formData.Trans_Time = ""
      this.formData.ShiftTimeFrom = ""
      this.formData.ShiftTimeTo = ""
    } else {
      this.ShiftIsAactive = false
    }
  }

  morningHourlyIsAactiveChange(event: any) {
    this.morningHourlyIsAactive = event.target.checked
    if (this.morningHourlyIsAactive) {
      this.formData.Trans_Time_UL = event.target.value
      this.afternoonHourlyIsAactive = false
      this.nightHourlyIsAactive = false
    }
  }

  afternoonHourlyIsAactiveChange(event: any) {
    this.afternoonHourlyIsAactive = event.target.checked
    if (this.afternoonHourlyIsAactive) {
      this.formData.Trans_Time_UL = event.target.value
      this.morningHourlyIsAactive = false
      this.nightHourlyIsAactive = false
    }
  }

  nightHourlyIsAactiveChange(event: any) {
    this.nightHourlyIsAactive = event.target.checked
    if (this.nightHourlyIsAactive) {
      this.formData.Trans_Time_UL = event.target.value
      this.afternoonHourlyIsAactive = false
      this.morningHourlyIsAactive = false
    }
  }

  // Dropdown selection handlers
  getAgencyname(event: any) {
    this.formData.agencyName = event.target.value
  }

  getvehicleNumber(event: any) {
    this.formData.Vehicle_No = event.target.value
  }

  getTypeOfGarbage(event: any) {
    this.formData.TypeOfGarbage = event.target.value
  }

  getWard(event: any) {
    this.formData.Ward = event.target.value
  }

  getWorkCode(event: any) {
    this.formData.Work_code = event.target.value
  }

  getMorningHour(event: any) {
    this.formData.Trans_Time = event.target.value
  }

  getafternoonHour(event: any) {
    this.formData.Trans_Time = event.target.value
  }

  getnightHour(event: any) {
    this.formData.Trans_Time = event.target.value
  }

  // Search submission
  onSubmit() {
    const formValues = this.reportForm.value;
    // Validation
    if (!formValues.FromDate || !formValues.todate) {
      alert("Please enter From Date and To Date");
      return;
    }

    if (new Date(formValues.FromDate) > new Date(formValues.todate)) {
      alert("From Date must be less than To Date");
      return;
    }

    // Create payload with explicit value extraction
    const basicPayload = {
      WeighBridge: this.reportForm.get('WeighBridge')?.value || '',
      FromDate: this.reportForm.get('FromDate')?.value,
      todate: this.reportForm.get('todate')?.value,
      reportType: this.reportForm.get('reportType')?.value
    };

    this.dbService.getSearchReports(basicPayload).subscribe(
      (response) => {

        if (response && (response as any).data) {
          this.reportData = (response as any).data;
        } else {
          this.reportData = [];
        }
      },
      (error) => {
        console.error('API Error:', error);
        this.reportData = [];
      }
    );

    this.isLoading = true;

    setTimeout(() => {
      //this.generateMockResults();
      this.isLoading = false;
      this.activeTab = "search";
    }, 1000);
  }
  generateMockResults() {
    // Generate 20 mock records
    this.lstReportData = Array(20)
      .fill(0)
      .map((_, index) => ({
        VerifiedStatus: index % 3 === 0 ? "Y" : "N",
        AuthorizedStatus: index % 4 === 0 ? "Y" : "N",
        DeliveryLocation: index % 2 === 0 ? "Kanjur" : "Deonar",
        SlipSrNo: `SLP${10000 + index}`,
        Trans_Date: this.formatDisplayDate(new Date()),
        Trans_Time: `${(8 + (index % 12)).toString().padStart(2, "0")}:${((index * 5) % 60).toString().padStart(2, "0")}`,
        DC_No: `DC${5000 + index}`,
        Agency_Name: this.AgencyData[index % this.AgencyData.length].FirmName,
        Vehicle_No: this.VehcleData[index % this.VehcleData.length].Veh_Num,
        VehicleType: index % 3 === 0 ? "Truck" : index % 3 === 1 ? "Dumper" : "Tipper",
        WorkCode: this.uniqueWorkcode[index % this.uniqueWorkcode.length],
        Ward: this.WardData[index % this.WardData.length].WardName,
        Type_of_Garbage: this.GarbageData[index % this.GarbageData.length].GarbageType,
        Gross_Weight: 1000 + index * 100,
        Trans_Date_UL: this.formatDisplayDate(new Date()),
        Trans_Time_UL: `${(10 + (index % 12)).toString().padStart(2, "0")}:${((index * 7) % 60).toString().padStart(2, "0")}`,
        Unladen_Weight: 500 + index * 50,
        Act_Net_Weight: 500 + index * 50,
        In_Vehicle_Image: "https://via.placeholder.com/150",
        Out_Vehicle_Image: "https://via.placeholder.com/150",
        Trans_Type: index % 2 === 0 ? "I" : "O",
      }))

    // Calculate summary statistics
    this.calculateSummaryStatistics()
  }

  formatDisplayDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  calculateSummaryStatistics() {
    this.totalNoOfVehicles = this.lstReportData.length
    this.totalInVehicles = this.lstReportData.filter((item) => item.Trans_Type === "I").length
    this.totalOutVehicles = this.lstReportData.filter((item) => item.Trans_Type === "O").length

    const grossWeightTotal = this.lstReportData.reduce((sum, item) => sum + Number(item.Gross_Weight || 0), 0)
    this.totalGrossWeightInKG = Number.parseFloat(grossWeightTotal.toFixed(2))
    this.totalGrossWeightInTon = Number.parseFloat((this.totalGrossWeightInKG / 1000).toFixed(2))

    const netWeightTotal = this.lstReportData.reduce((sum, item) => sum + Number(item.Act_Net_Weight || 0), 0)
    this.totalActualNetWeightInKG = Number.parseFloat(netWeightTotal.toFixed(2))
    this.totalActualNetWeightInTon = Number.parseFloat((this.totalActualNetWeightInKG / 1000).toFixed(2))

    const unladenWeightTotal = this.lstReportData.reduce((sum, item) => sum + Number(item.Unladen_Weight || 0), 0)
    this.totalUnladenWeightInKg = Number.parseFloat(unladenWeightTotal.toFixed(2))
    this.totalUnladenWeightInTon = Number.parseFloat((this.totalUnladenWeightInKg / 1000).toFixed(2))
  }

  // Navigation
  back() {
    this.router.navigateByUrl("/dashboard")
  }


  @ViewChild(AgGridAngular) agGrid!: AgGridAngular;

  // exportToExcel() {
  //   if (!this.reportData || this.reportData.length === 0) {
  //     alert("There is no data to export");
  //     return;
  //   }

  //   // Get filtered data from AG Grid
  //   const filteredData: any[] = [];
  //   this.agGrid.api.forEachNodeAfterFilter((node) => {
  //     if (node.data) {
  //       filteredData.push(node.data);
  //     }
  //   });

  //   if (filteredData.length === 0) {
  //     alert("No filtered data to export");
  //     return;
  //   }

  //   // Define a mapping from field names to column headers
  //   const columnMapping: { [key: string]: string } = {
  //     slipSrNo: "Slip No",
  //     trans_Date: "Date",
  //     trans_Time: "Time",
  //     agency_Name: "Agency",
  //     vehicle_No: "Vehicle No",
  //     type_of_Garbage: "Type of Waste",
  //     gross_Weight: "Gross Weight",
  //     net_Weight: "Net Weight",
  //   };

  //   // Transform filteredData to match UI headers
  //   const transformedData = filteredData.map(item => {
  //     const newItem: { [key: string]: any } = {};
  //     for (const key in columnMapping) {
  //       newItem[columnMapping[key]] = item[key];
  //     }
  //     return newItem;
  //   });

  //   // Create Excel file using filtered data
  //   const worksheet = XLSX.utils.json_to_sheet(transformedData);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

  //   const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  //   const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  //   FileSaver.saveAs(data, 'report.xlsx');
  // }
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

    // Column mapping from API fields to UI headers
    const columnMapping: { [key: string]: string } = {
      slipSrNo: "Slip No",
      trans_Date: "Date",
      trans_Time: "Time",
      agency_Name: "Agency",
      vehicle_No: "Vehicle No",
      type_of_Garbage: "Type of Waste",
      gross_Weight: "Gross Weight",
      net_Weight: "Net Weight",
    };

    // Convert to UI-based headers
    const transformedData = filteredData.map(item => {
      const row: { [key: string]: any } = {};
      for (const field in columnMapping) {
        row[columnMapping[field]] = item[field];
      }
      return row;
    });

    // Create worksheet without header
    const worksheet = XLSX.utils.json_to_sheet(transformedData);

    // Prepend UI-based header row at A1
    const headerRow = Object.values(columnMapping);
    XLSX.utils.sheet_add_aoa(worksheet, [headerRow], { origin: "A1" });

    // Adjust column widths
    const colWidths = headerRow.map(header => {
      const columnContent = [header, ...transformedData.map(row => String(row[header] ?? ""))];
      const maxLength = Math.max(...columnContent.map(val => val.length));
      return { wch: maxLength + 2 };
    });
    worksheet["!cols"] = colWidths;

    // Optional: Bold header styling (note: requires `xlsx-style` or pro version)
    headerRow.forEach((_, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true }
        };
      }
    });

    // Create and save workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    XLSX.writeFile(workbook, "report.xlsx");
  }

  resetForm() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.reportForm.reset({
      WeighBridge: '',
      FromDate: this.formatDate(firstDay),
      todate: this.formatDate(today),
      reportType: '',
      Gross_Weight_From: 0,
      Gross_Weight_To: 0,
      agencyName: '',
      Vehicle_No: '',
      TypeOfGarbage: '',
      Ward: '',
      Work_code: '',
      Act_Shift: '',
      Act_Shift_UL: '',
      Trans_Time: '',
      Trans_Time_UL: '',
      ShiftTimeFrom: '',
      ShiftTimeTo: '',
      selectNallah: ''
    });

    // Reset all filter states
    this.GrossWeightInKAactive = false;
    this.AgencynameIsAactive = false;
    this.vehicleNumberIsAactive = false;
    this.TypeOfGarbageIsAactive = false;
    this.WardIsAactive = false;
    this.WorkCodeIsAactive = false;
    this.ShiftIsAactive = false;
    this.ShiftIsAactive1 = false;
    this.ShiftIsAactive2 = false;
    this.ShiftIsAactive3 = false;
    this.HourlyIsAactive = false;
    this.morningHourlyIsAactive = false;
    this.afternoonHourlyIsAactive = false;
    this.nightHourlyIsAactive = false;
    this.ReportTypesAactive = false;

    // Reset results
    this.lstReportData = [];
    this.activeTab = "search";
  }
}
