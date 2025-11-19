import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import { DbCallingService } from 'src/app/core/services/db-calling.service';
import Swal from "sweetalert2"
import moment from "moment"
import * as XLSX from "xlsx"
import { CommonModule } from '@angular/common';
import { FormModule } from '@coreui/angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { Router } from '@angular/router';

@Component({
  selector: 'app-agency-master',
  imports: [CommonModule, AgGridAngular, FormModule, FormsModule, ReactiveFormsModule],
  templateUrl: './agency-master.component.html',
  styleUrl: './agency-master.component.scss'
})
export class AgencyMasterComponent {
  @ViewChild("agGrid", { static: false }) agGrid!: AgGridAngular
  @ViewChild("excelexporttable") excelexporttable!: ElementRef

  siteLocations: any[] = []
  vehicleTypesList: any[] = []

  agencyForm!: FormGroup;
  lstAgencyData: any[] = [];
  lstAgencyDataFiltered: any[] = [];
  isAddModalOpen: boolean = false;
  isSubmitting: boolean = false;
  filterText: string = '';
  activeFilter: number = 9; // 9 = All, 1 = Active, 0 = Inactive

  // 🆕 for edit
  isEditMode = false;
  editAgencyData: any = null;
  modalTitle = 'Add Agency';

  // Grid configuration
  columnDefs: ColDef[] = []
  context: any
  gridApi!: GridApi<any>;
  defaultColDef: any
  public rowSelection: "single" | "multiple" = "multiple"
  components: any

  // User info
  uRole = 0
  userType = 0
  userId = 0
  userSiteName = "";
  loading: boolean = false
  constructor(
    private fb: FormBuilder,
    private agencyService: DbCallingService,
    private router: Router,
  ) {
    // load dropdowns
    this.userId = Number(sessionStorage.getItem("UserId")) || 0
    this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";

  }

  ngOnInit(): void {
    this.initForm();
    this.loadAgencies();
  }

  initForm() {
    this.agencyForm = this.fb.group({
      agencyNo: [null], // 🆕 keep for edit
      //  vehicleType: ['', Validators.required],
      agencyName: ['', [Validators.required, Validators.maxLength(500)]],
      isPaid: [false],
      siteName: ['', Validators.required],
      isActive: [1, Validators.required]
    });
  }

