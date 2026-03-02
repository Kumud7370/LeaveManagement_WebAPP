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
  foregroundColor:               '#374151',
  borderColor:                   '#e5e7eb',
  headerBackgroundColor:         '#ffffff',
  headerTextColor:               '#374151',
  oddRowBackgroundColor:         '#ffffff',
  rowHoverColor:                 '#f8faff',
  selectedRowBackgroundColor:    '#dbeafe',
  fontFamily:                    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  fontSize:                      13,
  columnBorder:                  true,
  headerColumnBorder:            true,
  headerColumnBorderHeight:      '50%',
  headerColumnResizeHandleColor: '#d1d5db',
  headerFontWeight:              500,
  headerFontSize:                13,
  rowBorder:                     true,
  cellHorizontalPaddingScale:    0.75,
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

  allRequests: WfhRequest[] = [];
  rowData: WfhRequest[] = [];
  loading = false;
  refreshing = false;
  error: string | null = null;

  private gridApi!: GridApi;
  private resizeObserver!: ResizeObserver;
  private resizeTimer: any;

  // Modal
  showForm = false;
  showDetails = false;
  editingRequest: WfhRequest | null = null;
  selectedRequestId: string | null = null;

  // Filter
  selectedStatus: ApprovalStatus | '' = '';
  ApprovalStatus = ApprovalStatus;

  // Stats from loaded data
  get totalCount()    { return this.allRequests.length; }
  get pendingCount()  { return this.countByStatus('pending');   }
  get approvedCount() { return this.countByStatus('approved');  }
  get rejectedCount() { return this.countByStatus('rejected');  }
  get cancelledCount(){ return this.countByStatus('cancelled'); }

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
      width: 80, minWidth: 80, maxWidth: 80,
      sortable: false, filter: false, floatingFilter: false,
      suppressFloatingFilterButton: true,
      headerClass: 'emp-action-col',
      cellClass: 'emp-action-cell emp-action-col',
      cellStyle: { display: 'flex', alignItems: 'center', padding: '0', overflow: 'visible' },
      suppressSizeToFit: true,
      cellRenderer: (p: any) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;align-items:center;gap:6px;padding:0 10px;';

        const viewBtn = document.createElement('button');
        viewBtn.innerHTML = '<i class="bi bi-eye"></i>';
        viewBtn.title = 'View Details';
        viewBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1px solid #bfdbfe;background:#eff6ff;color:#3b82f6;cursor:pointer;font-size:14px;transition:all 0.15s;';
        viewBtn.addEventListener('click', () => this.viewDetails(p.data));
        wrap.appendChild(viewBtn);

        if (this.isPending(p.data)) {
          const cancelBtn = document.createElement('button');
          cancelBtn.innerHTML = '<i class="bi bi-slash-circle"></i>';
          cancelBtn.title = 'Cancel';
          cancelBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1px solid #fecaca;background:#fef2f2;color:#ef4444;cursor:pointer;font-size:14px;transition:all 0.15s;';
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
        const byNum  = numMap[Number(p.value)];
        const byStr  = strMap[String(p.data?.statusName ?? '').toLowerCase()];
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
        ? new Date(p.value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
    }
  ];

  constructor(private wfhService: WfhRequestService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadAll(); }

  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    clearTimeout(this.resizeTimer);
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

    // Uses /my-requests — backend reads JWT claims to return only this employee's requests
    this.wfhService.getMyWfhRequests().subscribe({
      next: (r) => {
        this.loading = false;
        this.refreshing = false;
        // Handle both { success, data } wrapper and raw array responses
        const raw: any = r;
        const items: WfhRequest[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
            ? raw.data
            : (raw?.data as any)?.items ?? [];

        if (items.length >= 0) {
          this.allRequests = items.sort((a: WfhRequest, b: WfhRequest) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
          this.applyFilter();
        } else {
          this.error = (r as any)?.message || 'Failed to load requests';
        }
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
    if (!this.selectedStatus) {
      this.rowData = [...this.allRequests];
    } else {
      const num = Number(this.selectedStatus);
      this.rowData = this.allRequests.filter(r =>
        Number(r.status) === num ||
        String(r.statusName ?? '').toLowerCase() === ApprovalStatus[num]?.toLowerCase()
      );
    }
    if (this.gridApi && !this.gridApi.isDestroyed()) {
      this.gridApi.setGridOption('rowData', this.rowData);
      setTimeout(() => this.gridApi?.sizeColumnsToFit(), 50);
    }
  }

  onStatusFilter(status: ApprovalStatus | ''): void {
    this.selectedStatus = status;
    this.applyFilter();
  }

  openCreateForm(): void { this.editingRequest = null; this.showForm = true; this.showDetails = false; }
  viewDetails(req: WfhRequest): void { this.selectedRequestId = req.id; this.showDetails = true; this.showForm = false; }
  closeModal(): void { this.showForm = false; this.showDetails = false; this.editingRequest = null; this.selectedRequestId = null; }
  onRequestSaved(): void { this.closeModal(); this.loadAll(); }
  onRequestUpdated(): void { this.loadAll(); }

  async cancelRequest(req: WfhRequest): Promise<void> {
    const result = await Swal.fire({
      title: 'Cancel WFH Request?', text: 'Are you sure?',
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
    return String(req.statusName ?? '').toLowerCase() === 'pending';
  }
}