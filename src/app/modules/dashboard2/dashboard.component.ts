import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { NgApexchartsModule } from "ng-apexcharts"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { Subject, takeUntil } from "rxjs"
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
  selector: "app-dashboard",
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

  timeMetrics = {
    year: 0,
    month: 0,
    week: 0,
    lastDay: 0,
    today: 0,
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

  private primaryColor = "#1a2a6c"
  private secondaryColor = "#b21f1f"
  private accentColor = "#00ffcc"
  private successColor = "#10b981"
  private warningColor = "#f59e0b"

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
              formatter: (w) => {
                return w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0).toString()
              },
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
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
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.loadDashboardData()
  }

  ngOnDestroy() {
    this.destroy$.next()
    this.destroy$.complete()
  }

  loadDashboardData() {
    this.isLoading = true

    const payload = {
      WeighBridge: "",
      FromDate: new Date().toISOString(),
      ToDate: new Date().toISOString(),
      FullDate: "",
      WardName: "",
      Act_Shift: "",
      TransactionDate: "",
    }

    this.dbCallingService
      .getWardwiseReport(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.processDashboardData(response)
          this.isLoading = false
          this.cdr.detectChanges()
        },
        error: (error) => {
          console.error("Error loading dashboard data", error)
          this.isLoading = false
        },
      })
  }

  processDashboardData(data: any) {
    this.kanjurData = { trips: 831, netWeight: 6140.29 }
    this.deonarData = { trips: 229, netWeight: 1624.82 }
    this.totalData = {
      trips: this.kanjurData.trips + this.deonarData.trips,
      netWeight: this.kanjurData.netWeight + this.deonarData.netWeight,
    }

    this.unifiedData = { grts: 326, mrts: 446, vrts: 210 }

    this.timeMetrics = {
      year: 45200,
      month: 3800,
      week: 950,
      lastDay: 145,
      today: 152,
    }

    this.last30DaysMetrics = {
      cumulativeWeight: 4200.5,
      averageWardWeight: 175.2,
    }

    this.updateCharts()
  }

  updateCharts() {
    this.vehicleChartOptions.series = [this.kanjurData.trips, this.deonarData.trips]

    this.capacityVsActualChartOptions.series = [
      {
        name: "Vehicle Capacity",
        data: [44, 55, 57, 56, 61, 58, 63, 60, 66],
      },
      {
        name: "Actual Weight",
        data: [35, 41, 36, 26, 45, 48, 52, 53, 41],
      },
    ]
    this.capacityVsActualChartOptions.xaxis = {
      categories: ["Ward A", "Ward B", "Ward C", "Ward D", "Ward E", "Ward F", "Ward G", "Ward H", "Ward I"],
    }
  }

  refreshAllData() {
    this.isRefreshing = true
    setTimeout(() => {
      this.loadDashboardData()
      this.isRefreshing = false
    }, 1000)
  }

  exportAllData() {
    this.isExporting = true
    setTimeout(() => {
      this.isExporting = false
    }, 2000)
  }

  toggleFilters() {
    this.filtersCollapsed = !this.filtersCollapsed
  }

  clearAllFilters() {
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

  onGlobalFilterChange() {
    this.loadDashboardData()
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed
  }

  switchSection(section: "overview" | "performance" | "analytics" | "reports") {
    this.activeSection = section
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId + "-section")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  drillDownMetric(metricType: string) {
    console.log("Drilling down into", metricType)
  }
}