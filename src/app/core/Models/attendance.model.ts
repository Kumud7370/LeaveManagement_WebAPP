// src/app/core/Models/attendance.model.ts

export enum AttendanceStatus {
  Present = 1,
  Absent = 2,
  HalfDay = 3,
  Leave = 4,
  Holiday = 5,
  WeekOff = 6,
  OnDuty = 7,
  WorkFromHome = 8
}

export enum CheckInMethod {
  Biometric = 1,
  WebApp = 2,
  MobileApp = 3,
  Manual = 4,
  RFID = 5
}

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

// Location Interface
export interface LocationDto {
  latitude: number;
  longitude: number;
  address?: string;
}

// Check-In DTO
export interface CheckInDto {
  employeeId: string;
  checkInTime: Date;
  checkInMethod: CheckInMethod;
  checkInLocation?: LocationDto;
  checkInDeviceId?: string;
  remarks?: string;
}

// Check-Out DTO
export interface CheckOutDto {
  employeeId: string;
  checkOutTime: Date;
  checkOutMethod: CheckInMethod;
  checkOutLocation?: LocationDto;
  checkOutDeviceId?: string;
  remarks?: string;
}

// Manual Attendance DTO
export interface ManualAttendanceDto {
  employeeId: string;
  attendanceDate: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: AttendanceStatus;
  remarks?: string;
}

// Attendance Response DTO
export interface AttendanceResponseDto {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  attendanceDate: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  workingHours?: number;
  overtimeHours?: number;
  status: AttendanceStatus;
  statusName: string;
  isLate: boolean;
  isEarlyLeave: boolean;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  checkInLocation?: LocationDto;
  checkOutLocation?: LocationDto;
  checkInMethod?: CheckInMethod;
  checkInMethodName?: string;
  checkOutMethod?: CheckInMethod;
  checkOutMethodName?: string;
  checkInDeviceId?: string;
  checkOutDeviceId?: string;
  remarks?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

// Attendance Filter DTO
export interface AttendanceFilterDto {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AttendanceStatus;
  isLate?: boolean;
  isEarlyLeave?: boolean;
  checkInMethod?: CheckInMethod;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  sortDescending: boolean;
}

// Attendance Summary DTO
export interface AttendanceSummaryDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  startDate: Date;
  endDate: Date;
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  holidays: number;
  weekOffs: number;
  lateDays: number;
  earlyLeaveDays: number;
  totalWorkingHours: number;
  totalOvertimeHours: number;
  averageWorkingHours: number;
  attendancePercentage: number;
}

// Paged Result (Generic)
export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// API Response (Generic)
export interface ApiResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
}

// ==================== HELPER FUNCTIONS ====================

// Get Status Name
export function getAttendanceStatusName(status: AttendanceStatus): string {
  return AttendanceStatus[status];
}

// Get Check-In Method Name
export function getCheckInMethodName(method: CheckInMethod): string {
  return CheckInMethod[method];
}

// Get Regularization Type Name
export function getRegularizationTypeName(type: RegularizationType): string {
  return RegularizationType[type];
}

// Get Regularization Status Name
export function getRegularizationStatusName(status: RegularizationStatus): string {
  return RegularizationStatus[status];
}

// Calculate Working Hours
export function calculateWorkingHours(checkIn?: Date, checkOut?: Date): number {
  if (!checkIn || !checkOut) return 0;
  
  const checkInTime = new Date(checkIn).getTime();
  const checkOutTime = new Date(checkOut).getTime();
  const diffMs = checkOutTime - checkInTime;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
}

// Format Working Hours Display
export function formatWorkingHours(hours?: number): string {
  if (!hours) return '0h 0m';
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  return `${wholeHours}h ${minutes}m`;
}

// Check if Full Day Present
export function isFullDayPresent(workingHours?: number, minimumHours: number = 8): boolean {
  return (workingHours || 0) >= minimumHours;
}

// Check if Half Day Present
export function isHalfDayPresent(workingHours?: number, minimumHalfDay: number = 4, minimumFullDay: number = 8): boolean {
  const hours = workingHours || 0;
  return hours >= minimumHalfDay && hours < minimumFullDay;
}

// Create Empty Check-In DTO
export function createEmptyCheckInDto(): CheckInDto {
  return {
    employeeId: '',
    checkInTime: new Date(),
    checkInMethod: CheckInMethod.WebApp,
    checkInLocation: undefined,
    checkInDeviceId: '',
    remarks: ''
  };
}

// Create Empty Check-Out DTO
export function createEmptyCheckOutDto(): CheckOutDto {
  return {
    employeeId: '',
    checkOutTime: new Date(),
    checkOutMethod: CheckInMethod.WebApp,
    checkOutLocation: undefined,
    checkOutDeviceId: '',
    remarks: ''
  };
}

