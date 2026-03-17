import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError, throwError } from 'rxjs';
import { ApiClientService } from './apiClient';
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
export class AdminManagementService {

  constructor(private apiClient: ApiClientService) {}


  //  CREATE USER
  createUser(dto: CreateUserDto): Observable<UserResponseDto> {
    return this.apiClient.post<ApiResponse<UserResponseDto>>('admin-management/users', dto).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error creating user:', error);
        return throwError(() => error);
      })
    );
  }

  //  UPDATE USER

  updateUser(userId: string, dto: UpdateUserDto): Observable<UserResponseDto> {
    return this.apiClient.put<ApiResponse<UserResponseDto>>(`admin-management/users/${userId}`, dto).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error updating user:', error);
        return throwError(() => error);
      })
    );
  }

  //  ACTIVATE / DEACTIVATE USER
 
  setUserStatus(userId: string, isActive: boolean): Observable<boolean> {
    return this.apiClient.patch<ApiResponse<boolean>>(`admin-management/users/${userId}/status`, isActive).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error changing user status:', error);
        return throwError(() => error);
      })
    );
  }

  //  DELETE USER
  deleteUser(userId: string): Observable<boolean> {
    return this.apiClient.delete<ApiResponse<boolean>>(`admin-management/users/${userId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error deleting user:', error);
        return throwError(() => error);
      })
    );
  }

  //  GET ALL USERS
  getAllUsers(): Observable<UserResponseDto[]> {
    return this.apiClient.get<ApiResponse<UserResponseDto[]>>('admin-management/users').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching users:', error);
        return throwError(() => error);
      })
    );
  }

  //  GET USER BY ID
  getUserById(userId: string): Observable<UserResponseDto> {
    return this.apiClient.get<ApiResponse<UserResponseDto>>(`admin-management/users/${userId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching user:', error);
        return throwError(() => error);
      })
    );
  }

  //  ADMIN RESET PASSWORD
 
  resetUserPassword(userId: string, dto: AdminResetPasswordDto): Observable<boolean> {
    return this.apiClient.post<ApiResponse<boolean>>(
      `admin-management/users/${userId}/reset-password`, dto
    ).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error resetting password:', error);
        return throwError(() => error);
      })
    );
  }
}