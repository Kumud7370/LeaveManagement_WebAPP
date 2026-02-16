import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// ============================================================================
// EXPORTED INTERFACES - These must be exported to use in other files
// ============================================================================

export interface CreateDesignationDto {
  designationCode: string;
  designationName: string;
  description?: string;
  level: number;
  isActive?: boolean;
}

export interface UpdateDesignationDto {
  designationCode: string;
  designationName: string;
  description?: string;
  level: number;
  isActive?: boolean;
}

export interface DesignationResponseDto {
  designationId: string;
  designationCode: string;
  designationName: string;
  description?: string;
  level: number;
  isActive: boolean;
  employeeCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DesignationFilterDto {
  searchTerm?: string;
  isActive?: boolean;
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface PaginationDto {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PagedResultDto<T> {
  data: T[];
  pagination: PaginationDto;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: 'root'
})
export class DesignationService {
  private apiUrl = `${environment.apiUrl}/Designation`;

  constructor(private http: HttpClient) {
    console.log('🔧 DesignationService initialized');
    console.log('🌐 API URL:', this.apiUrl);
  }

  createDesignation(dto: CreateDesignationDto): Observable<ApiResponse<DesignationResponseDto>> {
    console.log('📝 Creating designation:', dto);
    return this.http.post<ApiResponse<DesignationResponseDto>>(this.apiUrl, dto).pipe(
      tap(response => console.log('✅ Create response:', response))
    );
  }

  getDesignationById(id: string): Observable<ApiResponse<DesignationResponseDto>> {
    console.log('🔍 Fetching designation by ID:', id);
    return this.http.get<ApiResponse<DesignationResponseDto>>(`${this.apiUrl}/${id}`).pipe(
      tap(response => console.log('✅ Get by ID response:', response))
    );
  }

  getFilteredDesignations(filter: DesignationFilterDto): Observable<PagedResultDto<DesignationResponseDto>> {
    console.log('🔍 Fetching filtered designations:', filter);
    
    let params = new HttpParams()
      .set('pageNumber', filter.pageNumber.toString())
      .set('pageSize', filter.pageSize.toString());

    if (filter.searchTerm) params = params.set('searchTerm', filter.searchTerm);
    if (filter.isActive !== undefined) params = params.set('isActive', filter.isActive.toString());
    if (filter.level) params = params.set('level', filter.level.toString());
    if (filter.minLevel) params = params.set('minLevel', filter.minLevel.toString());
    if (filter.maxLevel) params = params.set('maxLevel', filter.maxLevel.toString());
    if (filter.sortBy) params = params.set('sortBy', filter.sortBy);
    if (filter.sortDescending !== undefined) params = params.set('sortDescending', filter.sortDescending.toString());

    console.log('🌐 Full URL:', `${this.apiUrl}?${params.toString()}`);

    return this.http.get<PagedResultDto<DesignationResponseDto>>(this.apiUrl, { params }).pipe(
      tap(response => console.log('✅ Get filtered response:', response))
    );
  }

  updateDesignation(id: string, dto: UpdateDesignationDto): Observable<ApiResponse<DesignationResponseDto>> {
    console.log('✏️ Updating designation:', id, dto);
    return this.http.put<ApiResponse<DesignationResponseDto>>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(response => console.log('✅ Update response:', response))
    );
  }

  deleteDesignation(id: string): Observable<ApiResponse<void>> {
    console.log('🗑️ Deleting designation:', id);
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      tap(response => console.log('✅ Delete response:', response))
    );
  }

  toggleDesignationStatus(id: string): Observable<ApiResponse<DesignationResponseDto>> {
    console.log('🔄 Toggling designation status:', id);
    return this.http.patch<ApiResponse<DesignationResponseDto>>(`${this.apiUrl}/${id}/toggle-status`, {}).pipe(
      tap(response => console.log('✅ Toggle response:', response))
    );
  }

  getActiveDesignations(): Observable<PagedResultDto<DesignationResponseDto>> {
    console.log('📋 Fetching active designations');
    return this.http.get<PagedResultDto<DesignationResponseDto>>(`${this.apiUrl}/active`).pipe(
      tap(response => console.log('✅ Active designations response:', response))
    );
  }

  getDesignationsByLevel(level: number): Observable<PagedResultDto<DesignationResponseDto>> {
    console.log('📊 Fetching designations by level:', level);
    return this.http.get<PagedResultDto<DesignationResponseDto>>(`${this.apiUrl}/level/${level}`).pipe(
      tap(response => console.log('✅ Designations by level response:', response))
    );
  }

  getDesignationStatistics(): Observable<ApiResponse<any>> {
    console.log('📈 Fetching designation statistics');
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/statistics`).pipe(
      tap(response => console.log('✅ Statistics response:', response))
    );
  }
}