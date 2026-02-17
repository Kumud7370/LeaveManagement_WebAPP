// src/app/core/services/api/attendance.api.ts

import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  AttendanceResponseDto,
  CheckInDto,
  CheckOutDto,
  ManualAttendanceDto,
  AttendanceFilterDto,
  AttendanceSummaryDto,
  PagedResultDto,
  ApiResponseDto
} from '../../Models/attendance.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  constructor(private apiClient: ApiClientService) {}

  // ✅ FIXED: Check-In with proper date transformation
  checkIn(dto: CheckInDto): Observable<AttendanceResponseDto> {
    console.log('🌐 AttendanceService.checkIn() called');
    console.log('Original DTO:', dto);
    
    // ⚠️ CRITICAL FIX: Transform Date to ISO string
    const payload = {
      employeeId: dto.employeeId,
      checkInTime: dto.checkInTime instanceof Date 
        ? dto.checkInTime.toISOString() 
        : dto.checkInTime,
      checkInMethod: Number(dto.checkInMethod), // Ensure it's a number
      checkInLocation: dto.checkInLocation || null,
      checkInDeviceId: dto.checkInDeviceId || null,
      remarks: dto.remarks || ''
    };
    
    console.log('📦 Transformed Payload:', payload);
    
    return this.apiClient.post<ApiResponseDto<AttendanceResponseDto>>(
      'Attendance/checkin', 
      payload
    ).pipe(
      map(response => {
        console.log('✅ Check-in response:', response);
        
        // Handle wrapped response
        if (response.data) {
          return response.data;
        }
        
        // Handle direct response
        return response as any;
      }),
      catchError(error => {
        console.error('❌ Check-in error:', error);
        return throwError(() => error);
      })
    );
  }

  // ✅ FIXED: Check-Out with proper date transformation
  checkOut(dto: CheckOutDto): Observable<AttendanceResponseDto> {
    console.log('🌐 AttendanceService.checkOut() called');
    
    const payload = {
      employeeId: dto.employeeId,
      checkOutTime: dto.checkOutTime instanceof Date 
        ? dto.checkOutTime.toISOString() 
        : dto.checkOutTime,
      checkOutMethod: Number(dto.checkOutMethod),
      checkOutLocation: dto.checkOutLocation || null,
      checkOutDeviceId: dto.checkOutDeviceId || null,
      remarks: dto.remarks || ''
    };
    
    console.log('📦 Check-out Payload:', payload);
    
    return this.apiClient.post<ApiResponseDto<AttendanceResponseDto>>(
      'Attendance/checkout', 
      payload
    ).pipe(
      map(response => {
        console.log('✅ Check-out response:', response);
        return response.data || response as any;
      }),
      catchError(error => {
        console.error('❌ Check-out error:', error);
        return throwError(() => error);
      })
    );
  }

  // Get Today's Attendance
  getTodayAttendance(employeeId: string): Observable<AttendanceResponseDto> {
    console.log('🌐 getTodayAttendance() for:', employeeId);
    
    return this.apiClient.get<ApiResponseDto<AttendanceResponseDto>>(
      `Attendance/today/${employeeId}`
    ).pipe(
      map(response => {
        console.log('✅ Today attendance response:', response);
        return response.data || response as any;
      }),
      catchError(error => {
        // 404 is normal when no attendance exists
        if (error.status === 404) {
          console.log('ℹ️ No attendance found (404)');
        } else {
          console.error('❌ Error fetching attendance:', error);
        }
        return throwError(() => error);
      })
    );
  }

  // Mark Manual Attendance
  markManualAttendance(dto: ManualAttendanceDto): Observable<AttendanceResponseDto> {
    const payload = {
      ...dto,
      attendanceDate: dto.attendanceDate instanceof Date 
        ? dto.attendanceDate.toISOString() 
        : dto.attendanceDate,
      checkInTime: dto.checkInTime instanceof Date 
        ? dto.checkInTime.toISOString() 
        : dto.checkInTime,
      checkOutTime: dto.checkOutTime instanceof Date 
        ? dto.checkOutTime.toISOString() 
        : dto.checkOutTime,
      status: Number(dto.status)
    };
    
    return this.apiClient.post<ApiResponseDto<AttendanceResponseDto>>(
      'Attendance/manual', 
      payload
    ).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('❌ Manual attendance error:', error);
        return throwError(() => error);
      })
    );
  }

  // Get Attendance by ID
  getAttendanceById(id: string): Observable<AttendanceResponseDto> {
    return this.apiClient.get<ApiResponseDto<AttendanceResponseDto>>(`Attendance/${id}`).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error fetching attendance:', error);
        return throwError(() => error);
      })
    );
  }

  // Get Attendance by Date
  getAttendanceByDate(employeeId: string, date: Date): Observable<AttendanceResponseDto> {
    const formattedDate = date.toISOString().split('T')[0];
    return this.apiClient.get<ApiResponseDto<AttendanceResponseDto>>(
      `Attendance/date/${employeeId}/${formattedDate}`
    ).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error fetching attendance by date:', error);
        return throwError(() => error);
      })
    );
  }

  // Get Filtered Attendance
  getFilteredAttendance(filter: AttendanceFilterDto): Observable<PagedResultDto<AttendanceResponseDto>> {
    console.log('Sending filter request:', filter);
    
    return this.apiClient.post<ApiResponseDto<PagedResultDto<AttendanceResponseDto>>>(
      'Attendance/filter',
      filter
    ).pipe(
      map(response => {
        console.log('Filter response:', response);
        return response.data || response as any;
      }),
      catchError(error => {
        console.error('Error filtering attendance:', error);
        return throwError(() => error);
      })
    );
  }

  // Get Employee Attendance History
  getEmployeeAttendanceHistory(
    employeeId: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<AttendanceResponseDto[]> {
    let url = `Attendance/history/${employeeId}`;
    const params: string[] = [];
    
    if (startDate) {
      params.push(`startDate=${startDate.toISOString()}`);
    }
    if (endDate) {
      params.push(`endDate=${endDate.toISOString()}`);
    }
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    return this.apiClient.get<ApiResponseDto<AttendanceResponseDto[]>>(url).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error fetching attendance history:', error);
        return throwError(() => error);
      })
    );
  }

  // Get Attendance Summary
  getAttendanceSummary(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Observable<AttendanceSummaryDto> {
    const url = `Attendance/summary/${employeeId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    
    return this.apiClient.get<ApiResponseDto<AttendanceSummaryDto>>(url).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error fetching attendance summary:', error);
        return throwError(() => error);
      })
    );
  }

  // Get Attendance Statistics
  getAttendanceStatistics(startDate: Date, endDate: Date): Observable<{ [key: string]: number }> {
    const url = `Attendance/statistics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    
    return this.apiClient.get<ApiResponseDto<{ [key: string]: number }>>(url).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error fetching attendance statistics:', error);
        return throwError(() => error);
      })
    );
  }

  // Get Late Check-Ins
  getLateCheckIns(startDate: Date, endDate: Date): Observable<AttendanceResponseDto[]> {
    const url = `Attendance/late?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    
    return this.apiClient.get<ApiResponseDto<AttendanceResponseDto[]>>(url).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error fetching late check-ins:', error);
        return throwError(() => error);
      })
    );
  }

  // Get Early Leaves
  getEarlyLeaves(startDate: Date, endDate: Date): Observable<AttendanceResponseDto[]> {
    const url = `Attendance/early-leave?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    
    return this.apiClient.get<ApiResponseDto<AttendanceResponseDto[]>>(url).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error fetching early leaves:', error);
        return throwError(() => error);
      })
    );
  }

  // Update Attendance
  updateAttendance(id: string, dto: ManualAttendanceDto): Observable<AttendanceResponseDto> {
    const payload = {
      ...dto,
      attendanceDate: dto.attendanceDate instanceof Date 
        ? dto.attendanceDate.toISOString() 
        : dto.attendanceDate,
      checkInTime: dto.checkInTime instanceof Date 
        ? dto.checkInTime.toISOString() 
        : dto.checkInTime,
      checkOutTime: dto.checkOutTime instanceof Date 
        ? dto.checkOutTime.toISOString() 
        : dto.checkOutTime
    };
    
    return this.apiClient.put<ApiResponseDto<AttendanceResponseDto>>(`Attendance/${id}`, payload).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error updating attendance:', error);
        return throwError(() => error);
      })
    );
  }

  // Delete Attendance
  deleteAttendance(id: string): Observable<boolean> {
    return this.apiClient.delete<ApiResponseDto<boolean>>(`Attendance/${id}`).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error deleting attendance:', error);
        return throwError(() => error);
      })
    );
  }

  // Approve Attendance
  approveAttendance(id: string): Observable<boolean> {
    return this.apiClient.patch<ApiResponseDto<boolean>>(`Attendance/${id}/approve`, {}).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error approving attendance:', error);
        return throwError(() => error);
      })
    );
  }

  // Mark Absent Employees
  markAbsentEmployees(date?: Date): Observable<boolean> {
    const url = date 
      ? `Attendance/mark-absent?date=${date.toISOString()}`
      : 'Attendance/mark-absent';
    
    return this.apiClient.post<ApiResponseDto<boolean>>(url, {}).pipe(
      map(response => response.data || response as any),
      catchError(error => {
        console.error('Error marking absent employees:', error);
        return throwError(() => error);
      })
    );
  }
}