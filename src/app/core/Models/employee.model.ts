export enum Gender {
  Male = 0,
  Female = 1,
  Other = 2
}

export enum EmploymentType {
  FullTime = 1,
  PartTime = 2,
  Contract = 3,
  Intern = 4,
  Temporary = 5
}

export enum EmployeeStatus {
  Active = 1,
  Inactive = 2,
  OnLeave = 3,
  Suspended = 4,
  Terminated = 5,
  Resigned = 6
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface EmployeeResponseDto {
  id: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  dateOfBirth: Date;
  age: number;
  gender: Gender;
  genderName: string;
  address: Address;
  departmentId: string;
  departmentName?: string;
  designationId: string;
  designationName?: string;
  managerId?: string;
  managerName?: string;
  dateOfJoining: Date;
  dateOfLeaving?: Date;
  employmentType: EmploymentType;
  employmentTypeName: string;
  employeeStatus: EmployeeStatus;
  employeeStatusName: string;
  profileImageUrl?: string;
  biometricId?: string;
  isCurrentlyEmployed: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateEmployeeDto {
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  dateOfBirth: Date;
  gender: Gender;
  address: Address;
  departmentId: string;
  designationId: string;
  managerId?: string;
  dateOfJoining: Date;
  dateOfLeaving?: Date;
  employmentType: EmploymentType;
  employeeStatus: EmployeeStatus;
  profileImageUrl?: string;
  biometricId?: string;
}

export interface UpdateEmployeeDto {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  alternatePhoneNumber?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  address?: Address;
  departmentId?: string;
  designationId?: string;
  managerId?: string;
  dateOfJoining?: Date;
  dateOfLeaving?: Date;
  employmentType?: EmploymentType;
  employeeStatus?: EmployeeStatus;
  profileImageUrl?: string;
  biometricId?: string;
}

export interface EmployeeFilterDto {
  searchTerm?: string;
  departmentId?: string;
  designationId?: string;
  managerId?: string;
  employeeStatus?: EmployeeStatus;
  employmentType?: EmploymentType;
  gender?: Gender;
  joiningDateFrom?: Date;
  joiningDateTo?: Date;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
  sortDescending: boolean;
}

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
}

// Helper functions
export function getGenderName(gender: Gender): string {
  return Gender[gender];
}

export function getEmploymentTypeName(type: EmploymentType): string {
  return EmploymentType[type];
}

export function getEmployeeStatusName(status: EmployeeStatus): string {
  return EmployeeStatus[status];
}

export function createEmptyAddress(): Address {
  return {
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: ''
  };
}

export function createEmptyEmployee(): CreateEmployeeDto {
  return {
    employeeCode: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    alternatePhoneNumber: '',
    dateOfBirth: new Date(),
    gender: Gender.Male,
    address: createEmptyAddress(),
    departmentId: '',
    designationId: '',
    managerId: '',
    dateOfJoining: new Date(),
    dateOfLeaving: undefined,
    employmentType: EmploymentType.FullTime,
    employeeStatus: EmployeeStatus.Active,
    profileImageUrl: '',
    biometricId: ''
  };
}