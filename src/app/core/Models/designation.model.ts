export interface DesignationResponseDto {
  designationId: string;
  designationCode: string;
  designationName: string;
  description?: string;
  level: number;
  isActive: boolean;
  displayOrder?: number;
  employeeCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDesignationDto {
  designationCode: string;
  designationName: string;
  description?: string;
  level: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateDesignationDto {
  designationCode: string;
  designationName: string;
  description?: string;
  level: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface DesignationFilterDto {
  searchTerm?: string;
  isActive?: boolean;
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
}

export interface PaginationDto {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PagedResultDto<T> {
  data: T[];
  pagination: PaginationDto;
}

export interface CreateDesignationDto {
  designationCode: string;
  designationName: string;
  description?: string;
  level: number;
  isActive?: boolean;
}

export interface UpdateDesignationDto {
  designationCode: string;
  designationName: string;
  description?: string;
  level: number;
  isActive?: boolean;
}


