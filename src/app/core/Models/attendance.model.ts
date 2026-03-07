
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


export interface CheckInDto {
  employeeId: string;
  checkInTime: string;          
  checkInMethod: CheckInMethod;
  checkInLocation?: LocationDto;
  checkInDeviceId?: string;
  remarks?: string;
}

export interface CheckOutDto {
  employeeId: string;
  checkOutTime: string;
  checkOutMethod: CheckInMethod;
  checkOutLocation?: LocationDto;
  checkOutDeviceId?: string;
  remarks?: string;
}

export interface LocationDto {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface ManualAttendanceDto {
  employeeId: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceFilterDto {
  employeeId?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  isLate?: boolean;
  isEarlyLeave?: boolean;
  checkInMethod?: CheckInMethod;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  sortDescending: boolean;
}


export interface AttendanceResponseDto {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  attendanceDate: string;
  checkInTime?: string;
  checkOutTime?: string;
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
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceSummaryDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  startDate: string;
  endDate: string;
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

// ---- Common ----
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