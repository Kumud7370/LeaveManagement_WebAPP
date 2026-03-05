// import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
// import { isPlatformBrowser } from '@angular/common';
// import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { catchError, map, tap } from 'rxjs/operators';
// import { environment } from '../../../../environments/environment';

// @Injectable({
//   providedIn: 'root'
// })
// export class ApiClientService {
//   private baseUrl: string = environment.apiUrl;
//   private isBrowser: boolean;

//   constructor(
//     private http: HttpClient,
//     @Inject(PLATFORM_ID) private platformId: Object
//   ) {
//     this.isBrowser = isPlatformBrowser(this.platformId);
//   }

//   private getHeaders(): HttpHeaders {
//     let headers = new HttpHeaders({
//       'Content-Type': 'application/json',
//       'Accept': 'application/json'
//     });

//     const token = this.getAuthToken();
//     if (token) {
//       headers = headers.set('Authorization', `Bearer ${token}`);
//     }

//     return headers;
//   }

//   private getAuthToken(): string | null {
//     if (!this.isBrowser) return null;
//     return sessionStorage.getItem('token') || localStorage.getItem('accessToken');
//   }

//   public setAuthToken(token: string): void {
//     if (!this.isBrowser) return;
//     sessionStorage.setItem('token', token);
//     localStorage.setItem('accessToken', token);
//   }

//   public setRefreshToken(token: string): void {
//     if (!this.isBrowser) return;
//     sessionStorage.setItem('refreshToken', token);
//     localStorage.setItem('refreshToken', token);
//   }

//   public clearTokens(): void {
//     if (!this.isBrowser) return;

//     sessionStorage.removeItem('token');
//     sessionStorage.removeItem('refreshToken');
//     sessionStorage.removeItem('UserId');
//     sessionStorage.removeItem('EmployeeId');
//     sessionStorage.removeItem('SiteName');
//     sessionStorage.removeItem('RoleName');
//     sessionStorage.removeItem('username');
//     sessionStorage.removeItem('role');
//     sessionStorage.removeItem('deviceId');

//     localStorage.removeItem('accessToken');
//     localStorage.removeItem('refreshToken');
//   }

//   public get<T>(endpoint: string): Observable<T> {
//     const url = `${this.baseUrl}/${endpoint}`;
//     return this.http.get<T>(url, { headers: this.getHeaders() })
//       .pipe(catchError(this.handleError));
//   }

//   public post<T>(endpoint: string, data: any): Observable<T> {
//     const url = `${this.baseUrl}/${endpoint}`;
//     return this.http.post<T>(url, data, { headers: this.getHeaders() })
//       .pipe(catchError(this.handleError));
//   }

//   public put<T>(endpoint: string, data: any): Observable<T> {
//     const url = `${this.baseUrl}/${endpoint}`;
//     return this.http.put<T>(url, data, { headers: this.getHeaders() })
//       .pipe(catchError(this.handleError));
//   }

//   public patch<T>(endpoint: string, data: any): Observable<T> {
//     const url = `${this.baseUrl}/${endpoint}`;
//     return this.http.patch<T>(url, data, { headers: this.getHeaders() })
//       .pipe(catchError(this.handleError));
//   }

//   public delete<T>(endpoint: string): Observable<T> {
//     const url = `${this.baseUrl}/${endpoint}`;
//     return this.http.delete<T>(url, { headers: this.getHeaders() })
//       .pipe(catchError(this.handleError));
//   }

//   private handleError(error: HttpErrorResponse): Observable<never> {
//     let errorMessage = 'An unknown error occurred';

//     if (error.error instanceof ErrorEvent) {
//       errorMessage = `Network Error: ${error.error.message}`;
//     } else if (error.status === 0) {
//       errorMessage = 'Cannot connect to the server. Please ensure the API server is running at ' +
//         (error.url?.split('/api')[0] || 'the configured URL');
//     } else {
//       errorMessage = `Server Error: ${error.status} - ${error.statusText}`;

//       if (error.error && typeof error.error === 'object') {
//         if (error.error.message) {
//           errorMessage = error.error.message;
//         } else if (error.error.title) {
//           errorMessage = error.error.title;
//         }
//       }
//     }

//     console.error('API Error Details:', {
//       status: error.status,
//       statusText: error.statusText,
//       url: error.url,
//       message: errorMessage,
//       error: error.error
//     });

//     return throwError(() => error);
//   }

//   // ==================== Authentication Endpoints ====================

