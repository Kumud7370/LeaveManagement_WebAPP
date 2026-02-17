export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description: string;
  maxDaysPerYear: number;
  isCarryForward: boolean;
  maxCarryForwardDays: number;
  availableCarryForward: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  minimumNoticeDays: number;
  color: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  description: string;
  maxDaysPerYear: number;
  isCarryForward: boolean;
  maxCarryForwardDays: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  minimumNoticeDays: number;
  color: string;
  isActive: boolean;
  displayOrder: number;
}

export interface UpdateLeaveTypeDto {
  name?: string;
  code?: string;
  description?: string;
  maxDaysPerYear?: number;
  isCarryForward?: boolean;
  maxCarryForwardDays?: number;
  requiresApproval?: boolean;
  requiresDocument?: boolean;
  minimumNoticeDays?: number;
  color?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface LeaveTypeFilterDto {
  searchTerm?: string;
  isActive?: boolean | null;
  requiresApproval?: boolean | null;
  requiresDocument?: boolean | null;
  isCarryForward?: boolean | null;
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

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}