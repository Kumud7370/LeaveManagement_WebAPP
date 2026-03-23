export interface TranslationResponseDto {
  id: string;
  key: string;
  namespace: string;
  mr: string;
  en?: string;
  hi?: string;
  updatedAt: Date;
}
 
export interface CreateTranslationDto {
  key: string;
  namespace: string;
  mr: string;
  en?: string;
  hi?: string;
}
 
export interface UpdateTranslationDto {
  mr: string;
  en?: string;
  hi?: string;
}
 
export interface TranslationPagedResult {
  items: TranslationResponseDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}