  getAGGridReady() {
    this.columnDefs = [
      {
        headerName: 'Status', field: 'isActive',
        valueFormatter: (p: any) => p.value === 1 ? 'Active' : 'Inactive',
        cellStyle: (params: any) => {
          const baseStyle = { display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }
          if (params.value === 0) return { ...baseStyle, color: "#f59e0b" }
          if (params.value === 1) return { ...baseStyle, color: "#10b981" }
          return { ...baseStyle, color: "#6b7280", fontWeight: "normal" }
        }, maxWidth: 120
      },
      { headerName: 'Location', field: 'siteName', maxWidth: 200 },
      { headerName: 'Agency No', field: 'agencyNo', hide: true },
      { headerName: 'Agency Name', field: 'agencyName', minWidth: 300 },
      // { headerName: 'Vehicle Type', field: 'vehicleType', sortable: true, filter: true },
      { headerName: 'Is Paid', field: 'isPaid', valueFormatter: (p: any) => p.value ? 'Yes' : 'No', maxWidth: 100 },
      {
        headerName: 'Actions', maxWidth: 120,
        cellRenderer: () => `
          <div class="cell-button-container">
            <button class="btn-view">
              <i class="fa fa-edit"></i>
              <span>Edit</span>
            </button>
          </div>
        `,
        onCellClicked: (params) => this.openEditModal(params.data)
      }
    ];

    this.defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        padding: "0 12px"
      },
      wrapText: true,
      autoHeight: true,   // Add this
      wrapHeaderText: true,
      flex: 1
    }
  }

  loadAgencies() {
    let obj = {
      UserId: this.userId,
      SiteName: this.userSiteName,
    }


    this.agencyService.GetSiteLocations(obj).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.siteLocations = response.data;
          // 👇 If there is only one site, auto-select it in the form
          if (this.siteLocations.length === 1) {
            console.log("Only one site found, auto-selecting:", this.siteLocations[0]);
            const singleSite = this.siteLocations[0];
            this.agencyForm?.patchValue({ siteName: singleSite.siteName });
          }
        }
      }
    });
    this.agencyService.getVehicleTypes(obj).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.vehicleTypesList = response.data;
        }
      }
    });
       this.loading = true;
    this.agencyService.GetAgencies(obj).subscribe({
      next: (res) => {
        this.lstAgencyData = res?.data || [];
        this.lstAgencyDataFiltered = res?.data || [];
        this.getAGGridReady();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error("Error fetching agencies:", err);
      }
    });
  }

  OnGridReady(params: GridReadyEvent) {
    this.gridApi = params.api
    this.gridApi.sizeColumnsToFit()
  }

  // ---------- MODAL ----------

  openAddAgencyModal() {
    this.isEditMode = false;
    this.modalTitle = 'Add New Agency';
    this.resetForm();
    this.isAddModalOpen = true;
  }

  openEditModal(row: any) {
    this.isEditMode = true;
    this.modalTitle = `Update Agency #${row.agencyName}`;
    this.editAgencyData = row;
    console.log(row);
    // Patch values into form
    this.agencyForm.patchValue({
      agencyNo: row.agencyNo,
      agencyName: row.agencyName,
      // vehicleType: row.vehicleType,
      isPaid: row.isPaid ?? false,
      siteName: row.siteName,
      isActive: row.isActive ?? 1
    });

    this.isAddModalOpen = true;
  }

  closeAddModal() {
    this.isAddModalOpen = false
    this.isSubmitting = false;
    this.resetForm();
  }

  resetForm() {
    this.agencyForm.reset({
      isPaid: false,
      isActive: 1
    });
    this.editAgencyData = null;
  }

  // ---------- SUBMIT ----------

  onSubmit() {
    if (this.agencyForm.invalid) {
      this.agencyForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const payload = this.agencyForm.value;
    console.log(payload);
    if (this.isEditMode && payload.agencyNo) {
      // 🆕 Update API
      this.agencyService.AddAgency(payload).subscribe({
        next: (res) => {
          if (res?.isSuccess) {
            Swal.fire({ title: "Updated!", text: "Agency updated successfully", icon: "success", timer: 2000, showConfirmButton: false })
            this.loadAgencies();
            this.closeAddModal();
          } else {
            Swal.fire({ title: "Error", text: res?.msg || "Failed to update agency", icon: "error" })
          }
          this.isSubmitting = false;
        },
        error: () => this.isSubmitting = false
      });
    } else {
      // Add API
      this.agencyService.AddAgency(payload).subscribe({
        next: (res) => {
          if (res?.isSuccess) {
            Swal.fire({ title: "Success!", text: "Agency added successfully", icon: "success", timer: 2000, showConfirmButton: false })
            this.loadAgencies();
            this.closeAddModal();
          } else {
            Swal.fire({ title: "Error", text: res?.msg || "Failed to add agency", icon: "error" })
          }
          this.isSubmitting = false;
        },
        error: () => this.isSubmitting = false
      });
    }
  }

  // ---------- Filters / Export ----------
  FilterData(status: number) {
    this.activeFilter = status;

    if (status === 9) {
      this.lstAgencyDataFiltered = [...this.lstAgencyData];
    } else {
      this.lstAgencyDataFiltered = this.lstAgencyData.filter(a => Number(a.isActive) === Number(status));
    }

    // Update grid
    if (this.gridApi) {
      // Cast to 'any' if TS complains
      (this.gridApi as any).setRowData(this.lstAgencyDataFiltered);
    }
  }
  getStatusCount(status: number): number {
    return this.lstAgencyData.filter(a => a.isActive === status).length;
  }

  download() {
    const excelData = this.lstAgencyData.map((v: any, i: number) => ({
      "Sr No": i + 1,
      Status: v.isActive === 0 ? "Inactive" : "Active",
      "Agency Name": v.agencyName || "N/A",
      Location: v.siteName || "N/A",
      "Created On": v.createdOn || "N/A",
      "Created By": v.createdby || "N/A",
    }))
    const fileName = "AgencyMaster_" + moment(new Date()).format("DDMMYYYY") + ".xlsx"
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData)
    const wb: XLSX.WorkBook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
    XLSX.writeFile(wb, fileName)
  }

  Back() { this.router.navigate(["/dashboard"]) }
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
}
function headerHeightGetter(): number {
  var columnHeaderTexts = document.querySelectorAll(".ag-header-cell-text")
  var columnHeaderTextsArray: HTMLElement[] = []
  columnHeaderTexts.forEach((node) => columnHeaderTextsArray.push(node as HTMLElement))
  var clientHeights = columnHeaderTextsArray.map((headerText: HTMLElement) => headerText.clientHeight)
  var tallestHeaderTextHeight = Math.max(...clientHeights)
  return tallestHeaderTextHeight
}

