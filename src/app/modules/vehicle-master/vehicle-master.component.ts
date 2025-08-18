import { Component, ElementRef, ViewChild, OnInit, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule, FormsModule } from "@angular/forms"
import { AgGridModule } from "ag-grid-angular"
import { AgGridAngular } from "ag-grid-angular"
import { Router } from "@angular/router"
import { FormBuilder, FormGroup, Validators, AbstractControl } from "@angular/forms"
import { GridApi, ColDef, GridReadyEvent } from "ag-grid-community"
import { MatDialog, MatDialogModule } from "@angular/material/dialog"
import Swal from "sweetalert2"
import moment from "moment"
import * as XLSX from "xlsx"
import { HttpClientModule, HttpClient } from "@angular/common/http"
import { environment } from "src/environments/environment"
import { DbCallingService } from "src/app/core/services/db-calling.service"

interface VehicleData {
  vehicleID: number
  vehicleNumber: string
  vehicleType: string
  agencyNo: number
  agencyName?: string
  grossWeight?: number
  tareWeight: number
  ward?: string
  locationName?: string
  isVehicleActive: number
  remark?: string
  createdby?: string
  createdOn?: string
  updatedby?: string
  updatedOn?: string
  siteName?: string
  isPrivate?: number
  date_of_Reg?: string
  makeofVeh?: string
  maxCapacity?: number
  tareWt_last_change?: string
  tareWt_last_added?: string
  reserved?: string
}

interface VehicleTypeData {
  VehicleTypeID: number
  VehicleType: string
  IsActive?: number
  LocationName?: string
}

interface MatchVehicleData {
  Vehicle_NO: string
  Agency: string
}

interface VehicleSearchParams {
  UserId?: number | null
  SiteName?: string | null
  VehicleType?: string | null
}

interface AddVehicleRequest {
  VehicleNumber: string
  VehicleType: number | string
  AgencyNo: number
  GrossWeight?: number
  TareWeight?: number
  Ward?: string
  LocationName?: string
  IsActive: number
  Remark?: string
  CreatedBy: number
}

interface VehicleResponse {
  msg: string
  status: string
  data: VehicleData[]
}

interface VehicleTypeResponse {
  msg: string
  status: string
  data: VehicleTypeData[]
}

@Component({
  selector: "app-vehicle-master",
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AgGridModule, MatDialogModule, HttpClientModule],
  templateUrl: "./vehicle-master.component.html",
  styleUrl: "./vehicle-master.component.scss",
})
export class VehicleMasterComponent implements OnInit {
  @ViewChild("agGrid", { static: false }) agGrid!: AgGridAngular
  @ViewChild("excelexporttable") excelexporttable!: ElementRef

  // Modal state
  isAddModalOpen = false
  isSubmitting = false

  // Entry mode toggles
  isManualVehicleEntry = true
  isManualVehicleTypeEntry = false // Changed to false to show dropdown by default

  // Filter state
  activeFilter = 9
  filterText = ""

  // Data arrays
  lstSearchResults: VehicleData[] = []
  lstReportData: VehicleData[] = []
  vehicleList: VehicleData[] = []
  vehicleTypesList: VehicleTypeData[] = []
  matchVehiclesList: MatchVehicleData[] = []

  // Forms
  addVehicleForm!: FormGroup

  // Grid configuration
  columnDefs: ColDef[] = []
  context: any
  gridApi!: GridApi
  defaultColDef: ColDef = {}
  public rowSelection: "single" | "multiple" = "multiple"
  components: any