//   public loginUser(credentials: { username: string; password: string; deviceId: string }): Observable<any> {
//     console.log('Attempting login with:', {
//       username: credentials.username,
//       endpoint: `${this.baseUrl}/Auth/login`
//     });

//     return this.post('Auth/login', credentials).pipe(
//       map((response: any) => {
//         console.log('Login response received:', response);

//         // Extract data from the ApiResponseDto wrapper
//         const actualData = response.data || response;

//         // Store tokens if they exist (only in browser)
//         if (this.isBrowser) {
//           if (actualData.accessToken) {
//             this.setAuthToken(actualData.accessToken);
//           }
//           if (actualData.refreshToken) {
//             this.setRefreshToken(actualData.refreshToken);
//           }

//           // Store user info if needed
//           if (actualData.user) {
//             if (actualData.user.id) {
//               sessionStorage.setItem('UserId', actualData.user.id);
//             }
//             if (actualData.user.username) {
//               sessionStorage.setItem('username', actualData.user.username);
//             }
//             if (actualData.user.roles && actualData.user.roles.length > 0) {
//               sessionStorage.setItem('RoleName', actualData.user.roles[0]);
//             }
//             if (actualData.user.employeeId) {
//             sessionStorage.setItem('EmployeeId', actualData.user.employeeId);
//           }
//           if (actualData.employeeId) {
//           sessionStorage.setItem('EmployeeId', actualData.employeeId);
//         }
//           }
//         }

//         return actualData;
//       }),
//       catchError((error) => {
//         console.error('Login failed:', error);
//         return throwError(() => error);
//       })
//     );
//   }

//   public login(credentials: { email: string; password: string }): Observable<any> {
//     return this.post('Auth/login', credentials).pipe(
//       map((response: any) => {
//         // Extract data from ApiResponseDto wrapper
//         const actualData = response.data || response;

//         if (this.isBrowser) {
//           if (actualData.accessToken) {
//             this.setAuthToken(actualData.accessToken);
//           }
//           if (actualData.refreshToken) {
//             this.setRefreshToken(actualData.refreshToken);
//           }
//         }

//         return actualData;
//       })
//     );
//   }

//   public register(userData: any): Observable<any> {
//     return this.post('Auth/register', userData);
//   }

//   public logout(): Observable<any> {
//     return this.post('Auth/logout', {}).pipe(
//       map((response) => {
//         this.clearTokens();
//         return response;
//       }),
//       catchError((error) => {
//         this.clearTokens();
//         return throwError(() => error);
//       })
//     );
//   }

//   public refreshToken(): Observable<any> {
//     if (!this.isBrowser) {
//       return throwError(() => new Error('Not running in browser'));
//     }

//     const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');

//     if (!refreshToken) {
//       return throwError(() => new Error('No refresh token available'));
//     }

//     return this.http.post(`${this.baseUrl}/Auth/refresh-token`, { refreshToken }, {
//       headers: new HttpHeaders({
//         'Content-Type': 'application/json',
//         'Accept': 'application/json'
//       })
//     }).pipe(
//       map((response: any) => {
//         // Extract data from ApiResponseDto wrapper
//         const actualData = response.data || response;

//         if (actualData.accessToken) {
//           this.setAuthToken(actualData.accessToken);
//         }
//         if (actualData.refreshToken) {
//           this.setRefreshToken(actualData.refreshToken);
//         }

//         return actualData;
//       }),
//       catchError((error) => {
//         console.error('[API] Token refresh failed:', error);
//         this.clearTokens();
//         return throwError(() => error);
//       })
//     );
//   }

//   public changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
//     return this.post('Auth/change-password', data);
//   }

//   public getCurrentUser(): Observable<any> {
//     return this.get('Auth/me');
//   }

//   // ==================== User Endpoints ====================

//   public updateProfile(userData: any): Observable<any> {
//     return this.put('users/me', userData);
//   }

//   public getUsers(): Observable<any> {
//     return this.get('users');
//   }

//   public getUserById(userId: string): Observable<any> {
//     return this.get(`users/${userId}`);
//   }

//   // ==================== Attendance Endpoints ====================

//   public checkIn(data: any): Observable<any> {
//     return this.post('Attendance/checkin', data);
//   }

//   public checkOut(data: any): Observable<any> {
//     return this.post('Attendance/checkout', data);
//   }

//   public manualAttendance(data: any): Observable<any> {
//     return this.post('Attendance/manual', data);
//   }

//   public markAttendance(attendanceData: any): Observable<any> {
//     return this.manualAttendance(attendanceData);
//   }

