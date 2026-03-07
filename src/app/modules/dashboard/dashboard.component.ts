import {
  Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, finalize, catchError } from 'rxjs/operators';
import { ApiClientService } from 'src/app/core/services/api/apiClient';
import { UpcomingHolidaysWidgetComponent } from '../holiday/upcoming-holidays-widget/upcoming-holidays-widget.component';
import type {
  ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis,
  ApexDataLabels, ApexPlotOptions, ApexLegend, ApexGrid,
  ApexStroke, ApexMarkers, ApexFill, ApexTooltip, ApexNonAxisChartSeries
} from 'ng-apexcharts';

export type BarLineChartOptions = {
  series: ApexAxisChartSeries; chart: ApexChart;
  xaxis: ApexXAxis; yaxis: ApexYAxis | ApexYAxis[];
  dataLabels: ApexDataLabels; plotOptions: ApexPlotOptions;
  colors: string[]; grid: ApexGrid; legend: ApexLegend;
  stroke: ApexStroke; markers: ApexMarkers;
  fill: ApexFill; tooltip: ApexTooltip;
};

export type DonutChartOptions = {
  series: ApexNonAxisChartSeries; chart: ApexChart;
  labels: string[]; colors: string[]; legend: ApexLegend;
  plotOptions: ApexPlotOptions; dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, FormsModule, UpcomingHolidaysWidgetComponent],
})
export class DashboardComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  isLoading     = true;
  loadingError: string | null = null;
  isMobileView  = false;

  // ── Colour tokens ──────────────────────────────────────────────
  private C = {
    navy: '#1a2a6c', crimson: '#b21f1f',
    green: '#10b981', red: '#ef4444',
    yellow: '#f59e0b', blue: '#3b82f6',
    purple: '#8b5cf6', teal: '#06b6d4',
    orange: '#f97316', gray: '#6b7280',
  };

  // ── Stat values ────────────────────────────────────────────────
  presentToday     = 0;
  absentToday      = 0;
  lateToday        = 0;
  earlyLeaveToday  = 0;
  leavePending     = 0;
  leaveApproved    = 0;
  leaveRejected    = 0;
  leaveCancelled   = 0;
  leaveTotal       = 0;
  activeEmployees  = 0;
  activeDepartments = 0;
  nextHolidayName  = '—';
  nextHolidayDate  = '—';

  // ── Activity lists ─────────────────────────────────────────────
  pendingLeavesList: any[] = [];
  lateList:          any[] = [];
  earlyList:         any[] = [];
  upcomingLeaves:    any[] = [];

  // ── Charts ─────────────────────────────────────────────────────
  attendanceBarChart!:  BarLineChartOptions;
  leaveTrendLineChart!: BarLineChartOptions;
  leaveDonutChart!:     DonutChartOptions;
  deptDonutChart!:      DonutChartOptions;

  private allLeaveItems: any[] = [];

  constructor(private api: ApiClientService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.checkMobileView();
    this.initEmptyCharts();
    this.loadDashboard();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  @HostListener('window:resize')
  onResize(): void { this.checkMobileView(); }
  checkMobileView(): void { this.isMobileView = window.innerWidth <= 768; }

  loadDashboard(): void {
    this.isLoading    = true;
    this.loadingError = null;

    forkJoin({
      attStats:  this.api.getAttendanceStatistics() .pipe(catchError(() => of(null))),
      late:      this.api.getLateAttendance()        .pipe(catchError(() => of([]))),
      early:     this.api.getEarlyLeave()            .pipe(catchError(() => of([]))),
      pending:   this.api.getPendingLeaves()         .pipe(catchError(() => of([]))),
      employees: this.api.getActiveEmployees()       .pipe(catchError(() => of([]))),
      depts:     this.api.getActiveDepartments()     .pipe(catchError(() => of([]))),
      holidays:  this.api.getUpcomingHolidays()      .pipe(catchError(() => of([]))),
      allLeaves: this.api.filterLeaves({
        pageNumber: 1, pageSize: 500,
        sortBy: 'AppliedDate', sortDescending: true,
      }).pipe(catchError(() => of(null))),
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => { this.isLoading = false; this.cdr.detectChanges(); }),
    )
    .subscribe({
      next: (r) => {
        this.processAttendance(r.attStats);
        this.processLate(r.late);
        this.processEarly(r.early);
        this.processPending(r.pending);
        this.processEmployees(r.employees);
        this.processDepartments(r.depts);
        this.processHolidays(r.holidays);
        this.processAllLeaves(r.allLeaves);

        this.buildAttendanceBarChart();
        this.buildLeaveTrendChart();
        this.buildLeaveDonut();
        this.buildDeptDonut(r.depts);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingError = err?.error?.message || 'Failed to load dashboard data.';
      },
    });
  }

  // ── Processors ─────────────────────────────────────────────────
  private processAttendance(res: any): void {
    const d = res?.data ?? res ?? {};
    this.presentToday   = d.presentCount    ?? d.present    ?? d.Present    ?? 0;
    this.absentToday    = d.absentCount     ?? d.absent     ?? d.Absent     ?? 0;
    this.lateToday      = d.lateCount       ?? d.late       ?? d.Late       ?? 0;
    this.earlyLeaveToday = d.earlyLeaveCount ?? d.earlyLeave ?? d.EarlyLeave ?? 0;
  }

  private processLate(res: any): void {
    const list = res?.data ?? res ?? [];
    this.lateList  = Array.isArray(list) ? list.slice(0, 6) : [];
    if (!this.lateToday) this.lateToday = this.lateList.length;
  }

  private processEarly(res: any): void {
    const list = res?.data ?? res ?? [];
    this.earlyList = Array.isArray(list) ? list.slice(0, 6) : [];
    if (!this.earlyLeaveToday) this.earlyLeaveToday = this.earlyList.length;
  }

  private processPending(res: any): void {
    const list = res?.data ?? res ?? [];
    this.pendingLeavesList = Array.isArray(list) ? list.slice(0, 6) : [];
  }

  private processEmployees(res: any): void {
    const list = res?.data ?? res ?? [];
    this.activeEmployees = Array.isArray(list) ? list.length : (res?.data?.totalCount ?? 0);
  }

  private processDepartments(res: any): void {
    const list = res?.data ?? res ?? [];
    this.activeDepartments = Array.isArray(list) ? list.length : 0;
  }

  private processHolidays(res: any): void {
    const list = res?.data ?? res ?? [];
    if (Array.isArray(list) && list.length > 0) {
      const h = list[0];
      this.nextHolidayName = h.name ?? h.holidayName ?? '—';
      this.nextHolidayDate = h.date ? this.fmt(h.date) : '—';
    }
  }

  private processAllLeaves(res: any): void {
    const items: any[] = res?.data?.items ?? res?.data ?? [];
    this.allLeaveItems  = Array.isArray(items) ? items : [];
    // Upcoming = approved leaves with startDate in the future
    const today = new Date();
    this.upcomingLeaves = this.allLeaveItems
      .filter(l => this.statusName(l.leaveStatus) === 'Approved' && new Date(l.startDate) >= today)
      .slice(0, 5);
    this.leaveTotal     = this.allLeaveItems.length;
    this.leavePending   = this.allLeaveItems.filter(l => this.statusName(l.leaveStatus) === 'Pending').length;
    this.leaveApproved  = this.allLeaveItems.filter(l => this.statusName(l.leaveStatus) === 'Approved').length;
    this.leaveRejected  = this.allLeaveItems.filter(l => this.statusName(l.leaveStatus) === 'Rejected').length;
    this.leaveCancelled = this.allLeaveItems.filter(l => this.statusName(l.leaveStatus) === 'Cancelled').length;
  }

  // ── Chart builders ─────────────────────────────────────────────
  private buildAttendanceBarChart(): void {
    const labels = this.last7Labels();
    const fill7  = (v: number) => [...Array(6).fill(0), v];
    this.attendanceBarChart = {
      ...this.attendanceBarChart,
      series: [
        { name: 'Present',     data: fill7(this.presentToday)    },
        { name: 'Absent',      data: fill7(this.absentToday)     },
        { name: 'Late',        data: fill7(this.lateToday)       },
        { name: 'Early Leave', data: fill7(this.earlyLeaveToday) },
      ],
      xaxis: { ...this.attendanceBarChart.xaxis, categories: labels },
    };
  }

  private buildLeaveTrendChart(): void {
    const labels = this.last7Labels();
    type B = { p: number; a: number; r: number };
    const buckets: Record<string, B> =
      Object.fromEntries(labels.map(l => [l, { p: 0, a: 0, r: 0 }]));

    this.allLeaveItems.forEach(leave => {
      const lbl = new Date(leave.appliedDate)
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (!buckets[lbl]) return;
      const s = this.statusName(leave.leaveStatus);
      if (s === 'Pending')  buckets[lbl].p++;
      if (s === 'Approved') buckets[lbl].a++;
      if (s === 'Rejected') buckets[lbl].r++;
    });

    this.leaveTrendLineChart = {
      ...this.leaveTrendLineChart,
      series: [
        { name: 'Pending',  data: labels.map(l => buckets[l].p) },
        { name: 'Approved', data: labels.map(l => buckets[l].a) },
        { name: 'Rejected', data: labels.map(l => buckets[l].r) },
      ],
      xaxis: { ...this.leaveTrendLineChart.xaxis, categories: labels },
    };
  }

  private buildLeaveDonut(): void {
    this.leaveDonutChart = {
      ...this.leaveDonutChart,
      series: [this.leavePending, this.leaveApproved, this.leaveRejected, this.leaveCancelled],
    };
  }

  private buildDeptDonut(res: any): void {
    const list: any[] = res?.data ?? res ?? [];
    if (!Array.isArray(list) || list.length === 0) return;
    this.deptDonutChart = {
      ...this.deptDonutChart,
      labels:  list.map(d => d.name ?? d.departmentName ?? 'Dept'),
      series:  list.map(d => d.employeeCount ?? d.totalEmployees ?? 1),
    };
  }

  initEmptyChartsPublic(): void { this.initEmptyCharts(); }

  private initEmptyCharts(): void {
    const baseGrid: ApexGrid = {
      borderColor: '#e5e7eb', strokeDashArray: 3,
      padding: { top: 0, right: 10, bottom: 0, left: 10 },
    };
    const baseLegend: ApexLegend = {
      position: 'top', horizontalAlign: 'center', fontSize: '13px', fontWeight: 500,
      markers: { width: 10, height: 10, radius: 5 },
      itemMargin: { horizontal: 8, vertical: 4 },
    };
    const baseXAxis = (): ApexXAxis => ({
      categories: this.last7Labels(),
      labels: { style: { fontSize: '12px', colors: Array(7).fill(this.C.gray) } },
    });
    const baseYAxis = (text: string): ApexYAxis => ({
      title: { text, style: { color: this.C.gray, fontSize: '12px' } },
      labels: {
        style: { colors: [this.C.gray], fontSize: '11px' },
        formatter: (v: number) => Math.round(v).toString(),
      },
    });

    this.attendanceBarChart = {
      series: [],
      chart: { type: 'bar', height: 300, fontFamily: "'Inter',sans-serif", toolbar: { show: false } },
      plotOptions: { bar: { horizontal: false, columnWidth: '60%', borderRadius: 4 } },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      markers: { size: 0 },
      xaxis: baseXAxis(), yaxis: baseYAxis('Employees'),
      colors: [this.C.green, this.C.red, this.C.yellow, this.C.orange],
      grid: baseGrid, legend: baseLegend,
      fill: { opacity: 1 },
      tooltip: { y: { formatter: (v: number) => `${v} employees` } },
    };

    this.leaveTrendLineChart = {
      series: [],
      chart: { type: 'line', height: 300, fontFamily: "'Inter',sans-serif", toolbar: { show: false } },
      plotOptions: {},
      dataLabels: { enabled: false },
      stroke: { width: [3, 3, 3], curve: 'smooth' },
      markers: { size: 5, strokeColors: '#fff', strokeWidth: 2, hover: { size: 7 } },
      xaxis: baseXAxis(), yaxis: baseYAxis('Leaves'),
      colors: [this.C.yellow, this.C.green, this.C.red],
      grid: baseGrid, legend: baseLegend,
      fill: {},
      tooltip: { y: { formatter: (v: number) => `${v} leaves` } },
    };

    this.leaveDonutChart = {
      series: [0, 0, 0, 0],
      chart: { type: 'donut', height: 280, fontFamily: "'Inter',sans-serif" },
      labels: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      colors: [this.C.yellow, this.C.green, this.C.red, this.C.gray],
      legend: { ...baseLegend, position: 'bottom' },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true, label: 'Total', fontSize: '14px', fontWeight: 700,
                color: this.C.navy, formatter: () => this.leaveTotal.toString(),
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (v: number) => Math.round(v) + '%',
        style: { fontSize: '12px', fontWeight: 'bold', colors: ['#fff'] },
      },
      tooltip: { y: { formatter: (v: number) => `${v} leaves` } },
    };

    this.deptDonutChart = {
      series: [],
      chart: { type: 'donut', height: 280, fontFamily: "'Inter',sans-serif" },
      labels: [],
      colors: [this.C.navy, this.C.blue, this.C.teal, this.C.purple,
               this.C.green, this.C.yellow, this.C.orange, this.C.crimson],
      legend: { ...baseLegend, position: 'bottom' },
      plotOptions: { pie: { donut: { size: '55%' } } },
      dataLabels: {
        enabled: true,
        formatter: (v: number) => Math.round(v) + '%',
        style: { fontSize: '11px', fontWeight: 'bold', colors: ['#fff'] },
      },
      tooltip: { y: { formatter: (v: number) => `${v} employees` } },
    };
  }

  // ── Public helpers (used by template & tests) ──────────────────
  statusName(status: any): string {
    if (typeof status === 'string' && isNaN(+status)) return status;
    return ({ 0: 'Pending', 1: 'Approved', 2: 'Rejected', 3: 'Cancelled' } as any)[Number(status)] ?? 'Pending';
  }
  statusClass(s: any): string { return `badge-${this.statusName(s).toLowerCase()}`; }
  attendancePct(): number {
    const t = this.presentToday + this.absentToday;
    return t > 0 ? Math.round((this.presentToday / t) * 100) : 0;
  }
  fmt(d: string | Date): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  get Math() { return Math; }

  // ── Private helper ─────────────────────────────────────────────
  private last7Labels(): string[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    });
  }
}