// Enums
export enum LeaveStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Cancelled = 3
}

// Leave Models
export interface Leave {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  leaveTypeColor?: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  leaveStatus: LeaveStatus;
  leaveStatusName: string;
  appliedDate: Date;
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: Date;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedDate?: Date;
  rejectionReason?: string;
  cancelledDate?: Date;
  cancellationReason?: string;
  isEmergencyLeave: boolean;
  attachmentUrl?: string;
  isActiveLeave: boolean;
  canBeCancelled: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateLeaveDto {
  employeeId: string;
  leaveTypeId: string;
 startDate: string; 
  endDate: string; 
  totalDays: number;
  reason: string;
  isEmergencyLeave?: boolean;
  attachmentUrl?: string;
}

export interface UpdateLeaveDto {
  startDate?: string;  
  endDate?: string; 
  totalDays?: number;
  reason?: string;
  isEmergencyLeave?: boolean;
  attachmentUrl?: string;
}

export interface LeaveFilterDto {
  employeeId?: string;
  leaveTypeId?: string;
  leaveStatus?: LeaveStatus;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  appliedDateFrom?: Date;
  appliedDateTo?: Date;
  isEmergencyLeave?: boolean;
  searchTerm?: string;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface ValidateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  excludeLeaveId?: string;
}

// Leave Type Models
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
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  description: string;
  maxDaysPerYear: number;
  isCarryForward?: boolean;
  maxCarryForwardDays?: number;
  requiresApproval?: boolean;
  requiresDocument?: boolean;
  minimumNoticeDays?: number;
  color?: string;
  isActive?: boolean;
  displayOrder?: number;
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
  isActive?: boolean;
  requiresApproval?: boolean;
  requiresDocument?: boolean;
  isCarryForward?: boolean;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDescending?: boolean;
}

// Leave Balance Models
export interface LeaveBalance {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeCode?: string;
  leaveTypeColor?: string;
  year: number;
  totalAllocated: number;
  consumed: number;
  carriedForward: number;
  available: number;
  utilizationPercentage: number;
  isLowBalance: boolean;
  isCurrentYear: boolean;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateLeaveBalanceDto {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalAllocated: number;
  carriedForward?: number;
}

export interface UpdateLeaveBalanceDto {
  totalAllocated?: number;
  consumed?: number;
  carriedForward?: number;
}

export interface LeaveBalanceFilterDto {
  employeeId?: string;
  leaveTypeId?: string;
  year?: number;
  minAvailableBalance?: number;
  maxAvailableBalance?: number;
  minConsumedBalance?: number;
  maxConsumedBalance?: number;
  isLowBalance?: boolean;
  lowBalanceThreshold?: number;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface AdjustLeaveBalanceDto {
  adjustmentAmount: number;
  adjustmentReason: string;
  adjustmentType?: string;
}

export interface CarryForwardDto {
  employeeId: string;
  leaveTypeId: string;
  fromYear: number;
  toYear: number;
  carryForwardDays: number;
}

export interface BulkInitializeBalanceDto {
  employeeIds: string[];
  year: number;
  includeCarryForward?: boolean;
}

export interface LeaveTypeBalanceDto {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  leaveTypeColor: string;
  totalAllocated: number;
  consumed: number;
  carriedForward: number;
  available: number;
  utilizationPercentage: number;
}

export interface EmployeeLeaveBalanceSummaryDto {
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  year: number;
  leaveBalances: LeaveTypeBalanceDto[];
  totalAllocated: number;
  totalConsumed: number;
  totalAvailable: number;
  overallUtilizationPercentage: number;
}

// Common API Response
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