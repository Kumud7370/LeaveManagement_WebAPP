import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  InvitationResponseDto,
  SendInvitationDto,
  EditInvitationDto,
  AcceptInvitationDto,
  ValidateTokenResponse,
  ApiResponse
} from '../../Models/admin-invitation.model';

@Injectable({
  providedIn: 'root'
})
export class AdminInvitationService {
  private endpoint = 'admin-management';

  constructor(private apiClient: ApiClientService) {}

  sendInvitation(dto: SendInvitationDto): Observable<ApiResponse<InvitationResponseDto>> {
    return this.apiClient.post<ApiResponse<InvitationResponseDto>>(
      `${this.endpoint}/invitations/send`,
      dto
    );
  }

  updateInvitation(
    id: string,
    dto: EditInvitationDto
  ): Observable<ApiResponse<InvitationResponseDto>> {
    return this.apiClient.put<ApiResponse<InvitationResponseDto>>(
      `${this.endpoint}/invitations/${id}`,
      dto
    );
  }

  revokeInvitation(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.post<ApiResponse<boolean>>(
      `${this.endpoint}/invitations/${id}/revoke`,
      {}
    );
  }

  deleteInvitation(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.delete<ApiResponse<boolean>>(
      `${this.endpoint}/invitations/${id}`
    );
  }

  getAllInvitations(): Observable<ApiResponse<InvitationResponseDto[]>> {
    return this.apiClient.get<ApiResponse<InvitationResponseDto[]>>(
      `${this.endpoint}/invitations`
    );
  }

  getMyInvitations(): Observable<ApiResponse<InvitationResponseDto[]>> {
    return this.apiClient.get<ApiResponse<InvitationResponseDto[]>>(
      `${this.endpoint}/invitations/my-invitations`
    );
  }

  validateToken(token: string): Observable<ValidateTokenResponse> {
    return this.apiClient.get<ValidateTokenResponse>(
      `${this.endpoint}/invitations/validate/${token}`
    );
  }

  acceptInvitation(dto: AcceptInvitationDto): Observable<ApiResponse<boolean>> {
    return this.apiClient.post<ApiResponse<boolean>>(
      `${this.endpoint}/invitations/accept`,
      dto
    );
  }
}