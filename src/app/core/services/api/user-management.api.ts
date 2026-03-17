import { Injectable } from '@angular/core';
import { Observable, map, catchError, throwError } from 'rxjs';
import { ApiClientService } from 'src/app/core/services/api/apiClient';
import {
  CreateUserDto,
  UpdateUserDto,
  AdminResetPasswordDto,
  UserResponseDto,
  ApiResponse
} from '../../Models/admin-management.model';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  constructor(private apiClient: ApiClientService) {}

  createUser(dto: CreateUserDto): Observable<UserResponseDto> {
    return this.apiClient.post<ApiResponse<UserResponseDto>>('admin-management/users', dto).pipe(
      map(r => r.data),
      catchError(err => { console.error('Create user error:', err); return throwError(() => err); })
    );
  }

  getAllUsers(): Observable<UserResponseDto[]> {
    return this.apiClient.get<ApiResponse<UserResponseDto[]>>('admin-management/users').pipe(
      map(r => r.data),
      catchError(err => { console.error('Get users error:', err); return throwError(() => err); })
    );
  }

  getUserById(id: string): Observable<UserResponseDto> {
    return this.apiClient.get<ApiResponse<UserResponseDto>>(`admin-management/users/${id}`).pipe(
      map(r => r.data),
      catchError(err => throwError(() => err))
    );
  }

  updateUser(id: string, dto: UpdateUserDto): Observable<UserResponseDto> {
    return this.apiClient.put<ApiResponse<UserResponseDto>>(`admin-management/users/${id}`, dto).pipe(
      map(r => r.data),
      catchError(err => throwError(() => err))
    );
  }

  setUserStatus(id: string, isActive: boolean): Observable<boolean> {
    return this.apiClient.patch<ApiResponse<boolean>>(`admin-management/users/${id}/status`, isActive).pipe(
      map(r => r.data),
      catchError(err => throwError(() => err))
    );
  }

  deleteUser(id: string): Observable<boolean> {
    return this.apiClient.delete<ApiResponse<boolean>>(`admin-management/users/${id}`).pipe(
      map(r => r.data),
      catchError(err => throwError(() => err))
    );
  }

  resetUserPassword(id: string, dto: AdminResetPasswordDto): Observable<boolean> {
    return this.apiClient.post<ApiResponse<boolean>>(`admin-management/users/${id}/reset-password`, dto).pipe(
      map(r => r.data),
      catchError(err => throwError(() => err))
    );
  }
}