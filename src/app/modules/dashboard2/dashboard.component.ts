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

export interface ComparisonData {
  currentYear: {
    totalWeight: number
    totalTrips: number
    avgDailyWeight: number
    efficiencyRate: number
    monthlyData: number[]
    quarterlyData: number[]
  }
  previousYear: {
    totalWeight: number
    totalTrips: number
    avgDailyWeight: number
    efficiencyRate: number
    monthlyData: number[]
    quarterlyData: number[]
  }
  changes: {
    weightChange: number
    tripsChange: number
    avgDailyChange: number
    efficiencyChange: number
  }
  siteWise: {
    kanjur: {
      currentWeight: number
      previousWeight: number
      currentTrips: number
      previousTrips: number
      weightChange: number
      tripsChange: number
    }
    deonar: {
      currentWeight: number
      previousWeight: number
      currentTrips: number
      previousTrips: number
      weightChange: number
      tripsChange: number
    }
  }
}

export interface HistoricalRecord {
  year: number
  totalWeight: number
  totalTrips: number
  avgDaily: number
  efficiency: number
  yoyChange: number
}

export interface WardAnalytics {
  wardName: string
  trips: number
  netWeight: number
  avgWeight: number
  capacity: number
  utilization: number
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
  availableAgencies: string[] = []

  availableWards: string[] = []
  availableVehicleTypes: string[] = []

  selectedWard = ""
  selectedVehicleType = ""

  customDateFrom = ""
  customDateTo = ""
  showCustomDateRange = false

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

  deonarAnalytics: WardAnalytics[] = []
  kanjurAnalytics: WardAnalytics[] = []
  overallAnalytics = {
    totalTrips: 0,
    totalWeight: 0,
    avgDailyWeight: 0,
    capacityUtilization: 0,
  }

  // Store raw site data
  swmSites: any[] = []
  rtsSites: any[] = []

  isLoadingComparison = false
  selectedComparisonYear = new Date().getFullYear()
  availableYears: number[] = []

  comparisonData: ComparisonData = {
    currentYear: {
      totalWeight: 0,
      totalTrips: 0,
      avgDailyWeight: 0,
      efficiencyRate: 0,
      monthlyData: Array(12).fill(0),
      quarterlyData: [0, 0, 0, 0],
    },
    previousYear: {
      totalWeight: 0,
      totalTrips: 0,
      avgDailyWeight: 0,
      efficiencyRate: 0,
      monthlyData: Array(12).fill(0),
      quarterlyData: [0, 0, 0, 0],
    },
    changes: {
      weightChange: 0,
      tripsChange: 0,
      avgDailyChange: 0,
      efficiencyChange: 0,
    },
    siteWise: {
      kanjur: {
        currentWeight: 0,
        previousWeight: 0,
        currentTrips: 0,
        previousTrips: 0,
        weightChange: 0,
        tripsChange: 0,
      },
      deonar: {
        currentWeight: 0,
        previousWeight: 0,
        currentTrips: 0,
        previousTrips: 0,
        weightChange: 0,
        tripsChange: 0,
      },
    },
  }

  historicalData: HistoricalRecord[] = []

  // Chart colors
  private primaryColor = "#1a2a6c"
  private secondaryColor = "#b21f1f"
  private accentColor = "#00ffcc"
  private successColor = "#10b981"
  private warningColor = "#f59e0b"
  private infoColor = "#3b82f6"

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

