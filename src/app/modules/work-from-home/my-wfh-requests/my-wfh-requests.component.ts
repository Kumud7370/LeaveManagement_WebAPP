import {
  Component, OnInit, OnDestroy,
  ChangeDetectorRef, ViewEncapsulation, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ColDef, GridApi, GridReadyEvent,
  ModuleRegistry, AllCommunityModule, themeQuartz
} from 'ag-grid-community';

import { WfhRequestService } from '../../../core/services/api/work-from-home.api';
import { WfhRequest, ApprovalStatus } from '../../../core/Models/work-from-home.model';
import { WfhRequestFormComponent } from '../work-from-home-form/work-from-home-form.component';
import { WfhRequestDetailsComponent } from '../work-from-home-details/work-from-home-details.component';
import Swal from 'sweetalert2';

ModuleRegistry.registerModules([AllCommunityModule]);


const empGridTheme = themeQuartz.withParams({
  backgroundColor:               '#ffffff',
  foregroundColor:               '#1f2937',
  borderColor:                   '#e5e7eb',
  headerBackgroundColor:         '#f9fafb',
  headerTextColor:               '#374151',
  oddRowBackgroundColor:         '#ffffff',
  rowHoverColor:                 '#f8faff',
  selectedRowBackgroundColor:    '#dbeafe',
  fontFamily:                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize:                      13,
  columnBorder:                  true,
  headerColumnBorder:            true,
  headerColumnBorderHeight:      '50%',
  headerColumnResizeHandleColor: '#9ca3af',
  headerColumnResizeHandleHeight: '50%',
  headerColumnResizeHandleWidth: 2,
  cellHorizontalPaddingScale:    0.8,
});

