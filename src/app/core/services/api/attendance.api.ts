// =============================================
// attendance.api.ts
// HTTP service - mirrors every backend endpoint
// =============================================

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient'; // your existing HTTP wrapper
import {
  ApiResponse,
  PagedResultDto,
  AttendanceResponseDto,
  AttendanceSummaryDto,
  CheckInDto,
  CheckOutDto,
  ManualAttendanceDto,
  AttendanceFilterDto
} from '../../Models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly endpoint = 'Attendance';

  constructor(private apiClient: ApiClientService) {}

  // ---------- Check In / Out ----------
  checkIn(dto: CheckInDto): Observable<ApiResponse<AttendanceResponseDto>> {
    return this.apiClient.post<ApiResponse<AttendanceResponseDto>>(
      `${this.endpoint}/checkin`, dto
    );
  }

  checkOut(dto: CheckOutDto): Observable<ApiResponse<AttendanceResponseDto>> {
    return this.apiClient.post<ApiResponse<AttendanceResponseDto>>(
      `${this.endpoint}/checkout`, dto
    );
  }

  // ---------- Manual (Admin / Manager) ----------
  markManualAttendance(dto: ManualAttendanceDto): Observable<ApiResponse<AttendanceResponseDto>> {
    return this.apiClient.post<ApiResponse<AttendanceResponseDto>>(
      `${this.endpoint}/manual`, dto
    );
  }

  updateAttendance(id: string, dto: ManualAttendanceDto): Observable<ApiResponse<AttendanceResponseDto>> {
    return this.apiClient.put<ApiResponse<AttendanceResponseDto>>(
      `${this.endpoint}/${id}`, dto
    );
  }

  approveAttendance(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.patch<ApiResponse<boolean>>(
      `${this.endpoint}/${id}/approve`, {}
    );
  }

  deleteAttendance(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.delete<ApiResponse<boolean>>(
      `${this.endpoint}/${id}`
    );
  }

  markAbsentEmployees(date?: string): Observable<ApiResponse<boolean>> {
    const q = date ? `?date=${date}` : '';
    return this.apiClient.post<ApiResponse<boolean>>(
      `${this.endpoint}/mark-absent${q}`, {}
    );
  }

  // ---------- Read ----------
  getAttendanceById(id: string): Observable<ApiResponse<AttendanceResponseDto>> {
    return this.apiClient.get<ApiResponse<AttendanceResponseDto>>(
      `${this.endpoint}/${id}`
    );
  }

  getTodayAttendance(employeeId: string): Observable<ApiResponse<AttendanceResponseDto>> {
    return this.apiClient.get<ApiResponse<AttendanceResponseDto>>(
      `${this.endpoint}/today/${employeeId}`
    );
  }

  getAttendanceByDate(employeeId: string, date: string): Observable<ApiResponse<AttendanceResponseDto>> {
    return this.apiClient.get<ApiResponse<AttendanceResponseDto>>(
      `${this.endpoint}/date/${employeeId}/${date}`
    );
  }

  getFilteredAttendance(filter: AttendanceFilterDto): Observable<ApiResponse<PagedResultDto<AttendanceResponseDto>>> {
    return this.apiClient.post<ApiResponse<PagedResultDto<AttendanceResponseDto>>>(
      `${this.endpoint}/filter`, filter
    );
  }

  getEmployeeHistory(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Observable<ApiResponse<AttendanceResponseDto[]>> {
    let q = '';
    if (startDate) q += `?startDate=${startDate}`;
    if (endDate)   q += `${q ? '&' : '?'}endDate=${endDate}`;
    return this.apiClient.get<ApiResponse<AttendanceResponseDto[]>>(
      `${this.endpoint}/history/${employeeId}${q}`
    );
  }

  getAttendanceSummary(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Observable<ApiResponse<AttendanceSummaryDto>> {
    return this.apiClient.get<ApiResponse<AttendanceSummaryDto>>(
      `${this.endpoint}/summary/${employeeId}?startDate=${startDate}&endDate=${endDate}`
    );
  }

  getStatistics(startDate: string, endDate: string): Observable<ApiResponse<{ [key: string]: number }>> {
    return this.apiClient.get<ApiResponse<{ [key: string]: number }>>(
      `${this.endpoint}/statistics?startDate=${startDate}&endDate=${endDate}`
    );
  }

  getLateCheckIns(startDate: string, endDate: string): Observable<ApiResponse<AttendanceResponseDto[]>> {
    return this.apiClient.get<ApiResponse<AttendanceResponseDto[]>>(
      `${this.endpoint}/late?startDate=${startDate}&endDate=${endDate}`
    );
  }

  getEarlyLeaves(startDate: string, endDate: string): Observable<ApiResponse<AttendanceResponseDto[]>> {
    return this.apiClient.get<ApiResponse<AttendanceResponseDto[]>>(
      `${this.endpoint}/early-leave?startDate=${startDate}&endDate=${endDate}`
    );
  }
}