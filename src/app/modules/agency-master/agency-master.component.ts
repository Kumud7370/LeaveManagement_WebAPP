// import { Component, ElementRef, ViewChild } from '@angular/core';
// import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
// import { AgGridAngular } from 'ag-grid-angular';
// import Swal from "sweetalert2"
// import moment from "moment"
// import * as XLSX from "xlsx"
// import { CommonModule } from '@angular/common';
// import { FormModule } from '@coreui/angular';
// import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-agency-master',
//   imports: [CommonModule, AgGridAngular, FormModule, FormsModule, ReactiveFormsModule],
//   templateUrl: './agency-master.component.html',
//   styleUrl: './agency-master.component.scss'
// })
// export class AgencyMasterComponent {
//   @ViewChild("agGrid", { static: false }) agGrid!: AgGridAngular
//   @ViewChild("excelexporttable") excelexporttable!: ElementRef

//   siteLocations: any[] = []
//   vehicleTypesList: any[] = []

//   agencyForm!: FormGroup;
//   lstAgencyData: any[] = [];
//   lstAgencyDataFiltered: any[] = [];
//   isAddModalOpen: boolean = false;
//   isSubmitting: boolean = false;
//   filterText: string = '';
//   activeFilter: number = 9; // 9 = All, 1 = Active, 0 = Inactive

//   // 🆕 for edit
//   isEditMode = false;
//   editAgencyData: any = null;
//   modalTitle = 'Add Agency';

//   // Grid configuration
//   columnDefs: ColDef[] = []
//   context: any
//   gridApi!: GridApi<any>;
//   defaultColDef: any
//   public rowSelection: "single" | "multiple" = "multiple"
//   components: any

//   // User info
//   uRole = 0
//   userType = 0
//   userId = 0
//   userSiteName = "";
//   loading: boolean = false
//   constructor(
//     private fb: FormBuilder,
//     private agencyService: DbCallingService,
//     private router: Router,
//   ) {
//     // load dropdowns
//     this.userId = Number(sessionStorage.getItem("UserId")) || 0
//     this.userSiteName = String(sessionStorage.getItem("SiteName")) || "";

//   }

//   ngOnInit(): void {
//     this.initForm();
//     this.loadAgencies();
//   }

//   initForm() {
//     this.agencyForm = this.fb.group({
//       agencyNo: [null], // 🆕 keep for edit
//       agencyName: ['', [Validators.required, Validators.maxLength(500)]],
//       isPaid: [false],
//       siteName: ['', Validators.required],
//       isActive: [1, Validators.required]
//     });
//   }

//   getAGGridReady() {
//     this.columnDefs = [
//       {
//         headerName: "Actions",
//         width: 100,
//         minWidth: 100,
//         maxWidth: 100,
//         suppressSizeToFit: true,
//         pinned: 'left',
//         lockPosition: true,
//         cellRenderer: (params: any) => {
//           return `
//             <div style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;">
//               <button class="btn-view-agency" data-action="edit" style="
//                 background: linear-gradient(135deg, #1a2a6c 0%, #b21f1f 100%);
//                 color: white;
//                 border: none;
//                 border-radius: 8px;
//                 padding: 0.375rem 0.75rem;
//                 cursor: pointer;
//                 transition: all 0.3s ease;
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 gap: 0.375rem;
//                 font-size: 0.75rem;
//                 font-weight: 600;
//                 box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
//                 min-width: 70px;
//                 height: auto;
//                 white-space: nowrap;
//               ">
//                 <i class="fa fa-edit" style="font-size: 0.875rem;"></i>
//                 <span>Edit</span>
//               </button>
//             </div>`
//         },
//         cellStyle: {
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           padding: "8px"
//         },
//         onCellClicked: (params: any) => {
//           if (params.event.target.dataset.action === "edit" || params.event.target.closest("button")?.dataset.action === "edit") {
//             this.openEditModal(params.data)
//           }
//         }
//       },
//       {
//         headerName: 'Status', field: 'isActive',
//         valueFormatter: (p: any) => p.value === 1 ? 'Active' : 'Inactive',
//         cellStyle: (params: any) => {
//           const baseStyle = { display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }
//           if (params.value === 0) return { ...baseStyle, color: "#f59e0b" }
//           if (params.value === 1) return { ...baseStyle, color: "#10b981" }
//           return { ...baseStyle, color: "#6b7280", fontWeight: "normal" }
//         },
//         width: 100,
//         minWidth: 100,
//         maxWidth: 120,
//         suppressSizeToFit: true,
//       },
//       {
//         headerName: 'Location',
//         field: 'siteName',
//         width: 150,
//         minWidth: 150,
//         suppressSizeToFit: true,
//         cellStyle: {
//           display: "flex",
//           alignItems: "center",
//           padding: "0 12px",
//           whiteSpace: "nowrap",
//           overflow: "hidden",
//           textOverflow: "ellipsis"
//         }
//       },
//       { headerName: 'Agency No', field: 'agencyNo', hide: true },
//       {
//         headerName: 'Agency Name',
//         field: 'agencyName',
//         minWidth: 250,
//         suppressSizeToFit: true,
//         cellStyle: {
//           display: "flex",
//           alignItems: "center",
//           padding: "0 12px",
//           whiteSpace: "nowrap",
//           overflow: "hidden",
//           textOverflow: "ellipsis"
//         },
//         tooltipField: "agencyName"
//       },
//       {
//         headerName: 'Is Paid',
//         field: 'isPaid',
//         valueFormatter: (p: any) => p.value ? 'Yes' : 'No',
//         width: 100,
//         minWidth: 100,
//         maxWidth: 120,
//         suppressSizeToFit: true,
//         cellStyle: {
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           padding: "0 12px"
//         }
//       }
//     ];

