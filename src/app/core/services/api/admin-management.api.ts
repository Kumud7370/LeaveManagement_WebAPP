// // import { Injectable } from '@angular/core';
// // import { Observable } from 'rxjs';
// // import { ApiClientService } from './apiClient';
// // import {
// //   InvitationResponseDto,
// //   SendInvitationDto,
// //   EditInvitationDto,
// //   AcceptInvitationDto,
// //   ValidateTokenResponse,
// //   ApiResponse
// // } from '../../Models/admin-invitation.model';

// // @Injectable({
// //   providedIn: 'root'
// // })
// // export class AdminInvitationService {
// //   private endpoint = 'admin-management';

// //   constructor(private apiClient: ApiClientService) {}

// //   sendInvitation(dto: SendInvitationDto): Observable<ApiResponse<InvitationResponseDto>> {
// //     return this.apiClient.post<ApiResponse<InvitationResponseDto>>(
// //       `${this.endpoint}/invitations/send`,
// //       dto
// //     );
// //   }

// //   updateInvitation(
// //     id: string,
// //     dto: EditInvitationDto
// //   ): Observable<ApiResponse<InvitationResponseDto>> {
// //     return this.apiClient.put<ApiResponse<InvitationResponseDto>>(
// //       `${this.endpoint}/invitations/${id}`,
// //       dto
// //     );
// //   }

// //   revokeInvitation(id: string): Observable<ApiResponse<boolean>> {
// //     return this.apiClient.post<ApiResponse<boolean>>(
// //       `${this.endpoint}/invitations/${id}/revoke`,
// //       {}
// //     );
// //   }

// //   deleteInvitation(id: string): Observable<ApiResponse<boolean>> {
// //     return this.apiClient.delete<ApiResponse<boolean>>(
// //       `${this.endpoint}/invitations/${id}`
// //     );
// //   }

// //  // In admin-invitation.api.ts — update the method signature:
// // getAllInvitations(params?: { [key: string]: string }): Observable<any> {
// //   return this.http.get<any>(`${this.apiUrl}`, { params });
// // }

// //   getMyInvitations(): Observable<ApiResponse<InvitationResponseDto[]>> {
// //     return this.apiClient.get<ApiResponse<InvitationResponseDto[]>>(
// //       `${this.endpoint}/invitations/my-invitations`
// //     );
// //   }

// //   validateToken(token: string): Observable<ValidateTokenResponse> {
// //     return this.apiClient.get<ValidateTokenResponse>(
// //       `${this.endpoint}/invitations/validate/${token}`
// //     );
// //   }

// //   acceptInvitation(dto: AcceptInvitationDto): Observable<ApiResponse<boolean>> {
// //     return this.apiClient.post<ApiResponse<boolean>>(
// //       `${this.endpoint}/invitations/accept`,
// //       dto
// //     );
// //   }
// // }


// import { Injectable } from '@angular/core';
// import { Observable } from 'rxjs';
// import { ApiClientService } from './apiClient';
// import {
//   InvitationResponseDto,
//   SendInvitationDto,
//   EditInvitationDto,
//   AcceptInvitationDto,
//   ValidateTokenResponse,
//   ApiResponse
// } from '../../Models/admin-invitation.model';

// @Injectable({
//   providedIn: 'root'
// })
// export class AdminInvitationService {
//   private endpoint = 'admin-management';

//   constructor(private apiClient: ApiClientService) {}

//   sendInvitation(dto: SendInvitationDto): Observable<ApiResponse<InvitationResponseDto>> {
//     return this.apiClient.post<ApiResponse<InvitationResponseDto>>(
//       `${this.endpoint}/invitations/send`,
//       dto
//     );
//   }

//   updateInvitation(id: string, dto: EditInvitationDto): Observable<ApiResponse<InvitationResponseDto>> {
//     return this.apiClient.put<ApiResponse<InvitationResponseDto>>(
//       `${this.endpoint}/invitations/${id}`,
//       dto
//     );
//   }

