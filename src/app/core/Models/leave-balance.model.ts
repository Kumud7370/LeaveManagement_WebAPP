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
  lastUpdated: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
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
  sortBy: string;
  sortDescending: boolean;
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

export interface BulkInitializeResult {
  Success: number;
  Failed: number;
  Skipped: number;
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
export interface CollectiveLeaveBalanceDto {
  leaveTypeId:     string;          
  employeeIds:     string[];         
  year:            number;
  totalAllocated?: number;          
  carriedForward?: number;           
  skipExisting:    boolean;          
}

export interface CollectiveAssignmentResultDto {
  succeeded:          number;
  skipped:            number;
  failed:             number;
  failedEmployeeIds:  string[];
  skippedEmployeeIds: string[];
}