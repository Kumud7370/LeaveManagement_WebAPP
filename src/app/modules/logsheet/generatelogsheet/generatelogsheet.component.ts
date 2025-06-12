import {
    Component,
    OnDestroy,
    OnInit,
    CUSTOM_ELEMENTS_SCHEMA,
} from "@angular/core"
import { CommonModule } from "@angular/common"
import { ReactiveFormsModule, FormsModule } from "@angular/forms"
import { HttpClient } from "@angular/common/http"
import { Router } from "@angular/router"
import { FormBuilder, FormGroup, Validators } from "@angular/forms"
import Swal from "sweetalert2"
import { forkJoin } from "rxjs"
import { catchError } from "rxjs/operators"
import { of } from "rxjs"
import { environment } from "src/environments/environment"

@Component({
    selector: "app-generatelogsheet",
    templateUrl: "./generatelogsheet.component.html",
    styleUrls: ["./generatelogsheet.component.scss"],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class GeneratelogsheetComponent implements OnInit, OnDestroy {
    vehiclesFilteredList: any[] = []
    wardList: any[] = []
    routesFilteredList: any[] = []
    wasteTypeList: any[] = []
    Form!: FormGroup
    loading: boolean = false
    showSuccessMessage: boolean = false
    intervalId: any
    private apiUrl = environment.apiUrl

    get f() {
        return this.Form.controls
    }

    constructor(
        private http: HttpClient,
        private router: Router,
        private fb: FormBuilder,
    ) { }

    ngOnInit() {
        this.Form = this.fb.group({
            vehicleno: ["", Validators.required],
            ward: ["", Validators.required],
            routeno: ["", Validators.required],
            typeofwaste: ["", Validators.required],
            drivername: ["", Validators.required],
            starttime: [""],
            endtime: [""],
        })

        this.loadAllData()
    }

    ngOnDestroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId)
        }
    }

    loadAllData() {
        this.loading = true;

        const searchVehicleModel = {
            veh_ID: null,
            veh_Num: "",
            agencyNo: null,
            work_code: "",
            maxVeh_ID: null,
            userId: Number(sessionStorage.getItem("UserId")) || 1
        };

        // Ensure the API URL doesn't have double slashes
        const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
        
        console.log('Base API URL:', baseUrl);
        console.log('Making API calls to:');
        console.log('- Vehicles:', `${baseUrl}/Logsheet/getVehicles`);
        console.log('- Wards:', `${baseUrl}/Logsheet/getAllWards`);
        console.log('- Routes:', `${baseUrl}/Logsheet/getAllRoutes`);
        console.log('- Waste Types:', `${baseUrl}/Logsheet/getWasteTypes`);

        forkJoin({
            vehicles: this.http.post<any>(`${baseUrl}/Logsheet/getVehicles`, searchVehicleModel)
                .pipe(catchError(error => {
                    console.error('Vehicles API error:', error);
                    return of({ vehicleData: [] });
                })),
            wards: this.http.get<any>(`${baseUrl}/Logsheet/getAllWards`)
                .pipe(catchError(error => {
                    console.error('Wards API error:', error);
                    return of({ data: [] });
                })),
            routes: this.http.get<any>(`${baseUrl}/Logsheet/getAllRoutes`)
                .pipe(catchError(error => {
                    console.error('Routes API error:', error);
                    return of({ data: [] });
                })),
            wasteTypes: this.http.get<any>(`${baseUrl}/Logsheet/getWasteTypes`)
                .pipe(catchError(error => {
                    console.error('Waste Types API error:', error);
                    console.error('Error details:', {
                        status: error.status,
                        statusText: error.statusText,
                        url: error.url,
                        message: error.message
                    });
                    return of({ data: [] });
                }))
        }).subscribe({
            next: (results) => {
                console.log('API Results received:', results);

                // Process vehicles data
                if (results.vehicles?.vehicleData && Array.isArray(results.vehicles.vehicleData)) {
                    this.vehiclesFilteredList = results.vehicles.vehicleData;
                } else if (results.vehicles?.VehicleData && Array.isArray(results.vehicles.VehicleData)) {
                    this.vehiclesFilteredList = results.vehicles.VehicleData;
                } else {
                    this.vehiclesFilteredList = [];
                }
                console.log('Vehicles loaded:', this.vehiclesFilteredList.length);

                // Process wards data
                if (results.wards?.data && Array.isArray(results.wards.data)) {
                    this.wardList = results.wards.data;
                } else {
                    this.wardList = [];
                }
                console.log('Wards loaded:', this.wardList.length);

                // Process routes data
                if (results.routes?.data && Array.isArray(results.routes.data)) {
                    this.routesFilteredList = results.routes.data;
                } else {
                    this.routesFilteredList = [];
                }
                console.log('Routes loaded:', this.routesFilteredList.length);

                // Process waste types data - based on your controller, it should return ApiResponse<List<RouteWasteType>>
                if (results.wasteTypes?.data && Array.isArray(results.wasteTypes.data)) {
                    this.wasteTypeList = results.wasteTypes.data;
                } else {
                    this.wasteTypeList = [];
                }
                console.log('Waste types loaded:', this.wasteTypeList.length);

                // If waste types failed to load, show a specific message
                if (this.wasteTypeList.length === 0) {
                    console.warn('No waste types loaded from API. Check if the endpoint is working.');
                }

                this.loading = false;
            },
            error: (error: any) => {
                console.error("Error loading data:", error);
                this.loading = false;
                Swal.fire({
                    title: "Error!",
                    text: "Failed to load data. Please check your API endpoints and try again.",
                    icon: "error",
                    confirmButtonText: "OK"
                });
            }
        });
    }

    // Debug method to test waste types API individually
    testWasteTypesEndpoint() {
        const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
        const wasteTypesUrl = `${baseUrl}/Logsheet/getWasteTypes`;
        
        console.log('Testing waste types endpoint:', wasteTypesUrl);
        
        this.http.get<any>(wasteTypesUrl).subscribe({
            next: (response) => {
                console.log('Waste Types API Response:', response);
                if (response?.data) {
                    this.wasteTypeList = response.data;
                    console.log('Waste types updated:', this.wasteTypeList);
                }
            },
            error: (error) => {
                console.error('Waste Types API Error Details:', {
                    status: error.status,
                    statusText: error.statusText,
                    url: error.url,
                    message: error.message,
                    error: error.error
                });
            }
        });
    }

    Back() {
        this.router.navigate(["/logsheet/report"])
    }

    onSubmit() {
        if (!this.Form.valid) {
            this.Form.markAllAsTouched()
            return
        }

        const object = {
            Ward: this.Form.value.ward,
            VehicleNumber: this.Form.value.vehicleno,
            RouteNumber: this.Form.value.routeno,
            TypeOfWaste: this.Form.value.typeofwaste,
            DriverName: this.Form.value.drivername,
            StartDateTime: this.Form.value.starttime,
            EndDateTime: this.Form.value.endtime,
            CreatedBy: sessionStorage.getItem("UserName"),
            UserId: Number(sessionStorage.getItem("UserId"))
        }

        const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
        
        this.loading = true
        this.http.post<any>(`${baseUrl}/Logsheet/generateLogsheet`, object).subscribe({
            next: (response: any) => {
                this.loading = false
                Swal.fire({
                    title: "Success!",
                    text: "Logsheet generated successfully!",
                    icon: "success",
                    confirmButtonText: "OK"
                }).then(() => {
                    this.Form.reset()
                    this.showSuccessMessage = true
                })
            },
            error: (error: any) => {
                this.loading = false
                console.error("Error generating logsheet:", error)
                Swal.fire({
                    title: "Error!",
                    text: "Failed to generate logsheet. Please try again.",
                    icon: "error",
                    confirmButtonText: "OK"
                })
            }
        })
    }

    generateAnother() {
        this.showSuccessMessage = false
        this.Form.reset()
    }
}