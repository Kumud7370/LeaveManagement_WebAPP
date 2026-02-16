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
  private endpoint = 'Holiday';

  constructor(private apiClient: ApiClientService) {}

  createHoliday(dto: CreateHolidayDto): Observable<ApiResponse<Holiday>> {
    return this.apiClient.createHoliday(dto);
  }

  getHolidayById(id: string): Observable<ApiResponse<Holiday>> {
    return this.apiClient.getHolidayById(id);
  }

  getFilteredHolidays(filter: HolidayFilterDto): Observable<ApiResponse<PagedResult<Holiday>>> {
    return this.apiClient.filterHolidays(filter);
  }

  getHolidaysByDepartment(departmentId: string): Observable<ApiResponse<Holiday[]>> {
    return this.apiClient.get<ApiResponse<Holiday[]>>(`${this.endpoint}/department/${departmentId}`);
  }

  getHolidaysByDateRange(startDate: Date, endDate: Date): Observable<ApiResponse<Holiday[]>> {
    return this.apiClient.get<ApiResponse<Holiday[]>>(
      `${this.endpoint}/date-range?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
  }

  getUpcomingHolidays(count: number = 10): Observable<ApiResponse<Holiday[]>> {
    return this.apiClient.getUpcomingHolidays();
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
    return this.apiClient.updateHoliday(id, dto);
  }

  deleteHoliday(id: string): Observable<ApiResponse<boolean>> {
    return this.apiClient.deleteHoliday(id);
  }

  isHolidayOnDate(date: Date): Observable<ApiResponse<boolean>> {
    return this.apiClient.get<ApiResponse<boolean>>(
      `${this.endpoint}/check-date?date=${date.toISOString()}`
    );
  }

  getHolidayStatisticsByType(): Observable<ApiResponse<{ [key: string]: number }>> {
    return this.apiClient.get<ApiResponse<{ [key: string]: number }>>(`${this.endpoint}/statistics/type`);
  }
}