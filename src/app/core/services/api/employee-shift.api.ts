// ============================================================
// FILE: src/app/core/services/api/employee-shift.api.ts
// ============================================================

import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  EmployeeShift,
  CreateEmployeeShiftDto,
  UpdateEmployeeShiftDto,
  EmployeeShiftFilterDto,
  RejectShiftChangeRequestDto,
  ValidateShiftAssignmentRequestDto,
  PagedResult,
  ApiResponse,
} from '../../Models/employee-shift.module';

@Injectable({ providedIn: 'root' })
export class EmployeeShiftService {
  private readonly BASE = 'EmployeeShift';

  constructor(private api: ApiClientService) {}

  // ── Admin-side ──────────────────────────────────────────────────────────────

  createEmployeeShift(dto: CreateEmployeeShiftDto): Observable<ApiResponse<EmployeeShift>> {
    return this.api.post<ApiResponse<EmployeeShift>>(this.BASE, dto).pipe(
      catchError(e => { console.error('Create employee shift:', e); return throwError(() => e); })
    );
  }

  getEmployeeShiftById(id: string): Observable<ApiResponse<EmployeeShift>> {
    return this.api.get<ApiResponse<EmployeeShift>>(`${this.BASE}/${id}`).pipe(
      catchError(e => { console.error('Get employee shift:', e); return throwError(() => e); })
    );
  }

  getFilteredEmployeeShifts(filter: EmployeeShiftFilterDto): Observable<ApiResponse<PagedResult<EmployeeShift>>> {
    return this.api.post<ApiResponse<PagedResult<EmployeeShift>>>(`${this.BASE}/filter`, filter).pipe(
      catchError(e => { console.error('Filter employee shifts:', e); return throwError(() => e); })
    );
  }

  getShiftsByEmployee(employeeId: string): Observable<ApiResponse<EmployeeShift[]>> {
    return this.api.get<ApiResponse<EmployeeShift[]>>(`${this.BASE}/employee/${employeeId}`).pipe(
      catchError(e => { console.error('Get by employee:', e); return throwError(() => e); })
    );
  }

  getCurrentShiftForEmployee(employeeId: string): Observable<ApiResponse<EmployeeShift>> {
    return this.api.get<ApiResponse<EmployeeShift>>(`${this.BASE}/employee/${employeeId}/current`).pipe(
      catchError(e => { console.error('Get current shift:', e); return throwError(() => e); })
    );
  }

  getPendingShiftChanges(): Observable<ApiResponse<EmployeeShift[]>> {
    return this.api.get<ApiResponse<EmployeeShift[]>>(`${this.BASE}/pending`).pipe(
      catchError(e => { console.error('Get pending:', e); return throwError(() => e); })
    );
  }

  getUpcomingShiftChanges(days = 7): Observable<ApiResponse<EmployeeShift[]>> {
    return this.api.get<ApiResponse<EmployeeShift[]>>(`${this.BASE}/upcoming?days=${days}`).pipe(
      catchError(e => { console.error('Get upcoming:', e); return throwError(() => e); })
    );
  }

  updateEmployeeShift(id: string, dto: UpdateEmployeeShiftDto): Observable<ApiResponse<EmployeeShift>> {
    return this.api.put<ApiResponse<EmployeeShift>>(`${this.BASE}/${id}`, dto).pipe(
      catchError(e => { console.error('Update employee shift:', e); return throwError(() => e); })
    );
  }

  deleteEmployeeShift(id: string): Observable<ApiResponse<boolean>> {
    return this.api.delete<ApiResponse<boolean>>(`${this.BASE}/${id}`).pipe(
      catchError(e => { console.error('Delete employee shift:', e); return throwError(() => e); })
    );
  }

  approveShiftChange(id: string): Observable<ApiResponse<boolean>> {
    return this.api.patch<ApiResponse<boolean>>(`${this.BASE}/${id}/approve`, {}).pipe(
      catchError(e => { console.error('Approve shift:', e); return throwError(() => e); })
    );
  }

  rejectShiftChange(id: string, reason: string): Observable<ApiResponse<boolean>> {
    const body: RejectShiftChangeRequestDto = { rejectionReason: reason };
    return this.api.patch<ApiResponse<boolean>>(`${this.BASE}/${id}/reject`, body).pipe(
      catchError(e => { console.error('Reject shift:', e); return throwError(() => e); })
    );
  }

  cancelShiftChange(id: string): Observable<ApiResponse<boolean>> {
    return this.api.patch<ApiResponse<boolean>>(`${this.BASE}/${id}/cancel`, {}).pipe(
      catchError(e => { console.error('Cancel shift:', e); return throwError(() => e); })
    );
  }

  getStatisticsByStatus(): Observable<ApiResponse<Record<string, number>>> {
    return this.api.get<ApiResponse<Record<string, number>>>(`${this.BASE}/statistics/status`).pipe(
      catchError(e => { console.error('Get stats:', e); return throwError(() => e); })
    );
  }

  validateShiftAssignment(payload: ValidateShiftAssignmentRequestDto): Observable<ApiResponse<boolean>> {
    return this.api.post<ApiResponse<boolean>>(`${this.BASE}/validate`, payload).pipe(
      catchError(e => { console.error('Validate shift:', e); return throwError(() => e); })
    );
  }

  // ── Employee self-service ───────────────────────────────────────────────────

  /** Get all shift assignments for the currently logged-in employee. */
  getMyShifts(): Observable<ApiResponse<EmployeeShift[]>> {
    return this.api.get<ApiResponse<EmployeeShift[]>>(`${this.BASE}/my-shifts`).pipe(
      catchError(e => { console.error('Get my shifts:', e); return throwError(() => e); })
    );
  }

  /** Employee confirms the shift assigned to them by admin. */
  employeeApproveShift(id: string): Observable<ApiResponse<boolean>> {
    return this.api.patch<ApiResponse<boolean>>(`${this.BASE}/${id}/employee-approve`, {}).pipe(
      catchError(e => { console.error('Employee approve shift:', e); return throwError(() => e); })
    );
  }

  /** Employee rejects the shift assigned to them by admin (reason required). */
  employeeRejectShift(id: string, reason: string): Observable<ApiResponse<boolean>> {
    const body: RejectShiftChangeRequestDto = { rejectionReason: reason };
    return this.api.patch<ApiResponse<boolean>>(`${this.BASE}/${id}/employee-reject`, body).pipe(
      catchError(e => { console.error('Employee reject shift:', e); return throwError(() => e); })
    );
  }
}