//   revokeInvitation(id: string): Observable<ApiResponse<boolean>> {
//     return this.apiClient.post<ApiResponse<boolean>>(
//       `${this.endpoint}/invitations/${id}/revoke`,
//       {}
//     );
//   }

//   deleteInvitation(id: string): Observable<ApiResponse<boolean>> {
//     return this.apiClient.delete<ApiResponse<boolean>>(
//       `${this.endpoint}/invitations/${id}`
//     );
//   }

//   getAllInvitations(): Observable<ApiResponse<InvitationResponseDto[]>> {
//     return this.apiClient.get<ApiResponse<InvitationResponseDto[]>>(
//       `${this.endpoint}/invitations`
//     );
//   }

//   getMyInvitations(): Observable<ApiResponse<InvitationResponseDto[]>> {
//     return this.apiClient.get<ApiResponse<InvitationResponseDto[]>>(
//       `${this.endpoint}/invitations/my-invitations`
//     );
//   }

//   validateToken(token: string): Observable<ValidateTokenResponse> {
//     return this.apiClient.get<ValidateTokenResponse>(
//       `${this.endpoint}/invitations/validate/${token}`
//     );
//   }

//   acceptInvitation(dto: AcceptInvitationDto): Observable<ApiResponse<boolean>> {
//     return this.apiClient.post<ApiResponse<boolean>>(
//       `${this.endpoint}/invitations/accept`,
//       dto
//     );
//   }
// }

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

  // ─────────────────────────────────────────────
  //  CREATE USER
  // ─────────────────────────────────────────────

  /**
   * Admin creates a user with a username + password directly.
   * - For "Employee" role, employeeId is required.
   * - For "Tehsildar" / "NayabTehsildar", no employeeId needed.
   */
  createUser(dto: CreateUserDto): Observable<UserResponseDto> {
    return this.apiClient.post<ApiResponse<UserResponseDto>>('admin-management/users', dto).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error creating user:', error);
        return throwError(() => error);
      })
    );
  }

  // ─────────────────────────────────────────────
  //  UPDATE USER
  // ─────────────────────────────────────────────

  updateUser(userId: string, dto: UpdateUserDto): Observable<UserResponseDto> {
    return this.apiClient.put<ApiResponse<UserResponseDto>>(`admin-management/users/${userId}`, dto).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error updating user:', error);
        return throwError(() => error);
      })
    );
  }

  // ─────────────────────────────────────────────
  //  ACTIVATE / DEACTIVATE USER
  // ─────────────────────────────────────────────

  setUserStatus(userId: string, isActive: boolean): Observable<boolean> {
    return this.apiClient.patch<ApiResponse<boolean>>(`admin-management/users/${userId}/status`, isActive).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error changing user status:', error);
        return throwError(() => error);
      })
    );
  }

  // ─────────────────────────────────────────────
  //  DELETE USER
  // ─────────────────────────────────────────────

  deleteUser(userId: string): Observable<boolean> {
    return this.apiClient.delete<ApiResponse<boolean>>(`admin-management/users/${userId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error deleting user:', error);
        return throwError(() => error);
      })
    );
  }

  // ─────────────────────────────────────────────
  //  GET ALL USERS
  // ─────────────────────────────────────────────

  getAllUsers(): Observable<UserResponseDto[]> {
    return this.apiClient.get<ApiResponse<UserResponseDto[]>>('admin-management/users').pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching users:', error);
        return throwError(() => error);
      })
    );
  }

  // ─────────────────────────────────────────────
  //  GET USER BY ID
  // ─────────────────────────────────────────────

  getUserById(userId: string): Observable<UserResponseDto> {
    return this.apiClient.get<ApiResponse<UserResponseDto>>(`admin-management/users/${userId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching user:', error);
        return throwError(() => error);
      })
    );
  }

  // ─────────────────────────────────────────────
  //  ADMIN RESET PASSWORD
  // ─────────────────────────────────────────────

  /**
   * Admin directly resets any user's password.
   * No current-password required — admin privilege only.
   */
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