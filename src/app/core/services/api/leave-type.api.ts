import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  ApiResponse,
  PagedResultDto,
  LeaveType,
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  LeaveTypeFilterDto
} from '../../Models/leave-type.model';

@Injectable({ providedIn: 'root' })
export class LeaveTypeService {
  private endpoint = 'LeaveType';

  constructor(private apiClient: ApiClientService) {}

  createLeaveType(dto: CreateLeaveTypeDto): Observable<ApiResponse<LeaveType>> {
    return this.apiClient.post<ApiResponse<LeaveType>>(`${this.endpoint}`, dto);
  }

  getLeaveTypeById(id: string): Observable<ApiResponse<LeaveType>> {
    return this.apiClient.get<ApiResponse<LeaveType>>(`${this.endpoint}/${id}`);
  }

  getLeaveTypeByCode(code: string): Observable<ApiResponse<LeaveType>> {
    return this.apiClient.get<ApiResponse<LeaveType>>(`${this.endpoint}/code/${code}`);
  }

  getFilteredLeaveTypes(filter: LeaveTypeFilterDto): Observable<ApiResponse<PagedResultDto<LeaveType>>> {
    return this.apiClient.post<ApiResponse<PagedResultDto<LeaveType>>>(`${this.endpoint}/filter`, filter);
  }

  getActiveLeaveTypes(): Observable<ApiResponse<LeaveType[]>> {
    return this.apiClient.get<ApiResponse<LeaveType[]>>(`${this.endpoint}/active`);
  }

  updateLeaveType(id: string, dto: UpdateLeaveTypeDto): Observable<ApiResponse<LeaveType>> {
    return this.apiClient.put<ApiResponse<LeaveType>>(`${this.endpoint}/${id}`, dto);
  }

  deleteLeaveType(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.delete<ApiResponse<boolean>>(`${this.endpoint}/${id}`);
  }

  toggleLeaveTypeStatus(id: string, isActive: boolean): Observable<ApiResponse<boolean>> {
    return this.apiClient.patch<ApiResponse<boolean>>(`${this.endpoint}/${id}/toggle-status`, { isActive });
  }
}