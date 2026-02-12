import { Injectable } from '@angular/core';
import { Observable, map, catchError } from 'rxjs';
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

  // Create new employee
  createEmployee(dto: CreateEmployeeDto): Observable<EmployeeResponseDto> {
    return this.apiClient.post<ApiResponseDto<EmployeeResponseDto>>('Employee', dto).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error creating employee:', error);
        throw error;
      })
    );
  }

  // Get employee by ID
  getEmployeeById(id: string): Observable<EmployeeResponseDto> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>(`Employee/${id}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employee:', error);
        throw error;
      })
    );
  }

  // Get employee by code
  getEmployeeByCode(employeeCode: string): Observable<EmployeeResponseDto> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>(`Employee/code/${employeeCode}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employee by code:', error);
        throw error;
      })
    );
  }

  // Get employee by email
  getEmployeeByEmail(email: string): Observable<EmployeeResponseDto> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto>>(`Employee/email/${email}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employee by email:', error);
        throw error;
      })
    );
  }

  // Get filtered employees with pagination
  getFilteredEmployees(filter: EmployeeFilterDto): Observable<PagedResultDto<EmployeeResponseDto>> {
    return this.apiClient.post<ApiResponseDto<PagedResultDto<EmployeeResponseDto>>>('Employee/filter', filter).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error filtering employees:', error);
        throw error;
      })
    );
  }

  // Get employees by department
  getEmployeesByDepartment(departmentId: string): Observable<EmployeeResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto[]>>(`Employee/department/${departmentId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employees by department:', error);
        throw error;
      })
    );
  }

  // Get employees by manager
  getEmployeesByManager(managerId: string): Observable<EmployeeResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto[]>>(`Employee/manager/${managerId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employees by manager:', error);
        throw error;
      })
    );
  }

  // Get all active employees
  getActiveEmployees(): Observable<EmployeeResponseDto[]> {
    return this.apiClient.get<ApiResponseDto<EmployeeResponseDto[]>>('Employee/active').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching active employees:', error);
        throw error;
      })
    );
  }

  // Update employee
  updateEmployee(id: string, dto: UpdateEmployeeDto): Observable<EmployeeResponseDto> {
    return this.apiClient.put<ApiResponseDto<EmployeeResponseDto>>(`Employee/${id}`, dto).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error updating employee:', error);
        throw error;
      })
    );
  }

  // Delete employee
  deleteEmployee(id: string): Observable<boolean> {
    return this.apiClient.delete<ApiResponseDto<boolean>>(`Employee/${id}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error deleting employee:', error);
        throw error;
      })
    );
  }

  // Change employee status
  changeEmployeeStatus(id: string, status: EmployeeStatus): Observable<boolean> {
    return this.apiClient.patch<ApiResponseDto<boolean>>(`Employee/${id}/status`, status).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error changing employee status:', error);
        throw error;
      })
    );
  }

  // Get employee statistics by status
  getEmployeeStatisticsByStatus(): Observable<{ [key: string]: number }> {
    return this.apiClient.get<ApiResponseDto<{ [key: string]: number }>>('Employee/statistics/status').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching employee statistics:', error);
        throw error;
      })
    );
  }
}