export enum HolidayType {
  National = 'National',
  Regional = 'Regional',
  Optional = 'Optional'
}

export interface Holiday {
  id: string;
  holidayName: string;
  holidayDate: string; // ISO string from API
  description?: string;
  holidayType: HolidayType;
  holidayTypeName: string;
  isOptional: boolean;
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
  holidayDate: string; // ISO string — send as 'YYYY-MM-DDT00:00:00.000Z'
  description?: string;
  holidayType: HolidayType;
  isOptional: boolean;
  applicableDepartments: string[];
}

export interface UpdateHolidayDto {
  holidayName?: string;
  holidayDate?: string; // ISO string
  description?: string;
  holidayType?: HolidayType;
  isOptional?: boolean;
  applicableDepartments?: string[];
}

export interface HolidayFilterDto {
  searchTerm?: string;
  holidayType?: HolidayType;
  isOptional?: boolean;
  departmentId?: string;
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