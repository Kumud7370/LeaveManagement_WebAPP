// ============================================================
// shift.api.ts  →  src/app/core/services/api/shift.api.ts
// ============================================================

import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  Shift,
  CreateShiftDto,
  UpdateShiftDto,
  ShiftFilterDto,
  PagedResult,
  ApiResponse,
  ToggleShiftStatusRequestDto
} from '../../Models/shift.model';        // ✅ FIXED: was "shoft.model"

@Injectable({
  providedIn: 'root'
})
export class ShiftService {

  constructor(private apiClient: ApiClientService) {}

  // ── Helper: "HH:mm" → "HH:mm:ss"  (ASP.NET TimeOnly needs seconds) ──────
  private toTimeOnly(time: string): string {
    if (!time) return time;
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;   // already has seconds
    if (/^\d{2}:\d{2}$/.test(time))        return `${time}:00`;  // add :00
    return time;
  }

  // POST /api/Shift
  createShift(dto: CreateShiftDto): Observable<ApiResponse<Shift>> {
    // ✅ CRITICAL: Convert "HH:mm" → "HH:mm:ss" before sending
    const payload = {
      ...dto,
      startTime: this.toTimeOnly(dto.startTime),
      endTime:   this.toTimeOnly(dto.endTime)
    };
    return this.apiClient.post<ApiResponse<Shift>>('Shift', payload).pipe(
      catchError(error => {
        console.error('Error creating shift:', error);
        return throwError(() => error);
      })
    );
  }

  // GET /api/Shift/:id
  getShiftById(id: string): Observable<ApiResponse<Shift>> {
    return this.apiClient.get<ApiResponse<Shift>>(`Shift/${id}`).pipe(
      catchError(error => {
        console.error('Error fetching shift:', error);
        return throwError(() => error);
      })
    );
  }

  // GET /api/Shift/code/:code
  getShiftByCode(code: string): Observable<ApiResponse<Shift>> {
    return this.apiClient.get<ApiResponse<Shift>>(`Shift/code/${code}`).pipe(
      catchError(error => {
        console.error('Error fetching shift by code:', error);
        return throwError(() => error);
      })
    );
  }

  // POST /api/Shift/filter
  getFilteredShifts(filter: ShiftFilterDto): Observable<ApiResponse<PagedResult<Shift>>> {
    return this.apiClient.post<ApiResponse<PagedResult<Shift>>>('Shift/filter', filter).pipe(
      catchError(error => {
        console.error('Error filtering shifts:', error);
        return throwError(() => error);
      })
    );
  }

  // GET /api/Shift/active
  getActiveShifts(): Observable<ApiResponse<Shift[]>> {
    return this.apiClient.get<ApiResponse<Shift[]>>('Shift/active').pipe(
      catchError(error => {
        console.error('Error fetching active shifts:', error);
        return throwError(() => error);
      })
    );
  }

  // GET /api/Shift/night-shifts
  getNightShifts(): Observable<ApiResponse<Shift[]>> {
    return this.apiClient.get<ApiResponse<Shift[]>>('Shift/night-shifts').pipe(
      catchError(error => {
        console.error('Error fetching night shifts:', error);
        return throwError(() => error);
      })
    );
  }

  // PUT /api/Shift/:id
  updateShift(id: string, dto: UpdateShiftDto): Observable<ApiResponse<Shift>> {
    const payload = {
      ...dto,
      startTime: dto.startTime ? this.toTimeOnly(dto.startTime) : undefined,
      endTime:   dto.endTime   ? this.toTimeOnly(dto.endTime)   : undefined
    };
    return this.apiClient.put<ApiResponse<Shift>>(`Shift/${id}`, payload).pipe(
      catchError(error => {
        console.error('Error updating shift:', error);
        return throwError(() => error);
      })
    );
  }

  // DELETE /api/Shift/:id
  deleteShift(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.delete<ApiResponse<boolean>>(`Shift/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting shift:', error);
        return throwError(() => error);
      })
    );
  }

  // PATCH /api/Shift/:id/toggle-status
  toggleShiftStatus(id: string, isActive: boolean): Observable<ApiResponse<boolean>> {
    const payload: ToggleShiftStatusRequestDto = { isActive };
    return this.apiClient.patch<ApiResponse<boolean>>(`Shift/${id}/toggle-status`, payload).pipe(
      catchError(error => {
        console.error('Error toggling shift status:', error);
        return throwError(() => error);
      })
    );
  }
}