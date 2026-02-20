export enum HolidayType {
  National = 'National',
  Regional = 'Regional',
  Optional = 'Optional'
}

export interface Holiday {
  id: string;
  holidayName: string;
  holidayDate: string;
  description?: string;
  holidayType: HolidayType;
  holidayTypeName: string;
  isOptional: boolean;
  isActive: boolean;          // ← added: mapped from backend IsActive
  applicableDepartments: string[];
  departmentNames: string[];
  isUpcoming: boolean;
  isToday: boolean;
  daysUntilHoliday: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateHolidayDto {
  holidayName: string;
  holidayDate: string;
  description?: string;
  holidayType: HolidayType;
  isOptional: boolean;
  applicableDepartments: string[];
  isActive?: boolean;
}

export interface UpdateHolidayDto {
  holidayName?: string;
  holidayDate?: string;
  description?: string;
  holidayType?: HolidayType;
  isOptional?: boolean;
  applicableDepartments?: string[];
  isActive?: boolean;          // ← added: lets toggleStatus send isActive
}

export interface HolidayFilterDto {
  searchTerm?: string;
  holidayType?: HolidayType;
  isOptional?: boolean;
  departmentId?: string;
  isActive?: boolean;
  dateFrom?: string;
  dateTo?: string;
  isUpcoming?: boolean;
  year?: number;
  month?: number;
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