//   public getAttendanceById(attendanceId: string): Observable<any> {
//     return this.get(`Attendance/${attendanceId}`);
//   }

//   public updateAttendance(attendanceId: string, data: any): Observable<any> {
//     return this.put(`Attendance/${attendanceId}`, data);
//   }

//   public deleteAttendance(attendanceId: string): Observable<any> {
//     return this.delete(`Attendance/${attendanceId}`);
//   }

//   public getAttendance(params?: any): Observable<any> {
//     if (params) {
//       return this.filterAttendance(params);
//     }
//     return this.getAttendanceStatistics();
//   }

//   public getTodayAttendance(employeeId: string): Observable<any> {
//     return this.get(`Attendance/today/${employeeId}`);
//   }

//   public getAttendanceByDate(employeeId: string, date: string): Observable<any> {
//     return this.get(`Attendance/date/${employeeId}/${date}`);
//   }

//   public filterAttendance(filterData: any): Observable<any> {
//     return this.post('Attendance/filter', filterData);
//   }

//   public getAttendanceHistory(employeeId: string): Observable<any> {
//     return this.get(`Attendance/history/${employeeId}`);
//   }

//   public getAttendanceSummary(employeeId: string): Observable<any> {
//     return this.get(`Attendance/summary/${employeeId}`);
//   }

//   public getAttendanceStatistics(): Observable<any> {
//     return this.get('Attendance/statistics');
//   }

//   public getLateAttendance(): Observable<any> {
//     return this.get('Attendance/late');
//   }

//   public getEarlyLeave(): Observable<any> {
//     return this.get('Attendance/early-leave');
//   }

//   public approveAttendance(id: string): Observable<any> {
//     return this.patch(`Attendance/${id}/approve`, {});
//   }

//   public markAbsent(data: any): Observable<any> {
//     return this.post('Attendance/mark-absent', data);
//   }

//   // ==================== Department Endpoints ====================

//   public createDepartment(data: any): Observable<any> {
//     return this.post('Department', data);
//   }

//   public updateDepartment(data: any): Observable<any> {
//     return this.put('Department', data);
//   }

//   public getDepartmentById(id: string): Observable<any> {
//     return this.get(`Department/${id}`);
//   }

//   public deleteDepartment(id: string): Observable<any> {
//     return this.delete(`Department/${id}`);
//   }

//   public filterDepartments(filterData: any): Observable<any> {
//     return this.post('Department/filter', filterData);
//   }

//   public getActiveDepartments(): Observable<any> {
//     return this.get('Department/active');
//   }

//   // ==================== Employee Endpoints ====================

//   public createEmployee(data: any): Observable<any> {
//     return this.post('Employee', data);
//   }

//   public getEmployeeById(id: string): Observable<any> {
//     return this.get(`Employee/${id}`);
//   }

//   public updateEmployee(id: string, data: any): Observable<any> {
//     return this.put(`Employee/${id}`, data);
//   }

//   public deleteEmployee(id: string): Observable<any> {
//     return this.delete(`Employee/${id}`);
//   }

//   public filterEmployees(filterData: any): Observable<any> {
//     return this.post('Employee/filter', filterData);
//   }

//   public getActiveEmployees(): Observable<any> {
//     return this.get('Employee/active');
//   }

//   // ==================== Leave Endpoints ====================

//   public createLeave(data: any): Observable<any> {
//     return this.post('Leave', data);
//   }

//   public getLeaveById(id: string): Observable<any> {
//     return this.get(`Leave/${id}`);
//   }

//   public updateLeave(id: string, data: any): Observable<any> {
//     return this.put(`Leave/${id}`, data);
//   }

//   public deleteLeave(id: string): Observable<any> {
//     return this.delete(`Leave/${id}`);
//   }

//   public filterLeaves(filterData: any): Observable<any> {
//     return this.post('Leave/filter', filterData);
//   }

//   public getPendingLeaves(): Observable<any> {
//     return this.get('Leave/pending');
//   }

//   public approveLeave(id: string): Observable<any> {
//     return this.patch(`Leave/${id}/approve`, {});
//   }

//   public rejectLeave(id: string): Observable<any> {
//     return this.patch(`Leave/${id}/reject`, {});
//   }

//   // ==================== Shift Endpoints ====================

//   public createShift(data: any): Observable<any> {
//     return this.post('Shift', data);
//   }

//   public getShiftById(id: string): Observable<any> {
//     return this.get(`Shift/${id}`);
//   }

