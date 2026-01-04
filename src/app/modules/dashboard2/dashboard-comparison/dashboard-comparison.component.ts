import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { NgApexchartsModule } from "ng-apexcharts"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { Subject, takeUntil, forkJoin, of, Observable } from "rxjs"
import moment from "moment"
import type {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexPlotOptions,
  ApexLegend,
  ApexGrid,
  ApexResponsive,
  ApexStroke,
  ApexMarkers,
  ApexFill,
  ApexTooltip,
} from "ng-apexcharts"

export type ChartOptions = {
  series: ApexAxisChartSeries
  chart: ApexChart
  xaxis: ApexXAxis
  yaxis: ApexYAxis | ApexYAxis[]
  dataLabels: ApexDataLabels
  plotOptions: ApexPlotOptions
  colors: string[]
  grid: ApexGrid
  legend: ApexLegend
  stroke?: ApexStroke
  markers?: ApexMarkers
  fill?: ApexFill
  tooltip?: ApexTooltip
}




export interface HistoricalRecord {
  year: number
  totalWeight: number
  totalTrips: number
  avgDaily: number
  efficiency: number
  yoyChange: number
}


@Component({
  selector: 'app-dashboard-comparison',
  imports: [CommonModule, NgApexchartsModule, FormsModule],
  templateUrl: './dashboard-comparison.component.html',
  styleUrl: './dashboard-comparison.component.scss'
})
export class DashboardComparisonComponent implements OnInit, OnDestroy {

  selectedYear = 2023;
  previousYear = 2022;

  data: any[] = [];

  kpis = {
    totalWeight: { current: 0, previous: 0 },
    totalTrips: { current: 0, previous: 0 },
    avgDailyWeight: { current: 0, previous: 0 },
    efficiency: { current: 0, previous: 0 }
  };

  monthlyComparisonChartOptions!: any;
  public quarterlyComparisonChartOptions: any;
  public yoyGrowthChartOptions: any;

  private destroy$ = new Subject<void>()

  isLoading = true
  isRefreshing = false
  isExporting = false


  filtersCollapsed = false
  sidebarCollapsed = false

  globalTimeRange = "day"

  selectedAgency = ""
  availableAgencies: string[] = []

  availableWards: string[] = []
  availableVehicleTypes: string[] = []

  selectedWard = ""
  selectedVehicleType = ""

  customDateFrom = ""
  customDateTo = ""
  showCustomDateRange = false





  // Store raw site data
  swmSites: any[] = []
  rtsSites: any[] = []

  isLoadingComparison = false
  selectedComparisonYear = new Date().getFullYear()
  availableYears: number[] = []
  filteredPreviousYears: number[] = [];

  historicalData: HistoricalRecord[] = []

  constructor(private dashboardService: DbCallingService, private cdr: ChangeDetectorRef) { }