  public monthlyComparisonChartOptions: ChartOptions = {
    series: [],
    chart: {
      type: "bar",
      height: 350,
      fontFamily: "Raleway, sans-serif",
      toolbar: {
        show: true,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 6,
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
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
    yaxis: {
      title: {
        text: "Weight (MT)",
      },
    },
    fill: {
      opacity: 1,
    },
    colors: [this.primaryColor, this.infoColor],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      position: "top",
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val.toFixed(2)} MT`,
      },
    },
  }

  public quarterlyComparisonChartOptions: ChartOptions = {
    series: [],
    chart: {
      type: "bar",
      height: 350,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "50%",
        borderRadius: 8,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toLocaleString(),
      style: {
        fontSize: "10px",
      },
    },
    xaxis: {
      categories: ["Q1", "Q2", "Q3", "Q4"],
    },
    yaxis: {
      title: {
        text: "Trips",
      },
    },
    colors: [this.successColor, this.warningColor],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      position: "top",
    },
  }

  public yoyGrowthChartOptions: ChartOptions = {
    series: [],
    chart: {
      type: "line",
      height: 350,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    xaxis: {
      categories: [],
    },
    yaxis: {
      title: {
        text: "Growth (%)",
      },
    },
    colors: [this.primaryColor, this.secondaryColor],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      position: "top",
    },
  }

  constructor(private dbCallingService: DbCallingService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeAvailableYears()
    this.initializeCustomDateRange()
    this.loadFiltersFromAPI()
    this.loadDashboardData()
    this.loadComparisonData()
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  private initializeAvailableYears(): void {
    const currentYear = new Date().getFullYear()
    this.availableYears = []
    for (let i = currentYear; i >= currentYear - 5; i--) {
      this.availableYears.push(i)
    }
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

  onComparisonYearChange(): void {
    this.loadComparisonData()
  }

  loadComparisonData(): void {
    this.isLoadingComparison = true

    const year = this.selectedComparisonYear
    const userId = Number(sessionStorage.getItem("UserId")) || 0

    // Build payloads (same as earlier) to fetch wardwise items for current and previous year
    const currentYearPayload = {
      WeighBridge: "",
      FromDate: `${year}-01-01`,
      ToDate: `${year}-12-31`,
      FullDate: "",
      WardName: this.selectedWard || "",
      Act_Shift: "",
      TransactionDate: `${year}-01-01`,
      Agency: this.selectedAgency || "",
      VehicleType: this.selectedVehicleType || "",
    }

    const previousYearPayload = {
      WeighBridge: "",
      FromDate: `${year - 1}-01-01`,
      ToDate: `${year - 1}-12-31`,
      FullDate: "",
      WardName: this.selectedWard || "",
      Act_Shift: "",
      TransactionDate: `${year - 1}-01-01`,
      Agency: this.selectedAgency || "",
      VehicleType: this.selectedVehicleType || "",
    }

    const currentYear$ = this.safeCall(() => this.dbCallingService.getWardwiseReport(currentYearPayload))
    const previousYear$ = this.safeCall(() => this.dbCallingService.getWardwiseReport(previousYearPayload))

    forkJoin({ currentYear: currentYear$, previousYear: previousYear$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ currentYear, previousYear }) => {
          try {
            const currentItems = this.extractWardData(currentYear)
            const previousItems = this.extractWardData(previousYear)

            const currentAggregates = this.aggregateByYearAndMonth(currentItems, year)
            const previousAggregates = this.aggregateByYearAndMonth(previousItems, year - 1)

            // Fill comparisonData deterministically from aggregates
            this.comparisonData.currentYear.monthlyData = currentAggregates.monthlyWeights
            this.comparisonData.previousYear.monthlyData = previousAggregates.monthlyWeights

            this.comparisonData.currentYear.quarterlyData = this.monthsToQuarters(
              this.comparisonData.currentYear.monthlyData,
            )
            this.comparisonData.previousYear.quarterlyData = this.monthsToQuarters(
              this.comparisonData.previousYear.monthlyData,
            )

            this.comparisonData.currentYear.totalWeight = currentAggregates.totalWeight
            this.comparisonData.previousYear.totalWeight = previousAggregates.totalWeight

            this.comparisonData.currentYear.totalTrips = currentAggregates.totalTrips
            this.comparisonData.previousYear.totalTrips = previousAggregates.totalTrips

            this.comparisonData.currentYear.avgDailyWeight =
              this.comparisonData.currentYear.totalWeight / (this.isLeapYear(year) ? 366 : 365)
            this.comparisonData.previousYear.avgDailyWeight =
              this.comparisonData.previousYear.totalWeight / (this.isLeapYear(year - 1) ? 366 : 365)

            this.comparisonData.currentYear.efficiencyRate = this.computeEfficiencyFromItems(currentItems)
            this.comparisonData.previousYear.efficiencyRate = this.computeEfficiencyFromItems(previousItems)

            // site wise
            const kanjurCurrent = this.calculateSiteTotalsFromItems(currentItems, "kanjur")
            const kanjurPrevious = this.calculateSiteTotalsFromItems(previousItems, "kanjur")
            const deonarCurrent = this.calculateSiteTotalsFromItems(currentItems, "deonar")
            const deonarPrevious = this.calculateSiteTotalsFromItems(previousItems, "deonar")

            this.comparisonData.siteWise.kanjur.currentWeight = kanjurCurrent.weight
            this.comparisonData.siteWise.kanjur.previousWeight = kanjurPrevious.weight
            this.comparisonData.siteWise.kanjur.currentTrips = kanjurCurrent.trips
            this.comparisonData.siteWise.kanjur.previousTrips = kanjurPrevious.trips

            this.comparisonData.siteWise.deonar.currentWeight = deonarCurrent.weight
            this.comparisonData.siteWise.deonar.previousWeight = deonarPrevious.weight
            this.comparisonData.siteWise.deonar.currentTrips = deonarCurrent.trips
            this.comparisonData.siteWise.deonar.previousTrips = deonarPrevious.trips

            // percentage changes (deterministic, guarded)
            this.comparisonData.changes.weightChange =
              this.safePercentChange(this.comparisonData.currentYear.totalWeight, this.comparisonData.previousYear.totalWeight)
            this.comparisonData.changes.tripsChange =
              this.safePercentChange(this.comparisonData.currentYear.totalTrips, this.comparisonData.previousYear.totalTrips)
            this.comparisonData.changes.avgDailyChange =
              this.safePercentChange(this.comparisonData.currentYear.avgDailyWeight, this.comparisonData.previousYear.avgDailyWeight)
            this.comparisonData.changes.efficiencyChange =
              this.comparisonData.currentYear.efficiencyRate - this.comparisonData.previousYear.efficiencyRate

            // site-wise percent changes
            this.comparisonData.siteWise.kanjur.weightChange = this.safePercentChange(
              this.comparisonData.siteWise.kanjur.currentWeight,
              this.comparisonData.siteWise.kanjur.previousWeight,
            )
            this.comparisonData.siteWise.kanjur.tripsChange = this.safePercentChange(
              this.comparisonData.siteWise.kanjur.currentTrips,
              this.comparisonData.siteWise.kanjur.previousTrips,
            )
            this.comparisonData.siteWise.deonar.weightChange = this.safePercentChange(
              this.comparisonData.siteWise.deonar.currentWeight,
              this.comparisonData.siteWise.deonar.previousWeight,
            )
            this.comparisonData.siteWise.deonar.tripsChange = this.safePercentChange(
              this.comparisonData.siteWise.deonar.currentTrips,
              this.comparisonData.siteWise.deonar.previousTrips,
            )

            // historical from available years (derived deterministically from API)
            this.generateHistoricalFromYears([currentItems, previousItems])

            this.updateComparisonCharts()
          } catch (err) {
            console.error("Error processing comparison data:", err)
            // reset to zeroed deterministic structure if something goes wrong
            this.resetComparisonData()
            this.updateComparisonCharts()
          } finally {
            this.isLoadingComparison = false
            this.cdr.detectChanges()
          }
        },
        error: (err) => {
          console.error("Error loading comparison data:", err)
          this.resetComparisonData()
          this.updateComparisonCharts()
          this.isLoadingComparison = false
          this.cdr.detectChanges()
        },
      })
  }

  private resetComparisonData(): void {
    this.comparisonData = {
      currentYear: {
        totalWeight: 0,
        totalTrips: 0,
        avgDailyWeight: 0,
        efficiencyRate: 0,
        monthlyData: Array(12).fill(0),
        quarterlyData: [0, 0, 0, 0],
      },
      previousYear: {
        totalWeight: 0,
        totalTrips: 0,
        avgDailyWeight: 0,
        efficiencyRate: 0,
        monthlyData: Array(12).fill(0),
        quarterlyData: [0, 0, 0, 0],
      },
      changes: {
        weightChange: 0,
        tripsChange: 0,
        avgDailyChange: 0,
        efficiencyChange: 0,
      },
      siteWise: {
        kanjur: {
          currentWeight: 0,
          previousWeight: 0,
          currentTrips: 0,
          previousTrips: 0,
          weightChange: 0,
          tripsChange: 0,
        },
        deonar: {
          currentWeight: 0,
          previousWeight: 0,
          currentTrips: 0,
          previousTrips: 0,
          weightChange: 0,
          tripsChange: 0,
        },
      },
    }
  }

  private extractWardData(response: any): any[] {
    if (!response) return []
    return Array.isArray(response.wardData)
      ? response.wardData
      : Array.isArray(response.data)
      ? response.data
      : Array.isArray(response)
      ? response
      : []
  }

  private aggregateByYearAndMonth(items: any[], year: number): { monthlyWeights: number[]; totalWeight: number; totalTrips: number } {
    const monthlyWeights = Array(12).fill(0)
    let totalWeight = 0
    let totalTrips = 0

    items.forEach((it: any) => {
      const parsed = this.parseDateFromItem(it)
      if (!parsed) return
      const d = parsed
      const itemYear = d.getFullYear()
      if (itemYear !== year) return

      const monthIndex = d.getMonth() // 0..11
      const weight = Number(it.totalNetWeight ?? it.netWeight ?? it.totalWeight ?? it.actualWeight ?? 0)
      const trips = Number(it.vehicleCount ?? it.vehicles ?? it.trips ?? 0)

      monthlyWeights[monthIndex] += isFinite(weight) ? weight : 0
      totalWeight += isFinite(weight) ? weight : 0
      totalTrips += isFinite(trips) ? trips : 0
    })

    // ensure numeric and rounded values
    const roundedMonthly = monthlyWeights.map((v) => Number(Number(v).toFixed(2)))
    totalWeight = Number(totalWeight.toFixed(2))
    totalTrips = Math.round(totalTrips)

    return { monthlyWeights: roundedMonthly, totalWeight, totalTrips }
  }

  private parseDateFromItem(item: any): Date | null {
    if (!item) return null

    const candidates = [
      item.TransactionDate,
      item.FullDate,
      item.date,
      item.CreatedDate,
      item.transactionDate,
      item.createdDate,
      item.EntryDate,
      item.entryDate,
    ]

    for (const c of candidates) {
      if (!c && c !== 0) continue
      const s = typeof c === "string" ? c.trim() : c
      if (!s) continue
      const m = moment(s)
      if (m.isValid()) return m.toDate()
    }

    return null
  }

  private monthsToQuarters(months: number[]): number[] {
    const q1 = months.slice(0, 3).reduce((a, b) => a + b, 0)
    const q2 = months.slice(3, 6).reduce((a, b) => a + b, 0)
    const q3 = months.slice(6, 9).reduce((a, b) => a + b, 0)
    const q4 = months.slice(9, 12).reduce((a, b) => a + b, 0)
    return [Number(q1.toFixed(2)), Number(q2.toFixed(2)), Number(q3.toFixed(2)), Number(q4.toFixed(2))]
  }

  private computeEfficiencyFromItems(items: any[]): number {
    // efficiency = totalActual / totalCapacity * 100
    let totalCapacity = 0
    let totalActual = 0

    items.forEach((it: any) => {
      const capacity = Number(it.vehicleCapacity ?? it.capacity ?? it.maxCapacity ?? 0)
      const vehicles = Number(it.vehicleCount ?? it.vehicles ?? 0)
      const estimatedCapacity = capacity > 0 ? capacity : vehicles * 6 // deterministic estimate if capacity absent
      const actual = Number(it.actualWeight ?? it.actualWeightMT ?? it.totalNetWeight ?? it.netWeight ?? it.totalWeight ?? 0)

      totalCapacity += isFinite(estimatedCapacity) ? estimatedCapacity : 0
      totalActual += isFinite(actual) ? actual : 0
    })

    if (totalCapacity === 0) return 0 // deterministic, no random fallback
    return Number(((totalActual / totalCapacity) * 100).toFixed(2))
  }

  private calculateSiteTotalsFromItems(items: any[], siteName: string): { weight: number; trips: number } {
    let weight = 0
    let trips = 0

    items.forEach((w: any) => {
      const wName = (w.wardName ?? w.WardName ?? w.siteName ?? w.site ?? "").toString().toLowerCase()
      if (wName.includes(siteName)) {
        weight += Number(w.totalNetWeight ?? w.netWeight ?? w.totalWeight ?? 0)
        trips += Number(w.vehicleCount ?? w.vehicles ?? w.trips ?? 0)
      }
    })

    // deterministic fallback if no site-specific entries: return zeros (not random)
    return { weight: Number(weight.toFixed(2)), trips: Math.round(trips) }
  }

  private safePercentChange(current: number, previous: number): number {
    if (!previous || previous === 0) {
      return previous === 0 && current === 0 ? 0 : 100 * (current - previous) / (previous === 0 ? 1 : previous)
    }
    return Number((((current - previous) / previous) * 100).toFixed(2))
  }

  private generateHistoricalFromYears(listOfItemArrays: any[][]): void {
    // Combine items and derive yearly aggregates for availableYears deterministically
    const combined: any[] = []
    listOfItemArrays.forEach((arr) => {
      if (Array.isArray(arr)) combined.push(...arr)
    })

    const yearMap = new Map<number, { weight: number; trips: number; capacity: number; actual: number }>()

    combined.forEach((it: any) => {
      const d = this.parseDateFromItem(it)
      if (!d) return
      const y = d.getFullYear()
      const cur = yearMap.get(y) ?? { weight: 0, trips: 0, capacity: 0, actual: 0 }

      cur.weight += Number(it.totalNetWeight ?? it.netWeight ?? it.totalWeight ?? 0) || 0
      cur.trips += Number(it.vehicleCount ?? it.vehicles ?? it.trips ?? 0) || 0
      const cap = Number(it.vehicleCapacity ?? it.capacity ?? it.maxCapacity ?? 0)
      const vehicles = Number(it.vehicleCount ?? it.vehicles ?? 0)
      cur.capacity += isFinite(cap) && cap > 0 ? cap : vehicles * 6
      cur.actual += Number(it.actualWeight ?? it.actualWeightMT ?? it.totalNetWeight ?? it.netWeight ?? 0) || 0

      yearMap.set(y, cur)
    })

    const hist: HistoricalRecord[] = []
    this.availableYears.forEach((y) => {
      const v = yearMap.get(y) ?? { weight: 0, trips: 0, capacity: 0, actual: 0 }
      const avgDaily = v.weight > 0 ? Number((v.weight / (this.isLeapYear(y) ? 366 : 365)).toFixed(2)) : 0
      const efficiency = v.capacity > 0 ? Number(((v.actual / v.capacity) * 100).toFixed(2)) : 0
      hist.push({
        year: y,
        totalWeight: Number(v.weight.toFixed(2)),
        totalTrips: Math.round(v.trips),
        avgDaily,
        efficiency,
        yoyChange: 0, // calculate below
      })
    })

    // compute YoY deterministically
    for (let i = 0; i < hist.length; i++) {
      if (i === hist.length - 1) {
        hist[i].yoyChange = 0
      } else {
        const cur = hist[i].totalWeight
        const prev = hist[i + 1].totalWeight || 0
        hist[i].yoyChange = prev === 0 ? (cur === 0 ? 0 : 100) : Number((((cur - prev) / prev) * 100).toFixed(2))
      }
    }

    this.historicalData = hist
  }

  private isLeapYear(y: number): boolean {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  }

  getProgressWidth(current: number, previous: number): number {
    const max = Math.max(current, previous)
    if (max === 0) return 0
    return Math.min((current / max) * 100, 100)
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

    const wbSummaryPayload = {
      DateFrom: fromDate,
      DateTo: toDate,
      UserId: userId,
      WardName: this.selectedWard || "",
      Agency: this.selectedAgency || "",
      VehicleType: this.selectedVehicleType || "",
    }

    const cumulativePayload = {
      UserId: userId,
      FromDate: fromDate,
      ToDate: toDate,
      SiteName: "SWM",
      WardName: this.selectedWard || "",
      Agency: this.selectedAgency || "",
      VehicleType: this.selectedVehicleType || "",
    }

    const wardwisePayload = {
      WeighBridge: "",
      FromDate: fromDate,
      ToDate: toDate,
      FullDate: "",
      WardName: this.selectedWard || "",
      Act_Shift: "",
      TransactionDate: fromDate,
      Agency: this.selectedAgency || "",
      VehicleType: this.selectedVehicleType || "",
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

  private safeCall(fn: () => Observable<any> | null | undefined): Observable<any> {
    try {
      const obs = fn()
      return obs ?? of(null)
    } catch (e) {
      console.error("safeCall caught:", e)
      return of(null)
    }
  }

  private processWBTripSummary(response: any): void {
    if (!response || !response.data) {
      console.warn("No WB Trip Summary data received")
      return
    }

    const data = response.data

    this.swmSites = Array.isArray(data.swmSites) ? data.swmSites : []
    this.rtsSites = Array.isArray(data.rtsSites) ? data.rtsSites : []

    let kanjurTrips = 0
    let kanjurWeight = 0
    let deonarTrips = 0
    let deonarWeight = 0

    const filterSite = (site: any): boolean => {
      if (
        this.selectedWard &&
        site.wardName &&
        !site.wardName.toLowerCase().includes(this.selectedWard.toLowerCase())
      ) {
        return false
      }
      if (
        this.selectedAgency &&
        site.agency &&
        !site.agency.toLowerCase().includes(this.selectedAgency.toLowerCase())
      ) {
        return false
      }
      if (
        this.selectedVehicleType &&
        site.vehicleType &&
        !site.vehicleType.toLowerCase().includes(this.selectedVehicleType.toLowerCase())
      ) {
        return false
      }
      return true
    }

    this.swmSites.filter(filterSite).forEach((site) => {
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

    this.rtsSites.filter(filterSite).forEach((site) => {
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
      trips: Math.round(kanjurTrips),
      netWeight: Number(kanjurWeight.toFixed(2)),
    }

    this.deonarData = {
      trips: Math.round(deonarTrips),
      netWeight: Number(deonarWeight.toFixed(2)),
    }

    let vrtsWeight = 0
    let mrtsWeight = 0
    let grtsWeight = 0

    this.rtsSites.filter(filterSite).forEach((site) => {
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

    const allSites = [...this.swmSites, ...this.rtsSites].filter(filterSite)
    const totalTrips = allSites.reduce((sum, site) => sum + Number(site.vehicleCount || 0), 0)
    const totalWeight = allSites.reduce((sum, site) => sum + Number(site.netWeight || 0), 0)

    this.totalData = {
      trips: Math.round(totalTrips),
      netWeight: Number(totalWeight.toFixed(2)),
    }

    this.overallAnalytics = {
      totalTrips: Math.round(totalTrips),
      totalWeight: Number(totalWeight.toFixed(2)),
      avgDailyWeight: Number((totalWeight / 30).toFixed(2)),
      capacityUtilization: this.calculateCapacityUtilization(allSites),
    }
  }

  private calculateCapacityUtilization(sites: any[]): number {
    const totalCapacity = sites.reduce((sum, site) => sum + Number(site.vehicleCapacity || site.capacity || 0), 0)
    const totalActual = sites.reduce((sum, site) => sum + Number(site.netWeight || site.actualWeight || 0), 0)
    if (totalCapacity === 0) return 0
    return Number(((totalActual / totalCapacity) * 100).toFixed(2))
  }

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
      this.last30DaysMetrics.averageWardWeight = Number(
        map.get("avgwardweight30days") ?? map.get("averagewardweight") ?? 0,
      )

      return
    }

    const d = payload as any
    const getN = (k: any) => (k == null ? 0 : Number(k))

    this.timeMetrics.todayWeight = getN(d.today ?? d.Today ?? d.todays ?? d.todayMT ?? 0)
    this.timeMetrics.lastDay = getN(d.lastDay ?? d.LastDay ?? d.yesterday ?? d.last_day ?? 0)
    this.timeMetrics.week = getN(d.week ?? d.thisWeek ?? d.this_week ?? d.weekly ?? 0)
    this.timeMetrics.month = getN(d.month ?? d.thisMonth ?? d.this_month ?? d.monthly ?? 0)
    this.timeMetrics.year = getN(d.year ?? d.thisYear ?? d.yearly ?? 0)

    this.last30DaysMetrics.cumulativeWeight = getN(
      d.last30DaysTotal ?? d.last30DaysTotalWeight ?? d.last30 ?? d.last30Total ?? 0,
    )
    this.last30DaysMetrics.averageWardWeight = getN(
      d.averageWardWeight ?? d.avgWardWeight ?? d.avgWardWeight30Days ?? 0,
    )
  }

  private processWardwiseReport(response: any): void {
    if (!response) return

    const wardData = Array.isArray(response.wardData)
      ? response.wardData
      : Array.isArray(response.data)
      ? response.data
      : []

    if (!wardData || wardData.length === 0) {
      // No ward data: reset charts deterministically
      this.capacityVsActualChartOptions = {
        ...this.capacityVsActualChartOptions,
        series: [
          { name: "Vehicle Capacity", data: [0] },
          { name: "Actual Weight", data: [0] },
        ],
        xaxis: { categories: ["No data"] },
      }
      this.wardChartOptions = {
        ...this.wardChartOptions,
        series: [{ name: "Trips", data: [0] }, { name: "Weight (MT)", data: [0] }],
        xaxis: { categories: ["No data"] },
      }
      return
    }

    if (this.availableWards.length === 0) {
      this.availableWards = Array.from(
        new Set(wardData.map((w: any) => w.wardName ?? w.WardName ?? w.ward ?? "Unknown")),
      )
    }

    let filteredWardData = wardData
    if (this.selectedWard) {
      filteredWardData = wardData.filter((w: any) => {
        const wardName = (w.wardName ?? w.WardName ?? w.ward ?? "").toLowerCase()
        return wardName.includes(this.selectedWard.toLowerCase())
      })
    }
    if (this.selectedAgency) {
      filteredWardData = filteredWardData.filter((w: any) => {
        const agency = (w.agency ?? w.Agency ?? "").toLowerCase()
        return agency.includes(this.selectedAgency.toLowerCase())
      })
    }
    if (this.selectedVehicleType) {
      filteredWardData = filteredWardData.filter((w: any) => {
        const vehicleType = (w.vehicleType ?? w.VehicleType ?? "").toLowerCase()
        return vehicleType.includes(this.selectedVehicleType.toLowerCase())
      })
    }

    const categories: string[] = []
    const capacitySeries: number[] = []
    const actualSeries: number[] = []
    const vehicleCounts: number[] = []
    const weightSeries: number[] = []

    this.deonarAnalytics = []
    this.kanjurAnalytics = []

    filteredWardData.forEach((w: any) => {
      const wardName = (w.wardName ?? w.WardName ?? w.ward ?? "Unknown").toString()
      const capacity = Number(w.vehicleCapacity ?? w.capacity ?? w.maxCapacity ?? w.vehicle_capacity ?? 0)
      const actual = Number(w.actualWeight ?? w.actualWeightMT ?? w.totalNetWeight ?? w.netWeight ?? w.totalWeight ?? 0)
      const vehicles = Number(w.vehicleCount ?? w.vehicles ?? 0)
      const weight = Number(w.totalNetWeight ?? w.netWeight ?? w.totalWeight ?? 0)

      categories.push(wardName)
      capacitySeries.push(Number(isFinite(capacity) ? capacity : vehicles * 6))
      actualSeries.push(Number(isFinite(actual) ? actual : weight))
      vehicleCounts.push(Number(isFinite(vehicles) ? vehicles : 0))
      weightSeries.push(Number(isFinite(weight) ? weight : 0))

      const estimatedCapacity = capacity || vehicles * 6 || 0
      const wardAnalytics: WardAnalytics = {
        wardName: wardName,
        trips: vehicles,
        netWeight: weight,
        avgWeight: vehicles > 0 ? weight / vehicles : 0,
        capacity: estimatedCapacity,
        utilization: estimatedCapacity > 0 ? (actual / estimatedCapacity) * 100 : 0,
      }

      const siteName = (w.siteName ?? w.site ?? "").toLowerCase()
      if (siteName.includes("deonar") || wardName.toLowerCase().includes("deonar")) {
        this.deonarAnalytics.push(wardAnalytics)
      } else if (siteName.includes("kanjur") || wardName.toLowerCase().includes("kanjur")) {
        this.kanjurAnalytics.push(wardAnalytics)
      } else {
        if (this.deonarAnalytics.length <= this.kanjurAnalytics.length) {
          this.deonarAnalytics.push(wardAnalytics)
        } else {
          this.kanjurAnalytics.push(wardAnalytics)
        }
      }
    })

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
        { name: "Trips", data: vehicleCounts.map((v) => Math.round(v)) },
        { name: "Weight (MT)", data: weightSeries.map((v) => Number(v.toFixed(2))) },
      ],
      xaxis: { categories },
    }

    const totalWeight = weightSeries.reduce((a, b) => a + (Number(b) || 0), 0)
    const wardCount = categories.length || 1

    this.last30DaysMetrics.cumulativeWeight = Number(totalWeight.toFixed(2))
    this.last30DaysMetrics.averageWardWeight = Number((totalWeight / wardCount).toFixed(2))
  }

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

  private updateComparisonCharts(): void {
    const year = this.selectedComparisonYear

    this.monthlyComparisonChartOptions = {
      ...this.monthlyComparisonChartOptions,
      series: [
        { name: `${year}`, data: this.comparisonData.currentYear.monthlyData || Array(12).fill(0) },
        { name: `${year - 1}`, data: this.comparisonData.previousYear.monthlyData || Array(12).fill(0) },
      ],
    }

    this.quarterlyComparisonChartOptions = {
      ...this.quarterlyComparisonChartOptions,
      series: [
        { name: `${year}`, data: this.comparisonData.currentYear.quarterlyData || [0, 0, 0, 0] },
        { name: `${year - 1}`, data: this.comparisonData.previousYear.quarterlyData || [0, 0, 0, 0] },
      ],
    }

    const years = this.availableYears.slice().reverse()
    // deterministic zero/actual growth (no random). Growth computed from historicalData if present
    const weightGrowth = years.map((y, i) => {
      const idx = this.historicalData.findIndex((h) => h.year === y)
      if (idx === -1 || idx === this.historicalData.length - 1) return 0
      const cur = this.historicalData[idx].totalWeight
      const prev = this.historicalData[idx + 1]?.totalWeight ?? 0
      return prev === 0 ? (cur === 0 ? 0 : 100) : Number((((cur - prev) / prev) * 100).toFixed(2))
    })
    const tripsGrowth = years.map((y, i) => {
      const idx = this.historicalData.findIndex((h) => h.year === y)
      if (idx === -1 || idx === this.historicalData.length - 1) return 0
      const cur = this.historicalData[idx].totalTrips
      const prev = this.historicalData[idx + 1]?.totalTrips ?? 0
      return prev === 0 ? (cur === 0 ? 0 : 100) : Number((((cur - prev) / prev) * 100).toFixed(2))
    })

    this.yoyGrowthChartOptions = {
      ...this.yoyGrowthChartOptions,
      series: [
        { name: "Weight Growth (%)", data: weightGrowth },
        { name: "Trips Growth (%)", data: tripsGrowth },
      ],
      xaxis: { categories: years.map((y) => y.toString()) },
    }
  }

  refreshAllData(): void {
    this.isRefreshing = true
    this.loadFiltersFromAPI()
    this.loadDashboardData()
    this.loadComparisonData()
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
  }

  switchSection(section: "overview" | "performance" | "analytics" | "reports"): void {
    this.activeSection = section
    if (section === "performance" && this.historicalData.length === 0) {
      this.loadComparisonData()
    }
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
}
