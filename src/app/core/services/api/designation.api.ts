import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiClientService } from './apiClient';
import {
  CreateDesignationDto,
  UpdateDesignationDto,
  DesignationResponseDto,
  DesignationFilterDto,
  PaginationDto,
  PagedResultDto,
  ApiResponse
} from '../../Models/designation.model';

@Injectable({
  providedIn: 'root'
})
export class DesignationService {
  constructor(private apiClient: ApiClientService) {
    console.log('🔧 DesignationService initialized');
    console.log('🌐 Using ApiClientService for requests');
  }

  createDesignation(dto: CreateDesignationDto): Observable<ApiResponse<DesignationResponseDto>> {
    console.log('📝 Creating designation:', dto);
    return this.apiClient.post<ApiResponse<DesignationResponseDto>>('Designation', dto).pipe(
      tap(response => console.log('✅ Create response:', response))
    );
  }

  getDesignationById(id: string): Observable<ApiResponse<DesignationResponseDto>> {
    console.log('🔍 Fetching designation by ID:', id);
    return this.apiClient.get<ApiResponse<DesignationResponseDto>>(`Designation/${id}`).pipe(
      tap(response => console.log('✅ Get by ID response:', response))
    );
  }

  getFilteredDesignations(filter: DesignationFilterDto): Observable<PagedResultDto<DesignationResponseDto>> {
    console.log('🔍 Fetching filtered designations:', filter);

    // Build query string manually
    let queryParams: string[] = [];
    queryParams.push(`pageNumber=${filter.pageNumber}`);
    queryParams.push(`pageSize=${filter.pageSize}`);

    if (filter.searchTerm) queryParams.push(`searchTerm=${encodeURIComponent(filter.searchTerm)}`);
    if (filter.isActive !== undefined) queryParams.push(`isActive=${filter.isActive}`);
    if (filter.level) queryParams.push(`level=${filter.level}`);
    if (filter.minLevel) queryParams.push(`minLevel=${filter.minLevel}`);
    if (filter.maxLevel) queryParams.push(`maxLevel=${filter.maxLevel}`);
    if (filter.sortBy) queryParams.push(`sortBy=${filter.sortBy}`);
    if (filter.sortDescending !== undefined) queryParams.push(`sortDescending=${filter.sortDescending}`);

    const queryString = queryParams.join('&');
    console.log('🌐 Query string:', queryString);

    return this.apiClient.get<PagedResultDto<DesignationResponseDto>>(`Designation?${queryString}`).pipe(
      tap(response => console.log('✅ Get filtered response:', response))
    );
  }

  updateDesignation(id: string, dto: UpdateDesignationDto): Observable<ApiResponse<DesignationResponseDto>> {
    console.log('✏️ Updating designation:', id, dto);
    return this.apiClient.put<ApiResponse<DesignationResponseDto>>(`Designation/${id}`, dto).pipe(
      tap(response => console.log('✅ Update response:', response))
    );
  }

  deleteDesignation(id: string): Observable<ApiResponse<void>> {
    console.log('🗑️ Deleting designation:', id);
    return this.apiClient.delete<ApiResponse<void>>(`Designation/${id}`).pipe(
      tap(response => console.log('✅ Delete response:', response))
    );
  }

  toggleDesignationStatus(id: string): Observable<ApiResponse<DesignationResponseDto>> {
    console.log('🔄 Toggling designation status:', id);
    return this.apiClient.patch<ApiResponse<DesignationResponseDto>>(`Designation/${id}/toggle-status`, {}).pipe(
      tap(response => console.log('✅ Toggle response:', response))
    );
  }

  getActiveDesignations(): Observable<PagedResultDto<DesignationResponseDto>> {
    console.log('📋 Fetching active designations');
    return this.apiClient.get<PagedResultDto<DesignationResponseDto>>('Designation/active').pipe(
      tap(response => console.log('✅ Active designations response:', response))
    );
  }

  getDesignationsByLevel(level: number): Observable<PagedResultDto<DesignationResponseDto>> {
    console.log('📊 Fetching designations by level:', level);
    return this.apiClient.get<PagedResultDto<DesignationResponseDto>>(`Designation/level/${level}`).pipe(
      tap(response => console.log('✅ Designations by level response:', response))
    );
  }

  getDesignationStatistics(): Observable<ApiResponse<any>> {
    console.log('📈 Fetching designation statistics');
    return this.apiClient.get<ApiResponse<any>>('Designation/statistics').pipe(
      tap(response => console.log('✅ Statistics response:', response))
    );
  }
}