export type AdminCreatableRole = 'Tehsildar' | 'NayabTehsildar' | 'Employee';

/**
 * Payload sent to POST /api/admin-management/users
 * Admin fills this to create a new user account directly.
 */
export interface CreateUserDto {
  username:    string;
  password:    string;
  firstName:   string;
  lastName:    string;
  email:       string;
  /** Must be: "Tehsildar" | "NayabTehsildar" | "Employee" */
  role:        AdminCreatableRole;
  /**
   * Required when role === "Employee".
   * Must be the Id of an existing, unlinked Employee record.
   */
  employeeId?: string;
}

/**
 * Payload sent to PUT /api/admin-management/users/:id
 * Only basic profile fields — password changes go through reset-password.
 */
export interface UpdateUserDto {
  firstName?: string;
  lastName?:  string;
  email?:     string;
}

/**
 * Payload sent to POST /api/admin-management/users/:id/reset-password
 * Admin sets the new password for any user directly.
 */
export interface AdminResetPasswordDto {
  newPassword: string;
}

/**
 * Returned by the API after creating or fetching a user.
 */
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
}

/** Generic API envelope. */
export interface ApiResponse<T> {
  success:   boolean;
  message:   string;
  data:      T;
  errors?:   string[];
}