//   public updateShift(id: string, data: any): Observable<any> {
//     return this.put(`Shift/${id}`, data);
//   }

//   public deleteShift(id: string): Observable<any> {
//     return this.delete(`Shift/${id}`);
//   }

//   public filterShifts(filterData: any): Observable<any> {
//     return this.post('Shift/filter', filterData);
//   }

//   public getActiveShifts(): Observable<any> {
//     return this.get('Shift/active');
//   }

//   // ==================== Holiday Endpoints ====================

//   public createHoliday(data: any): Observable<any> {
//     return this.post('Holiday', data);
//   }

//   public getHolidayById(id: string): Observable<any> {
//     return this.get(`Holiday/${id}`);
//   }

//   public updateHoliday(id: string, data: any): Observable<any> {
//     return this.put(`Holiday/${id}`, data);
//   }

//   public deleteHoliday(id: string): Observable<any> {
//     return this.delete(`Holiday/${id}`);
//   }

//   public filterHolidays(filterData: any): Observable<any> {
//     return this.post('Holiday/filter', filterData);
//   }

//   public getUpcomingHolidays(): Observable<any> {
//     return this.get('Holiday/upcoming');
//   }
// }
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, filter, take, switchMap, finalize } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private baseUrl: string = environment.apiUrl;
  private isBrowser: boolean;

  private isRefreshing   = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    const token = this.getAuthToken();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  private getAuthToken(): string | null {
    if (!this.isBrowser) return null;
    return sessionStorage.getItem('token') || localStorage.getItem('accessToken');
  }

  public setAuthToken(token: string): void {
    if (!this.isBrowser) return;
    sessionStorage.setItem('token', token);
    localStorage.setItem('accessToken', token);
  }

  public setRefreshToken(token: string): void {
    if (!this.isBrowser) return;
    sessionStorage.setItem('refreshToken', token);
    localStorage.setItem('refreshToken', token);
  }

  public clearTokens(): void {
    if (!this.isBrowser) return;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('UserId');
    sessionStorage.removeItem('EmployeeId');
    sessionStorage.removeItem('SiteName');
    sessionStorage.removeItem('RoleName');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('deviceId');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  // ── Auto-refresh on 401 ────────────────────────────────────────

  private handle401<T>(method: string, url: string, data?: any): Observable<T> {
    if (this.isRefreshing) {
      // Queue behind the in-flight refresh
      return this.refreshSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => this.rawRequest<T>(method, url, data))
      );
    }

    this.isRefreshing = true;
    this.refreshSubject.next(null);

    return this.refreshToken().pipe(
      switchMap((res) => {
        const newToken = res.accessToken || res.token || '';
        this.refreshSubject.next(newToken);
        return this.rawRequest<T>(method, url, data);
      }),
      catchError((err) => {
        this.clearTokens();
        if (this.isBrowser) window.location.href = '/login';
        return throwError(() => err);
      }),
      finalize(() => { this.isRefreshing = false; })
    );
  }

  private rawRequest<T>(method: string, url: string, data?: any): Observable<T> {
    return this.http.request<T>(method, url, { body: data, headers: this.getHeaders() });
  }

  // ── HTTP verbs ─────────────────────────────────────────────────

  public get<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.get<T>(url, { headers: this.getHeaders() }).pipe(
      catchError((err: HttpErrorResponse) =>
        err.status === 401 ? this.handle401<T>('GET', url) : this.handleError(err)
      )
    );
  }

  public post<T>(endpoint: string, data: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.post<T>(url, data, { headers: this.getHeaders() }).pipe(
      catchError((err: HttpErrorResponse) =>
        err.status === 401 ? this.handle401<T>('POST', url, data) : this.handleError(err)
      )
    );
  }

  public put<T>(endpoint: string, data: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.put<T>(url, data, { headers: this.getHeaders() }).pipe(
      catchError((err: HttpErrorResponse) =>
        err.status === 401 ? this.handle401<T>('PUT', url, data) : this.handleError(err)
      )
    );
  }

  public patch<T>(endpoint: string, data: any): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.patch<T>(url, data, { headers: this.getHeaders() }).pipe(
      catchError((err: HttpErrorResponse) =>
        err.status === 401 ? this.handle401<T>('PATCH', url, data) : this.handleError(err)
      )
    );
  }

  public delete<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.delete<T>(url, { headers: this.getHeaders() }).pipe(
      catchError((err: HttpErrorResponse) =>
        err.status === 401 ? this.handle401<T>('DELETE', url) : this.handleError(err)
      )
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Network Error: ${error.error.message}`;
    } else if (error.status === 0) {
      errorMessage = 'Cannot connect to the server. Please ensure the API server is running at ' +
        (error.url?.split('/api')[0] || 'the configured URL');
    } else {
      errorMessage = `Server Error: ${error.status} - ${error.statusText}`;
      if (error.error && typeof error.error === 'object') {
        if (error.error.message) errorMessage = error.error.message;
        else if (error.error.title) errorMessage = error.error.title;
      }
    }
    console.error('API Error Details:', {
      status: error.status, statusText: error.statusText,
      url: error.url, message: errorMessage, error: error.error
    });
    return throwError(() => error);
  }

  // ==================== Authentication Endpoints ====================

  public loginUser(credentials: { username: string; password: string; deviceId: string }): Observable<any> {
    return this.post('Auth/login', credentials).pipe(
      map((response: any) => {
        const actualData = response.data || response;
        if (this.isBrowser) {
          if (actualData.accessToken)  this.setAuthToken(actualData.accessToken);
          if (actualData.refreshToken) this.setRefreshToken(actualData.refreshToken);
          if (actualData.user) {
            if (actualData.user.id)              sessionStorage.setItem('UserId',     actualData.user.id);
            if (actualData.user.username)        sessionStorage.setItem('username',   actualData.user.username);
            if (actualData.user.roles?.length)   sessionStorage.setItem('RoleName',   actualData.user.roles[0]);
            if (actualData.user.employeeId)      sessionStorage.setItem('EmployeeId', actualData.user.employeeId);
          }
          if (actualData.employeeId) sessionStorage.setItem('EmployeeId', actualData.employeeId);
        }
        return actualData;
      }),
      catchError((error) => { console.error('Login failed:', error); return throwError(() => error); })
    );
  }

  public login(credentials: { email: string; password: string }): Observable<any> {
    return this.post('Auth/login', credentials).pipe(
      map((response: any) => {
        const actualData = response.data || response;
        if (this.isBrowser) {
          if (actualData.accessToken)  this.setAuthToken(actualData.accessToken);
          if (actualData.refreshToken) this.setRefreshToken(actualData.refreshToken);
        }
        return actualData;
      })
    );
  }

  public register(userData: any): Observable<any> { return this.post('Auth/register', userData); }

  public logout(): Observable<any> {
    return this.post('Auth/logout', {}).pipe(
      map((response) => { this.clearTokens(); return response; }),
      catchError((error) => { this.clearTokens(); return throwError(() => error); })
    );
  }

  public refreshToken(): Observable<any> {
    if (!this.isBrowser) return throwError(() => new Error('Not running in browser'));
    const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
    if (!refreshToken) return throwError(() => new Error('No refresh token available'));

    return this.http.post(`${this.baseUrl}/Auth/refresh-token`, { refreshToken }, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    }).pipe(
      map((response: any) => {
        const actualData = response.data || response;
        if (actualData.accessToken)  this.setAuthToken(actualData.accessToken);
        if (actualData.refreshToken) this.setRefreshToken(actualData.refreshToken);
        return actualData;
      }),
      catchError((error) => {
        console.error('[API] Token refresh failed:', error);
        this.clearTokens();
        return throwError(() => error);
      })
    );
  }

  public changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.post('Auth/change-password', data);
  }

  public getCurrentUser(): Observable<any> { return this.get('Auth/me'); }

  // ==================== User Endpoints ====================

  public updateProfile(userData: any): Observable<any> { return this.put('users/me', userData); }
  public getUsers(): Observable<any>                   { return this.get('users'); }
  public getUserById(userId: string): Observable<any>  { return this.get(`users/${userId}`); }

  // ==================== Attendance Endpoints ====================

  public checkIn(data: any): Observable<any>                            { return this.post('Attendance/checkin', data); }
  public checkOut(data: any): Observable<any>                           { return this.post('Attendance/checkout', data); }
  public manualAttendance(data: any): Observable<any>                   { return this.post('Attendance/manual', data); }
  public markAttendance(data: any): Observable<any>                     { return this.manualAttendance(data); }
  public getAttendanceById(id: string): Observable<any>                 { return this.get(`Attendance/${id}`); }
  public updateAttendance(id: string, data: any): Observable<any>       { return this.put(`Attendance/${id}`, data); }
  public deleteAttendance(id: string): Observable<any>                  { return this.delete(`Attendance/${id}`); }
  public getAttendance(params?: any): Observable<any>                   { return params ? this.filterAttendance(params) : this.getAttendanceStatistics(); }
  public getTodayAttendance(employeeId: string): Observable<any>        { return this.get(`Attendance/today/${employeeId}`); }
  public getAttendanceByDate(eId: string, date: string): Observable<any>{ return this.get(`Attendance/date/${eId}/${date}`); }
  public filterAttendance(filterData: any): Observable<any>             { return this.post('Attendance/filter', filterData); }
  public getAttendanceHistory(employeeId: string): Observable<any>      { return this.get(`Attendance/history/${employeeId}`); }
  public getAttendanceSummary(employeeId: string): Observable<any>      { return this.get(`Attendance/summary/${employeeId}`); }
  public getAttendanceStatistics(): Observable<any>                     { return this.get('Attendance/statistics'); }
  public getLateAttendance(): Observable<any>                           { return this.get('Attendance/late'); }
  public getEarlyLeave(): Observable<any>                               { return this.get('Attendance/early-leave'); }
  public approveAttendance(id: string): Observable<any>                 { return this.patch(`Attendance/${id}/approve`, {}); }
  public markAbsent(data: any): Observable<any>                         { return this.post('Attendance/mark-absent', data); }

  // ==================== Department Endpoints ====================

  public createDepartment(data: any): Observable<any>        { return this.post('Department', data); }
  public updateDepartment(data: any): Observable<any>        { return this.put('Department', data); }
  public getDepartmentById(id: string): Observable<any>      { return this.get(`Department/${id}`); }
  public deleteDepartment(id: string): Observable<any>       { return this.delete(`Department/${id}`); }
  public filterDepartments(filterData: any): Observable<any> { return this.post('Department/filter', filterData); }
  public getActiveDepartments(): Observable<any>             { return this.get('Department/active'); }

  // ==================== Employee Endpoints ====================

  public createEmployee(data: any): Observable<any>             { return this.post('Employee', data); }
  public getEmployeeById(id: string): Observable<any>           { return this.get(`Employee/${id}`); }
  public updateEmployee(id: string, data: any): Observable<any> { return this.put(`Employee/${id}`, data); }
  public deleteEmployee(id: string): Observable<any>            { return this.delete(`Employee/${id}`); }
  public filterEmployees(filterData: any): Observable<any>      { return this.post('Employee/filter', filterData); }
  public getActiveEmployees(): Observable<any>                  { return this.get('Employee/active'); }

  // ==================== Leave Endpoints ====================

  public createLeave(data: any): Observable<any>             { return this.post('Leave', data); }
  public getLeaveById(id: string): Observable<any>           { return this.get(`Leave/${id}`); }
  public updateLeave(id: string, data: any): Observable<any> { return this.put(`Leave/${id}`, data); }
  public deleteLeave(id: string): Observable<any>            { return this.delete(`Leave/${id}`); }
  public filterLeaves(filterData: any): Observable<any>      { return this.post('Leave/filter', filterData); }
  public getPendingLeaves(): Observable<any>                 { return this.get('Leave/pending'); }
  public approveLeave(id: string): Observable<any>           { return this.patch(`Leave/${id}/approve`, {}); }
  public rejectLeave(id: string): Observable<any>            { return this.patch(`Leave/${id}/reject`, {}); }

  // ==================== Shift Endpoints ====================

  public createShift(data: any): Observable<any>             { return this.post('Shift', data); }
  public getShiftById(id: string): Observable<any>           { return this.get(`Shift/${id}`); }
  public updateShift(id: string, data: any): Observable<any> { return this.put(`Shift/${id}`, data); }
  public deleteShift(id: string): Observable<any>            { return this.delete(`Shift/${id}`); }
  public filterShifts(filterData: any): Observable<any>      { return this.post('Shift/filter', filterData); }
  public getActiveShifts(): Observable<any>                  { return this.get('Shift/active'); }

  // ==================== Holiday Endpoints ====================

  public createHoliday(data: any): Observable<any>             { return this.post('Holiday', data); }
  public getHolidayById(id: string): Observable<any>           { return this.get(`Holiday/${id}`); }
  public updateHoliday(id: string, data: any): Observable<any> { return this.put(`Holiday/${id}`, data); }
  public deleteHoliday(id: string): Observable<any>            { return this.delete(`Holiday/${id}`); }
  public filterHolidays(filterData: any): Observable<any>      { return this.post('Holiday/filter', filterData); }
  public getUpcomingHolidays(): Observable<any>                { return this.get('Holiday/upcoming'); }
}