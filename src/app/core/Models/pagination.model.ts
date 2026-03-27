export interface IPaginationDto {
  pageNumber: number;
  pageSize: number;
}

export interface IPagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export class PaginationDto implements IPaginationDto {
  private _pageNumber: number = 1;
  private _pageSize: number = 10;

  constructor(pageNumber: number = 1, pageSize: number = 10) {
    this.pageNumber = pageNumber;
    this.pageSize = pageSize;
  }

  get pageNumber(): number {
    return this._pageNumber;
  }
  set pageNumber(value: number) {
    this._pageNumber = value < 1 ? 1 : value;
  }

  get pageSize(): number {
    return this._pageSize;
  }
  set pageSize(value: number) {
    if (value < 1) this._pageSize = 10;
    else if (value > 100) this._pageSize = 100;
    else this._pageSize = value;
  }

  toHttpParams(): { [key: string]: string } {
    return {
      pageNumber: String(this._pageNumber),
      pageSize: String(this._pageSize),
    };
  }

  toObject(): IPaginationDto {
    return { pageNumber: this._pageNumber, pageSize: this._pageSize };
  }
}

export class PagedResultDto<T> implements IPagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;

  constructor(data: IPagedResultDto<T>) {
    this.items = data.items ?? [];
    this.totalCount = data.totalCount ?? 0;
    this.pageNumber = data.pageNumber ?? 1;
    this.pageSize = data.pageSize ?? 10;
  }

  get totalPages(): number {
    if (this.pageSize <= 0) return 0;
    return Math.ceil(this.totalCount / this.pageSize);
  }

  get hasPreviousPage(): boolean {
    return this.pageNumber > 1;
  }

  get hasNextPage(): boolean {
    return this.pageNumber < this.totalPages;
  }

  static fromApiResponse<T>(data: IPagedResultDto<T>): PagedResultDto<T> {
    return new PagedResultDto<T>(data);
  }
}

export class PaginationManager {
  private dto: PaginationDto;

  constructor(pageNumber: number = 1, pageSize: number = 10) {
    this.dto = new PaginationDto(pageNumber, pageSize);
  }

  get pageNumber(): number { return this.dto.pageNumber; }
  get pageSize(): number { return this.dto.pageSize; }

  toHttpParams(): { [key: string]: string } {
    return this.dto.toHttpParams();
  }

  goToPage(page: number): void {
    this.dto.pageNumber = page;
  }

  setPageSize(size: number): void {
    this.dto.pageSize = size;
    this.dto.pageNumber = 1; 
  }

  nextPage<T>(result: PagedResultDto<T>): void {
    if (result.hasNextPage) this.dto.pageNumber += 1;
  }

  prevPage<T>(result: PagedResultDto<T>): void {
    if (result.hasPreviousPage) this.dto.pageNumber -= 1;
  }

  firstPage(): void {
    this.dto.pageNumber = 1;
  }

  lastPage<T>(result: PagedResultDto<T>): void {
    this.dto.pageNumber = result.totalPages;
  }
}