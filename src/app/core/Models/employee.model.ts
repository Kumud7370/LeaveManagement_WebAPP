export enum Gender {
  Male = 0, Female = 1, Other = 2
}
export enum EmploymentType {
  FullTime = 1, PartTime = 2, Contract = 3, Intern = 4, Temporary = 5
}
export enum EmployeeStatus {
  Active = 1, Inactive = 2, OnLeave = 3, Suspended = 4, Terminated = 5, Resigned = 6
}

export interface Address {
  street: string; city: string; state: string; country: string; postalCode: string;
}

export interface EmployeeResponseDto {
  id: string;
  employeeCode: string;

  // Marathi (primary)
  firstNameMr: string;
  middleNameMr?: string;
  lastNameMr: string;

  // English (optional)
  firstName?: string;
  middleName?: string;
  lastName?: string;

  // Hindi (optional)
  firstNameHi?: string;
  middleNameHi?: string;
  lastNameHi?: string;

  // Computed full names
  fullName: string;       
  fullNameEn?: string;
  fullNameHi?: string;

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

  // Marathi (required)
  firstNameMr: string;
  middleNameMr?: string;
  lastNameMr: string;

  // English (optional)
  firstName?: string;
  middleName?: string;
  lastName?: string;

  // Hindi (optional)
  firstNameHi?: string;
  middleNameHi?: string;
  lastNameHi?: string;

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
  // Marathi
  firstNameMr?: string;
  middleNameMr?: string;
  lastNameMr?: string;

  // English
  firstName?: string;
  middleName?: string;
  lastName?: string;

  // Hindi
  firstNameHi?: string;
  middleNameHi?: string;
  lastNameHi?: string;

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

export interface ReassignEmployeeDto {
  toDepartmentId: string;
  toDesignationId: string;
  reason?: string;
}

export interface BulkReassignEmployeeDto {
  employeeIds: string[];
  toDepartmentId: string;
  toDesignationId: string;
  reason?: string;
}

export interface BulkReassignResultDto {
  totalRequested: number;
  succeeded: number;
  failed: number;
  failedIds: string[];
  message: string;
}

export interface AssignmentHistoryResponseDto {
  id: string;
  employeeId: string;
  fromDepartmentId?: string;
  fromDepartmentName?: string;
  toDepartmentId: string;
  toDepartmentName: string;
  fromDesignationId?: string;
  fromDesignationName?: string;
  toDesignationId: string;
  toDesignationName: string;
  changedBy: string;
  changedByName?: string;
  changedAt: Date;
  reason?: string;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getEmployeeDisplayName(
  emp: EmployeeResponseDto | CreateEmployeeDto,
  lang: 'mr' | 'en' | 'hi' = 'mr'
): string {
  if (lang === 'en' && 'firstName' in emp && emp.firstName && emp.lastName)
    return [emp.firstName, (emp as any).middleName, emp.lastName].filter(Boolean).join(' ');
  if (lang === 'hi' && emp.firstNameHi && emp.lastNameHi)
    return [emp.firstNameHi, emp.middleNameHi, emp.lastNameHi].filter(Boolean).join(' ');
  return [emp.firstNameMr, emp.middleNameMr, emp.lastNameMr].filter(Boolean).join(' ');
}

export function createEmptyAddress(): Address {
  return { street: '', city: '', state: '', country: '', postalCode: '' };
}

export function createEmptyEmployee(): CreateEmployeeDto {
  return {
    employeeCode: '',
    firstNameMr: '', middleNameMr: '', lastNameMr: '',
    firstName: '',   middleName: '',   lastName: '',
    firstNameHi: '', middleNameHi: '', lastNameHi: '',
    email: '', phoneNumber: '', alternatePhoneNumber: '',
    dateOfBirth: new Date(),
    gender: Gender.Male,
    address: createEmptyAddress(),
    departmentId: '', designationId: '', managerId: '',
    dateOfJoining: new Date(), dateOfLeaving: undefined,
    employmentType: EmploymentType.FullTime,
    employeeStatus: EmployeeStatus.Active,
    profileImageUrl: '', biometricId: ''
  };
}