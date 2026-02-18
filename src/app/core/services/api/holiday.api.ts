import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  Holiday,
  CreateHolidayDto,
  UpdateHolidayDto,
  HolidayFilterDto,
  PagedResult,
  ApiResponse,
  HolidayType
} from '../../Models/holiday.model';

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private readonly endpoint = 'Holiday';

  constructor(private apiClient: ApiClientService) {}

  createHoliday(dto: CreateHolidayDto): Observable<ApiResponse<Holiday>> {
    return this.apiClient.post<ApiResponse<Holiday>>(this.endpoint, dto);
  }

  getHolidayById(id: string): Observable<ApiResponse<Holiday>> {
    return this.apiClient.get<ApiResponse<Holiday>>(`${this.endpoint}/${id}`);
  }

  getFilteredHolidays(filter: HolidayFilterDto): Observable<ApiResponse<PagedResult<Holiday>>> {
    return this.apiClient.post<ApiResponse<PagedResult<Holiday>>>(`${this.endpoint}/filter`, filter);
  }

  getHolidaysByDepartment(departmentId: string): Observable<ApiResponse<Holiday[]>> {
    return this.apiClient.get<ApiResponse<Holiday[]>>(`${this.endpoint}/department/${departmentId}`);
  }

  getHolidaysByDateRange(startDate: string, endDate: string): Observable<ApiResponse<Holiday[]>> {
    return this.apiClient.get<ApiResponse<Holiday[]>>(
      `${this.endpoint}/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
  }

  getUpcomingHolidays(count: number = 10): Observable<ApiResponse<Holiday[]>> {
    return this.apiClient.get<ApiResponse<Holiday[]>>(`${this.endpoint}/upcoming?count=${count}`);
  }

  getHolidaysByYear(year: number): Observable<ApiResponse<Holiday[]>> {
    return this.apiClient.get<ApiResponse<Holiday[]>>(`${this.endpoint}/year/${year}`);
  }

  getHolidaysByMonth(year: number, month: number): Observable<ApiResponse<Holiday[]>> {
    return this.apiClient.get<ApiResponse<Holiday[]>>(`${this.endpoint}/month/${year}/${month}`);
  }

  getHolidaysByType(holidayType: HolidayType): Observable<ApiResponse<Holiday[]>> {
    return this.apiClient.get<ApiResponse<Holiday[]>>(`${this.endpoint}/type/${holidayType}`);
  }

  updateHoliday(id: string, dto: UpdateHolidayDto): Observable<ApiResponse<Holiday>> {
    return this.apiClient.put<ApiResponse<Holiday>>(`${this.endpoint}/${id}`, dto);
  }

  deleteHoliday(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.delete<ApiResponse<boolean>>(`${this.endpoint}/${id}`);
  }

  isHolidayOnDate(date: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.get<ApiResponse<boolean>>(
      `${this.endpoint}/check-date?date=${encodeURIComponent(date)}`
    );
  }

  getHolidayStatisticsByType(): Observable<ApiResponse<{ [key: string]: number }>> {
    return this.apiClient.get<ApiResponse<{ [key: string]: number }>>(`${this.endpoint}/statistics/type`);
  }
}