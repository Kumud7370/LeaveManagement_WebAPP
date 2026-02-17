import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  ApiResponse,
  PagedResultDto,
  LeaveBalance,
  CreateLeaveBalanceDto,
  UpdateLeaveBalanceDto,
  AdjustLeaveBalanceDto,
  CarryForwardDto,
  BulkInitializeBalanceDto,
  BulkInitializeResult,
  LeaveBalanceFilterDto,
  EmployeeLeaveBalanceSummaryDto
} from '../../Models/leave-balance.model';

@Injectable({ providedIn: 'root' })
export class LeaveBalanceService {
  private endpoint = 'LeaveBalance';

  constructor(private apiClient: ApiClientService) {}

  createLeaveBalance(dto: CreateLeaveBalanceDto): Observable<ApiResponse<LeaveBalance>> {
    return this.apiClient.post<ApiResponse<LeaveBalance>>(`${this.endpoint}`, dto);
  }

  getLeaveBalanceById(id: string): Observable<ApiResponse<LeaveBalance>> {
    return this.apiClient.get<ApiResponse<LeaveBalance>>(`${this.endpoint}/${id}`);
  }

  getByEmployeeAndLeaveType(
    employeeId: string, leaveTypeId: string, year: number
  ): Observable<ApiResponse<LeaveBalance>> {
    return this.apiClient.get<ApiResponse<LeaveBalance>>(
      `${this.endpoint}/employee/${employeeId}/leave-type/${leaveTypeId}/year/${year}`
    );
  }

  getFilteredLeaveBalances(
    filter: LeaveBalanceFilterDto
  ): Observable<ApiResponse<PagedResultDto<LeaveBalance>>> {
    return this.apiClient.post<ApiResponse<PagedResultDto<LeaveBalance>>>(
      `${this.endpoint}/filter`, filter
    );
  }

  getByEmployeeId(employeeId: string, year?: number): Observable<ApiResponse<LeaveBalance[]>> {
    const query = year !== undefined ? `?year=${year}` : '';
    return this.apiClient.get<ApiResponse<LeaveBalance[]>>(
      `${this.endpoint}/employee/${employeeId}${query}`
    );
  }

  getEmployeeBalanceSummary(
    employeeId: string, year: number
  ): Observable<ApiResponse<EmployeeLeaveBalanceSummaryDto>> {
    return this.apiClient.get<ApiResponse<EmployeeLeaveBalanceSummaryDto>>(
      `${this.endpoint}/employee/${employeeId}/summary/${year}`
    );
  }

  updateLeaveBalance(id: string, dto: UpdateLeaveBalanceDto): Observable<ApiResponse<LeaveBalance>> {
    return this.apiClient.put<ApiResponse<LeaveBalance>>(`${this.endpoint}/${id}`, dto);
  }

  deleteLeaveBalance(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.delete<ApiResponse<boolean>>(`${this.endpoint}/${id}`);
  }

  adjustLeaveBalance(id: string, dto: AdjustLeaveBalanceDto): Observable<ApiResponse<boolean>> {
    return this.apiClient.patch<ApiResponse<boolean>>(`${this.endpoint}/${id}/adjust`, dto);
  }

  carryForwardLeave(dto: CarryForwardDto): Observable<ApiResponse<boolean>> {
    return this.apiClient.post<ApiResponse<boolean>>(`${this.endpoint}/carry-forward`, dto);
  }

  getLowBalanceAlerts(threshold = 2): Observable<ApiResponse<LeaveBalance[]>> {
    return this.apiClient.get<ApiResponse<LeaveBalance[]>>(
      `${this.endpoint}/alerts/low-balance?threshold=${threshold}`
    );
  }

  getExpiringSoon(year: number, daysThreshold = 30): Observable<ApiResponse<LeaveBalance[]>> {
    return this.apiClient.get<ApiResponse<LeaveBalance[]>>(
      `${this.endpoint}/alerts/expiring-soon/${year}?daysThreshold=${daysThreshold}`
    );
  }

  initializeBalanceForEmployee(employeeId: string, year: number): Observable<ApiResponse<boolean>> {
    return this.apiClient.post<ApiResponse<boolean>>(
      `${this.endpoint}/initialize/employee/${employeeId}/year/${year}`, {}
    );
  }

  bulkInitializeBalances(dto: BulkInitializeBalanceDto): Observable<ApiResponse<BulkInitializeResult>> {
    return this.apiClient.post<ApiResponse<BulkInitializeResult>>(
      `${this.endpoint}/initialize/bulk`, dto
    );
  }

  recalculateBalance(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.patch<ApiResponse<boolean>>(`${this.endpoint}/${id}/recalculate`, {});
  }
}