    @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    this.updateChartResponsiveness()
  }
  ngOnDestroy(): void {
    // Clean up subscriptions to avoid memory leaks
    this.destroy$.next();
    this.destroy$.complete();
  }
  ngOnInit(): void {
    this.initializeAvailableYears();
    this.loadDashboard();

    // Default selection
    this.selectedYear = Math.max(...this.availableYears);
    this.updatePreviousYearOptions();
        this.updateChartResponsiveness()
  }
  private initializeAvailableYears(): void {
    const currentYear = new Date().getFullYear()
    this.availableYears = []
    for (let i = currentYear; i >= currentYear - 5; i--) {
      this.availableYears.push(i)
    }
  }
  /* =============================
   When Selected Year Changes
============================= */
  onSelectedYearChange() {
    this.updatePreviousYearOptions();

    // Auto-fix previousYear if invalid
    if (this.previousYear >= this.selectedYear) {
      this.previousYear = this.filteredPreviousYears.at(-1)!;
    }

    this.loadDashboard();
  }

  /* =============================
     Update Previous Year Options
  ============================= */
  updatePreviousYearOptions() {
    this.filteredPreviousYears = this.availableYears.filter(
      y => Number(y) < Number(this.selectedYear)
    );
    console.log('Filtered Previous Years:', this.filteredPreviousYears);
    // Default previous year (latest valid)
    if (!this.previousYear && this.filteredPreviousYears.length) {
      this.previousYear = this.filteredPreviousYears.at(-1)!;
    }
  }
  getProgressWidth(current: number, previous: number): number {
    const max = Math.max(current, previous)
    if (max === 0) return 0
    return Math.min((current / max) * 100, 100)
  }

  safePercentChange(current: number, previous: number): number {
    if (!previous || previous === 0) {
      return previous === 0 && current === 0 ? 0 : 100 * (current - previous) / (previous === 0 ? 1 : previous)
    }
    return Number((((current - previous) / previous) * 100).toFixed(2))
  }
  loadDashboard() {
    const filters = {
      UserId: 1,
      SiteName: null,
      WardName: null,
      Agency: null,
      VehicleType: null,
      FromDate: '2022-01-01',
      ToDate: '2025-12-31'
    };

    this.dashboardService.getDashboardMonthlySummary(filters)
      .subscribe(res => {
        console.log('Dashboard Monthly Summary Data:', res);
        this.data = res.data;
        this.prepareKPIs();
        this.prepareMonthlyChart();
        this.prepareQuarterlyTripsChart();
        this.prepareYoYGrowthChart();
        this.prepareTableData();
        this.isLoadingComparison = false;
        this.cdr.detectChanges();

      });
  }
  prepareKPIs() {

    const currentYearData = this.data.filter(x => Number(x.summaryYear) === Number(this.selectedYear));
    const previousYearData = this.data.filter(x => Number(x.summaryYear) === Number(this.previousYear));

    const sumWeight = (arr: any[]) =>
      arr.reduce((a, b) => a + b.totalNetWeight, 0);
    
    const sumTrips = (arr: any[]) =>
      arr.reduce((a, b) => a + b.tripsCount, 0);

    this.kpis.totalWeight.current = sumWeight(currentYearData);
    this.kpis.totalWeight.previous = sumWeight(previousYearData);

    this.kpis.totalTrips.current = sumTrips(currentYearData);
    this.kpis.totalTrips.previous = sumTrips(previousYearData);

    const daysInYear = 365;

    this.kpis.avgDailyWeight.current =
      this.kpis.totalWeight.current / daysInYear;

    this.kpis.avgDailyWeight.previous =
      this.kpis.totalWeight.previous / daysInYear;

    this.kpis.efficiency.current =
      this.kpis.totalTrips.current > 0
        ? this.kpis.totalWeight.current / this.kpis.totalTrips.current
        : 0;

    this.kpis.efficiency.previous =
      this.kpis.totalTrips.previous > 0
        ? this.kpis.totalWeight.previous / this.kpis.totalTrips.previous
        : 0;

    console.log('KPIs:', this.kpis);
  }
  prepareMonthlyChart() {

    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const yearData = (year: number) =>
      months.map(m =>
        this.data
          .filter(x => Number(x.summaryYear) === year && Number(x.summaryMonth) === m)
          .reduce((a, b) => a + b.totalNetWeight, 0)
      );

    this.monthlyComparisonChartOptions = {
      series: [
        { name: `${this.selectedYear}`, data: yearData(Number(this.selectedYear)) },
        { name: `${this.previousYear}`, data: yearData(Number(this.previousYear)) }
      ],
      chart: {
        type: 'bar',
        height: 300,
        toolbar: { show: true }
      },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      legend: { position: 'top' },
      xaxis: {
        categories: [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ]
      },
      tooltip: {
        y: {
          formatter: (val: any) => `${val.toFixed(2)} MT`
        }
      }
    };
  }
  prepareSiteWiseCards() {
    const siteData = (site: string, year: number) =>
      this.data.filter(x => x.siteName === site && x.summaryYear === year);
  }
  /* ================= Quarterly Trips ================= */

  prepareQuarterlyTripsChart() {
    const quarters = [1, 2, 3, 4];
    console.log('Preparing Quarterly Trips Chart with data:', this.data);
    const tripsByQuarter = (year: number) =>
      quarters.map(q =>
        this.data
          .filter(x =>
            Number(x.summaryYear) === year &&
            Math.ceil(Number(x.summaryMonth) / 3) === q
          )
          .reduce((a, b) => a + b.tripsCount, 0)
      );

    this.quarterlyComparisonChartOptions = {
      series: [
        { name: `${this.selectedYear}`, data: tripsByQuarter(Number(this.selectedYear)) },
        { name: `${this.previousYear}`, data: tripsByQuarter(Number(this.previousYear)) }
      ],
      chart: {
        type: 'bar',
        height: 280
      },
      plotOptions: {
        bar: {
          columnWidth: '45%',
          borderRadius: 6
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Q1', 'Q2', 'Q3', 'Q4']
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val} Trips`
        }
      }
    };
  }

  /* ================= YoY Growth ================= */

  prepareYoYGrowthChart() {
    console.log('Preparing YoY Growth Chart with data:', this.data);
    const totalWeight = (year: number) =>
      this.data
        .filter(x => Number(x.summaryYear) === year)
        .reduce((a, b) => a + b.totalNetWeight, 0);

    const totalTrips = (year: number) =>
      this.data
        .filter(x => Number(x.summaryYear) === year)
        .reduce((a, b) => a + b.tripsCount, 0);

    const weightGrowth =
      this.calculateGrowth(totalWeight(Number(this.selectedYear)), totalWeight(Number(this.previousYear)));
    const tripsGrowth =
      this.calculateGrowth(totalTrips(Number(this.selectedYear)), totalTrips(Number(this.previousYear)));

    this.yoyGrowthChartOptions = {
      series: [
        {
          name: 'Growth %',
          data: [weightGrowth, tripsGrowth]
        }
      ],
      chart: {
        type: 'bar',
        height: 280
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '40%',
          borderRadius: 6
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(2)}%`
      },
      xaxis: {
        categories: ['Weight Growth (%)', 'Trips Growth (%)']
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val.toFixed(2)} %`
        }
      }
    };
  }

  calculateGrowth(current: number, previous: number): number {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  }

  prepareTableData() {
    this.historicalData = [];
    const years = [...new Set(this.data.map(x => x.summaryYear))].sort();

    const yearlyStats = years.map(year => {
      const yearData = this.data.filter(x => x.summaryYear === year);

      const totalWeight = yearData.reduce((a, b) => a + b.totalNetWeight, 0);
      const totalTrips = yearData.reduce((a, b) => a + b.tripsCount, 0);

      const daysInYear = 365;
      const avgDaily = totalWeight / daysInYear;

      const efficiency = totalTrips > 0
        ? totalWeight / totalTrips
        : 0;

      return {
        year,
        totalWeight,
        totalTrips,
        avgDaily,
        efficiency,
        yoyChange: 0 // calculate later
      };
    });

    // YoY Change
    for (let i = 1; i < yearlyStats.length; i++) {
      yearlyStats[i].yoyChange =
        this.calculateGrowth(
          yearlyStats[i].totalWeight,
          yearlyStats[i - 1].totalWeight
        );
    }

    this.historicalData = yearlyStats.reverse(); // latest year on top
    console.log('Prepared Historical Data:', this.historicalData);
  }
 private updateChartResponsiveness(): void {
    const isMobile = window.innerWidth < 768

    // Adjust Donut Chart
    // if (this.vehicleChartOptions.chart) {
    //   this.vehicleChartOptions.chart.height = isMobile ? 300 : 350
    // }

    // Adjust Bar Charts
    const barCharts = [
     // this.capacityVsActualChartOptions,
      this.monthlyComparisonChartOptions,
      this.quarterlyComparisonChartOptions,
      this.yoyGrowthChartOptions,
    ]

    barCharts.forEach((opt) => {
      if (opt.chart) opt.chart.height = isMobile ? 280 : 350
      if (opt.plotOptions?.bar) {
        opt.plotOptions.bar.columnWidth = isMobile ? "80%" : "60%"
      }
    })

    this.cdr.detectChanges()
  }

}