  // User info
  uRole = 0
  userType = 0
  userId = 0

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private http: HttpClient,
    private dbcallingService: DbCallingService,
    private cdr: ChangeDetectorRef,
  ) {
    this.uRole = Number(sessionStorage.getItem("Role")) || 0
    this.userType = Number(sessionStorage.getItem("UserType")) || 0
    this.userId = Number(sessionStorage.getItem("UserID")) || 0
    this.components = {}
  }

  ngOnInit() {
    this.initializeAddVehicleForm()
    this.loadInitialData()
  }

  // TrackBy function for better performance
  trackByVehicleType(index: number, item: VehicleTypeData): number {
    return item.VehicleTypeID
  }

  initializeAddVehicleForm() {
    this.addVehicleForm = this.fb.group({
      vehicleNumber: ["", Validators.required],
      vehicleType: [""],
      vehicleTypeManual: [""],
      agencyNo: ["", [Validators.required, Validators.min(1)]],
      grossWeight: [""],
      tareWeight: [""],
      ward: [""],
      locationName: [""],
      isActive: [1, Validators.required],
      remark: [""],
    })

    // Set up dynamic validators
    this.updateVehicleNumberValidators()
    this.updateVehicleTypeValidators()
  }

  updateVehicleNumberValidators() {
    const vehicleNumberControl = this.addVehicleForm.get("vehicleNumber")
    if (vehicleNumberControl) {
      if (this.isManualVehicleEntry) {
        vehicleNumberControl.setValidators([
          Validators.required,
          Validators.pattern(/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/),
        ])
      } else {
        vehicleNumberControl.setValidators([Validators.required])
      }
      vehicleNumberControl.updateValueAndValidity()
    }
  }

  updateVehicleTypeValidators() {
    const vehicleTypeControl = this.addVehicleForm.get("vehicleType")
    const vehicleTypeManualControl = this.addVehicleForm.get("vehicleTypeManual")

    if (this.isManualVehicleTypeEntry) {
      vehicleTypeControl?.clearValidators()
      vehicleTypeManualControl?.setValidators([Validators.required])
    } else {
      vehicleTypeManualControl?.clearValidators()
      vehicleTypeControl?.setValidators([Validators.required])
    }

    vehicleTypeControl?.updateValueAndValidity()
    vehicleTypeManualControl?.updateValueAndValidity()
  }

  toggleVehicleEntryMode(isManual: boolean) {
    this.isManualVehicleEntry = isManual
    this.addVehicleForm.get("vehicleNumber")?.setValue("")
    this.updateVehicleNumberValidators()
  }

  toggleVehicleTypeEntryMode(isManual: boolean) {
    this.isManualVehicleTypeEntry = isManual
    this.addVehicleForm.get("vehicleType")?.setValue("")
    this.addVehicleForm.get("vehicleTypeManual")?.setValue("")
    this.updateVehicleTypeValidators()

    // Force change detection
    this.cdr.detectChanges()
  }

  getVehicleTypeControl(): AbstractControl | null {
    return this.isManualVehicleTypeEntry
      ? this.addVehicleForm.get("vehicleTypeManual")
      : this.addVehicleForm.get("vehicleType")
  }

  loadInitialData() {
    // Load vehicle types first, then other data
    this.loadVehicleTypes().then(() => {
      this.loadVehicleData()
      this.loadMatchVehicles()
    })
  }

  loadVehicleData() {
    const searchParams: VehicleSearchParams = {
      UserId: this.userId,
      SiteName: null,
      VehicleType: null,
    }

    this.dbcallingService.getVehiclemasterData(searchParams).subscribe({
      next: (res: VehicleResponse) => {
        console.log("Vehicle data fetched successfully:", res)
        if (res && res.data) {
          this.vehicleList = res.data
          this.lstReportData = [...res.data]
          this.lstSearchResults = [...res.data]
          this.getAGGridReady()

          // Update grid if it's already initialized
          if (this.gridApi) {
            this.gridApi.setGridOption("rowData", this.lstReportData)
          }
        } else {
          this.vehicleList = []
          this.lstReportData = []
          this.lstSearchResults = []
        }
      },
      error: (error) => {
        console.error("Error fetching vehicles:", error)
        this.vehicleList = []
        this.lstReportData = []
        this.lstSearchResults = []
        Swal.fire({
          title: "Error",
          text: "Failed to load vehicle data",
          icon: "error",
        })
      },
    })
  }

  loadVehicleTypes(): Promise<void> {
    return new Promise((resolve, reject) => {
      const searchParams: VehicleSearchParams = {
        UserId: this.userId,
      }

      console.log("Loading vehicle types with params:", searchParams)

      this.http.post<VehicleTypeResponse>(`${environment.apiUrl}/Master/getvehicletypes`, searchParams).subscribe({
        next: (res) => {
          console.log("Vehicle types API response:", res)

          if (res && res.data && Array.isArray(res.data)) {
            this.vehicleTypesList = res.data.filter((type) => type.IsActive === 1 || type.IsActive === undefined)
            console.log("Vehicle types loaded successfully:", this.vehicleTypesList.length, "items")
            console.log("Vehicle types data:", this.vehicleTypesList)

            // Force change detection to update the UI
            this.cdr.detectChanges()
            resolve()
          } else {
            console.warn("No vehicle types data received or invalid format:", res)
            this.vehicleTypesList = []
            resolve()
          }
        },
        error: (error) => {
          console.error("Error fetching vehicle types:", error)
          this.vehicleTypesList = []

          // Add some mock data for testing
          this.vehicleTypesList = [
            { VehicleTypeID: 1, VehicleType: "MINI COMPACTOR", IsActive: 1 },
            { VehicleTypeID: 2, VehicleType: "COMPACTOR", IsActive: 1 },
            { VehicleTypeID: 3, VehicleType: "TIPPER", IsActive: 1 },
            { VehicleTypeID: 4, VehicleType: "DUMPER", IsActive: 1 },
            { VehicleTypeID: 5, VehicleType: "TRUCK", IsActive: 1 },
          ]

          console.log("Using mock vehicle types data:", this.vehicleTypesList)
          this.cdr.detectChanges()

          Swal.fire({
            title: "Warning",
            text: "Failed to load vehicle types from server. Using default types.",
            icon: "warning",
          })
          resolve()
        },
      })
    })
  }

  loadMatchVehicles() {
    this.http.get<any>(`${environment.apiUrl}/Master/getmatchvehicles`).subscribe({
      next: (res) => {
        if (res && res.data) {
          this.matchVehiclesList = res.data
        }
      },
      error: (error) => {
        console.error("Error fetching match vehicles:", error)
        // Mock data for demonstration
        this.matchVehiclesList = [
          { Vehicle_NO: "MH01AB1234", Agency: "Agency 1" },
          { Vehicle_NO: "MH01CD5678", Agency: "Agency 2" },
          { Vehicle_NO: "MH01EF9012", Agency: "Agency 3" },
        ]
      },
    })
  }

  // Modal methods
  openAddVehicleModal() {
    this.isAddModalOpen = true
    this.resetAddForm()
  }

  closeAddModal() {
    this.isAddModalOpen = false
    this.resetAddForm()
  }

  resetAddForm() {
    this.addVehicleForm.reset({
      vehicleNumber: "",
      vehicleType: "",
      vehicleTypeManual: "",
      agencyNo: "",
      grossWeight: "",
      tareWeight: "",
      ward: "",
      locationName: "",
      isActive: 1,
      remark: "",
    })
    this.isSubmitting = false
    this.isManualVehicleEntry = true
    this.isManualVehicleTypeEntry = false // Default to dropdown mode
    this.updateVehicleNumberValidators()
    this.updateVehicleTypeValidators()
    this.cdr.detectChanges()
  }

  onAddVehicleSubmit() {
    if (this.addVehicleForm.invalid) {
      this.addVehicleForm.markAllAsTouched()
      return
    }

    this.isSubmitting = true
    const formValue = this.addVehicleForm.value

    // Determine vehicle type value
    let vehicleTypeValue: number | string
    if (this.isManualVehicleTypeEntry) {
      vehicleTypeValue = formValue.vehicleTypeManual?.toUpperCase() || ""
    } else {
      vehicleTypeValue = Number.parseInt(formValue.vehicleType)
    }

    const addVehicleRequest: AddVehicleRequest = {
      VehicleNumber: formValue.vehicleNumber.toUpperCase(),
      VehicleType: vehicleTypeValue,
      AgencyNo: Number.parseInt(formValue.agencyNo),
      GrossWeight: formValue.grossWeight ? Number.parseFloat(formValue.grossWeight) : undefined,
      TareWeight: formValue.tareWeight ? Number.parseFloat(formValue.tareWeight) : undefined,
      Ward: formValue.ward || undefined,
      LocationName: formValue.locationName || undefined,
      IsActive: Number.parseInt(formValue.isActive),
      Remark: formValue.remark || undefined,
      CreatedBy: this.userId,
    }

    console.log("Submitting vehicle data:", addVehicleRequest)

    this.http.post<any>(`${environment.apiUrl}/Master/addvehicle`, addVehicleRequest).subscribe({
      next: (response) => {
        console.log("Vehicle added successfully:", response)
        this.isSubmitting = false

        if (response && response.status === "success") {
          Swal.fire({
            title: "Success!",
            text: "Vehicle added successfully",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          })

          this.closeAddModal()
          // Automatically refresh the data to show the new vehicle
          this.loadVehicleData()
        } else {
          Swal.fire({
            title: "Error",
            text: response?.msg || "Failed to add vehicle",
            icon: "error",
          })
        }
      },
      error: (error) => {
        console.error("Error adding vehicle:", error)
        this.isSubmitting = false

        let errorMessage = "Failed to add vehicle. Please try again."
        if (error.error && error.error.msg) {
          errorMessage = error.error.msg
        } else if (error.message) {
          errorMessage = error.message
        }

        Swal.fire({
          title: "Error",
          text: errorMessage,
          icon: "error",
        })
      },
    })
  }

  // Grid methods
  getAGGridReady() {
    this.columnDefs = [
      {
        headerName: "Status",
        field: "isVehicleActive",
        valueFormatter: (params) => (Number(params.value) === 0 ? "Inactive" : "Active"),
        cellStyle: (params: any) => {
          const baseStyle = {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
          }
          if (params.value === 0) {
            return { ...baseStyle, color: "#f59e0b" }
          } else if (params.value === 1) {
            return { ...baseStyle, color: "#10b981" }
          }
          return { ...baseStyle, color: "#6b7280", fontWeight: "normal" }
        },
        minWidth: 100,
        flex: 0,
      },
      {
        headerName: "Vehicle Number",
        field: "vehicleNumber",
        minWidth: 150,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Vehicle Type",
        field: "vehicleType",
        minWidth: 140,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Agency Number",
        field: "agencyNo",
        minWidth: 130,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
      },
      {
        headerName: "Agency Name",
        field: "agencyName",
        minWidth: 140,
        flex: 1,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
        valueFormatter: (params) => params.value || "N/A",
      },
      {
        headerName: "Gross Weight (kg)",
        field: "grossWeight",
        minWidth: 140,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
        valueFormatter: (params) => (params.value ? `${params.value} kg` : "N/A"),
      },
      {
        headerName: "Tare Weight (kg)",
        field: "tareWeight",
        minWidth: 140,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
        valueFormatter: (params) => (params.value ? `${params.value} kg` : "N/A"),
      },
      {
        headerName: "Ward",
        field: "ward",
        minWidth: 100,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
        valueFormatter: (params) => params.value || "N/A",
      },
      {
        headerName: "Location",
        field: "locationName",
        minWidth: 140,
        flex: 1,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
        valueFormatter: (params) => params.value || "N/A",
      },
      {
        headerName: "Vehicle ID",
        field: "vehicleID",
        minWidth: 100,
        flex: 0,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
        },
        hide: true, // Hide this column by default
      },
    ]

    this.context = { componentParent: this }
    this.defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center",
      },
    }
  }

  OnGridReady(params: GridReadyEvent) {
    this.gridApi = params.api
    this.gridApi.sizeColumnsToFit()
  }

  headerHeightSetter(params: any) {
    var padding = 20
    var height = headerHeightGetter() + padding
    if (this.gridApi) {
      this.gridApi.setGridOption("headerHeight", height)
      this.gridApi.resetRowHeights()
    }
  }

  onFilterTextBoxChanged() {
    if (this.gridApi) {
      const filterValue = (document.getElementById("filter-text-box") as HTMLInputElement)?.value || ""
      this.gridApi.setGridOption("quickFilterText", filterValue)
    }
  }

  FilterData(id: number) {
    this.activeFilter = id
    console.log("Filtering data with id:", id, "Available records:", this.lstSearchResults.length)

    if (id === 9) {
      // Show all data
      this.lstReportData = [...this.lstSearchResults]
      console.log("Showing all records:", this.lstReportData.length)
    } else {
      // Filter by status
      this.lstReportData = this.lstSearchResults.filter((f: VehicleData) => f.isVehicleActive === id)
      console.log("Filtered records for status", id, ":", this.lstReportData.length)
    }

    // Force grid to refresh
    if (this.gridApi) {
      this.gridApi.setGridOption("rowData", this.lstReportData)
    }
  }

  // Get status count for summary cards
  getStatusCount(status: number): number {
    return this.lstSearchResults.filter((item: VehicleData) => item.isVehicleActive === status).length
  }

  // Navigation methods
  Back() {
    this.router.navigate(["/dashboard"])
  }

  // Export method
  download() {
    const excelData = this.lstReportData.map((v: VehicleData, i: number) => ({
      "Sr No": i + 1,
      Status: v.isVehicleActive === 0 ? "Inactive" : "Active",
      "Vehicle Number": v.vehicleNumber,
      "Vehicle Type": v.vehicleType,
      "Agency Number": v.agencyNo,
      "Agency Name": v.agencyName || "N/A",
      "Gross Weight": v.grossWeight ? `${v.grossWeight} kg` : "N/A",
      "Tare Weight": v.tareWeight ? `${v.tareWeight} kg` : "N/A",
      Ward: v.ward || "N/A",
      Location: v.locationName || "N/A",
      Remark: v.remark || "N/A",
      "Created On": v.createdOn || "N/A",
      "Created By": v.createdby || "N/A",
    }))

    const fileName = "VehicleMaster_" + moment(new Date()).format("DDMMYYYY") + ".xlsx"
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData)
    const wb: XLSX.WorkBook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
    XLSX.writeFile(wb, fileName)
  }
}

function headerHeightGetter(): number {
  var columnHeaderTexts = document.querySelectorAll(".ag-header-cell-text")
  var columnHeaderTextsArray: HTMLElement[] = []
  columnHeaderTexts.forEach((node) => columnHeaderTextsArray.push(node as HTMLElement))
  var clientHeights = columnHeaderTextsArray.map((headerText: HTMLElement) => headerText.clientHeight)
  var tallestHeaderTextHeight = Math.max(...clientHeights)
  return tallestHeaderTextHeight
}