@Component({
  selector: 'app-my-wfh-requests',
  standalone: true,
  templateUrl: './my-wfh-requests.component.html',
  styleUrls: ['./my-wfh-requests.component.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, AgGridAngular, WfhRequestFormComponent, WfhRequestDetailsComponent]
})
export class MyWfhRequestsComponent implements OnInit, OnDestroy {

  readonly gridTheme = empGridTheme;
  ApprovalStatus = ApprovalStatus;

  allRequests:       WfhRequest[] = [];
  filteredRequests:  WfhRequest[] = [];
  rowData:           WfhRequest[] = [];
  loading   = false;
  refreshing = false;
  error: string | null = null;

  currentUserId: string | null = null;

  searchTerm = '';

  private gridApi!: GridApi;
  private resizeObserver!: ResizeObserver;
  private resizeTimer: any;
  private searchDebounceTimer: any;

  // Modals
  showForm    = false;
  showDetails = false;
  editingRequest: WfhRequest | null = null;
  selectedRequestId: string | null = null;

  // Filter
  selectedStatus: ApprovalStatus | '' = '';

  // Pagination
  currentPage     = 1;
  pageSize        = 10;
  pageSizeOptions = [10, 25, 50, 100];

  get totalItems():  number { return this.filteredRequests.length; }
  get totalPages():  number { return Math.max(1, Math.ceil(this.totalItems / this.pageSize)); }
  get startIndex():  number { return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1; }
  get endIndex():    number { return Math.min(this.currentPage * this.pageSize, this.totalItems); }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const cur = this.currentPage;
    if (cur <= 4)         return [1, 2, 3, 4, 5, -1, total];
    if (cur >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
    return [1, -1, cur - 1, cur, cur + 1, -1, total];
  }

  // Stats
  get totalCount():    number { return this.allRequests.length; }
  get pendingCount():  number { return this.countByStatus('pending'); }
  get approvedCount(): number { return this.countByStatus('approved'); }
  get rejectedCount(): number { return this.countByStatus('rejected'); }
  get cancelledCount(): number { return this.countByStatus('cancelled'); }

  private countByStatus(s: string): number {
    return this.allRequests.filter(r => String(r.statusName ?? '').toLowerCase() === s).length;
  }

  defaultColDef: ColDef = {
    sortable: true, filter: true, floatingFilter: true,
    resizable: true, minWidth: 80,
    cellStyle: { display: 'flex', alignItems: 'center' }
  };

  columnDefs: ColDef[] = [
    {
      headerName: 'Actions',
      width: 100, minWidth: 100, maxWidth: 110,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      cellClass: 'actions-cell',
      cellStyle: { display: 'flex', alignItems: 'center', padding: '0', overflow: 'visible' },
      suppressSizeToFit: true,
      cellRenderer: (p: any) => {
        const btnBase = `
          display:inline-flex;align-items:center;justify-content:center;
          width:28px;height:28px;border:none;border-radius:4px;
          cursor:pointer;font-size:15px;padding:0;flex-shrink:0;
          line-height:1;transition:background 0.15s;background:transparent;
        `;

        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;align-items:center;gap:4px;padding:0 4px;height:100%;';

        const viewBtn = document.createElement('button');
        viewBtn.innerHTML = '<i class="bi bi-eye"></i>';
        viewBtn.title = 'View Details';
        viewBtn.style.cssText = btnBase + 'color:#10b981;';
        viewBtn.onmouseover = () => viewBtn.style.background = '#ecfdf5';
        viewBtn.onmouseout  = () => viewBtn.style.background = 'transparent';
        viewBtn.addEventListener('click', () => this.viewDetails(p.data));
        wrap.appendChild(viewBtn);

        if (this.isPending(p.data)) {
          const cancelBtn = document.createElement('button');
          cancelBtn.innerHTML = '<i class="bi bi-slash-circle"></i>';
          cancelBtn.title = 'Cancel';
          cancelBtn.style.cssText = btnBase + 'color:#d97706;';
          cancelBtn.onmouseover = () => cancelBtn.style.background = '#fef3c7';
          cancelBtn.onmouseout  = () => cancelBtn.style.background = 'transparent';
          cancelBtn.addEventListener('click', () => this.cancelRequest(p.data));
          wrap.appendChild(cancelBtn);
        }

        return wrap;
      }
    },
    {
      headerName: 'Start Date',
      field: 'startDate',
      width: 130, minWidth: 110,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    },
    {
      headerName: 'End Date',
      field: 'endDate',
      width: 130, minWidth: 110,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
    },
    {
      headerName: 'Days',
      field: 'totalDays',
      width: 80, minWidth: 70,
      cellRenderer: (p: any) =>
        `<span style="display:inline-flex;align-items:center;justify-content:center;
          width:28px;height:24px;background:#f1f5f9;border-radius:5px;
          font-size:12px;font-weight:700;color:#475569;">${p.value ?? 0}</span>`
    },
    {
      headerName: 'Reason',
      field: 'reason',
      flex: 1, minWidth: 180,
      cellRenderer: (p: any) => {
        const txt = p.value?.length > 50 ? p.value.substring(0, 50) + '…' : (p.value || '');
        return `<span style="font-size:13px;color:#374151;">${txt}</span>`;
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 130, minWidth: 110,
      cellRenderer: (p: any) => {
        const strMap: Record<string, [string, string, string]> = {
          'pending':   ['#fef9c3', '#92400e', 'Pending'],
          'approved':  ['#dcfce7', '#166534', 'Approved'],
          'rejected':  ['#fee2e2', '#991b1b', 'Rejected'],
          'cancelled': ['#f1f5f9', '#475569', 'Cancelled'],
        };
        const numMap: Record<number, [string, string, string]> = {
          [ApprovalStatus.Pending]:   ['#fef9c3', '#92400e', 'Pending'],
          [ApprovalStatus.Approved]:  ['#dcfce7', '#166534', 'Approved'],
          [ApprovalStatus.Rejected]:  ['#fee2e2', '#991b1b', 'Rejected'],
          [ApprovalStatus.Cancelled]: ['#f1f5f9', '#475569', 'Cancelled'],
        };
        const byNum = numMap[Number(p.value)];
        const byStr = strMap[String(p.data?.statusName ?? '').toLowerCase()];
        const [bg, color, lbl] = byNum ?? byStr ?? ['#fef9c3', '#92400e', 'Pending'];
        return `<span style="display:inline-flex;padding:2px 12px;border-radius:9999px;
          font-size:12px;font-weight:600;background:${bg};color:${color};">${lbl}</span>`;
      }
    },
    {
      headerName: 'Applied On',
      field: 'createdAt',
      width: 130, minWidth: 110,
      valueFormatter: (p: any) => p.value
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      cellStyle: { color: '#6b7280', fontSize: '12px' }
    }
  ];

  constructor(private wfhService: WfhRequestService, private cdr: ChangeDetectorRef) {}

ngOnInit(): void {
  this.currentUserId = sessionStorage.getItem('EmployeeId')
  || sessionStorage.getItem('employeeId')
  || sessionStorage.getItem('UserId')
  || sessionStorage.getItem('userId')
  || null;
  
  console.log('All sessionStorage keys:');
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)!;
    console.log(`  ${key} = ${sessionStorage.getItem(key)}`);
  }
  console.log('currentUserId =', this.currentUserId);
  
  this.loadAll();
}


  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    clearTimeout(this.resizeTimer);
    clearTimeout(this.searchDebounceTimer);
  }

  @HostListener('window:resize')
  onWindowResize(): void { this.scheduleFit(); }

  private scheduleFit(delay = 200): void {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      if (this.gridApi && !this.gridApi.isDestroyed()) this.gridApi.sizeColumnsToFit();
    }, delay);
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 100);
    const el = document.querySelector('app-my-wfh-requests ag-grid-angular') as HTMLElement;
    if (el && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleFit(50));
      this.resizeObserver.observe(el);
    }
  }

  loadAll(): void {
    const isFirst = this.allRequests.length === 0 && !this.error;
    if (isFirst) { this.loading = true; } else { this.refreshing = true; }
    this.error = null;

    this.wfhService.getMyWfhRequests().subscribe({
      next: (r) => {
        this.loading = false;
        this.refreshing = false;
        const raw: any = r;
        const items: WfhRequest[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
            ? raw.data
            : (raw?.data as any)?.items ?? [];

        this.allRequests = items.sort((a: WfhRequest, b: WfhRequest) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
        this.currentPage = 1;
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.loading = false;
        this.refreshing = false;
        this.error = e.error?.message || 'Error loading requests';
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter(): void {
    let filtered = [...this.allRequests];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.reason?.toLowerCase().includes(term) ||
        String(r.statusName ?? '').toLowerCase().includes(term)
      );
    }

    if (this.selectedStatus !== '') {
      const num = Number(this.selectedStatus);
      filtered = filtered.filter(r =>
        Number(r.status) === num ||
        String(r.statusName ?? '').toLowerCase() === ApprovalStatus[num]?.toLowerCase()
      );
    }

    this.filteredRequests = filtered;
    this.currentPage = 1;
    this.applyPage();
  }

  applyPage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.rowData = this.filteredRequests.slice(start, start + this.pageSize);
    if (this.gridApi && !this.gridApi.isDestroyed()) {
      this.gridApi.setGridOption('rowData', this.rowData);
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
    }
    this.cdr.detectChanges();
  }

  onSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => this.applyFilter(), 350);
  }

  onStatusFilter(status: ApprovalStatus | ''): void {
    this.selectedStatus = status;
    this.applyFilter();
  }

  clearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchTerm    = '';
    this.selectedStatus = '';
    this.currentPage   = 1;
    this.applyFilter();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.applyPage();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = Number(newSize);
    this.currentPage = 1;
    this.applyPage();
  }

  getStatusName(status: ApprovalStatus | ''): string {
    if (status === '') return '';
    return ApprovalStatus[Number(status)] ?? String(status);
  }

  // Modals
  openCreateForm(): void { this.editingRequest = null; this.showForm = true; this.showDetails = false; }
  viewDetails(req: WfhRequest): void { this.selectedRequestId = req.id; this.showDetails = true; this.showForm = false; }
  closeModal(): void { this.showForm = false; this.showDetails = false; this.editingRequest = null; this.selectedRequestId = null; }
  onRequestSaved():   void { this.closeModal(); this.loadAll(); }
  onRequestUpdated(): void { this.loadAll(); }

  async cancelRequest(req: WfhRequest): Promise<void> {
    const result = await Swal.fire({
      title: 'Cancel WFH Request?', text: 'Are you sure you want to cancel this request?',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#f59e0b', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Cancel It'
    });
    if (!result.isConfirmed) return;
    this.wfhService.cancelWfhRequest(req.id).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({ title: 'Cancelled!', icon: 'success', timer: 2000, showConfirmButton: false });
          this.loadAll();
        } else { Swal.fire('Error!', res.message || 'Failed', 'error'); }
      },
      error: (e) => Swal.fire('Error!', e.error?.message || 'Error', 'error')
    });
  }

  isPending(req: WfhRequest): boolean {
    return Number(req.status) === ApprovalStatus.Pending
      || String(req.statusName ?? '').toLowerCase() === 'pending';
  }
}