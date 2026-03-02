export enum ApprovalStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4
}

// WFH Request Models
export interface WfhRequest {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: ApprovalStatus;
  statusName: string;
  approvedBy?: string;
  approverName?: string;
  approverFullName?: string;
  approvedDate?: Date;
  rejectionReason?: string;
  isActive: boolean;
  canBeCancelled: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateWfhRequestDto {
  employeeId?: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface UpdateWfhRequestDto {
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export interface ApproveRejectWfhRequestDto {
  status: ApprovalStatus;
  rejectionReason?: string;
}

export interface WfhRequestFilterDto {
  employeeId?: string;
  searchTerm?: string;
  status?: ApprovalStatus;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  approvedBy?: string;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
}

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}