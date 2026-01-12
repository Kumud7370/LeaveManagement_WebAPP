import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { NgApexchartsModule } from "ng-apexcharts"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { Subject, takeUntil, forkJoin, of, type Observable } from "rxjs"
import moment from "moment"
import { DashboardAnalyticsComponent } from "./dashboard-analytics/dashboard-analytics.component"
import { DashboardComparisonComponent } from "./dashboard-comparison/dashboard-comparison.component"

@Component({
  selector: "app-dashboard2",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, FormsModule, DashboardAnalyticsComponent, DashboardComparisonComponent],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>()
  searchParams: any;
  isLoading = true
  isRefreshing = false
  isExporting = false

  activeSection: "overview" | "performance" | "analytics" | "reports" = "overview"
  filtersCollapsed = false
  sidebarCollapsed = false

  globalTimeRange = "day"
  selectedWard = ""
  selectedVehicleType = ""
  selectedAgency = ""
  availableAgencies: string[] = []
  availableWards: string[] = []
  availableVehicleTypes: string[] = []

  customDateFrom = ""
  customDateTo = ""
  showCustomDateRange = false

  timeMetrics = {
    year: 0,
    month: 0,
    week: 0,
    lastDay: 0,
    today: new Date(),
    todayWeight: 0,
  }

  kanjurData = { trips: 0, netWeight: 0 }
  deonarData = { trips: 0, netWeight: 0 }
  totalData = { trips: 0, netWeight: 0 }
  mrtswardData = { trips: 0, netWeight: 0 }
  grtswardData = { trips: 0, netWeight: 0 }
  vrtswardData = { trips: 0, netWeight: 0 }
  wardTotalData = { trips: 0, netWeight: 0 }

  swmOverallKpis: any;
  rtsWardOverallKpis: any;
  analyticsData: any;
  wardwiseChartOptions: any;

  constructor(
    private dbCallingService: DbCallingService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.initializeCustomDateRange()
    this.loadFiltersFromAPI()
    this.loadDashboardData()
    this.updateChartResponsiveness()
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    this.updateChartResponsiveness()
  }

  private initializeCustomDateRange(): void {
    const today = moment()
    this.customDateTo = today.format("YYYY-MM-DD")
    this.customDateFrom = today.subtract(7, "days").format("YYYY-MM-DD")
  }

  private loadFiltersFromAPI(): void {
    const userId = Number(sessionStorage.getItem("UserId")) || 0

    const wards$ = this.safeCall(() => this.dbCallingService.getWards({ UserId: userId }))
    const vehicleTypes$ = this.safeCall(() => this.dbCallingService.getVehicleTypes({ UserId: userId }))
    const agencies$ = this.safeCall(() => this.dbCallingService.GetAgencies({ UserId: userId }))

    forkJoin({ wards: wards$, vehicleTypes: vehicleTypes$, agencies: agencies$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ wards, vehicleTypes, agencies }) => {
          if (wards) {
            const wardData = Array.isArray(wards) ? wards : wards.data || wards.WardData || wards.wards || []
            this.availableWards = wardData
              .map((w: any) => w.wardName || w.WardName || w.name || w.Ward || "")
              .filter((name: string) => name !== "")
            this.availableWards = [...new Set(this.availableWards)]
          }

          if (vehicleTypes) {
            const vtData = Array.isArray(vehicleTypes)
              ? vehicleTypes
              : vehicleTypes.data || vehicleTypes.VehicleData || vehicleTypes.vehicleTypes || []
            this.availableVehicleTypes = vtData
              .map(
                (v: any) =>
                  v.vehicleType || v.vehicleTypeName || v.VehicleTypeName || v.VehicleType || v.name || v.type || "",
              )
              .filter((name: string) => name !== "")
            this.availableVehicleTypes = [...new Set(this.availableVehicleTypes)]
          }

          if (agencies) {
            const agencyData = Array.isArray(agencies)
              ? agencies
              : agencies.data || agencies.agencies || agencies.AgencyData || []
            this.availableAgencies = agencyData
              .map((a: any) => a.agencyName || a.AgencyName || a.name || a.Agency || "")
              .filter((name: string) => name !== "")
            this.availableAgencies = [...new Set(this.availableAgencies)]
          }

          this.cdr.detectChanges()
        },
        error: (err) => {
          console.error("Error loading filters:", err)
        },
      })
  }

  onTimeRangeChange(): void {
    this.showCustomDateRange = this.globalTimeRange === "custom"
    if (this.globalTimeRange !== "custom") {
      this.onGlobalFilterChange()
    }
  }

  applyCustomDateRange(): void {
    if (this.customDateFrom && this.customDateTo) {
      this.onGlobalFilterChange()
    }
  }

  private getDateRange(): { fromDate: string; toDate: string } {
    const today = moment()
    let fromDate: string
    let toDate: string = today.format("YYYY-MM-DD")

    switch (this.globalTimeRange) {
      case "day":
        fromDate = today.format("YYYY-MM-DD")
        break
      case "week":
        fromDate = today.clone().startOf("week").format("YYYY-MM-DD")
        break
      case "month":
        fromDate = today.clone().startOf("month").format("YYYY-MM-DD")
        break
      case "year":
        fromDate = today.clone().startOf("year").format("YYYY-MM-DD")
        break
      case "custom":
        fromDate = this.customDateFrom || today.format("YYYY-MM-DD")
        toDate = this.customDateTo || today.format("YYYY-MM-DD")
        break
      default:
        fromDate = today.format("YYYY-MM-DD")
    }

    return { fromDate, toDate }
  }

  loadDashboardData(): void {
    this.isLoading = true
    this.timeMetrics.today = moment().toDate()

    const { fromDate, toDate } = this.getDateRange()
    const userId = Number(sessionStorage.getItem("UserId")) || 0

    let analyticsPayload = {
      UserId: userId || null,
      SiteName: "SWM",
      WardName: this.selectedWard || null,
      Agency: this.selectedAgency || null,
      VehicleType: this.selectedVehicleType || null,
      FromDate: fromDate,
      ToDate: toDate
    }
    
    this.searchParams = analyticsPayload;

    this.dbCallingService.getDashboardOverallKpis().subscribe({
      next: (res) => {
        const data = res.data;
        this.swmOverallKpis = data.find((kpi: any) => kpi.siteName === 'SWM') || {};
        this.rtsWardOverallKpis = data.find((kpi: any) => kpi.siteName === 'RTS-WARD') || {};
      }
    });

    this.dbCallingService.getDashboardAnalyticsSummary(analyticsPayload).subscribe({
      next: (res) => {
        this.analyticsData = res.data;
        const swmData = res.data;

        const kanjurTotal = swmData
          .filter((x: any) => x.siteName === 'Kanjur')
          .reduce((sum: number, cur: any) => sum + (cur.totalNetWeight || 0), 0);
        const kanjurTotalTrips = swmData
          .filter((x: any) => x.siteName === 'Kanjur')
          .length;

        const deonarTotal = swmData
          .filter((x: any) => x.siteName === 'Deonar')
          .reduce((sum: number, cur: any) => sum + (cur.totalNetWeight || 0), 0);
        const deonarTotalTrips = swmData
          .filter((x: any) => x.siteName === 'Deonar')
          .length;

        this.kanjurData.trips = kanjurTotalTrips;
        this.kanjurData.netWeight = kanjurTotal;
        this.deonarData.trips = deonarTotalTrips;
        this.deonarData.netWeight = deonarTotal;
        this.totalData.trips = kanjurTotalTrips + deonarTotalTrips;
        this.totalData.netWeight = kanjurTotal + deonarTotal;

        const mrtswardTotal = swmData
          .filter((x: any) => x.siteName === 'MRTS-WARD')
          .reduce((sum: number, cur: any) => sum + (cur.totalNetWeight || 0), 0);
        const mrtswardTotalTrips = swmData
          .filter((x: any) => x.siteName === 'MRTS-WARD')
          .length;

        const grtswardTotal = swmData
          .filter((x: any) => x.siteName === 'GRTS-WARD')
          .reduce((sum: number, cur: any) => sum + (cur.totalNetWeight || 0), 0);
        const grtswardTotalTrips = swmData
          .filter((x: any) => x.siteName === 'GRTS-WARD')
          .length;

        const vrtswardTotal = swmData
          .filter((x: any) => x.siteName === 'VRTS-WARD')
          .reduce((sum: number, cur: any) => sum + (cur.totalNetWeight || 0), 0);
        const vrtswardTotalTrips = swmData
          .filter((x: any) => x.siteName === 'VRTS-WARD')
          .length;

        this.mrtswardData.trips = mrtswardTotalTrips;
        this.mrtswardData.netWeight = mrtswardTotal;
        this.grtswardData.trips = grtswardTotalTrips;
        this.grtswardData.netWeight = grtswardTotal;
        this.vrtswardData.trips = vrtswardTotalTrips;
        this.vrtswardData.netWeight = vrtswardTotal;
        this.wardTotalData.trips = mrtswardTotalTrips + grtswardTotalTrips + vrtswardTotalTrips;
        this.wardTotalData.netWeight = mrtswardTotal + grtswardTotal + vrtswardTotal;
        
        this.prepareWardwiseChart(res.data);
      }
    });
  }

  prepareWardwiseChart(data: any[]): void {
    const swmWardwiseChartData = data.filter(
      (x: any) => x.siteName === 'Kanjur' || x.siteName === 'Deonar'
    );

    const grouped = swmWardwiseChartData.reduce((acc: any, cur: any) => {
      if (!acc[cur.ward]) {
        acc[cur.ward] = {
          totalNetWeight: 0,
          avgNetWeightPerDay: 0
        };
      }
      acc[cur.ward].totalNetWeight += cur.totalNetWeight || 0;
      acc[cur.ward].avgNetWeightPerDay += cur.avgNetWeightPerDay || 0;
      return acc;
    }, {});

    const wards = Object.keys(grouped);
    const totalValues = wards.map(w => +grouped[w].totalNetWeight.toFixed(2));
    const avgLineData = wards.map(w => +grouped[w].avgNetWeightPerDay.toFixed(2));

    this.wardwiseChartOptions = {
      series: [
        {
          name: 'Total Net Weight (MT)',
          type: 'bar',
          data: totalValues
        },
        {
          name: 'Avg Net Weight / Day (MT)',
          type: 'line',
          data: avgLineData
        }
      ],
      chart: {
        type: 'line',
        height: 360,
        toolbar: { show: false }
      },
      stroke: {
        width: [0, 3],
        curve: 'smooth'
      },
      plotOptions: {
        bar: {
          columnWidth: '45%',
          borderRadius: 6
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: wards
      },
      yaxis: [
        {
          title: { text: 'Total Net Weight (MT)' },
          labels: {
            formatter: (val: number) => val.toFixed(2)
          }
        },
        {
          opposite: true,
          title: { text: 'Avg Net Weight / Day (MT)' },
          labels: {
            formatter: (val: number) => val.toFixed(2)
          }
        }
      ],
      tooltip: {
        shared: true,
        y: {
          formatter: (val: number) => `${val.toFixed(2)} MT`
        }
      },
      legend: {
        position: 'bottom'
      }
    };

    this.isLoading = false;
  }

  private safeCall(fn: () => Observable<any> | null | undefined): Observable<any> {
    try {
      const obs = fn()
      return obs ?? of(null)
    } catch (e) {
      console.error("safeCall caught:", e)
      return of(null)
    }
  }

  refreshAllData(): void {
    this.isRefreshing = true
    this.loadFiltersFromAPI()
    this.loadDashboardData()
    setTimeout(() => {
      this.isRefreshing = false
    }, 800)
  }

  exportAllData(): void {
    this.isExporting = true
    setTimeout(() => {
      this.isExporting = false
    }, 2000)
  }

  toggleFilters(): void {
    this.filtersCollapsed = !this.filtersCollapsed
    setTimeout(() => window.dispatchEvent(new Event("resize")), 300)
  }

  clearAllFilters(): void {
    this.globalTimeRange = "day"
    this.selectedWard = ""
    this.selectedAgency = ""
    this.selectedVehicleType = ""
    this.showCustomDateRange = false
    this.initializeCustomDateRange()
    this.loadDashboardData()
  }

  getActiveFiltersCount(): number {
    let count = 0
    if (this.globalTimeRange !== "day") count++
    if (this.selectedWard) count++
    if (this.selectedAgency) count++
    if (this.selectedVehicleType) count++
    return count
  }

  onGlobalFilterChange(): void {
    this.loadDashboardData()
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed
    setTimeout(() => window.dispatchEvent(new Event("resize")), 300)
  }

  switchSection(section: "overview" | "performance" | "analytics" | "reports"): void {
    this.activeSection = section
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId + "-section")
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  drillDownMetric(metric: string): void {
    console.log("Drill down to:", metric)
  }

  private updateChartResponsiveness(): void {
    const isMobile = window.innerWidth < 768

    const barCharts = [
      this.wardwiseChartOptions,
    ]

    barCharts.forEach((opt) => {
      if (opt?.chart) opt.chart.height = isMobile ? 280 : 360
      if (opt?.plotOptions?.bar) {
        opt.plotOptions.bar.columnWidth = isMobile ? "80%" : "45%"
      }
    })

    this.cdr.detectChanges()
  }
}