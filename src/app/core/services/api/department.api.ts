import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Department,
  DepartmentDetail,
  DepartmentHierarchy,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DepartmentFilterRequest,
  ApiResponse,
  PaginatedResponse,
  DepartmentStatistics
} from '../../Models/department.model';

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private apiUrl = `${environment.apiUrl}/api/Department`;

  constructor(private http: HttpClient) {}

  createDepartment(request: CreateDepartmentRequest): Observable<ApiResponse<Department>> {
    return this.http.post<ApiResponse<Department>>(`${this.apiUrl}`, request);
  }

  getDepartmentById(id: string): Observable<ApiResponse<Department>> {
    return this.http.get<ApiResponse<Department>>(`${this.apiUrl}/${id}`);
  }

  getDepartmentByCode(departmentCode: string): Observable<ApiResponse<Department>> {
    return this.http.get<ApiResponse<Department>>(`${this.apiUrl}/code/${departmentCode}`);
  }

  getDepartmentDetails(id: string): Observable<ApiResponse<DepartmentDetail>> {
    return this.http.get<ApiResponse<DepartmentDetail>>(`${this.apiUrl}/${id}/details`);
  }

  getFilteredDepartments(filter: DepartmentFilterRequest): Observable<ApiResponse<PaginatedResponse<Department>>> {
    return this.http.post<ApiResponse<PaginatedResponse<Department>>>(`${this.apiUrl}/filter`, filter);
  }

  getChildDepartments(parentId: string): Observable<ApiResponse<Department[]>> {
    return this.http.get<ApiResponse<Department[]>>(`${this.apiUrl}/${parentId}/children`);
  }

  getRootDepartments(): Observable<ApiResponse<Department[]>> {
    return this.http.get<ApiResponse<Department[]>>(`${this.apiUrl}/root`);
  }

  getActiveDepartments(): Observable<ApiResponse<Department[]>> {
    return this.http.get<ApiResponse<Department[]>>(`${this.apiUrl}/active`);
  }

  getDepartmentHierarchy(): Observable<ApiResponse<DepartmentHierarchy[]>> {
    return this.http.get<ApiResponse<DepartmentHierarchy[]>>(`${this.apiUrl}/hierarchy`);
  }

  updateDepartment(request: UpdateDepartmentRequest): Observable<ApiResponse<Department>> {
    return this.http.put<ApiResponse<Department>>(`${this.apiUrl}`, request);
  }

  deleteDepartment(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/${id}`);
  }

  toggleDepartmentStatus(id: string): Observable<ApiResponse<boolean>> {
    return this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  getDepartmentStatistics(): Observable<ApiResponse<DepartmentStatistics>> {
    return this.http.get<ApiResponse<DepartmentStatistics>>(`${this.apiUrl}/statistics`);
  }

  canDeleteDepartment(id: string): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/${id}/can-delete`);
  }
}