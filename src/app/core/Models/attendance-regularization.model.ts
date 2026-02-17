// Enums
export enum RegularizationType {
  MissedPunch = 1,
  LateEntry = 2,
  EarlyExit = 3,
  FullDayRegularization = 4
}

export enum RegularizationStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4
}

// DTOs
export interface RegularizationRequestDto {
  attendanceId: string;
  regularizationType: RegularizationType;
  attendanceDate: Date;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  reason: string;
}

export interface RegularizationApprovalDto {
  isApproved: boolean;
  rejectionReason?: string;
}

export interface RegularizationResponseDto {
  id: string;
  attendanceId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  regularizationType: RegularizationType;
  regularizationTypeName: string;
  attendanceDate: Date;
  originalCheckIn?: Date;
  originalCheckOut?: Date;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  reason: string;
  status: RegularizationStatus;
  statusName: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

export interface RegularizationFilterDto {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  regularizationType?: RegularizationType;
  status?: RegularizationStatus;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

// Reuse from attendance.model.ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}