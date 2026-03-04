import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { ApiClientService } from 'src/app/core/services/api/apiClient';
import {
  EmployeeResponseDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeFilterDto,
  PagedResultDto,
  ApiResponseDto,
  EmployeeStatus
} from '../../Models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  constructor(private apiClient: ApiClientService) {}

  createEmployee(dto: CreateEmployeeDto): Observable<EmployeeResponseDto> {
    return this.apiClient.post<ApiResponseDto<EmployeeResponseDto>>('Employee', dto).pipe(
      map(response => {
        console.log('Create employee response:', response);
        return response.data;
      }),
      catchError(error => {
        console.error('Error creating employee:', error);
        return throwError(() => error);
      })
    );
  }

  getEmployeeById(id: string): Observable<EmployeeResponseDto> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>(`Employee/${id}`).pipe(
      map(response => {
        console.log('Get employee by ID response:', response);
        return response.data;
      }),
      catchError(error => {
        console.error('Error fetching employee:', error);
        return throwError(() => error);
      })
    );
  }

  // Get employee by code
  getEmployeeByCode(employeeCode: string): Observable<EmployeeResponseDto> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>(`Employee/code/${employeeCode}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employee by code:', error);
        return throwError(() => error);
      })
    );
  }

  getEmployeeByEmail(email: string): Observable<EmployeeResponseDto> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>(`Employee/email/${email}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employee by email:', error);
        return throwError(() => error);
      })
    );
  }

  getFilteredEmployees(filter: EmployeeFilterDto): Observable<PagedResultDto<EmployeeResponseDto>> {
    console.log('Sending filter request:', filter);
    
    return this.apiClient.post<ApiResponseDto<PagedResultDto<EmployeeResponseDto>>>('Employee/filter', filter).pipe(
      map(response => {
        console.log('Filter response:', response);
        return response.data;
      }),
      catchError(error => {
        console.error('Error filtering employees:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        return throwError(() => error);
      })
    );
  }

  // Get employees by department
  getEmployeesByDepartment(departmentId: string): Observable<EmployeeResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto[]>>(`Employee/department/${departmentId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employees by department:', error);
        return throwError(() => error);
      })
    );
  }

  // Get employees by manager
  getEmployeesByManager(managerId: string): Observable<EmployeeResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto[]>>(`Employee/manager/${managerId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employees by manager:', error);
        return throwError(() => error);
      })
    );
  }

  // Get all active employees
  getActiveEmployees(): Observable<EmployeeResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto[]>>('Employee/active').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching active employees:', error);
        return throwError(() => error);
      })
    );
  }

  // Update employee
  updateEmployee(id: string, dto: UpdateEmployeeDto): Observable<EmployeeResponseDto> {
    return this.apiClient.put<ApiResponseDto<EmployeeResponseDto>>(`Employee/${id}`, dto).pipe(
      map(response => {
        console.log('Update employee response:', response);
        return response.data;
      }),
      catchError(error => {
        console.error('Error updating employee:', error);
        return throwError(() => error);
      })
    );
  }

  // Delete employee
  deleteEmployee(id: string): Observable<boolean> {
    return this.apiClient.delete<ApiResponseDto<boolean>>(`Employee/${id}`).pipe(
      map(response => {
        console.log('Delete employee response:', response);
        return response.data;
      }),
      catchError(error => {
        console.error('Error deleting employee:', error);
        return throwError(() => error);
      })
    );
  }

  // Change employee status - FIXED: Send status as number in request body
  changeEmployeeStatus(id: string, status: EmployeeStatus): Observable<boolean> {
    console.log('Changing status:', { id, status });
    
    return this.apiClient.patch<ApiResponseDto<boolean>>(`Employee/${id}/status`, status).pipe(
      map(response => {
        console.log('Change status response:', response);
        return response.data;
      }),
      catchError(error => {
        console.error('Error changing employee status:', error);
        return throwError(() => error);
      })
    );
  }

  // Get employee statistics by status
  getEmployeeStatisticsByStatus(): Observable<{ [key: string]: number }> {
    return this.apiClient.get<ApiResponseDto<{ [key: string]: number }>>('Employee/statistics/status').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employee statistics:', error);
        return throwError(() => error);
      })
    );
  }
}