//     this.context = { componentParent: this }
//     this.defaultColDef = {
//       sortable: true,
//       filter: true,
//       resizable: true,
//       suppressMovable: true,
//       cellStyle: {
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "flex-start",
//         padding: "0 12px",
//         lineHeight: "normal"
//       },
//       wrapText: false,
//       autoHeight: false,
//       wrapHeaderText: true,
//       tooltipValueGetter: (params: any) => params.value
//     }
//   }

//   loadAgencies() {
//     let obj = {
//       UserId: this.userId,
//       SiteName: this.userSiteName,
//     }

//     this.agencyService.GetSiteLocations(obj).subscribe({
//       next: (response: any) => {
//         if (response && response.data) {
//           this.siteLocations = response.data;
//           // 👇 If there is only one site, auto-select it in the form
//           if (this.siteLocations.length === 1) {
//             console.log("Only one site found, auto-selecting:", this.siteLocations[0]);
//             const singleSite = this.siteLocations[0];
//             this.agencyForm?.patchValue({ siteName: singleSite.siteName });
//           }
//         }
//       }
//     });
//     this.agencyService.getVehicleTypes(obj).subscribe({
//       next: (response: any) => {
//         if (response && response.data) {
//           this.vehicleTypesList = response.data;
//         }
//       }
//     });
//     this.loading = true;
//     this.agencyService.GetAgencies(obj).subscribe({
//       next: (res) => {
//         this.lstAgencyData = res?.data || [];
//         this.lstAgencyDataFiltered = res?.data || [];
//         this.getAGGridReady();
//         this.loading = false;
//       },
//       error: (err) => {
//         this.loading = false;
//         console.error("Error fetching agencies:", err);
//       }
//     });
//   }

//   OnGridReady(params: GridReadyEvent) {
//     this.gridApi = params.api

//     // Don't use sizeColumnsToFit on mobile - let columns have their fixed widths for horizontal scrolling
//     if (window.innerWidth > 768) {
//       this.gridApi.sizeColumnsToFit()
//     }
//   }

//   // ---------- MODAL ----------

//   openAddAgencyModal() {
//     this.isEditMode = false;
//     this.modalTitle = 'Add New Agency';
//     this.resetForm();
//     this.isAddModalOpen = true;
//   }

//   openEditModal(row: any) {
//     this.isEditMode = true;
//     this.modalTitle = `Update Agency #${row.agencyName}`;
//     this.editAgencyData = row;

//     // 🔍 MAPPING EXPLANATION - Selected Row Data to Form Fields:
//     console.log("=== EDIT MODE - FIELD MAPPING ===");
//     console.log("Selected Row Data:", row);
//     console.log("Field Mappings:");
//     console.log("1. agencyNo (Hidden ID):", row.agencyNo, "→ Form: agencyNo");
//     console.log("2. Agency Name:", row.agencyName, "→ Form: agencyName");
//     console.log("3. Location:", row.siteName, "→ Form: siteName");
//     console.log("4. Is Paid:", row.isPaid, "→ Form: isPaid");
//     console.log("5. Status:", row.isActive, "→ Form: isActive");
//     console.log("================================");

//     // Patch values into form
//     // FIELD → TABLE COLUMN MAPPING:
//     // agencyNo (hidden) ← "Agency No" column (hidden in grid)
//     // agencyName ← "Agency Name" column
//     // siteName ← "Location" column
//     // isPaid ← "Is Paid" column
//     // isActive ← "Status" column
//     this.agencyForm.patchValue({
//       agencyNo: row.agencyNo,           // Hidden ID field for update
//       agencyName: row.agencyName,       // "Agency Name" column
//       isPaid: row.isPaid ?? false,      // "Is Paid" column
//       siteName: row.siteName,           // "Location" column
//       isActive: row.isActive ?? 1       // "Status" column
//     });

