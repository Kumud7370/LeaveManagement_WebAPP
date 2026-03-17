import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { ApiClientService } from './apiClient';
import {
  CreateDesignationDto,
  UpdateDesignationDto,
  DesignationResponseDto,
  DesignationFilterDto,
  PagedResultDto,
  ApiResponse
} from '../../Models/designation.model';

function mapId(raw: any): DesignationResponseDto {
  return {
    ...raw,
    designationId: raw.designationId ?? raw.id ?? raw.Id ?? ''
  };
}

@Injectable({
  providedIn: 'root'
})
export class DesignationService {

  constructor(private apiClient: ApiClientService) {}

  createDesignation(dto: CreateDesignationDto): Observable<ApiResponse<DesignationResponseDto>> {
    return this.apiClient.post<ApiResponse<DesignationResponseDto>>('Designation', dto).pipe(
      map(response => ({ ...response, data: mapId(response.data) }))
    );
  }

  getDesignationById(id: string): Observable<ApiResponse<DesignationResponseDto>> {
    return this.apiClient.get<ApiResponse<DesignationResponseDto>>(`Designation/${id}`).pipe(
      map(response => ({ ...response, data: mapId(response.data) }))
    );
  }

  getFilteredDesignations(filter: DesignationFilterDto): Observable<PagedResultDto<DesignationResponseDto>> {
    const queryParams: string[] = [
      `pageNumber=${filter.pageNumber}`,
      `pageSize=${filter.pageSize}`
    ];

    if (filter.searchTerm)                    queryParams.push(`searchTerm=${encodeURIComponent(filter.searchTerm)}`);
    if (filter.isActive !== undefined)        queryParams.push(`isActive=${filter.isActive}`);
    if (filter.level !== undefined)           queryParams.push(`level=${filter.level}`);
    if (filter.minLevel !== undefined)        queryParams.push(`minLevel=${filter.minLevel}`);
    if (filter.maxLevel !== undefined)        queryParams.push(`maxLevel=${filter.maxLevel}`);
    if (filter.sortBy)                        queryParams.push(`sortBy=${filter.sortBy}`);
    if (filter.sortDescending !== undefined)  queryParams.push(`sortDescending=${filter.sortDescending}`);

    const queryString = queryParams.join('&');

    return this.apiClient.get<PagedResultDto<DesignationResponseDto>>(`Designation?${queryString}`).pipe(
      map(response => ({
        ...response,
        data: (response.data || []).map(mapId)
      }))
    );
  }

  updateDesignation(id: string, dto: UpdateDesignationDto): Observable<ApiResponse<DesignationResponseDto>> {
    return this.apiClient.put<ApiResponse<DesignationResponseDto>>(`Designation/${id}`, dto).pipe(
      map(response => ({ ...response, data: mapId(response.data) }))
    );
  }

  deleteDesignation(id: string): Observable<ApiResponse<void>> {
    return this.apiClient.delete<ApiResponse<void>>(`Designation/${id}`);
  }

  toggleDesignationStatus(id: string): Observable<ApiResponse<DesignationResponseDto>> {
  return this.apiClient.patch<ApiResponse<DesignationResponseDto>>(`Designation/${id}/toggle-status`, {}).pipe(
    map(response => ({
      ...response,
      data: response.data ? mapId(response.data) : null as any
    }))
  );
}

  getActiveDesignations(): Observable<PagedResultDto<DesignationResponseDto>> {
    return this.apiClient.get<PagedResultDto<DesignationResponseDto>>('Designation/active').pipe(
      map(response => ({ ...response, data: (response.data || []).map(mapId) }))
    );
  }

  getDesignationsByLevel(level: number): Observable<PagedResultDto<DesignationResponseDto>> {
    return this.apiClient.get<PagedResultDto<DesignationResponseDto>>(`Designation/level/${level}`).pipe(
      map(response => ({ ...response, data: (response.data || []).map(mapId) }))
    );
  }

  getDesignationStatistics(): Observable<ApiResponse<any>> {
    return this.apiClient.get<ApiResponse<any>>('Designation/statistics/by-level');
  }

  // Add this method to DesignationService:
getDesignationsByDepartment(departmentId: string): Observable<ApiResponse<DesignationResponseDto[]>> {
  return this.apiClient.get<ApiResponse<DesignationResponseDto[]>>(
    `Designation/by-department/${departmentId}`
  ).pipe(
    map(response => ({
      ...response,
      data: (response.data || []).map(mapId)
    }))
  );
}
}

