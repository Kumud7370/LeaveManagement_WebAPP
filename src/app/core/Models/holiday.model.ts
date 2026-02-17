export enum HolidayType {
  National = 'National',
  Regional = 'Regional',
  Optional = 'Optional'
}

export interface Holiday {
  id: string;
  holidayName: string;
  holidayDate: Date | string;
  description?: string;
  holidayType: HolidayType;
  holidayTypeName: string;
  isOptional: boolean;
  applicableDepartments: string[];
  departmentNames: string[];
  isUpcoming: boolean;
  isToday: boolean;
  daysUntilHoliday: number;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface CreateHolidayDto {
  holidayName: string;
  holidayDate: Date | string;
  description?: string;
  holidayType: HolidayType;
  isOptional: boolean;
  applicableDepartments: string[];
}

export interface UpdateHolidayDto {
  id: string;
  holidayName?: string;
  holidayDate?: Date | string;
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
  dateFrom?: Date | string;
  dateTo?: Date | string;
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