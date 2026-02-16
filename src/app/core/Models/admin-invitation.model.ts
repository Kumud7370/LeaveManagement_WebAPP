export interface AdminInvitation {
  id: string;
  email: string;
  invitedRole: string;
  token: string;
  invitedBy: string;
  invitedByName: string;
  status: 'Pending' | 'Accepted' | 'Revoked' | 'Expired';
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  notes?: string;
}

export interface InvitationResponseDto {
  id: string;
  email: string;
  invitedRole: string;
  token: string;
  invitedBy: string;
  invitedByName: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  notes?: string;
}

export interface SendInvitationDto {
  email: string;
  role: string;
  notes?: string;
}

export interface EditInvitationDto {
  email?: string;
  role?: string;
  notes?: string;
}

export interface AcceptInvitationDto {
  token: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ValidateTokenResponse {
  success: boolean;
  message?: string;
  data?: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    invitedBy: string;
    expiresAt: string;
  };
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
}

export interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
}