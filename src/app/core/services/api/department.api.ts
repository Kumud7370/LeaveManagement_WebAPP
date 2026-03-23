import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  Department, DepartmentDetail, DepartmentHierarchy,
  CreateDepartmentRequest, UpdateDepartmentRequest,
  DepartmentFilterRequest, ApiResponse, PaginatedResponse, DepartmentStatistics
} from '../../Models/department.model';

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private endpoint = 'Department';

  constructor(private apiClient: ApiClientService) {}

  createDepartment(request: CreateDepartmentRequest): Observable<ApiResponse<Department>> {
    return this.apiClient.post<ApiResponse<Department>>(this.endpoint, request);
  }

  getDepartmentById(id: string): Observable<ApiResponse<Department>> {
    return this.apiClient.get<ApiResponse<Department>>(`${this.endpoint}/${id}`);
  }

  getDepartmentByCode(departmentCode: string): Observable<ApiResponse<Department>> {
    return this.apiClient.get<ApiResponse<Department>>(`${this.endpoint}/code/${departmentCode}`);
  }

  getDepartmentDetails(id: string): Observable<ApiResponse<DepartmentDetail>> {
    return this.apiClient.get<ApiResponse<DepartmentDetail>>(`${this.endpoint}/${id}/details`);
  }

  getFilteredDepartments(filter: DepartmentFilterRequest): Observable<ApiResponse<PaginatedResponse<Department>>> {
    return this.apiClient.post<ApiResponse<PaginatedResponse<Department>>>(`${this.endpoint}/filter`, filter);
  }

  getChildDepartments(parentId: string): Observable<ApiResponse<Department[]>> {
    return this.apiClient.get<ApiResponse<Department[]>>(`${this.endpoint}/${parentId}/children`);
  }

  getRootDepartments(): Observable<ApiResponse<Department[]>> {
    return this.apiClient.get<ApiResponse<Department[]>>(`${this.endpoint}/root`);
  }

  getActiveDepartments(): Observable<ApiResponse<Department[]>> {
    return this.apiClient.get<ApiResponse<Department[]>>(`${this.endpoint}/active`);
  }

  getDepartmentHierarchy(): Observable<ApiResponse<DepartmentHierarchy[]>> {
    return this.apiClient.get<ApiResponse<DepartmentHierarchy[]>>(`${this.endpoint}/hierarchy`);
  }

  updateDepartment(request: UpdateDepartmentRequest): Observable<ApiResponse<Department>> {
    return this.apiClient.put<ApiResponse<Department>>(this.endpoint, request);
  }

  deleteDepartment(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.delete<ApiResponse<boolean>>(`${this.endpoint}/${id}`);
  }

  toggleDepartmentStatus(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.patch<ApiResponse<boolean>>(`${this.endpoint}/${id}/toggle-status`, {});
  }

  getDepartmentStatistics(): Observable<ApiResponse<DepartmentStatistics>> {
    return this.apiClient.get<ApiResponse<DepartmentStatistics>>(`${this.endpoint}/statistics`);
  }

  canDeleteDepartment(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.get<ApiResponse<boolean>>(`${this.endpoint}/${id}/can-delete`);
  }
}