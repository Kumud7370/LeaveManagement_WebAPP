import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  ApiResponse,
  PagedResultDto,
  Leave,
  CreateLeaveDto,
  UpdateLeaveDto,
  LeaveFilterDto,
  ValidateLeaveRequestDto
} from '../../Models/leave.model';

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private endpoint = 'Leave';

  constructor(private apiClient: ApiClientService) {}

  createLeave(dto: CreateLeaveDto): Observable<ApiResponse<Leave>> {
    return this.apiClient.post<ApiResponse<Leave>>(
      `${this.endpoint}`,
      dto
    );
  }

  getLeaveById(id: string): Observable<ApiResponse<Leave>> {
    return this.apiClient.get<ApiResponse<Leave>>(
      `${this.endpoint}/${id}`
    );
  }

  getFilteredLeaves(filter: LeaveFilterDto): Observable<ApiResponse<PagedResultDto<Leave>>> {
    return this.apiClient.post<ApiResponse<PagedResultDto<Leave>>>(
      `${this.endpoint}/filter`,
      filter
    );
  }

  getMyLeaves(filter: LeaveFilterDto): Observable<ApiResponse<PagedResultDto<Leave>>> {
    return this.apiClient.post<ApiResponse<PagedResultDto<Leave>>>(
      `${this.endpoint}/my-leaves`,
      filter
    );
  }

  getLeavesByEmployee(employeeId: string): Observable<ApiResponse<Leave[]>> {
    return this.apiClient.get<ApiResponse<Leave[]>>(
      `${this.endpoint}/employee/${employeeId}`
    );
  }

  getPendingLeaves(): Observable<ApiResponse<Leave[]>> {
    return this.apiClient.get<ApiResponse<Leave[]>>(
      `${this.endpoint}/pending`
    );
  }

  getUpcomingLeaves(days: number = 7): Observable<ApiResponse<Leave[]>> {
    return this.apiClient.get<ApiResponse<Leave[]>>(
      `${this.endpoint}/upcoming?days=${days}`
    );
  }

  updateLeave(id: string, dto: UpdateLeaveDto): Observable<ApiResponse<Leave>> {
    return this.apiClient.put<ApiResponse<Leave>>(
      `${this.endpoint}/${id}`,
      dto
    );
  }

  deleteLeave(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.delete<ApiResponse<boolean>>(
      `${this.endpoint}/${id}`
    );
  }

// ADD these three:
adminApproveLeave(id: string): Observable<ApiResponse<boolean>> {
  return this.apiClient.patch<ApiResponse<boolean>>(
    `${this.endpoint}/${id}/admin-approve`, {}
  );
}

nayabApproveLeave(id: string): Observable<ApiResponse<boolean>> {
  return this.apiClient.patch<ApiResponse<boolean>>(
    `${this.endpoint}/${id}/nayab-approve`, {}
  );
}

tehsildarApproveLeave(id: string): Observable<ApiResponse<boolean>> {
  return this.apiClient.patch<ApiResponse<boolean>>(
    `${this.endpoint}/${id}/tehsildar-approve`, {}
  );
}

  rejectLeave(id: string, rejectionReason: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.patch<ApiResponse<boolean>>(
      `${this.endpoint}/${id}/reject`,
      { rejectionReason }
    );
  }

  cancelLeave(id: string, cancellationReason: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.patch<ApiResponse<boolean>>(
      `${this.endpoint}/${id}/cancel`,
      { cancellationReason }
    );
  }

  getLeaveStatisticsByStatus(): Observable<ApiResponse<{ [key: string]: number }>> {
    return this.apiClient.get<ApiResponse<{ [key: string]: number }>>(
      `${this.endpoint}/statistics/status`
    );
  }

  getRemainingLeaveDays(
    employeeId: string,
    leaveTypeId: string,
    year: number
  ): Observable<ApiResponse<number>> {
    return this.apiClient.get<ApiResponse<number>>(
      `${this.endpoint}/balance/${employeeId}/${leaveTypeId}/${year}`
    );
  }

  getDepartmentLeaves(filter: LeaveFilterDto): Observable<ApiResponse<PagedResultDto<Leave>>> {
  return this.apiClient.post<ApiResponse<PagedResultDto<Leave>>>(
    `${this.endpoint}/department-leaves`,
    filter
  );
}

  validateLeaveRequest(request: ValidateLeaveRequestDto): Observable<ApiResponse<boolean>> {
    return this.apiClient.post<ApiResponse<boolean>>(
      `${this.endpoint}/validate`,
      request
    );
  }
}