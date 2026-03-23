import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from './apiClient';
import {
  TranslationResponseDto,
  CreateTranslationDto,
  UpdateTranslationDto,
  TranslationPagedResult
} from '../../Models/translation.model';
 
@Injectable({ providedIn: 'root' })
export class TranslationApiService {
 
  constructor(private apiClient: ApiClientService) {}
 
  getFlat(lang: 'mr' | 'en' | 'hi'): Observable<Record<string, string>> {
    return this.apiClient.get<Record<string, string>>(`Translation/flat?lang=${lang}`);
  }
 
  getAll(params: { ns?: string; page?: number; pageSize?: number }): Observable<any> {
    const qs = new URLSearchParams();
    if (params.ns)       qs.set('namespace', params.ns);
    if (params.page)     qs.set('page',      String(params.page));
    if (params.pageSize) qs.set('pageSize',  String(params.pageSize));
    return this.apiClient.get<any>(`Translation?${qs.toString()}`);
  }
 
  getNamespaces(): Observable<string[]> {
    return this.apiClient.get<string[]>('Translation/namespaces');
  }
 
  create(dto: CreateTranslationDto): Observable<any> {
    return this.apiClient.post<any>('Translation', dto);
  }
 
  update(id: string, dto: UpdateTranslationDto): Observable<any> {
    return this.apiClient.put<any>(`Translation/${id}`, dto);
  }
 
  delete(id: string): Observable<any> {
    return this.apiClient.delete<any>(`Translation/${id}`);
  }
 
  seed(items: CreateTranslationDto[]): Observable<any> {
    return this.apiClient.post<any>('Translation/seed', items);
  }
}