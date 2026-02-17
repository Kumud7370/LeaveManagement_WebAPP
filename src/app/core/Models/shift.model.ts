// ============================================================
// shift.model.ts
// All TypeScript interfaces, DTOs, and enums for the Shift module
// ============================================================

export interface Shift {
  id: string;
  shiftName: string;
  shiftCode: string;
  startTime: string;        // "HH:mm:ss" from backend TimeOnly
  endTime: string;          // "HH:mm:ss" from backend TimeOnly
  startTimeFormatted: string; // "HH:mm" - pre-formatted by backend
  endTimeFormatted: string;   // "HH:mm" - pre-formatted by backend
  gracePeriodMinutes: number;
  minimumWorkingMinutes: number;
  minimumWorkingHoursFormatted: string; // e.g. "8h 0m"
  breakDurationMinutes: number;
  isNightShift: boolean;
  isActive: boolean;
  displayOrder: number;
  description?: string;
  color: string;             // hex color e.g. "#3B82F6"
  nightShiftAllowancePercentage: number;
  totalShiftDuration: string;  // e.g. "9h 0m"
  netWorkingHours: string;     // e.g. "8h 0m"
  shiftTimingDisplay: string;  // e.g. "09:00 - 18:00"
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface CreateShiftDto {
  shiftName: string;
  shiftCode: string;
  startTime: string;          // "HH:mm" sent to backend
  endTime: string;            // "HH:mm" sent to backend
  gracePeriodMinutes: number;
  minimumWorkingMinutes: number;
  breakDurationMinutes: number;
  isNightShift: boolean;
  isActive: boolean;
  displayOrder: number;
  description?: string;
  color: string;
  nightShiftAllowancePercentage: number;
}

export interface UpdateShiftDto {
  shiftName?: string;
  shiftCode?: string;
  startTime?: string;
  endTime?: string;
  gracePeriodMinutes?: number;
  minimumWorkingMinutes?: number;
  breakDurationMinutes?: number;
  isNightShift?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  description?: string;
  color?: string;
  nightShiftAllowancePercentage?: number;
}

export interface ShiftFilterDto {
  searchTerm?: string;
  isActive?: boolean;
  isNightShift?: boolean;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  sortDescending: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface ToggleShiftStatusRequestDto {
  isActive: boolean;
}