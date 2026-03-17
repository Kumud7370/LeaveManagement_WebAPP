export type AdminCreatableRole = 'Tehsildar' | 'NayabTehsildar' | 'Employee' | 'HR';

export interface CreateUserDto {
  username:    string;
  password:    string;
  firstName:   string;
  lastName:    string;
  email:       string;
  role:        AdminCreatableRole;
  employeeId?: string;
  departmentId?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?:  string;
  email?:     string;
}

export interface AdminResetPasswordDto {
  newPassword: string;
}

export interface UserResponseDto {
  id:          string;
  username:    string;
  firstName:   string;
  lastName:    string;
  email:       string;
  roles:       string[];
  isActive:    boolean;
  employeeId?: string;
  createdAt:   Date;
  departmentId?: string;  
  departmentName?: string;
}

/** Generic API envelope. */
export interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  errors?:   string[];
}