
export interface Shift {
  id: string;
  shiftName: string;
  shiftCode: string;
  startTime: string;       
  endTime: string;         
  startTimeFormatted: string; 
  endTimeFormatted: string;   
  gracePeriodMinutes: number;
  minimumWorkingMinutes: number;
  minimumWorkingHoursFormatted: string; 
  breakDurationMinutes: number;
  isNightShift: boolean;
  isActive: boolean;
  displayOrder: number;
  description?: string;
  color: string;            
  nightShiftAllowancePercentage: number;
  totalShiftDuration: string;  
  netWorkingHours: string;     
  shiftTimingDisplay: string;  
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface CreateShiftDto {
  shiftName: string;
  shiftCode: string;
  startTime: string;          
  endTime: string;            
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