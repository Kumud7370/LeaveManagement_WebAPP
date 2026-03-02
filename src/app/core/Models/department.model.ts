export interface Department {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  employeeCount: number;
  childDepartmentCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DepartmentDetail extends Department {
  fullPath: string;
  level: number;
  childDepartments?: Department[];
  employees?: EmployeeSummary[];
  auditInfo?: AuditInfo;
}

export interface DepartmentHierarchy {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  isActive: boolean;
  employeeCount: number;
  children?: DepartmentHierarchy[];
}

export interface EmployeeSummary {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  designation?: string;
  email?: string;
  profileImageUrl?: string;
}

export interface AuditInfo {
  createdAt: Date;
  createdBy?: string;
  createdByName?: string;
  updatedAt?: Date;
  updatedBy?: string;
  updatedByName?: string;
}

export interface CreateDepartmentRequest {
  departmentCode: string;
  departmentName: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateDepartmentRequest {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface DepartmentFilterRequest {
  searchTerm?: string;
  includeDeleted?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  pageNumber?: number;
  pageSize?: number;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

export interface DepartmentStatistics {
  [key: string]: number;
}