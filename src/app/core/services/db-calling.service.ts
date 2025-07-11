import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DbCallingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getDashboardGraphData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/graph-data`).pipe(
      catchError(error => {
        console.error('Error fetching dashboard graph data', error);
        // Return mock data for development
        return of({
          Data: [
            { MonthYear: 'Jan 2023', VehicleCount: 120, TotalActNetWeight: 1500 },
            { MonthYear: 'Feb 2023', VehicleCount: 150, TotalActNetWeight: 1800 },
            { MonthYear: 'Mar 2023', VehicleCount: 180, TotalActNetWeight: 2200 },
            { MonthYear: 'Apr 2023', VehicleCount: 210, TotalActNetWeight: 2500 },
            { MonthYear: 'May 2023', VehicleCount: 190, TotalActNetWeight: 2300 },
            { MonthYear: 'Jun 2023', VehicleCount: 220, TotalActNetWeight: 2700 }
          ]
        });
      })
    );
  }

  getDashboardGraphWardwiseData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/ward-data`).pipe(
      catchError(error => {
        console.error('Error fetching ward-wise data', error);
        // Return mock data for development
        return of({
          WBWidgetTable: [
            { WBName: 'Ward A', VehicleCount: 50, ActNetWt: 600 },
            { WBName: 'Ward B', VehicleCount: 70, ActNetWt: 850 },
            { WBName: 'Ward C', VehicleCount: 45, ActNetWt: 550 },
            { WBName: 'Ward D', VehicleCount: 65, ActNetWt: 780 },
            { WBName: 'Ward E', VehicleCount: 55, ActNetWt: 670 },
            { WBName: 'Ward F', VehicleCount: 40, ActNetWt: 480 }
          ]
        });
      })
    );
  }

  getWidgetData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/widget-data`).pipe(
      catchError(error => {
        console.error('Error fetching widget data', error);
        // Return mock data for development
        return of({
          totalVehicles: 985,
          totalWeight: 12450,
          activeWards: 24,
          completionPercentage: 78
        });
      })
    );
  }

  getVehicles(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/vehicles/list`, data).pipe(
      catchError(error => {
        console.error('Error fetching vehicle data', error);
        return of({ VehicleData: [] }); // fallback to empty array on error
      })
    );
  }

  getWards(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/wards/list`).pipe(
      catchError(error => {
        console.error('Error fetching ward data', error);
        return of({ WardData: [] });
      })
    );
  }

  getWasteTypes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/waste-types`).pipe(
      catchError(error => {
        console.error('Error fetching waste types', error);
        return of(null);
      })
    );
  }

  getRoutes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/routes`).pipe(
      catchError(error => {
        console.error('Error fetching routes', error);
        return of(null);
      })
    );
  }

  generateLogsheet(obj: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/logsheet/generate`, obj).pipe(
      catchError(error => {
        console.error('Error generating logsheet', error);
        return of(null);
      })
    );
  }

  loginUser(data: { username: string; password: string, deviceId: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/User/userWebLogin`, data).pipe(
      catchError(error => {
        console.error('Login error', error);
        return of(null);
      })
    );
  }

  getSearchReports(payload: any) {
    return this.http.post(`${this.apiUrl}/Report/GetSearchReports`, payload).pipe(
      catchError(error => {
        console.error('Error generating report', error);
        return of(null);
      })
    )
  }

  getWardwiseReport(data: {
    WeighBridge: string;
    FromDate: string;
    ToDate: string;
    FullDate: string;
    WardName: string;
    Act_Shift: string;
    TransactionDate: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Report/GetWardwiseReport`, data).pipe(
      catchError((error) => {
        console.error("Error fetching wardwise report", error)

        return of({ WardData: [], ServiceResponse: "Failed", msg: "Error fetching data" })
      }),
    )
  }

  getShiftwiseReport(data: {
    WeighBridge: string;
    FromDate: string;
    ToDate: string;
    Act_Shift: string;
    WardName: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Report/getShiftwiseReport`, data).pipe(
      catchError((error) => {
        console.error("Error fetching shiftwise report", error);
        return of({
          ShiftData: [],
          ServiceResponse: "Failed",
          msg: "Error fetching shiftwise data"
        });
      })
    );
  }
  getBillableSearchData(data: {
    UserId: number;
    Zone: string | null;
    Parentcode: string | null;
    Workcode: string | null;
    FromDate: string;
    ToDate: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Report/GetBillableSearchData`, data).pipe(
      catchError((error) => {
        console.error("Error fetching billable search data", error);
        return of({
          Data: [],
          ServiceResponse: 0,
          msg: "Error fetching billable data"
        });
      })
    );
  }

  sendToVerifyBillingData(data: {
    UserId: number;
    SlipSrNoNew: string;
    BillingStatus: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Report/BillingVerification`, data).pipe(
      catchError((error) => {
        console.error("Error sending billing data for verification", error);
        return of({
          ServiceResponse: 0,
          msg: "Error sending data for verification"
        });
      })
    );
  }

  rejectBillingData(data: {
    UserId: number;
    SlipSrNoNew: string;
    BillingStatus: number;
    Remark?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/Report/BillingReject`, data).pipe(
      catchError((error) => {
        console.error("Error rejecting billing data", error);
        return of({
          ServiceResponse: 0,
          msg: "Error rejecting billing data"
        });
      })
    );
  }
}
