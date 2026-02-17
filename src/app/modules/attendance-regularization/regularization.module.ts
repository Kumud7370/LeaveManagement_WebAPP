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

export interface RegularizationRequestDto {
  employeeId: string;
  attendanceDate: Date;
  regularizationType: RegularizationType;
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
  attendanceId?: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  attendanceDate: Date;
  regularizationType: RegularizationType;
  regularizationTypeName: string;
  requestedCheckIn?: Date;
  requestedCheckOut?: Date;
  originalCheckIn?: Date;
  originalCheckOut?: Date;
  reason: string;
  status: RegularizationStatus;
  statusName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  requestedBy: string;
  requestedAt: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface RegularizationFilterDto {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  regularizationType?: RegularizationType;
  status?: RegularizationStatus;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  sortDescending: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}