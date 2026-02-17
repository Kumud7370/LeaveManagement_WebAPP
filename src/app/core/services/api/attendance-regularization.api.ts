import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  RegularizationRequestDto,
  RegularizationApprovalDto,
  RegularizationResponseDto,
  RegularizationFilterDto,
  ApiResponse,
  PaginatedResponse
} from '../../Models/attendance-regularization.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceRegularizationService {
  private endpoint = 'AttendanceRegularization';

  constructor(private apiClient: ApiClientService) {}

  requestRegularization(dto: RegularizationRequestDto): Observable<ApiResponse<RegularizationResponseDto>> {
    return this.apiClient.post<ApiResponse<RegularizationResponseDto>>(`${this.endpoint}/request`, dto);
  }

  approveRegularization(
    id: string,
    dto: RegularizationApprovalDto
  ): Observable<ApiResponse<RegularizationResponseDto>> {
    return this.apiClient.patch<ApiResponse<RegularizationResponseDto>>(`${this.endpoint}/${id}/approve`, dto);
  }

  getById(id: string): Observable<ApiResponse<RegularizationResponseDto>> {
    return this.apiClient.get<ApiResponse<RegularizationResponseDto>>(`${this.endpoint}/${id}`);
  }

  getByEmployeeId(employeeId: string): Observable<ApiResponse<RegularizationResponseDto[]>> {
    return this.apiClient.get<ApiResponse<RegularizationResponseDto[]>>(`${this.endpoint}/employee/${employeeId}`);
  }

  getFiltered(filter: RegularizationFilterDto): Observable<ApiResponse<PaginatedResponse<RegularizationResponseDto>>> {
    return this.apiClient.post<ApiResponse<PaginatedResponse<RegularizationResponseDto>>>(`${this.endpoint}/filter`, filter);
  }

  getPending(): Observable<ApiResponse<RegularizationResponseDto[]>> {
    return this.apiClient.get<ApiResponse<RegularizationResponseDto[]>>(`${this.endpoint}/pending`);
  }

  getPendingCount(employeeId: string): Observable<ApiResponse<number>> {
    return this.apiClient.get<ApiResponse<number>>(`${this.endpoint}/pending-count/${employeeId}`);
  }

  cancelRegularization(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.patch<ApiResponse<boolean>>(`${this.endpoint}/${id}/cancel`, {});
  }
}