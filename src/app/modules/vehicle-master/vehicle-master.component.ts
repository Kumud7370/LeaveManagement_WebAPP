import { Component, ElementRef, ViewChild, OnInit, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule, FormsModule } from "@angular/forms"
import { AgGridModule } from "ag-grid-angular"
import { AgGridAngular } from "ag-grid-angular"
import { Router } from "@angular/router"
import { FormBuilder, FormGroup, Validators, AbstractControl } from "@angular/forms"
import { GridApi, ColDef, GridReadyEvent, ICellRendererParams } from "ag-grid-community"
import { MatDialog, MatDialogModule } from "@angular/material/dialog"
import Swal from "sweetalert2"
import moment from "moment"
import * as XLSX from "xlsx"
import { HttpClientModule, HttpClient } from "@angular/common/http"
import { environment } from "src/environments/environment"
import { DbCallingService } from "src/app/core/services/db-calling.service"

// Edit Button Cell Renderer Component (matching logsheet View button style)
@Component({
  selector: 'btn-edit-cell-renderer',
  template: `
    <button 
      class="btn-view-vehicle" 
      (click)="onClick()"
      [style.pointer-events]="'auto'"
      style="cursor: pointer;">
      <i class="fa fa-edit"></i>
    </button>
  `,
  styles: [`
    .btn-view-vehicle {
      background: linear-gradient(135deg, #1a2a6c 0%, #b21f1f 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      width: 40px;
      height: 40px;
    }
    
    .btn-view-vehicle:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .btn-view-vehicle i {
      font-size: 16px;
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class BtnEditCellRenderer {
  private params: any;

  agInit(params: ICellRendererParams): void {
    this.params = params;
  }

  onClick() {
    if (this.params.context.componentParent) {
      this.params.context.componentParent.openEditVehicleModal(this.params.data);
    }
  }

  refresh(): boolean {
    return false;
  }
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
  isManualVehicleTypeEntry = false

  // Filter state
  activeFilter = 9
  filterText = ""

  // Data arrays
  lstSearchResults: any[] = []
  lstReportData: any[] = []
  vehicleList: any[] = []
  matchVehiclesList: any[] = []
  siteLocations: any[] = []
  vehicleTypesList: any[] = []
  agencyList: any[] = []
  wardList: any[] = []
  wardListFiltered: any[] = []

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
  userSiteName = ""
  editMode = false
  selectedVehicleId: number | null = null
  modalTitle = 'Add New Vehicle'

  loading: boolean = false

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
    this.userId = Number(sessionStorage.getItem("UserId")) || 0
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || ""
    this.components = {}
  }

  ngOnInit() {
    this.initializeAddVehicleForm()
    this.loadInitialData()
  }

  trackByVehicleType(index: number, item: any): number {
    return item.VehicleTypeID
  }

  initializeAddVehicleForm() {
    this.addVehicleForm = this.fb.group({
      vehicleNumber: ["", Validators.required],
      vehicleType: ["", Validators.required],
      agencyNo: ["", Validators.required],
      grossWeight: ["", Validators.required],
      tareWeight: ["", Validators.required],
      ward: ["", Validators.required],
      siteName: ["", Validators.required],
      isActive: [1, Validators.required],
      remark: [""],
    })

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
    if (this.isManualVehicleTypeEntry) {
      vehicleTypeControl?.clearValidators()
    } else {
      vehicleTypeControl?.setValidators([Validators.required])
    }
    vehicleTypeControl?.updateValueAndValidity()
  }

  toggleVehicleEntryMode(isManual: boolean) {
    this.isManualVehicleEntry = isManual
    this.addVehicleForm.get("vehicleNumber")?.setValue("")
    this.updateVehicleNumberValidators()
  }

  toggleVehicleTypeEntryMode(isManual: boolean) {
    this.isManualVehicleTypeEntry = isManual
    this.addVehicleForm.get("vehicleType")?.setValue("")
    this.updateVehicleTypeValidators()
    this.cdr.detectChanges()
  }

  getVehicleTypeControl(): AbstractControl | null {
    return this.isManualVehicleTypeEntry
      ? this.addVehicleForm.get("vehicleTypeManual")
      : this.addVehicleForm.get("vehicleType")
  }

  loadInitialData() {
    let obj = {
      UserId: Number(this.userId),
      SiteName: (this.userSiteName) ? this.userSiteName : null,
    }

    this.dbcallingService.GetSiteLocations(obj).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.siteLocations = response.data
          if (this.wardList.length === 1) {
            this.addVehicleForm.patchValue({ siteName: this.wardList[0].siteName || this.wardList[0].siteName })
          }
        }
      },
      error: (error: any) => {
        console.error('Error loading site locations:', error)
      }
    })

    this.dbcallingService.GetAgencies(obj).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.agencyList = response.data
        }
      },
      error: (error: any) => {
        console.error('Error loading agencies:', error)
      }
    })

    this.dbcallingService.getWards(obj).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.wardList = response.data
          this.wardListFiltered = response.data
          if (this.wardList.length === 1) {
            this.addVehicleForm.patchValue({ ward: this.wardList[0].wardName || this.wardList[0].wardName })
          }
        }
      },
      error: (error: any) => {
        console.error('Error loading wards:', error)
      }
    })

    this.loadVehicleTypes().then(() => {
      this.loadVehicleData()
    })
  }

  loadVehicleData() {
    const searchParams: any = {
      UserId: this.userId,
      SiteName: this.userSiteName,
      VehicleType: null,
    }

    this.loading = true

    this.dbcallingService.getVehiclemasterData(searchParams).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.loading = false
          this.vehicleList = res.data
          this.lstReportData = [...res.data]
          this.lstSearchResults = [...res.data]
          this.getAGGridReady()

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
        this.loading = false
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
      const searchParams = {
        "VehicleID": null,
        "VehicleNumber": null,
        "UserId": String(sessionStorage.getItem("UserId")),
        "Ward": null,
        SiteName: String(sessionStorage.getItem("SiteName")),
      }

      console.log("Loading vehicle types with params:", searchParams)
      this.dbcallingService.getVehicleTypes(searchParams).subscribe({
        next: (res) => {
          console.log("Vehicle types API response:", res)
          if (res && res.data && Array.isArray(res.data)) {
            this.vehicleTypesList = res.data
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

  openAddVehicleModal() {
    this.isAddModalOpen = true
    this.modalTitle = 'Add New Vehicle'
    this.resetAddForm()
  }

  closeAddModal() {
    this.isAddModalOpen = false
    this.resetAddForm()
    this.editMode = false
    this.selectedVehicleId = null
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
      siteName: "",
      isActive: 1,
      remark: "",
    })
    this.isSubmitting = false
    this.isManualVehicleEntry = true
    this.isManualVehicleTypeEntry = false
    this.updateVehicleNumberValidators()
    this.updateVehicleTypeValidators()
    this.cdr.detectChanges()
  }

  getAGGridReady() {
    this.columnDefs = [
      {
        headerName: "Status",
        field: "isActive",
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
        width: 100,
        minWidth: 100,
        suppressSizeToFit: false,
      },
      {
        headerName: "Location",
        field: "siteName",
        width: 120,
        minWidth: 120,
        suppressSizeToFit: false,
        valueFormatter: (params) => params.value || "N/A",
      },
      {
        headerName: "Ward",
        field: "ward",
        width: 120,
        minWidth: 120,
        suppressSizeToFit: false,
        valueFormatter: (params) => params.value || "N/A",
      },
      {
        headerName: "Vehicle Number",
        field: "vehicleNumber",
        width: 140,
        minWidth: 140,
        suppressSizeToFit: false,
      },
      {
        headerName: "Vehicle Type",
        field: "vehicleType",
        width: 200,
        minWidth: 200,
        suppressSizeToFit: false,
      },
      {
        headerName: "Agency Number",
        field: "agencyNo",
        width: 20,
        minWidth: 20,
        hide: true,
        suppressSizeToFit: false,
      },
      {
        headerName: "Agency Name",
        field: "agencyName",
        width: 200,
        minWidth: 200,
        suppressSizeToFit: false,
        valueFormatter: (params) => params.value || "N/A",
      },
      {
        headerName: "Gross Weight (kg)",
        field: "grossWeight",
        width: 150,
        minWidth: 150,
        suppressSizeToFit: false,
        valueFormatter: (params) => (params.value ? `${params.value} kg` : "N/A"),
      },
      {
        headerName: "Tare Weight (kg)",
        field: "tareWeight",
        width: 150,
        minWidth: 150,
        suppressSizeToFit: false,
        valueFormatter: (params) => (params.value ? `${params.value} kg` : "N/A"),
      },
      {
        headerName: "Vehicle ID",
        field: "vehicleID",
        width: 100,
        minWidth: 100,
        hide: true,
        suppressSizeToFit: false,
      },
      {
        headerName: "Actions",
        width: 100,
        minWidth: 100,
        suppressSizeToFit: false,
        cellRenderer: (params: any) => {
          return `
            <div class="cell-button-container">
              <button class="btn-view" data-action="edit">
                <i class="fa fa-edit"></i>
                <span>Edit</span>
              </button>
            </div>`
        },
        onCellClicked: (params: any) => {
          if (params.event.target.dataset.action === "edit" || params.event.target.closest("button")?.dataset.action === "edit") {
            this.openEditVehicleModal(params.data)
          }
        }
      }
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
        justifyContent: "flex-start",
        padding: "0 12px"
      },
      wrapText: false,
      autoHeight: false,
      wrapHeaderText: true,
    }
  }

  OnGridReady(params: GridReadyEvent) {
    this.gridApi = params.api

    // Don't use sizeColumnsToFit on mobile - let columns have their fixed widths for horizontal scrolling
    if (window.innerWidth > 768) {
      this.gridApi.sizeColumnsToFit()
    }
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
      this.lstReportData = [...this.lstSearchResults]
      console.log("Showing all records:", this.lstReportData.length)
    } else {
      this.lstReportData = this.lstSearchResults.filter((f: any) => f.isActive === id)
      console.log("Filtered records for status", id, ":", this.lstReportData.length)
    }

    if (this.gridApi) {
      this.gridApi.setGridOption("rowData", this.lstReportData)
    }
  }

  OnLocationChange(event: any) {
    const selectedLocation = event.target.value
    console.log("Selected Location:", selectedLocation)
    if (selectedLocation === "") {
      this.wardListFiltered = [...this.wardList]
    } else {
      this.wardListFiltered = this.wardList.filter(ward => ward.locationName === selectedLocation)
    }
  }

  getStatusCount(status: number): number {
    return this.lstSearchResults.filter((item: any) => item.isActive === status).length
  }

  Back() {
    this.router.navigate(["/dashboard"])
  }

  download() {
    const excelData = this.lstReportData.map((v: any, i: number) => ({
      "Sr No": i + 1,
      Status: v.isActive === 0 ? "Inactive" : "Active",
      "Vehicle Number": v.vehicleNumber,
      "Vehicle Type": v.vehicleType,
      "Agency Number": v.agencyNo,
      "Agency Name": v.agencyName || "N/A",
      "Gross Weight": v.grossWeight ? `${v.grossWeight} kg` : "N/A",
      "Tare Weight": v.tareWeight ? `${v.tareWeight} kg` : "N/A",
      Ward: v.ward || "N/A",
      Location: v.siteName || "N/A",
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

  openEditVehicleModal(vehicle: any) {
    this.isAddModalOpen = true
    this.editMode = true
    this.selectedVehicleId = vehicle.vehicleID
    this.modalTitle = `Update Vehicle  #${vehicle.vehicleNumber}`
    console.log("Editing vehicle:", vehicle)
    this.addVehicleForm.patchValue({
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      agencyNo: String(vehicle.agencyNo),
      grossWeight: vehicle.grossWeight,
      tareWeight: vehicle.tareWeight,
      ward: vehicle.ward,
      siteName: vehicle.siteName,
      isActive: vehicle.isActive,
      remark: vehicle.remark,
    })
  }

  onAddVehicleSubmit() {
    if (this.addVehicleForm.invalid) {
      this.addVehicleForm.markAllAsTouched()
      return
    }

    this.isSubmitting = true
    const formValue = this.addVehicleForm.value

    const vehicleRequest: any = {
      VehicleID: this.selectedVehicleId,
      VehicleNumber: formValue.vehicleNumber.toUpperCase(),
      VehicleType: formValue.vehicleType,
      AgencyNo: Number(formValue.agencyNo),
      GrossWeight: formValue.grossWeight ? Number(formValue.grossWeight) : null,
      TareWeight: formValue.tareWeight ? Number(formValue.tareWeight) : null,
      Ward: formValue.ward,
      SiteName: formValue.siteName,
      IsActive: Number(formValue.isActive),
      Remark: formValue.remark || null,
      CreatedBy: Number(sessionStorage.getItem("UserId")),
    }

    console.log("Submitting vehicle data:", vehicleRequest)

    this.dbcallingService.addVehicle(vehicleRequest).subscribe({
      next: (response) => {
        this.isSubmitting = false

        if (response && response.status === "success") {
          Swal.fire({
            title: "Success!",
            text: this.editMode ? "Vehicle updated successfully" : "Vehicle added successfully",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          })

          this.closeAddModal()
          this.loadVehicleData()
        } else {
          Swal.fire({
            title: "Error",
            text: response?.msg || "Failed to save vehicle",
            icon: "error",
          })
        }
      },
      error: (error) => {
        console.error("Error saving vehicle:", error)
        this.isSubmitting = false

        Swal.fire({
          title: "Error",
          text: error?.error?.msg || error.message || "Failed to save vehicle. Please try again.",
          icon: "error",
        })
      },
    })
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