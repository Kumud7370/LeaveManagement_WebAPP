import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { NgApexchartsModule } from "ng-apexcharts"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from "rxjs"
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
}

export interface NewsItem {
  id: number
  type: string
  priority: string
  date: string
  year: number
  category: string
  title: string
  content: string
  timeAgo: string
  createdAt: string
  monthYear: string
  siteLocation: string
  eventDate: string
  notification: string
  description?: string
  isActive?: boolean
}

interface WardData {
  id?: number
  wardName: string
  vehicleCount: number
  totalNetWeight: number
  transactionDate: string
}

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, FormsModule],
})
export class Dashboard2Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>()

  // Loading states
  isLoading = true
  isLoadingWardData = false
  isLoadingNews = false
  isLoadingCharts = false
  isLoadingMap = false
  isExporting = false
  isRefreshing = false

  // Layout management
  activeSection: "overview" | "routes" | "performance" | "analytics" | "maps" | "reports" = "overview"
  filtersCollapsed = false
  sidebarCollapsed = false

  // Global filters
  globalTimeRange = "day"
  customFromDate = ""
  customToDate = ""
  globalSearchQuery = ""
  valueRangeMin: number | null = null
  valueRangeMax: number | null = null

  // Data from requirements
  kanjurData = {
    vehicles: 831,
    netWeight: 6140.29,
  }

  deonarData = {
    vehicles: 229,
    netWeight: 1624.82,
  }

  totalData = {
    vehicles: 1060,
    netWeight: 7765.11,
  }

  // Ward summary data
  wardSummary = {
    totalWards: 0,
    topWard: "",
  }

  // Filter options
  availableWards: string[] = ["Ward A", "Ward B", "Ward C", "Ward D", "Ward E"]
  availableRoutes: string[] = ["RS1016W", "RS1005W", "PS3015P", "RS1008W", "AX1902Y"]
  availableVehicleTypes: string[] = ["COMPACTOR", "MINI COMPACTOR", "DUMPER", "TEMPO", "BIG DUMPER"]
  availableWasteTypes: string[] = ["BLF-MSW", "MSW", "COMPOST-MSW", "WARD DEBRIS", "REFUSE"]

  // Filter selections
  selectedWard = ""
  selectedRoute = ""
  selectedVehicleType = ""
  selectedWasteType = ""

  // Time-based metrics
  timeMetrics = {
    day: 6,
    week: 6,
    month: 6,
    year: 6,
    total: 6,
  }

  // Unified location data
  unifiedData = {
    grts: 326,
    mrts: 446,
    vrts: 210,
  }

  // Map data
  mapLayers = {
    routes: true,
    stations: true,
    vehicles: false,
  }

  realTimeTracking = false
  mapStats = {
    activeRoutes: 45,
    activeVehicles: 128,
    dumpingStations: 12,
  }

  // Chart colors
  private primaryColor = "#1a2a6c"
  private secondaryColor = "#b21f1f"
  private accentColor = "#00ffcc"
  private successColor = "#10b981"
  private infoColor = "#3b82f6"
  private warningColor = "#f59e0b"

  // Chart-specific filters and pagination
  // Route Day Chart
  routeDayFilter = "all"
  routeDaySortBy = "weight_desc"
  routeDayCurrentPage = 1
  routeDayPageSize = 8
  routeDayTotalPages = 1

  // Route Week Chart
  routeWeekFilter = "all"
  routeWeekSortBy = "weight_desc"
  routeWeekCurrentPage = 1
  routeWeekPageSize = 8
  routeWeekTotalPages = 1

  // Route Month Chart
  routeMonthFilter = "all"
  routeMonthSortBy = "weight_desc"
  routeMonthCurrentPage = 1
  routeMonthPageSize = 8
  routeMonthTotalPages = 1

  // Best Routes Chart
  bestRoutesTimeRange = "day"
  bestRoutesLimit = "10"
  bestRoutesCurrentPage = 1
  bestRoutesPageSize = 10
  bestRoutesTotalPages = 1

  // Worst Routes Chart
  worstRoutesTimeRange = "day"
  worstRoutesLimit = "10"
  worstRoutesCurrentPage = 1
  worstRoutesPageSize = 10
  worstRoutesTotalPages = 1

  // Waste Type Chart
  wasteTypeTimeRange = "day"
  wasteTypeFilter = "all"

  // Dumping Station Chart
  dumpingStationTimeRange = "day"
  dumpingStationSortBy = "weight_desc"

  // Ward Wise Chart
  wardWiseTimeRange = "day"
  wardWiseFilter = "all"
  wardWiseSortBy = "weight_desc"
  wardWiseCurrentPage = 1
  wardWisePageSize = 7
  wardWiseTotalPages = 1

  // Vehicle Type Chart
  vehicleTypeTimeRange = "day"
  vehicleTypeFilter = "all"
  vehicleTypeSortBy = "weight_desc"
  vehicleTypeCurrentPage = 1
  vehicleTypePageSize = 9
  vehicleTypeTotalPages = 1

  // Time Series Chart
  timeSeriesTimeRange = "day"
  timeSeriesInterval = "hour"

  // Waste Treemap Chart
  wasteTreemapTimeRange = "day"
  wasteTreemapMinWeight: number | null = null
  wasteTreemapMaxWeight: number | null = null

  // Ward Chart
  wardChartTimeRange = "month"
  wardChartSortBy = "vehicles_desc"
  wardChartCurrentPage = 1
  wardChartPageSize = 10
  wardChartTotalPages = 1

  // Ward data with proper pagination
  wardData: WardData[] = []
  filteredWardData: WardData[] = []
  paginatedWardData: WardData[] = []
  wardSearchQuery = ""
  wardSortBy = "wardName"
  wardCurrentPage = 1
  wardPageSize = 10
  wardTotalPages = 0

  // News management with proper pagination
  allNews: NewsItem[] = []
  filteredNews: NewsItem[] = []
  paginatedNews: NewsItem[] = []
  availableYears: number[] = []
  selectedYear = ""
  selectedPriority = ""
  searchQuery = ""
  newsCurrentPage = 1
  newsPageSize = 6
  newsTotalItems = 0
  newsTotalPages = 0

  // Chart options
  public vehicleChartOptions: PieChartOptions = {
    series: [831, 229],
    chart: {
      type: "donut",
      height: 350,
      fontFamily: "Raleway, sans-serif",
    },
    labels: ["Kanjur", "Deonar"],
    colors: [this.primaryColor, this.secondaryColor],
    legend: {
      position: "bottom",
      fontSize: "14px",
      fontWeight: 500,
      markers: {
        width: 12,
        height: 12,
        radius: 6,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Vehicles",
              fontSize: "16px",
              fontWeight: 600,
              color: this.primaryColor,
              formatter: () => "1060",
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => {
        return Math.round(val) + "%"
      },
      style: {
        fontSize: "14px",
        fontWeight: "bold",
        colors: ["#fff"],
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

  public wardChartOptions: ChartOptions = {
    series: [
      {
        name: "Vehicles",
        data: [],
      },
      {
        name: "Weight (MT)",
        data: [],
      },
    ],
    chart: {
      type: "bar",
      height: 350,
      fontFamily: "Raleway, sans-serif",
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 4,
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts: any) => {
        if (opts.seriesIndex === 0) {
          return val.toString()
        } else {
          return val.toFixed(1) + " MT"
        }
      },
      offsetY: -20,
      style: {
        fontSize: "10px",
        fontWeight: "bold",
        colors: [this.primaryColor],
      },
    },
    xaxis: {
      categories: [],
      labels: {
        style: {
          fontSize: "12px",
          fontWeight: 500,
          colors: [],
        },
        rotate: -45,
      },
    },
    yaxis: [
      {
        title: {
          text: "Number of Vehicles",
          style: {
            color: this.primaryColor,
            fontSize: "12px",
            fontWeight: 600,
          },
        },
        labels: {
          style: {
            colors: [this.primaryColor],
          },
        },
      },
      {
        opposite: true,
        title: {
          text: "Weight (MT)",
          style: {
            color: this.successColor,
            fontSize: "12px",
            fontWeight: 600,
          },
        },
        labels: {
          style: {
            colors: [this.successColor],
          },
        },
      },
    ],
    colors: [this.primaryColor, this.successColor],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "center",
      fontSize: "14px",
      fontWeight: 500,
      markers: {
        width: 12,
        height: 12,
        radius: 6,
      },
    },
  }

  // Route charts
  public routeDayChartOptions: ChartOptions = {
    series: [
      {
        name: "Weight in Ton",
        data: [11, 11, 11, 11, 10, 10, 10, 10],
      },
    ],
    chart: {
      type: "bar",
      height: 300,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toString(),
      style: {
        fontSize: "10px",
        fontWeight: "bold",
        colors: ["#fff"],
      },
    },
    xaxis: {
      categories: ["RS1016W", "RS1005W", "PS3015P", "RS1008W", "AX1902Y", "PN1043P", "DXT301Y", "ME1003P"],
      title: {
        text: "Average of Weight In Ton",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    yaxis: {
      title: {
        text: "Route",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    colors: ["#4A90E2"],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      show: false,
    },
  }

  public routeWeekChartOptions: ChartOptions = {
    series: [
      {
        name: "Weight in Ton",
        data: [12, 12, 11, 11, 10, 10, 10, 10],
      },
    ],
    chart: {
      type: "bar",
      height: 300,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toString(),
      style: {
        fontSize: "10px",
        fontWeight: "bold",
        colors: ["#fff"],
      },
    },
    xaxis: {
      categories: ["CX1904W", "RS1008W", "RS1016W", "FN3080P", "PS3016P", "TX0109W", "PN1028W", "CX1906W"],
      title: {
        text: "Average of Weight In Ton",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    yaxis: {
      title: {
        text: "Route",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    colors: ["#4A90E2"],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      show: false,
    },
  }

  public routeMonthChartOptions: ChartOptions = {
    series: [
      {
        name: "Weight in Ton",
        data: [11, 11, 11, 11, 10, 10, 10, 10],
      },
    ],
    chart: {
      type: "bar",
      height: 300,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toString(),
      style: {
        fontSize: "10px",
        fontWeight: "bold",
        colors: ["#fff"],
      },
    },
    xaxis: {
      categories: ["RS1008W", "RS1016W", "FN3080P", "AX1902Y", "CX1904W", "PS3016P", "EX1905Y", "PN1028W"],
      title: {
        text: "Average of Weight In Ton",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    yaxis: {
      title: {
        text: "Route",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    colors: ["#4A90E2"],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      show: false,
    },
  }

  public wasteTypePieOptions: PieChartOptions = {
    series: [63.36, 16.17, 11.14, 7.17, 2.16],
    chart: {
      type: "donut",
      height: 300,
      fontFamily: "Raleway, sans-serif",
    },
    labels: ["BLF-MSW", "MSW", "COMPOST-MSW", "WARD DEBRIS", "REFUSE"],
    colors: ["#8B5CF6", "#06B6D4", "#F59E0B", "#EF4444", "#10B981"],
    legend: {
      position: "right",
      fontSize: "12px",
      fontWeight: 500,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "50%",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toFixed(2) + "%",
      style: {
        fontSize: "10px",
        fontWeight: "bold",
        colors: ["#fff"],
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          legend: {
            position: "bottom",
          },
        },
      },
    ],
  }

  public bestRoutesChartOptions: ChartOptions = {
    series: [
      {
        name: "Weight in Ton",
        data: [27, 23, 22, 20, 19, 19, 19, 17, 17, 17],
      },
    ],
    chart: {
      type: "line",
      height: 300,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {},
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "10px",
        fontWeight: "bold",
      },
    },
    xaxis: {
      categories: [
        "RS2008W",
        "RS2018W",
        "RS2050W",
        "GS1801P",
        "KW2055K",
        "ME1604P",
        "KW1804P",
        "ME1011P",
        "KS1821W",
        "MW1913W",
      ],
      title: {
        text: "Route",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
      labels: {
        rotate: -45,
        style: {
          fontSize: "10px",
          colors: ["#6b7280"],
        },
      },
    },
    yaxis: {
      title: {
        text: "Weight in Ton",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    colors: [this.successColor],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    markers: {
      size: 5,
      colors: [this.successColor],
      strokeColors: "#fff",
      strokeWidth: 2,
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      show: false,
    },
  }

  public worstRoutesChartOptions: ChartOptions = {
    series: [
      {
        name: "Weight in Ton",
        data: [0.04, 0.04, 0.04, 0.03, 0.03, 0.03, 0.02, 0.02, 0.02, 0.01],
      },
    ],
    chart: {
      type: "line",
      height: 300,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {},
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toFixed(4),
      style: {
        fontSize: "10px",
        fontWeight: "bold",
      },
    },
    xaxis: {
      categories: [
        "CN2021P",
        "ME1019P",
        "ME1107P",
        "TX1110W",
        "GS2058P",
        "ME2103P",
        "CN1023P",
        "GN1103P",
        "GS2067P",
        "GG1105P",
      ],
      title: {
        text: "Route",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
      labels: {
        rotate: -45,
        style: {
          fontSize: "10px",
          colors: ["#6b7280"],
        },
      },
    },
    yaxis: {
      title: {
        text: "Weight in Ton",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    colors: [this.secondaryColor],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    markers: {
      size: 5,
      colors: [this.secondaryColor],
      strokeColors: "#fff",
      strokeWidth: 2,
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      show: false,
    },
  }

  public dumpingStationPieOptions: PieChartOptions = {
    series: [70.23, 14.76, 6.82, 3.2, 2.99, 2.0],
    chart: {
      type: "pie",
      height: 300,
      fontFamily: "Raleway, sans-serif",
    },
    labels: ["KANJUR", "DEONAR", "MRTS", "GRTS", "VRTS", "Others"],
    colors: ["#3B82F6", "#EC4899", "#F59E0B", "#10B981", "#8B5CF6", "#6B7280"],
    legend: {
      position: "right",
      fontSize: "12px",
      fontWeight: 500,
    },
    plotOptions: {
      pie: {
        expandOnClick: false,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toFixed(2) + "%",
      style: {
        fontSize: "10px",
        fontWeight: "bold",
        colors: ["#fff"],
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          legend: {
            position: "bottom",
          },
        },
      },
    ],
  }

  public wardWiseBarOptions: ChartOptions = {
    series: [
      {
        name: "Sum of Weight In Ton",
        data: [573, 574, 395, 349, 349, 344, 304],
      },
    ],
    chart: {
      type: "bar",
      height: 300,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toString(),
      style: {
        fontSize: "10px",
        fontWeight: "bold",
        colors: ["#fff"],
      },
    },
    xaxis: {
      categories: ["M.R.T.S.", "K.R.T.S.", "G.R.T.S.", "P/N", "K/W", "M/E", "L"],
      title: {
        text: "Sum of Weight In Ton",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    yaxis: {
      title: {
        text: "Ward",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    colors: ["#F59E0B"],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      show: false,
    },
  }

  public vehicleTypeBarOptions: ChartOptions = {
    series: [
      {
        name: "Sum of Weight In Ton",
        data: [2814, 1706, 1077, 551, 242, 138, 6, 3, 3],
      },
    ],
    chart: {
      type: "bar",
      height: 300,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 4,
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toString(),
      offsetY: -20,
      style: {
        fontSize: "10px",
        fontWeight: "bold",
        colors: [this.primaryColor],
      },
    },
    xaxis: {
      categories: [
        "COMPACTOR",
        "MINI COMPACTOR",
        "DUMPER",
        "STATIONARY COMPACTOR",
        "LARGE COMPACTOR",
        "TEMPO",
        "BIG DUMPER",
        "BMC MIN COMPACTOR",
        "BMC DUMPER",
      ],
      title: {
        text: "Vehicle Type",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
      labels: {
        rotate: -45,
        style: {
          fontSize: "10px",
          colors: ["#6b7280"],
        },
      },
    },
    yaxis: {
      title: {
        text: "Sum of Weight In Ton",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    colors: ["#3B82F6"],
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      show: false,
    },
  }

  public timeSeriesChartOptions: ChartOptions = {
    series: [
      {
        name: "Sum of Weight In Ton",
        data: Array.from({ length: 50 }, () => Math.floor(Math.random() * 40) + 5),
      },
    ],
    chart: {
      type: "area",
      height: 350,
      fontFamily: "Raleway, sans-serif",
      zoom: {
        enabled: true,
      },
    },
    plotOptions: {
      area: {
        fillTo: "origin",
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      type: "datetime",
      categories: Array.from({ length: 50 }, (_, i) => {
        const date = new Date()
        date.setHours(6 + i * 0.25)
        return date.toISOString()
      }),
      title: {
        text: "Time",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
      labels: {
        formatter: (val: string) => {
          const date = new Date(val)
          return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        },
        style: {
          colors: ["#6b7280"],
        },
      },
    },
    yaxis: {
      title: {
        text: "Sum of Weight In Ton",
        style: {
          color: "#6b7280",
          fontSize: "12px",
          fontWeight: 500,
        },
      },
    },
    colors: ["#6B7280"],
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: "#e5e7eb",
      strokeDashArray: 3,
    },
    legend: {
      show: false,
    },
  }

  public wasteTreemapOptions: ChartOptions = {
    series: [
      {
        data: [
          { x: "BLF-MSW", y: 4500 },
          { x: "MSW", y: 1200 },
          { x: "COMPOST-MSW", y: 800 },
          { x: "WARD DEBRIS", y: 400 },
          { x: "REFUSE", y: 200 },
        ],
      },
    ],
    chart: {
      type: "treemap",
      height: 350,
      fontFamily: "Raleway, sans-serif",
    },
    plotOptions: {
      treemap: {
        enableShades: true,
        shadeIntensity: 0.5,
        reverseNegativeShade: true,
        colorScale: {
          ranges: [
            { from: 0, to: 500, color: "#10B981" },
            { from: 501, to: 1000, color: "#F59E0B" },
            { from: 1001, to: 2000, color: "#EF4444" },
            { from: 2001, to: 5000, color: "#8B5CF6" },
          ],
        },
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "12px",
        fontWeight: "bold",
        colors: ["#fff"],
      },
      formatter: (text: string, op: any) => {
        return text + ": " + op.value
      },
    },
    colors: ["#8B5CF6", "#06B6D4", "#F59E0B", "#EF4444", "#10B981"],
    xaxis: {
      categories: [],
    },
    yaxis: {
      title: {
        text: "",
      },
    },
    grid: {
      show: false,
    },
    legend: {
      show: false,
    },
  }

  constructor(
    private dbCallingService: DbCallingService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.isLoading = true

    // Initialize with collapsed filters on mobile
    this.filtersCollapsed = window.innerWidth < 768
    this.sidebarCollapsed = window.innerWidth < 1024

    this.initializeData()
    this.setupSearchDebounce()
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  private initializeData(): void {
    this.loadWardData()
    this.loadNewsData()

    setTimeout(() => {
      this.isLoading = false
      this.cdr.detectChanges()
    }, 1000)
  }

  private setupSearchDebounce(): void {
    const searchSubject = new Subject<string>()
    searchSubject.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => {
      this.applyAllFilters()
    })
  }

  // Sidebar Management
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed
  }

  // Section Management with smooth scrolling
  switchSection(section: "overview" | "routes" | "performance" | "analytics" | "maps" | "reports"): void {
    this.activeSection = section
    this.loadSectionData(section)

    // Auto-expand sidebar when navigating
    if (this.sidebarCollapsed && window.innerWidth >= 1024) {
      this.sidebarCollapsed = false
    }
  }

  // Smooth scrolling to chart sections
  scrollToSection(sectionId: string): void {
    this.activeSection = "overview"
    setTimeout(() => {
      const element = document.getElementById(`${sectionId}-section`)
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        })
      }
    }, 100)
  }

  private loadSectionData(section: string): void {
    switch (section) {
      case "routes":
        this.loadRouteData()
        break
      case "performance":
        this.loadPerformanceData()
        break
      case "analytics":
        this.loadAnalyticsData()
        break
      case "maps":
        this.loadMapData()
        break
      case "reports":
        this.loadReportsData()
        break
    }
  }

  // Filter Management
  toggleFilters(): void {
    this.filtersCollapsed = !this.filtersCollapsed
  }

  getActiveFiltersCount(): number {
    let count = 0
    if (this.globalTimeRange !== "day") count++
    if (this.selectedWard) count++
    if (this.selectedRoute) count++
    if (this.selectedVehicleType) count++
    if (this.selectedWasteType) count++
    if (this.globalSearchQuery) count++
    if (this.valueRangeMin !== null) count++
    if (this.valueRangeMax !== null) count++
    return count
  }

  onGlobalFilterChange(): void {
    this.applyAllFilters()
  }

  onGlobalSearchChange(): void {
    this.applyAllFilters()
  }

  clearAllFilters(): void {
    this.globalTimeRange = "day"
    this.customFromDate = ""
    this.customToDate = ""
    this.selectedWard = ""
    this.selectedRoute = ""
    this.selectedVehicleType = ""
    this.selectedWasteType = ""
    this.globalSearchQuery = ""
    this.valueRangeMin = null
    this.valueRangeMax = null
    this.applyAllFilters()
  }

  applyAllFilters(): void {
    console.log("Applying global filters:", {
      timeRange: this.globalTimeRange,
      ward: this.selectedWard,
      route: this.selectedRoute,
      vehicleType: this.selectedVehicleType,
      wasteType: this.selectedWasteType,
      search: this.globalSearchQuery,
      valueRange: [this.valueRangeMin, this.valueRangeMax],
    })

    this.filterWardData()
    this.applyNewsFiltersAndPagination()
    this.updateAllCharts()
  }

  private updateAllCharts(): void {
    this.isLoadingCharts = true

    // Update all chart filters based on global filters
    this.updateRouteChart("day")
    this.updateRouteChart("week")
    this.updateRouteChart("month")
    this.updateBestRoutesChart()
    this.updateWorstRoutesChart()
    this.updateWasteTypeChart()
    this.updateDumpingStationChart()
    this.updateWardWiseChart()
    this.updateVehicleTypeChart()
    this.updateTimeSeriesChart()
    this.updateWasteTreemapChart()
    this.updateWardChart()

    setTimeout(() => {
      this.isLoadingCharts = false
      this.cdr.detectChanges()
    }, 500)
  }

  // Chart Update Methods
  updateRouteChart(period: "day" | "week" | "month"): void {
    console.log(`Updating ${period} route chart with filters`)
    // Implement chart update logic based on filters
  }

  updateBestRoutesChart(): void {
    console.log("Updating best routes chart with filters:", {
      timeRange: this.bestRoutesTimeRange,
      limit: this.bestRoutesLimit,
    })
  }

  updateWorstRoutesChart(): void {
    console.log("Updating worst routes chart with filters:", {
      timeRange: this.worstRoutesTimeRange,
      limit: this.worstRoutesLimit,
    })
  }

  updateWasteTypeChart(): void {
    console.log("Updating waste type chart with filters:", {
      timeRange: this.wasteTypeTimeRange,
      filter: this.wasteTypeFilter,
    })
  }

  updateDumpingStationChart(): void {
    console.log("Updating dumping station chart with filters:", {
      timeRange: this.dumpingStationTimeRange,
      sortBy: this.dumpingStationSortBy,
    })
  }

  updateWardWiseChart(): void {
    console.log("Updating ward wise chart with filters:", {
      timeRange: this.wardWiseTimeRange,
      filter: this.wardWiseFilter,
      sortBy: this.wardWiseSortBy,
    })
  }

  updateVehicleTypeChart(): void {
    console.log("Updating vehicle type chart with filters:", {
      timeRange: this.vehicleTypeTimeRange,
      filter: this.vehicleTypeFilter,
      sortBy: this.vehicleTypeSortBy,
    })
  }

  updateTimeSeriesChart(): void {
    console.log("Updating time series chart with filters:", {
      timeRange: this.timeSeriesTimeRange,
      interval: this.timeSeriesInterval,
    })
  }

  updateWasteTreemapChart(): void {
    console.log("Updating waste treemap chart with filters:", {
      timeRange: this.wasteTreemapTimeRange,
      minWeight: this.wasteTreemapMinWeight,
      maxWeight: this.wasteTreemapMaxWeight,
    })
  }

  updateWardChart(): void {
    console.log("Updating ward chart with filters:", {
      timeRange: this.wardChartTimeRange,
      sortBy: this.wardChartSortBy,
    })
  }

  // Pagination Methods for Charts
  routeDayPreviousPage(): void {
    if (this.routeDayCurrentPage > 1) {
      this.routeDayCurrentPage--
      this.updateRouteChart("day")
    }
  }

  routeDayNextPage(): void {
    if (this.routeDayCurrentPage < this.routeDayTotalPages) {
      this.routeDayCurrentPage++
      this.updateRouteChart("day")
    }
  }

  routeWeekPreviousPage(): void {
    if (this.routeWeekCurrentPage > 1) {
      this.routeWeekCurrentPage--
      this.updateRouteChart("week")
    }
  }

  routeWeekNextPage(): void {
    if (this.routeWeekCurrentPage < this.routeWeekTotalPages) {
      this.routeWeekCurrentPage++
      this.updateRouteChart("week")
    }
  }

  routeMonthPreviousPage(): void {
    if (this.routeMonthCurrentPage > 1) {
      this.routeMonthCurrentPage--
      this.updateRouteChart("month")
    }
  }

  routeMonthNextPage(): void {
    if (this.routeMonthCurrentPage < this.routeMonthTotalPages) {
      this.routeMonthCurrentPage++
      this.updateRouteChart("month")
    }
  }

  bestRoutesPreviousPage(): void {
    if (this.bestRoutesCurrentPage > 1) {
      this.bestRoutesCurrentPage--
      this.updateBestRoutesChart()
    }
  }

  bestRoutesNextPage(): void {
    if (this.bestRoutesCurrentPage < this.bestRoutesTotalPages) {
      this.bestRoutesCurrentPage++
      this.updateBestRoutesChart()
    }
  }

  worstRoutesPreviousPage(): void {
    if (this.worstRoutesCurrentPage > 1) {
      this.worstRoutesCurrentPage--
      this.updateWorstRoutesChart()
    }
  }

  worstRoutesNextPage(): void {
    if (this.worstRoutesCurrentPage < this.worstRoutesTotalPages) {
      this.worstRoutesCurrentPage++
      this.updateWorstRoutesChart()
    }
  }

  wardWisePreviousPage(): void {
    if (this.wardWiseCurrentPage > 1) {
      this.wardWiseCurrentPage--
      this.updateWardWiseChart()
    }
  }

  wardWiseNextPage(): void {
    if (this.wardWiseCurrentPage < this.wardWiseTotalPages) {
      this.wardWiseCurrentPage++
      this.updateWardWiseChart()
    }
  }

  vehicleTypePreviousPage(): void {
    if (this.vehicleTypeCurrentPage > 1) {
      this.vehicleTypeCurrentPage--
      this.updateVehicleTypeChart()
    }
  }

  vehicleTypeNextPage(): void {
    if (this.vehicleTypeCurrentPage < this.vehicleTypeTotalPages) {
      this.vehicleTypeCurrentPage++
      this.updateVehicleTypeChart()
    }
  }

  wardChartPreviousPage(): void {
    if (this.wardChartCurrentPage > 1) {
      this.wardChartCurrentPage--
      this.updateWardChart()
    }
  }

  wardChartNextPage(): void {
    if (this.wardChartCurrentPage < this.wardChartTotalPages) {
      this.wardChartCurrentPage++
      this.updateWardChart()
    }
  }

  // Export Methods
  exportAllData(): void {
    this.isExporting = true
    setTimeout(() => {
      console.log("Exporting all dashboard data...")
      this.isExporting = false
    }, 2000)
  }

  refreshAllData(): void {
    this.isRefreshing = true
    this.loadWardData()
    this.loadNewsData()
    setTimeout(() => {
      this.isRefreshing = false
    }, 1500)
  }

  exportSectionData(section: string): void {
    console.log("Exporting section data:", section)
  }

  exportChart(chartId: string, format: "csv" | "json"): void {
    console.log(`Exporting chart ${chartId} as ${format}`)
  }

  fullscreenChart(chartId: string): void {
    console.log("Fullscreen chart:", chartId)
  }

  exportWardTableData(): void {
    console.log("Exporting ward table data...")
  }

  // Action handlers
  focusOnLocation(location: string): void {
    console.log("Focusing on location:", location)
    this.switchSection("analytics")
  }

  drillDownMetric(period: string): void {
    console.log("Drilling down metric:", period)
    this.switchSection("performance")
  }

  viewLocationDetails(location: string): void {
    console.log("Viewing location details:", location)
  }

  // Map functionality
  toggleMapLayer(layer: "routes" | "stations" | "vehicles"): void {
    this.mapLayers[layer] = !this.mapLayers[layer]
    console.log("Map layer toggled:", layer, this.mapLayers[layer])
  }

  toggleRealTimeTracking(): void {
    this.realTimeTracking = !this.realTimeTracking
    console.log("Real-time tracking:", this.realTimeTracking)
  }

  // Data loading methods
  private loadRouteData(): void {
    console.log("Loading route data...")
  }

  private loadPerformanceData(): void {
    console.log("Loading performance data...")
  }

  private loadAnalyticsData(): void {
    console.log("Loading analytics data...")
  }

  private loadMapData(): void {
    this.isLoadingMap = true
    console.log("Loading map data...")
    setTimeout(() => {
      this.isLoadingMap = false
      this.cdr.detectChanges()
    }, 1500)
  }

  private loadReportsData(): void {
    console.log("Loading reports data...")
  }

  loadWardData(): void {
    this.isLoadingWardData = true
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

    const payload = {
      WeighBridge: "",
      FromDate: `${currentMonth}-01`,
      ToDate: "",
      FullDate: "",
      WardName: "",
      Act_Shift: "",
      TransactionDate: `${currentMonth}-01`,
    }

    this.dbCallingService
      .getWardwiseReport(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (
            response &&
            (response.serviceResponse === 1 || response.ServiceResponse === "Successful") &&
            response.wardData?.length
          ) {
            this.wardData = response.wardData.map((item: any, index: number) => ({
              ...item,
              id: index + 1,
            }))
            this.processWardDataForChart()
            this.calculateWardSummary()
            this.filterWardData()
          } else {
            this.resetWardData()
          }
          this.isLoadingWardData = false
        },
        error: (error) => {
          console.error("Ward API Error:", error)
          this.resetWardData()
          this.isLoadingWardData = false
        },
      })
  }

  processWardDataForChart(): void {
    if (!this.wardData || this.wardData.length === 0) {
      this.resetWardData()
      return
    }

    const wardMap = new Map<string, { vehicles: number; weight: number }>()

    this.wardData.forEach((item) => {
      const wardName = item.wardName || "Unknown"
      const vehicles = item.vehicleCount || 0
      const weight = item.totalNetWeight || 0

      if (wardMap.has(wardName)) {
        const existing = wardMap.get(wardName)!
        existing.vehicles += vehicles
        existing.weight += weight
      } else {
        wardMap.set(wardName, { vehicles, weight })
      }
    })

    const wardNames: string[] = []
    const vehicleData: number[] = []
    const weightData: number[] = []

    wardMap.forEach((data, wardName) => {
      wardNames.push(wardName)
      vehicleData.push(data.vehicles)
      weightData.push(Number(data.weight.toFixed(1)))
    })

    this.wardChartOptions = {
      ...this.wardChartOptions,
      series: [
        {
          name: "Vehicles",
          data: vehicleData,
        },
        {
          name: "Weight (MT)",
          data: weightData,
        },
      ],
      xaxis: {
        ...this.wardChartOptions.xaxis,
        categories: wardNames,
        labels: {
          ...this.wardChartOptions.xaxis.labels,
          style: {
            ...this.wardChartOptions.xaxis.labels?.style,
            colors: Array(wardNames.length).fill(this.primaryColor),
          },
        },
      },
    }
  }

  calculateWardSummary(): void {
    if (!this.wardData || this.wardData.length === 0) {
      this.wardSummary = { totalWards: 0, topWard: "" }
      return
    }

    const uniqueWards = new Set(this.wardData.map((item) => item.wardName))
    this.wardSummary.totalWards = uniqueWards.size

    const wardTotals = new Map<string, number>()
    this.wardData.forEach((item) => {
      const wardName = item.wardName || "Unknown"
      const weight = item.totalNetWeight || 0
      wardTotals.set(wardName, (wardTotals.get(wardName) || 0) + weight)
    })

    let maxWeight = 0
    let topWard = ""
    wardTotals.forEach((weight, wardName) => {
      if (weight > maxWeight) {
        maxWeight = weight
        topWard = wardName
      }
    })

    this.wardSummary.topWard = topWard
  }

  resetWardData(): void {
    this.wardData = []
    this.filteredWardData = []
    this.paginatedWardData = []
    this.wardTotalPages = 0
    this.wardCurrentPage = 1
    this.wardSummary = { totalWards: 0, topWard: "" }

    // Reset chart
    this.wardChartOptions = {
      ...this.wardChartOptions,
      series: [
        { name: "Vehicles", data: [] },
        { name: "Weight (MT)", data: [] },
      ],
      xaxis: {
        ...this.wardChartOptions.xaxis,
        categories: [],
      },
    }
  }

  // Ward Data Table Management
  filterWardData(): void {
    if (!this.wardData || this.wardData.length === 0) {
      this.filteredWardData = []
      this.updateWardPagination()
      return
    }

    let filtered = [...this.wardData]

    // Apply search filter
    if (this.wardSearchQuery.trim()) {
      const query = this.wardSearchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (item) =>
          item.wardName.toLowerCase().includes(query) ||
          item.vehicleCount.toString().includes(query) ||
          item.totalNetWeight.toString().includes(query),
      )
    }

    // Apply global filters
    if (this.selectedWard) {
      filtered = filtered.filter((item) => item.wardName === this.selectedWard)
    }

    this.filteredWardData = filtered
    this.sortWardData()
  }

  sortWardData(): void {
    if (!this.filteredWardData || this.filteredWardData.length === 0) {
      this.updateWardPagination()
      return
    }

    this.filteredWardData.sort((a, b) => {
      switch (this.wardSortBy) {
        case "wardName":
          return a.wardName.localeCompare(b.wardName)
        case "vehicleCount":
          return b.vehicleCount - a.vehicleCount
        case "totalNetWeight":
          return b.totalNetWeight - a.totalNetWeight
        default:
          return 0
      }
    })

    this.updateWardPagination()
  }

  updateWardPagination(): void {
    this.wardTotalPages = Math.ceil(this.filteredWardData.length / this.wardPageSize)
    if (this.wardCurrentPage > this.wardTotalPages) {
      this.wardCurrentPage = Math.max(1, this.wardTotalPages)
    }

    const startIndex = (this.wardCurrentPage - 1) * this.wardPageSize
    const endIndex = startIndex + this.wardPageSize
    this.paginatedWardData = this.filteredWardData.slice(startIndex, endIndex)
  }

  wardPreviousPage(): void {
    if (this.wardCurrentPage > 1) {
      this.wardCurrentPage--
      this.updateWardPagination()
    }
  }

  wardNextPage(): void {
    if (this.wardCurrentPage < this.wardTotalPages) {
      this.wardCurrentPage++
      this.updateWardPagination()
    }
  }

  getWardDisplayStart(): number {
    return this.filteredWardData.length === 0 ? 0 : (this.wardCurrentPage - 1) * this.wardPageSize + 1
  }

  getWardDisplayEnd(): number {
    return Math.min(this.wardCurrentPage * this.wardPageSize, this.filteredWardData.length)
  }

  trackByWardId(index: number, item: WardData): any {
    return item.id || index
  }

  viewWardDetails(ward: WardData): void {
    console.log("Viewing ward details:", ward)
  }

  exportWardDetails(ward: WardData): void {
    console.log("Exporting ward details:", ward)
  }

  refreshWardData(): void {
    this.loadWardData()
  }

  exportWardData(): void {
    console.log("Exporting ward data...")
  }

  // News Management with Proper Pagination
  loadNewsData(): void {
    this.isLoadingNews = true

    // Mock news data - replace with actual API call
    const mockNews: NewsItem[] = [
      {
        id: 1,
        type: "update",
        priority: "high",
        date: "2024-01-15",
        year: 2024,
        category: "Technology",
        title: "System Upgrade Completed Successfully",
        content:
          "The waste management system has been upgraded with new features including real-time tracking, improved analytics, and enhanced user interface. This upgrade will provide better insights into waste collection patterns and optimize route planning for maximum efficiency.",
        timeAgo: "2 days ago",
        createdAt: "2024-01-15T10:30:00Z",
        monthYear: "Jan 2024",
        siteLocation: "Central Office",
        eventDate: "2024-01-15",
        notification: "System upgrade notification",
        isActive: true,
      },
      {
        id: 2,
        type: "announcement",
        priority: "medium",
        date: "2024-01-12",
        year: 2024,
        category: "Development",
        title: "New Dashboard Features Released",
        content:
          "We are excited to announce the release of new dashboard features including advanced filtering options, improved chart visualizations, and better mobile responsiveness. These enhancements will make it easier to monitor and analyze waste management operations across all locations.",
        timeAgo: "5 days ago",
        createdAt: "2024-01-12T14:20:00Z",
        monthYear: "Jan 2024",
        siteLocation: "Development Team",
        eventDate: "2024-01-12",
        notification: "Feature release announcement",
        isActive: true,
      },
      {
        id: 3,
        type: "maintenance",
        priority: "low",
        date: "2024-01-10",
        year: 2024,
        category: "System",
        title: "Scheduled Maintenance Window",
        content:
          "A scheduled maintenance window is planned for this weekend to perform routine database optimization and server updates. The system will be temporarily unavailable during this period, but all data will be preserved and accessible once maintenance is complete.",
        timeAgo: "1 week ago",
        createdAt: "2024-01-10T09:15:00Z",
        monthYear: "Jan 2024",
        siteLocation: "IT Department",
        eventDate: "2024-01-10",
        notification: "Maintenance schedule notification",
        isActive: true,
      },
      {
        id: 4,
        type: "alert",
        priority: "high",
        date: "2024-01-08",
        year: 2024,
        category: "Announcement",
        title: "Route Optimization Algorithm Updated",
        content:
          "The route optimization algorithm has been updated to provide more efficient waste collection routes. This update takes into account real-time traffic data, vehicle capacity, and historical collection patterns to minimize travel time and fuel consumption while ensuring complete coverage of all areas.",
        timeAgo: "1 week ago",
        createdAt: "2024-01-08T16:45:00Z",
        monthYear: "Jan 2024",
        siteLocation: "Operations Center",
        eventDate: "2024-01-08",
        notification: "Algorithm update alert",
        isActive: true,
      },
      {
        id: 5,
        type: "info",
        priority: "medium",
        date: "2023-12-20",
        year: 2023,
        category: "Maintenance",
        title: "Year-End Performance Report Available",
        content:
          "The comprehensive year-end performance report is now available, showcasing key metrics, achievements, and areas for improvement in our waste management operations. The report includes detailed analytics on collection efficiency, route optimization success, and environmental impact reduction measures implemented throughout the year.",
        timeAgo: "3 weeks ago",
        createdAt: "2023-12-20T11:30:00Z",
        monthYear: "Dec 2023",
        siteLocation: "Analytics Department",
        eventDate: "2023-12-20",
        notification: "Report availability notification",
        isActive: true,
      },
      {
        id: 6,
        type: "update",
        priority: "low",
        date: "2023-12-15",
        year: 2023,
        category: "Technology",
        title: "Mobile App Security Enhancement",
        content:
          "Security enhancements have been implemented in the mobile application to ensure better data protection and user privacy. These updates include improved encryption, secure authentication protocols, and enhanced data validation to protect sensitive information and maintain system integrity.",
        timeAgo: "1 month ago",
        createdAt: "2023-12-15T13:20:00Z",
        monthYear: "Dec 2023",
        siteLocation: "Security Team",
        eventDate: "2023-12-15",
        notification: "Security update notification",
        isActive: true,
      },
    ]

    setTimeout(() => {
      this.allNews = mockNews
      this.extractAvailableYears()
      this.applyNewsFiltersAndPagination()
      this.isLoadingNews = false
      this.cdr.detectChanges()
    }, 800)
  }

  extractAvailableYears(): void {
    const years = [...new Set(this.allNews.map((item) => item.year))].sort((a, b) => b - a)
    this.availableYears = years
  }

  applyNewsFiltersAndPagination(): void {
    let filtered = [...this.allNews]

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query),
      )
    }

    // Apply year filter
    if (this.selectedYear) {
      filtered = filtered.filter((item) => item.year.toString() === this.selectedYear)
    }

    // Apply priority filter
    if (this.selectedPriority) {
      filtered = filtered.filter((item) => item.priority === this.selectedPriority)
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    this.filteredNews = filtered
    this.newsTotalItems = filtered.length
    this.newsTotalPages = Math.ceil(this.newsTotalItems / this.newsPageSize)

    // Reset to first page if current page is out of bounds
    if (this.newsCurrentPage > this.newsTotalPages) {
      this.newsCurrentPage = Math.max(1, this.newsTotalPages)
    }

    this.updateNewsPagination()
  }

  updateNewsPagination(): void {
    const startIndex = (this.newsCurrentPage - 1) * this.newsPageSize
    const endIndex = startIndex + this.newsPageSize
    this.paginatedNews = this.filteredNews.slice(startIndex, endIndex)
  }

  onSearchChange(): void {
    this.newsCurrentPage = 1
    this.applyNewsFiltersAndPagination()
  }

  onYearChange(): void {
    this.newsCurrentPage = 1
    this.applyNewsFiltersAndPagination()
  }

  onPriorityChange(): void {
    this.newsCurrentPage = 1
    this.applyNewsFiltersAndPagination()
  }

  newsPreviousPage(): void {
    if (this.newsCurrentPage > 1) {
      this.newsCurrentPage--
      this.updateNewsPagination()
    }
  }

  newsNextPage(): void {
    if (this.newsCurrentPage < this.newsTotalPages) {
      this.newsCurrentPage++
      this.updateNewsPagination()
    }
  }

  trackByNewsId(index: number, item: NewsItem): any {
    return item.id || index
  }

  formatNewsDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  getNewsExcerpt(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content
    }
    return content.substring(0, maxLength).trim() + "..."
  }

  getReadTime(content: string): number {
    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    return Math.ceil(wordCount / wordsPerMinute)
  }

  openNewsDetail(newsItem: NewsItem): void {
    console.log("Opening news detail:", newsItem)
    // Implement news detail modal or navigation
  }
}
