import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { ApiClientService } from 'src/app/core/services/api/apiClient';
import {
  EmployeeResponseDto, CreateEmployeeDto, UpdateEmployeeDto,
  EmployeeFilterDto, PagedResultDto, ApiResponseDto, EmployeeStatus,
  ReassignEmployeeDto, AssignmentHistoryResponseDto,
  BulkReassignEmployeeDto, BulkReassignResultDto
} from '../../Models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {

  constructor(private apiClient: ApiClientService) {}

  createEmployee(dto: CreateEmployeeDto): Observable<EmployeeResponseDto> {
    return this.apiClient.post<ApiResponseDto<EmployeeResponseDto>>('Employee', dto).pipe(
      map(response => response.data),
      catchError(error => { console.error('Error creating employee:', error); return throwError(() => error); })
    );
  }

  getEmployeeById(id: string): Observable<EmployeeResponseDto> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>(`Employee/${id}`).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  getEmployeeByCode(employeeCode: string): Observable<EmployeeResponseDto> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>(`Employee/code/${employeeCode}`).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  getEmployeeByEmail(email: string): Observable<EmployeeResponseDto> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>(`Employee/email/${email}`).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  getFilteredEmployees(filter: EmployeeFilterDto): Observable<PagedResultDto<EmployeeResponseDto>> {
    return this.apiClient.post<ApiResponseDto<PagedResultDto<EmployeeResponseDto>>>('Employee/filter', filter).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  getEmployeesByDepartment(departmentId: string): Observable<EmployeeResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto[]>>(`Employee/department/${departmentId}`).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  getEmployeesByManager(managerId: string): Observable<EmployeeResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto[]>>(`Employee/manager/${managerId}`).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  getActiveEmployees(): Observable<EmployeeResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto[]>>('Employee/active').pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  updateEmployee(id: string, dto: UpdateEmployeeDto): Observable<EmployeeResponseDto> {
    return this.apiClient.put<ApiResponseDto<EmployeeResponseDto>>(`Employee/${id}`, dto).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  deleteEmployee(id: string): Observable<boolean> {
    return this.apiClient.delete<ApiResponseDto<boolean>>(`Employee/${id}`).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  changeEmployeeStatus(id: string, status: EmployeeStatus): Observable<boolean> {
    return this.apiClient.patch<ApiResponseDto<boolean>>(`Employee/${id}/status`, status).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }
  getMyProfile(): Observable<EmployeeResponseDto> {
  return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>('Employee/me').pipe(
    map(response => response.data),
    catchError(error => throwError(() => error))
  );
}

  getEmployeeStatisticsByStatus(): Observable<{ [key: string]: number }> {
    return this.apiClient.get<ApiResponseDto<{ [key: string]: number }>>('Employee/statistics/status').pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  reassignEmployee(id: string, dto: ReassignEmployeeDto): Observable<EmployeeResponseDto> {
    return this.apiClient.post<ApiResponseDto<EmployeeResponseDto>>(`Employee/${id}/reassign`, dto).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  getAssignmentHistory(employeeId: string): Observable<AssignmentHistoryResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<AssignmentHistoryResponseDto[]>>(`Employee/${employeeId}/assignment-history`).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }

  bulkReassignEmployees(dto: BulkReassignEmployeeDto): Observable<BulkReassignResultDto> {
    return this.apiClient.post<ApiResponseDto<BulkReassignResultDto>>('Employee/bulk-reassign', dto).pipe(
      map(response => response.data),
      catchError(error => throwError(() => error))
    );
  }
}