import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core"
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

export type PieChartOptions = {
  series: number[]
  chart: ApexChart
  labels: string[]
  colors: string[]
  legend: ApexLegend
  plotOptions: ApexPlotOptions
  dataLabels: ApexDataLabels
  responsive: ApexResponsive[]
  stroke?: ApexStroke
}

@Component({
  selector: "app-dashboard2",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, FormsModule],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>()

  isLoading = true
  isRefreshing = false
  isExporting = false

  activeSection: "overview" | "performance" | "analytics" | "reports" = "overview"
  filtersCollapsed = false
  sidebarCollapsed = false

  globalTimeRange = "day"

  selectedAgency = ""
  availableAgencies: string[] = ["Agency A", "Agency B", "Agency C"]

  availableWards: string[] = []
  availableVehicleTypes: string[] = ["COMPACTOR", "MINI COMPACTOR", "DUMPER", "TEMPO", "BIG DUMPER"]

  selectedWard = ""
  selectedVehicleType = ""

  // Timeframe metrics
  timeMetrics = {
    year: 0,
    month: 0,
    week: 0,
    lastDay: 0,
    today: new Date(),
    todayWeight: 0,
  }

  last30DaysMetrics = {
    cumulativeWeight: 0,
    averageWardWeight: 0,
  }

  kanjurData = {
    trips: 0,
    netWeight: 0,
  }

  deonarData = {
    trips: 0,
    netWeight: 0,
  }

  totalData = {
    trips: 0,
    netWeight: 0,
  }

  unifiedData = {
    grts: 0,
    mrts: 0,
    vrts: 0,
  }

  // Store raw site data
  swmSites: any[] = []
  rtsSites: any[] = []

  // Chart colors
  private primaryColor = "#1a2a6c"
  private secondaryColor = "#b21f1f"
  private accentColor = "#00ffcc"
  private successColor = "#10b981"
  private warningColor = "#f59e0b"

  // Trip Distribution (Kanjur vs Deonar) donut
  public vehicleChartOptions: PieChartOptions = {
    series: [],
    chart: {
      type: "donut",
      height: 350,
      fontFamily: "Raleway, sans-serif",
    },
    labels: ["Kanjur", "Deonar"],
    colors: [this.primaryColor, this.secondaryColor],
    legend: {
      position: "bottom",
    },
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Trips",
              formatter: (w: any) => {
                try {
                  return (w?.globals?.seriesTotals || []).reduce((a: number, b: number) => a + b, 0).toString()
                } catch {
                  return "0"
                }
              },
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts?: any) => {
        try {
          const totals = opts?.w?.globals?.seriesTotals || []
          const total = totals.reduce((a: number, b: number) => a + b, 0) || 0
          if (total === 0) return "0%"
          const idx = opts?.seriesIndex ?? 0
          const value = opts.w.config.series[idx] ?? 0
          const pct = Math.round((value / total) * 100)
          return `${pct}%`
        } catch {
          return `${Math.round(val)}%`
        }
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 300,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
  }

  // Vehicle Capacity vs Actual (bar with two series)
  public capacityVsActualChartOptions: ChartOptions = {
    series: [],
    chart: {
      type: "bar",
      height: 350,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: [],
    },
    yaxis: {
      title: {
        text: "Weight (MT)",
      },
    },
    fill: {
      opacity: 1,
    },
    colors: [this.primaryColor, this.successColor],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      position: "top",
    },
  }

  // Generic ward chart
  public wardChartOptions: ChartOptions = {
    series: [],
    chart: { type: "bar", height: 350 },
    xaxis: { categories: [] },
    yaxis: { title: { text: "Weight" } },
    dataLabels: { enabled: false },
    plotOptions: { bar: { horizontal: false } },
    colors: [this.primaryColor],
    grid: { borderColor: "#e5e7eb" },
    legend: { show: false },
  }

  constructor(
    private dbCallingService: DbCallingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData()
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  /**
   * Load all dashboard data
   */
  loadDashboardData(): void {
    this.isLoading = true

    // Use moment to set today's date
    this.timeMetrics.today = moment().toDate()

    const wbSummaryPayload = {
      DateFrom: moment().format("YYYY-MM-DD"),
      UserId: Number(sessionStorage.getItem("UserId")) || 0,
    }

    const cumulativePayload = {
      UserId: Number(sessionStorage.getItem("UserId")) || 0,
      FromDate: null,
      ToDate: null,
      SiteName: "SWM",
    }

    const wardwisePayload = {
      WeighBridge: "",
      FromDate: moment().format("YYYY-MM-DD"),
      ToDate: "",
      FullDate: "",
      WardName: this.selectedWard || "",
      Act_Shift: "",
      TransactionDate: moment().format("YYYY-MM-DD"),
    }

    const wb$ = this.safeCall(() => this.dbCallingService.GetWBTripSummary(wbSummaryPayload))
    const cum$ = this.safeCall(() => this.dbCallingService.getCumulativeTripSummary(cumulativePayload))
    const ward$ = this.safeCall(() => this.dbCallingService.getWardwiseReport(wardwisePayload))

    forkJoin({ wbSummary: wb$, cumulative: cum$, wardwise: ward$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ wbSummary, cumulative, wardwise }) => {
          try {
            this.processWBTripSummary(wbSummary)
          } catch (err) {
            console.error("processWBTripSummary error:", err)
          }

          try {
            this.processCumulativeSummary(cumulative)
          } catch (err) {
            console.error("processCumulativeSummary error:", err)
          }

          try {
            this.processWardwiseReport(wardwise)
          } catch (err) {
            console.error("processWardwiseReport error:", err)
          }

          this.updateCharts()
          this.isLoading = false
          this.cdr.detectChanges()
        },
        error: (err) => {
          console.error("forkJoin error:", err)
          this.isLoading = false
        },
      })
  }

  private safeCall(fn: () => Observable<any> | null): Observable<any> {
    try {
      const obs = fn()
      return obs ?? of(null)
    } catch (e) {
      console.error("safeCall caught:", e)
      return of(null)
    }
  }

  /**
   * Process GetWBTripSummary response - FIXED to match old dashboard logic
   */
  private processWBTripSummary(response: any): void {
    if (!response || !response.data) {
      console.warn("No WB Trip Summary data received")
      return
    }

    const data = response.data

    // Store raw site arrays
    this.swmSites = Array.isArray(data.swmSites) ? data.swmSites : []
    this.rtsSites = Array.isArray(data.rtsSites) ? data.rtsSites : []

    console.log("SWM Sites:", this.swmSites)
    console.log("RTS Sites:", this.rtsSites)

    // Process Kanjur and Deonar from both SWM and RTS sites
    let kanjurTrips = 0
    let kanjurWeight = 0
    let deonarTrips = 0
    let deonarWeight = 0

    // Process SWM sites
    this.swmSites.forEach((site) => {
      const siteName = (site.siteName || "").toLowerCase()
      const trips = Number(site.vehicleCount || 0)
      const weight = Number(site.netWeight || 0)

      if (siteName.includes("kanjur")) {
        kanjurTrips += trips
        kanjurWeight += weight
      } else if (siteName.includes("deonar")) {
        deonarTrips += trips
        deonarWeight += weight
      }
    })

    // Process RTS sites
    this.rtsSites.forEach((site) => {
      const siteName = (site.siteName || "").toLowerCase()
      const trips = Number(site.vehicleCount || 0)
      const weight = Number(site.netWeight || 0)

      if (siteName.includes("kanjur")) {
        kanjurTrips += trips
        kanjurWeight += weight
      } else if (siteName.includes("deonar")) {
        deonarTrips += trips
        deonarWeight += weight
      }
    })

    this.kanjurData = {
      trips: kanjurTrips,
      netWeight: Number(kanjurWeight.toFixed(2)),
    }

    this.deonarData = {
      trips: deonarTrips,
      netWeight: Number(deonarWeight.toFixed(2)),
    }

    // Process VRTS, MRTS, GRTS from RTS sites
    let vrtsWeight = 0
    let mrtsWeight = 0
    let grtsWeight = 0

    this.rtsSites.forEach((site) => {
      const siteName = (site.siteName || "").toLowerCase()
      const weight = Number(site.netWeight || 0)

      if (siteName.includes("vrts") || siteName.includes("v-rts")) {
        vrtsWeight += weight
      } else if (siteName.includes("mrts") || siteName.includes("m-rts")) {
        mrtsWeight += weight
      } else if (siteName.includes("grts") || siteName.includes("g-rts")) {
        grtsWeight += weight
      }
    })

    this.unifiedData = {
      vrts: Number(vrtsWeight.toFixed(2)),
      mrts: Number(mrtsWeight.toFixed(2)),
      grts: Number(grtsWeight.toFixed(2)),
    }

    // Calculate totals from all sites
    const allSites = [...this.swmSites, ...this.rtsSites]
    const totalTrips = allSites.reduce((sum, site) => sum + Number(site.vehicleCount || 0), 0)
    const totalWeight = allSites.reduce((sum, site) => sum + Number(site.netWeight || 0), 0)

    this.totalData = {
      trips: totalTrips,
      netWeight: Number(totalWeight.toFixed(2)),
    }

    console.log("Processed Data:", {
      kanjur: this.kanjurData,
      deonar: this.deonarData,
      unified: this.unifiedData,
      total: this.totalData,
    })
  }

  /**
   * Process getCumulativeTripSummary response
   */
  private processCumulativeSummary(response: any): void {
    if (!response) return

    const payload = response.data ?? response

    if (Array.isArray(payload) && payload.length > 0) {
      const map = new Map<string, number>()
      payload.forEach((item: any) => {
        if (!item) return
        const key = (item.timeframe ?? item.period ?? item.key ?? item.name ?? "").toString().toLowerCase()
        const val = Number(item.value ?? item.amount ?? item.weight ?? item.netWeight ?? item.count ?? item.total ?? 0)
        if (key) map.set(key, val)
        if (item.today != null) map.set("today", Number(item.today))
        if (item.lastDay != null) map.set("lastday", Number(item.lastDay))
        if (item.week != null) map.set("week", Number(item.week))
      })

      this.timeMetrics.todayWeight = map.get("today") ?? map.get("todays") ?? 0
      this.timeMetrics.lastDay = map.get("lastday") ?? map.get("yesterday") ?? 0
      this.timeMetrics.week = map.get("week") ?? map.get("thisweek") ?? 0
      this.timeMetrics.month = map.get("month") ?? map.get("thismonth") ?? 0
      this.timeMetrics.year = map.get("year") ?? 0

      this.last30DaysMetrics.cumulativeWeight = Number(map.get("last30daystotal") ?? map.get("last30days") ?? 0)
      this.last30DaysMetrics.averageWardWeight = Number(map.get("avgwardweight30days") ?? map.get("averagewardweight") ?? 0)

      return
    }

    const d = payload as any
    const getN = (k: any) => (k == null ? 0 : Number(k))

    this.timeMetrics.todayWeight = getN(d.today ?? d.Today ?? d.todays ?? d.todayMT ?? 0)
    this.timeMetrics.lastDay = getN(d.lastDay ?? d.LastDay ?? d.yesterday ?? d.last_day ?? 0)
    this.timeMetrics.week = getN(d.week ?? d.thisWeek ?? d.this_week ?? d.weekly ?? 0)
    this.timeMetrics.month = getN(d.month ?? d.thisMonth ?? d.this_month ?? d.monthly ?? 0)
    this.timeMetrics.year = getN(d.year ?? d.thisYear ?? d.yearly ?? 0)

    this.last30DaysMetrics.cumulativeWeight = getN(d.last30DaysTotal ?? d.last30DaysTotalWeight ?? d.last30 ?? d.last30Total ?? 0)
    this.last30DaysMetrics.averageWardWeight = getN(d.averageWardWeight ?? d.avgWardWeight ?? d.avgWardWeight30Days ?? 0)
  }

  /**
   * Process wardwise report
   */
  private processWardwiseReport(response: any): void {
    if (!response) return

    const wardData = Array.isArray(response.wardData) ? response.wardData : Array.isArray(response.data) ? response.data : []

    if (!wardData || wardData.length === 0) return

    this.availableWards = Array.from(
      new Set(wardData.map((w: any) => w.wardName ?? w.WardName ?? w.ward ?? "Unknown"))
    )

    const categories: string[] = []
    const capacitySeries: number[] = []
    const actualSeries: number[] = []
    const vehicleCounts: number[] = []
    const weightSeries: number[] = []

    wardData.forEach((w: any) => {
      const wardName = (w.wardName ?? w.WardName ?? w.ward ?? "Unknown").toString()
      const capacity = Number(w.vehicleCapacity ?? w.capacity ?? w.maxCapacity ?? w.vehicle_capacity ?? 0)
      const actual = Number(w.actualWeight ?? w.actualWeightMT ?? w.totalNetWeight ?? w.netWeight ?? w.totalWeight ?? 0)
      const vehicles = Number(w.vehicleCount ?? w.vehicles ?? 0)
      const weight = Number(w.totalNetWeight ?? w.netWeight ?? w.totalWeight ?? 0)

      categories.push(wardName)
      capacitySeries.push(Number(isFinite(capacity) ? capacity : 0))
      actualSeries.push(Number(isFinite(actual) ? actual : 0))
      vehicleCounts.push(Number(isFinite(vehicles) ? vehicles : 0))
      weightSeries.push(Number(isFinite(weight) ? weight : 0))
    })

    const anyCapacity = capacitySeries.some((v) => v > 0)
    if (!anyCapacity) {
      for (let i = 0; i < capacitySeries.length; i++) {
        capacitySeries[i] = vehicleCounts[i] * 6
      }
    }

    this.capacityVsActualChartOptions = {
      ...this.capacityVsActualChartOptions,
      series: [
        { name: "Vehicle Capacity", data: capacitySeries.map((v) => Number(v.toFixed(2))) },
        { name: "Actual Weight", data: actualSeries.map((v) => Number(v.toFixed(2))) },
      ],
      xaxis: { categories },
    }

    this.wardChartOptions = {
      ...this.wardChartOptions,
      series: [
        { name: "Trips", data: vehicleCounts },
        { name: "Weight (MT)", data: weightSeries },
      ],
      xaxis: { categories },
    }

    const totalWeight = weightSeries.reduce((a, b) => a + (Number(b) || 0), 0)
    const wardCount = categories.length || 1
    this.last30DaysMetrics.cumulativeWeight = Number(totalWeight.toFixed(2))
    this.last30DaysMetrics.averageWardWeight = Number((totalWeight / wardCount).toFixed(2))
  }

  /**
   * Update charts
   */
  private updateCharts(): void {
    this.vehicleChartOptions = {
      ...this.vehicleChartOptions,
      series: [Number(this.kanjurData.trips || 0), Number(this.deonarData.trips || 0)],
      labels: ["Kanjur", "Deonar"],
      colors: [this.primaryColor, this.secondaryColor],
    }

    if (
      !Array.isArray(this.capacityVsActualChartOptions.series) ||
      this.capacityVsActualChartOptions.series.length === 0
    ) {
      this.capacityVsActualChartOptions = {
        ...this.capacityVsActualChartOptions,
        series: [
          { name: "Vehicle Capacity", data: [0] },
          { name: "Actual Weight", data: [0] },
        ],
        xaxis: { categories: ["No data"] },
      }
    }
  }

  refreshAllData(): void {
    this.isRefreshing = true
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
  }

  clearAllFilters(): void {
    this.globalTimeRange = "day"
    this.selectedWard = ""
    this.selectedAgency = ""
    this.selectedVehicleType = ""
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
  }

  switchSection(section: "overview" | "performance" | "analytics" | "reports"): void {
    this.activeSection = section
  }

  scrollToSection(sectionId: string): void {
    const el = document.getElementById(sectionId + "-section")
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  drillDownMetric(metricType: string): void {
    console.log("Drilling down into", metricType)
  }
}