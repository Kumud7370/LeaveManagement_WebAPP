import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  ApiResponse,
  PagedResultDto,
  WfhRequest,
  CreateWfhRequestDto,
  UpdateWfhRequestDto,
  WfhRequestFilterDto,
  ApproveRejectWfhRequestDto
} from '../../Models/work-from-home.model'

@Injectable({
  providedIn: 'root'
})
export class WfhRequestService {
  private endpoint = 'WorkFromHomeRequest';

  constructor(private apiClient: ApiClientService) {}

  createWfhRequest(dto: CreateWfhRequestDto): Observable<ApiResponse<WfhRequest>> {
    return this.apiClient.post<ApiResponse<WfhRequest>>(
      `${this.endpoint}`,
      dto
    );
  }

  getWfhRequestById(id: string): Observable<ApiResponse<WfhRequest>> {
    return this.apiClient.get<ApiResponse<WfhRequest>>(
      `${this.endpoint}/${id}`
    );
  }

  getFilteredWfhRequests(filter: WfhRequestFilterDto): Observable<ApiResponse<PagedResultDto<WfhRequest>>> {
    return this.apiClient.post<ApiResponse<PagedResultDto<WfhRequest>>>(
      `${this.endpoint}/filter`,
      filter
    );
  }

  getWfhRequestsByEmployee(employeeId: string): Observable<ApiResponse<WfhRequest[]>> {
    return this.apiClient.get<ApiResponse<WfhRequest[]>>(
      `${this.endpoint}/employee/${employeeId}`
    );
  }

  getMyWfhRequests(): Observable<ApiResponse<WfhRequest[]>> {
    return this.apiClient.get<ApiResponse<WfhRequest[]>>(
      `${this.endpoint}/my-requests`
    );
  }

  getPendingWfhRequests(): Observable<ApiResponse<WfhRequest[]>> {
    return this.apiClient.get<ApiResponse<WfhRequest[]>>(
      `${this.endpoint}/pending`
    );
  }

  getActiveWfhRequests(): Observable<ApiResponse<WfhRequest[]>> {
    return this.apiClient.get<ApiResponse<WfhRequest[]>>(
      `${this.endpoint}/active`
    );
  }

  getWfhRequestsByDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Observable<ApiResponse<WfhRequest[]>> {
    return this.apiClient.get<ApiResponse<WfhRequest[]>>(
      `${this.endpoint}/employee/${employeeId}/daterange?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
  }

  updateWfhRequest(id: string, dto: UpdateWfhRequestDto): Observable<ApiResponse<WfhRequest>> {
    return this.apiClient.put<ApiResponse<WfhRequest>>(
      `${this.endpoint}/${id}`,
      dto
    );
  }

  approveRejectWfhRequest(id: string, dto: ApproveRejectWfhRequestDto): Observable<ApiResponse<WfhRequest>> {
    return this.apiClient.patch<ApiResponse<WfhRequest>>(
      `${this.endpoint}/${id}/approve-reject`,
      dto
    );
  }

  cancelWfhRequest(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.patch<ApiResponse<boolean>>(
      `${this.endpoint}/${id}/cancel`,
      {}
    );
  }

  deleteWfhRequest(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.delete<ApiResponse<boolean>>(
      `${this.endpoint}/${id}`
    );
  }

  getWfhRequestStatisticsByStatus(): Observable<ApiResponse<{ [key: string]: number }>> {
    return this.apiClient.get<ApiResponse<{ [key: string]: number }>>(
      `${this.endpoint}/statistics/status`
    );
  }
}