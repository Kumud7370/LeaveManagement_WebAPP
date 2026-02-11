// import {
//     Component,
//     OnDestroy,
//     OnInit,
//     CUSTOM_ELEMENTS_SCHEMA,
// } from "@angular/core"
// import { CommonModule } from "@angular/common"
// import { ReactiveFormsModule, FormsModule } from "@angular/forms"
// import { HttpClient } from "@angular/common/http"
// import { Router } from "@angular/router"
// import { FormBuilder, FormGroup, Validators } from "@angular/forms"
// import Swal from "sweetalert2"
// import { forkJoin } from "rxjs"
// import { catchError } from "rxjs/operators"
// import { of } from "rxjs"
// import { environment } from "src/environments/environment"
// import { DbCallingService } from "src/app/core/services/db-calling.service"

// @Component({
//     selector: "app-generatelogsheet",
//     templateUrl: "./generatelogsheet.component.html",
//     styleUrls: ["./generatelogsheet.component.scss"],
//     standalone: true,
//     imports: [CommonModule, ReactiveFormsModule, FormsModule],
//     schemas: [CUSTOM_ELEMENTS_SCHEMA],
// })
// export class GeneratelogsheetComponent implements OnInit, OnDestroy {
//     vehiclesFilteredList: any[] = []
//     wardList: any[] = []
//     routesFilteredList: any[] = []
//     wasteTypeList: any[] = []
//     dumpingSiteLocations: any[] = []
//     Form!: FormGroup
//     loading: boolean = false
//     showSuccessMessage: boolean = false
//     intervalId: any
//     private apiUrl = environment.apiUrl

//     get f() {
//         return this.Form.controls
//     }

//     constructor(
//         private http: HttpClient,
//         private router: Router,
//         private fb: FormBuilder, private dbCallingService: DbCallingService
//     ) {

//         console.log(sessionStorage.getItem("UserId"), String(sessionStorage.getItem("SiteName")))
//         this.dbCallingService.GetDumpingSiteLocations({ UserId: Number(sessionStorage.getItem("UserId")) }).subscribe({
//             next: (response: any) => {
//                 if (response && response.data) {
//                     this.dumpingSiteLocations = response.data;
//                     console.log('Site Locations loaded:', this.dumpingSiteLocations);
//                 }
//             },
//             error: (error: any) => {
//                 console.error('Error loading site locations:', error);
//             }
//         });
//     }

//     ngOnInit() {
//         this.Form = this.fb.group({
//             vehicleno: ["", Validators.required],
//             ward: ["", Validators.required],
//             routeno: ["", Validators.required],
//             typeofwaste: ["", Validators.required],
//             drivername: ["", Validators.required],
//             cleanername: ["", Validators.required],
//             dumpingsite: ["", Validators.required],

//         })
//         this.loadAllData()
//     }

//     ngOnDestroy(): void {
//         if (this.intervalId) {
//             clearInterval(this.intervalId)
//         }
//     }

//     loadAllData() {
//         this.loading = true;

//         const searchVehicleModel = {
//             VehicleID: null,
//             VehicleNumber: null,
//             Ward: null,
//             SiteName: String(sessionStorage.getItem("SiteName")) ? String(sessionStorage.getItem("SiteName")) : null,
//             UserId: Number(sessionStorage.getItem("UserId")) || 1
//         };
//         console.log('Search Vehicle Model:', searchVehicleModel);
//         // Ensure the API URL doesn't have double slashes
//         const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;

//         // console.log('Base API URL:', baseUrl);
//         // console.log('Making API calls to:');
//         // console.log('- Vehicles:', `${baseUrl}/Logsheet/getVehicles`);
//         // console.log('- Wards:', `${baseUrl}/Logsheet/getAllWards`);
//         // console.log('- Routes:', `${baseUrl}/Logsheet/getAllRoutes`);
//         // console.log('- Waste Types:', `${baseUrl}/Logsheet/getWasteTypes`);

//         forkJoin({
//             vehicles: this.http.post<any>(`${baseUrl}/Logsheet/getVehicles`, searchVehicleModel)
//                 .pipe(catchError(error => {
//                     console.error('Vehicles API error:', error);
//                     return of({ vehicleData: [] });
//                 })),
//             wards: this.http.post<any>(`${baseUrl}/Logsheet/getAllWards`, searchVehicleModel)
//                 .pipe(catchError(error => {
//                     console.error('Wards API error:', error);
//                     return of({ data: [] });
//                 })),
//             routes: this.http.post<any>(`${baseUrl}/Logsheet/getAllRoutes`, searchVehicleModel)
//                 .pipe(catchError(error => {
//                     console.error('Routes API error:', error);
//                     return of({ data: [] });
//                 })),
//             wasteTypes: this.http.post<any>(`${baseUrl}/Logsheet/getWasteTypes`, searchVehicleModel)
//                 .pipe(catchError(error => {
//                     console.error('Waste Types API error:', error);
//                     console.error('Error details:', {
//                         status: error.status,
//                         statusText: error.statusText,
//                         url: error.url,
//                         message: error.message
//                     });
//                     return of({ data: [] });
//                 }))
//         }).subscribe({
//             next: (results) => {
//                 //   console.log('API Results received:', results);
//                 // Process vehicles data
//                 if (results.vehicles?.data && Array.isArray(results.vehicles.data)) {
//                     this.vehiclesFilteredList = results.vehicles.data;
//                 } else if (results.vehicles?.data && Array.isArray(results.vehicles.data)) {
//                     this.vehiclesFilteredList = results.vehicles.data;
//                 } else {
//                     this.vehiclesFilteredList = [];
//                 }
//                 //  console.log('Vehicles loaded:', this.vehiclesFilteredList.length);

