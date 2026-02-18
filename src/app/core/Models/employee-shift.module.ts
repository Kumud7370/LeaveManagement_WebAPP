// ============================================================
// employee-shift.model.ts
// src/app/core/Models/employee-shift.model.ts
// ============================================================

export enum ShiftChangeStatus {
  Pending   = 1,
  Approved  = 2,
  Rejected  = 3,
  Cancelled = 4,
}

export const ShiftChangeStatusLabel: Record<ShiftChangeStatus, string> = {
  [ShiftChangeStatus.Pending]:   'Pending',
  [ShiftChangeStatus.Approved]:  'Approved',
  [ShiftChangeStatus.Rejected]:  'Rejected',
  [ShiftChangeStatus.Cancelled]: 'Cancelled',
};

export const ShiftChangeStatusColor: Record<ShiftChangeStatus, { bg: string; color: string }> = {
  [ShiftChangeStatus.Pending]:   { bg: '#fef9c3', color: '#713f12' },
  [ShiftChangeStatus.Approved]:  { bg: '#d1fae5', color: '#065f46' },
  [ShiftChangeStatus.Rejected]:  { bg: '#fee2e2', color: '#991b1b' },
  [ShiftChangeStatus.Cancelled]: { bg: '#f1f5f9', color: '#475569' },
};

// ── Main response DTO (mirrors backend EmployeeShiftResponseDto) ──
export interface EmployeeShift {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  shiftId: string;
  shiftName?: string;
  shiftCode?: string;
  shiftColor?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  shiftTimingDisplay?: string;
  effectiveFrom: string | Date;
  effectiveTo?: string | Date | null;
  isActive: boolean;
  changeReason?: string;
  status: ShiftChangeStatus;
  statusName: string;
  requestedDate: string | Date;
  approvedBy?: string;
  approvedByName?: string;
  approvedDate?: string | Date | null;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedDate?: string | Date | null;
  rejectionReason?: string;
  isCurrentlyActive: boolean;
  canBeModified: boolean;
  durationInDays?: number | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
}

// ── Create DTO ────────────────────────────────────────────────
export interface CreateEmployeeShiftDto {
  employeeId: string;
  shiftId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changeReason?: string;
}

// ── Update DTO ────────────────────────────────────────────────
export interface UpdateEmployeeShiftDto {
  shiftId?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  changeReason?: string;
}

// ── Filter DTO ────────────────────────────────────────────────
export interface EmployeeShiftFilterDto {
  employeeId?: string;
  shiftId?: string;
  status?: ShiftChangeStatus;
  effectiveFromStart?: string;
  effectiveFromEnd?: string;
  isActive?: boolean;
  onlyCurrentAssignments?: boolean;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  sortDescending: boolean;
}

// ── Reject request ────────────────────────────────────────────
export interface RejectShiftChangeRequestDto {
  rejectionReason: string;
}

// ── Validate request ──────────────────────────────────────────
export interface ValidateShiftAssignmentRequestDto {
  employeeId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  excludeId?: string;
}

// ── Paged result ──────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// ── API wrapper ───────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}