// Create Empty Manual Attendance DTO
export function createEmptyManualAttendanceDto(): ManualAttendanceDto {
  return {
    employeeId: '',
    attendanceDate: new Date(),
    checkInTime: undefined,
    checkOutTime: undefined,
    status: AttendanceStatus.Present,
    remarks: ''
  };
}

// Create Empty Attendance Filter
export function createEmptyAttendanceFilter(): AttendanceFilterDto {
  return {
    employeeId: '',
    startDate: undefined,
    endDate: undefined,
    status: undefined,
    isLate: undefined,
    isEarlyLeave: undefined,
    checkInMethod: undefined,
    pageNumber: 1,
    pageSize: 20,
    sortBy: 'AttendanceDate',
    sortDescending: true
  };
}

// Get Status Badge Class (for UI styling)
export function getStatusBadgeClass(status: AttendanceStatus): string {
  switch (status) {
    case AttendanceStatus.Present:
      return 'badge-success';
    case AttendanceStatus.Absent:
      return 'badge-danger';
    case AttendanceStatus.HalfDay:
      return 'badge-warning';
    case AttendanceStatus.Leave:
      return 'badge-info';
    case AttendanceStatus.Holiday:
      return 'badge-primary';
    case AttendanceStatus.WeekOff:
      return 'badge-secondary';
    case AttendanceStatus.OnDuty:
      return 'badge-info';
    case AttendanceStatus.WorkFromHome:
      return 'badge-purple';
    default:
      return 'badge-secondary';
  }
}

// Get Check-In Method Icon (for UI)
export function getCheckInMethodIcon(method: CheckInMethod): string {
  switch (method) {
    case CheckInMethod.Biometric:
      return 'fas fa-fingerprint';
    case CheckInMethod.WebApp:
      return 'fas fa-desktop';
    case CheckInMethod.MobileApp:
      return 'fas fa-mobile-alt';
    case CheckInMethod.Manual:
      return 'fas fa-hand-paper';
    case CheckInMethod.RFID:
      return 'fas fa-id-card';
    default:
      return 'fas fa-question-circle';
  }
}

// Format Time Display
export function formatTime(date?: Date): string {
  if (!date) return 'N/A';
  
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

// Format Date Display
export function formatDate(date?: Date): string {
  if (!date) return 'N/A';
  
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format DateTime Display
export function formatDateTime(date?: Date): string {
  if (!date) return 'N/A';
  
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Calculate Attendance Percentage
export function calculateAttendancePercentage(presentDays: number, totalDays: number): number {
  if (totalDays === 0) return 0;
  return Math.round((presentDays / totalDays) * 100 * 100) / 100;
}

// Get Late Status Icon
export function getLateStatusIcon(isLate: boolean): string {
  return isLate ? 'fas fa-exclamation-triangle text-warning' : 'fas fa-check-circle text-success';
}

// Get Early Leave Status Icon
export function getEarlyLeaveStatusIcon(isEarlyLeave: boolean): string {
  return isEarlyLeave ? 'fas fa-exclamation-triangle text-warning' : 'fas fa-check-circle text-success';
}

// ==================== ENUM OPTIONS FOR DROPDOWNS ====================
// FIXED: Proper enum to array conversion

export const AttendanceStatusOptions = [
  { value: AttendanceStatus.Present, label: 'Present' },
  { value: AttendanceStatus.Absent, label: 'Absent' },
  { value: AttendanceStatus.HalfDay, label: 'Half Day' },
  { value: AttendanceStatus.Leave, label: 'Leave' },
  { value: AttendanceStatus.Holiday, label: 'Holiday' },
  { value: AttendanceStatus.WeekOff, label: 'Week Off' },
  { value: AttendanceStatus.OnDuty, label: 'On Duty' },
  { value: AttendanceStatus.WorkFromHome, label: 'Work From Home' }
];

export const CheckInMethodOptions = [
  { value: CheckInMethod.Biometric, label: 'Biometric' },
  { value: CheckInMethod.WebApp, label: 'Web App' },
  { value: CheckInMethod.MobileApp, label: 'Mobile App' },
  { value: CheckInMethod.Manual, label: 'Manual' },
  { value: CheckInMethod.RFID, label: 'RFID' }
];

export const RegularizationTypeOptions = [
  { value: RegularizationType.MissedPunch, label: 'Missed Punch' },
  { value: RegularizationType.LateEntry, label: 'Late Entry' },
  { value: RegularizationType.EarlyExit, label: 'Early Exit' },
  { value: RegularizationType.FullDayRegularization, label: 'Full Day Regularization' }
];

export const RegularizationStatusOptions = [
  { value: RegularizationStatus.Pending, label: 'Pending' },
  { value: RegularizationStatus.Approved, label: 'Approved' },
  { value: RegularizationStatus.Rejected, label: 'Rejected' },
  { value: RegularizationStatus.Cancelled, label: 'Cancelled' }
];