//                 // Process wards data
//                 if (results.wards?.data && Array.isArray(results.wards.data)) {
//                     this.wardList = results.wards.data;
//                 } else {
//                     this.wardList = [];
//                 }
//                 //  console.log('Wards loaded:', this.wardList.length);

//                 // Process routes data
//                 if (results.routes?.data && Array.isArray(results.routes.data)) {
//                     this.routesFilteredList = results.routes.data;
//                 } else {
//                     this.routesFilteredList = [];
//                 }
//                 //  console.log('Routes loaded:', this.routesFilteredList.length);

//                 // Process waste types data - based on your controller, it should return ApiResponse<List<RouteWasteType>>                
//                 if (
//                     results.wasteTypes?.data &&
//                     Array.isArray(results.wasteTypes.data)
//                 ) {
//                     this.wasteTypeList = results.wasteTypes.data;
//                 } else {
//                     this.wasteTypeList = [];
//                 }
//                 //  console.log('Waste types loaded:', this.wasteTypeList.length);

//                 // If waste types failed to load, show a specific message
//                 if (this.wasteTypeList.length === 0) {
//                     console.warn('No waste types loaded from API. Check if the endpoint is working.');
//                 }
//                 // ✅ Auto-select if only one vehicle
//                 // if (this.vehiclesFilteredList.length === 1) {
//                 //     this.Form.patchValue({ vehicleno: this.vehiclesFilteredList[0].VehicleNumber });
//                 // }
//                 // ✅ Auto-select if only one ward
//                 if (this.wardList.length === 1) {
//                     this.Form.patchValue({ ward: this.wardList[0].wardName || this.wardList[0].wardName });
//                 }
//                 // ✅ Auto-select if only one route
//                 if (this.routesFilteredList.length === 1) {
//                     this.Form.patchValue({ routeno: this.routesFilteredList[0].routeNumber });
//                 }
//                 // ✅ Auto-select if only one waste type
//                 if (this.wasteTypeList.length === 1) {
//                     this.Form.patchValue({ typeofwaste: this.wasteTypeList[0].wasteType });
//                 }
//                 this.loading = false;
//             },
//             error: (error: any) => {
//                 console.error("Error loading data:", error);
//                 this.loading = false;
//                 Swal.fire({
//                     title: "Error!",
//                     text: "Failed to load data. Please check your API endpoints and try again.",
//                     icon: "error",
//                     confirmButtonText: "OK"
//                 });
//             }
//         });
//     }

//     // Debug method to test waste types API individually
//     testWasteTypesEndpoint() {
//         const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
//         const wasteTypesUrl = `${baseUrl}/Logsheet/getWasteTypes`;

//         console.log('Testing waste types endpoint:', wasteTypesUrl);

//         this.http.get<any>(wasteTypesUrl).subscribe({
//             next: (response) => {
//                 console.log('Waste Types API Response:', response);
//                 if (response?.data) {
//                     this.wasteTypeList = response.data;
//                     console.log('Waste types updated:', this.wasteTypeList);
//                 }
//             },
//             error: (error) => {
//                 console.error('Waste Types API Error Details:', {
//                     status: error.status,
//                     statusText: error.statusText,
//                     url: error.url,
//                     message: error.message,
//                     error: error.error
//                 });
//             }
//         });
//     }

//     Back() {
//         this.router.navigate(["/logsheet/logsheetlist"])
//     }

//     onSubmit() {
//         if (!this.Form.valid) {
//             this.Form.markAllAsTouched()
//             return
//         }

//         const object = {
//             Ward: this.Form.value.ward,
//             VehicleNumber: this.Form.value.vehicleno,
//             RouteNumber: this.Form.value.routeno,
//             TypeOfWaste: this.Form.value.typeofwaste,
//             DriverName: this.Form.value.drivername,
//             CleanerName: this.Form.value.cleanername,
//             DumpingLocation: this.Form.value.dumpingsite,
//             SiteName: String(sessionStorage.getItem("SiteName")),
//             CreatedBy: String(sessionStorage.getItem("UserId")),
//             LogsheetSessionId: String(sessionStorage.getItem("UserId")),
//         }
//         console.log('Submitting logsheet with data:', object);
//         const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
//         this.loading = true
//         this.http.post<any>(`${baseUrl}/Logsheet/generateLogsheet`, object).subscribe({
//             next: (response: any) => {
//                 this.loading = false
//                 Swal.fire({
//                     title: "Success!",
//                     text: "Logsheet generated successfully!",
//                     icon: "success",
//                     confirmButtonText: "OK"
//                 }).then(() => {
//                     this.Form.reset()
//                     this.showSuccessMessage = true
//                      this.router.navigate(["/logsheet/logsheetlist"])
//                 })
//             },
//             error: (error: any) => {
//                 this.loading = false
//                 console.error("Error generating logsheet:", error)
//                 Swal.fire({
//                     title: "Error!",
//                     text: "Failed to generate logsheet. Please try again.",
//                     icon: "error",
//                     confirmButtonText: "OK"
//                 })
//             }
//         })
//     }

//     generateAnother() {
//         this.showSuccessMessage = false
//         this.Form.reset()
//     }
// }