//     this.isAddModalOpen = true;
//   }

//   closeAddModal() {
//     this.isAddModalOpen = false
//     this.isSubmitting = false;
//     this.resetForm();
//   }

//   resetForm() {
//     this.agencyForm.reset({
//       isPaid: false,
//       isActive: 1
//     });
//     this.editAgencyData = null;
//   }

//   // ---------- SUBMIT ----------

//   onSubmit() {
//     if (this.agencyForm.invalid) {
//       this.agencyForm.markAllAsTouched();
//       return;
//     }
//     this.isSubmitting = true;
//     const payload = this.agencyForm.value;
//     console.log(payload);
//     if (this.isEditMode && payload.agencyNo) {
//       // 🆕 Update API
//       this.agencyService.AddAgency(payload).subscribe({
//         next: (res) => {
//           if (res?.isSuccess) {
//             Swal.fire({ title: "Updated!", text: "Agency updated successfully", icon: "success", timer: 2000, showConfirmButton: false })
//             this.loadAgencies();
//             this.closeAddModal();
//           } else {
//             Swal.fire({ title: "Error", text: res?.msg || "Failed to update agency", icon: "error" })
//           }
//           this.isSubmitting = false;
//         },
//         error: () => this.isSubmitting = false
//       });
//     } else {
//       // Add API
//       this.agencyService.AddAgency(payload).subscribe({
//         next: (res) => {
//           if (res?.isSuccess) {
//             Swal.fire({ title: "Success!", text: "Agency added successfully", icon: "success", timer: 2000, showConfirmButton: false })
//             this.loadAgencies();
//             this.closeAddModal();
//           } else {
//             Swal.fire({ title: "Error", text: res?.msg || "Failed to add agency", icon: "error" })
//           }
//           this.isSubmitting = false;
//         },
//         error: () => this.isSubmitting = false
//       });
//     }
//   }

//   // ---------- Filters / Export ----------
//   FilterData(status: number) {
//     this.activeFilter = status;

//     if (status === 9) {
//       this.lstAgencyDataFiltered = [...this.lstAgencyData];
//     } else {
//       this.lstAgencyDataFiltered = this.lstAgencyData.filter(a => Number(a.isActive) === Number(status));
//     }

//     // Update grid
//     if (this.gridApi) {
//       (this.gridApi as any).setRowData(this.lstAgencyDataFiltered);
//     }
//   }

//   getStatusCount(status: number): number {
//     return this.lstAgencyData.filter(a => a.isActive === status).length;
//   }

//   download() {
//     const excelData = this.lstAgencyData.map((v: any, i: number) => ({
//       "Sr No": i + 1,
//       Status: v.isActive === 0 ? "Inactive" : "Active",
//       "Agency Name": v.agencyName || "N/A",
//       Location: v.siteName || "N/A",
//       "Is Paid": v.isPaid ? "Yes" : "No",
//       "Created On": v.createdOn || "N/A",
//       "Created By": v.createdby || "N/A",
//     }))
//     const fileName = "AgencyMaster_" + moment(new Date()).format("DDMMYYYY") + ".xlsx"
//     const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData)
//     const wb: XLSX.WorkBook = XLSX.utils.book_new()
//     XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
//     XLSX.writeFile(wb, fileName)
//   }

//   Back() { this.router.navigate(["/dashboard"]) }

//   headerHeightSetter(params: any) {
//     var padding = 20
//     var height = headerHeightGetter() + padding
//     if (this.gridApi) {
//       this.gridApi.setGridOption("headerHeight", height)
//       this.gridApi.resetRowHeights()
//     }
//   }

//   onFilterTextBoxChanged() {
//     if (this.gridApi) {
//       const filterValue = (document.getElementById("filter-text-box") as HTMLInputElement)?.value || ""
//       this.gridApi.setGridOption("quickFilterText", filterValue)
//     }
//   }
// }

// function headerHeightGetter(): number {
//   var columnHeaderTexts = document.querySelectorAll(".ag-header-cell-text")
//   var columnHeaderTextsArray: HTMLElement[] = []
//   columnHeaderTexts.forEach((node) => columnHeaderTextsArray.push(node as HTMLElement))
//   var clientHeights = columnHeaderTextsArray.map((headerText: HTMLElement) => headerText.clientHeight)
//   var tallestHeaderTextHeight = Math.max(...clientHeights)
//   return tallestHeaderTextHeight
// }