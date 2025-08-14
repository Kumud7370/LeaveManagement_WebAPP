import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { NgApexchartsModule } from "ng-apexcharts"
import { DbCallingService } from "src/app/core/services/db-calling.service"

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
export class DashboardComponent implements OnInit {
  isLoading = true
  isLoadingWardData = false
  isLoadingNews = false

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

  // Chart colors matching search-report theme
  private primaryColor = "#1a2a6c"
  private secondaryColor = "#b21f1f"
  private accentColor = "#00ffcc"
  private successColor = "#10b981"
  private infoColor = "#3b82f6"
  private warningColor = "#f59e0b"

  // Dynamic ward data from API
  wardData: WardData[] = []

  // News management
  allNews: NewsItem[] = []
  filteredNews: NewsItem[] = []
  availableYears: number[] = []
  selectedYear = ""
  searchQuery = ""
  currentPage = 1
  pageSize = 6
  totalItems = 0
  totalPages = 0

  // Vehicle Count Pie Chart Options
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

  // Ward Report Chart Options
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

  constructor(private dbCallingService: DbCallingService) { }

  ngOnInit(): void {
    // Load initial data
    this.loadWardData()
    this.loadNewsData()

    // Simulate loading
    setTimeout(() => {
      this.isLoading = false
    }, 1000)
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

    console.log("Loading ward data with payload:", payload)

    this.dbCallingService.getWardwiseReport(payload).subscribe({
      next: (response) => {
        console.log("Ward API Response:", response)
        if (
          response &&
          (response.serviceResponse === 1 || response.ServiceResponse === "Successful") &&
          response.wardData?.length
        ) {
          this.wardData = response.wardData
          this.processWardDataForChart()
          this.calculateWardSummary()
        } else {
          console.log("No ward data found")
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

    // Group data by ward name and sum up vehicles and weight
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

    // Convert to arrays for chart
    const wardNames: string[] = []
    const vehicleData: number[] = []
    const weightData: number[] = []

    wardMap.forEach((data, wardName) => {
      wardNames.push(wardName)
      vehicleData.push(data.vehicles)
      weightData.push(Number(data.weight.toFixed(1)))
    })

    // Update chart options
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

    console.log("Ward chart updated with data:", { wardNames, vehicleData, weightData })
  }

  calculateWardSummary(): void {
    if (!this.wardData || this.wardData.length === 0) {
      this.wardSummary = { totalWards: 0, topWard: "" }
      return
    }

    // Get unique ward names
    const uniqueWards = new Set(this.wardData.map(item => item.wardName))
    this.wardSummary.totalWards = uniqueWards.size

    // Find top ward by weight
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
    console.log("Ward summary calculated:", this.wardSummary)
  }

  resetWardData(): void {
    this.wardData = []
    this.wardSummary = { totalWards: 0, topWard: "" }
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

  refreshWardData(): void {
    this.loadWardData()
  }

  loadNewsData(): void {
    this.isLoadingNews = true

    // Create payload for news API
    const payload = {
      Type: "News",
      Priority: "",
      Date: new Date(),
      Year: new Date().getFullYear(),
      Category: "",
      Title: "",
      Content: "",
      TimeAgo: "",
      CreatedAt: new Date(),
      MonthYear: "",
      SiteLocation: "",
      EventDate: "",
      Notification: "",
      PageNumber: this.currentPage,
      PageSize: this.pageSize,
    }

    console.log("Loading news data with payload:", payload)

    // this.dbCallingService.getImportantUpdates(payload).subscribe({
    //   next: (response) => {
    //     console.log("News API Response:", response)
    //     if (response && response.length > 0) {
    //       this.allNews = response
    //       this.processNewsData()
    //     } else {
    //       console.log("No news data found")
    //       this.resetNewsData()
    //     }
    //     this.isLoadingNews = false
    //   },
    //   error: (error) => {
    //     console.error("News API Error:", error)
    //     this.resetNewsData()
    //     this.isLoadingNews = false
    //   },
    // })

    // this.dbCallingService.getImportantUpdates(payload).subscribe({
    //   next: (response: NewsItem[]) => {
    //     console.log("News API Response:", response)

    //     if (response && response.length > 0) {
    //       this.allNews = response
    //        this.filteredNews=[...this.allNews]
    //     } else {
    //       console.log("No news data found")
    //       this.resetNewsData()
    //     }
    //     this.isLoadingNews = false
    //   },
    //   error: (error: any) => {
    //     console.error("News API Error:", error)
    //     this.resetNewsData()
    //     this.isLoadingNews = false
    //   },
    // })
    this.dbCallingService.getImportantUpdates(payload).subscribe({
      next: (response: any) => {
        console.log("News API Response:", response)
        const newsItems = response?.data || []
        if (newsItems.length > 0) {
          this.allNews = newsItems
          this.filteredNews = [...this.allNews]
          this.processNewsData()
        } else {
          console.log("No news data found")
          this.resetNewsData()
        }
        this.isLoadingNews = false
      },
      error: (error: any) => {
        console.error("News API Error:", error)
        this.resetNewsData()
        this.isLoadingNews = false
      },
    })

  }

  processNewsData(): void {
    // Get available years
    this.availableYears = Array.from(new Set(this.allNews.map((news) => news.year)))
      .sort()
      .reverse()

    // Apply filters and pagination
    this.applyFiltersAndPagination()
  }

  applyFiltersAndPagination(): void {
    let filtered = [...this.allNews]

    // Apply year filter
    if (this.selectedYear) {
      filtered = filtered.filter((news) => news.year.toString() === this.selectedYear)
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (news) =>
          news.title.toLowerCase().includes(query) ||
          news.content.toLowerCase().includes(query) ||
          news.category.toLowerCase().includes(query)
      )
    }

    // Calculate pagination
    this.totalItems = filtered.length
    this.totalPages = Math.ceil(this.totalItems / this.pageSize)

    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize
    const endIndex = startIndex + this.pageSize
    this.filteredNews = filtered.slice(startIndex, endIndex)

    console.log("Filtered news:", {
      total: this.totalItems,
      pages: this.totalPages,
      currentPage: this.currentPage,
      filtered: this.filteredNews.length,
    })
  }

  resetNewsData(): void {
    this.allNews = []
    this.filteredNews = []
    this.availableYears = []
    this.totalItems = 0
    this.totalPages = 0
    this.currentPage = 1
  }

  onSearchChange(): void {
    this.currentPage = 1 // Reset to first page when searching
    this.applyFiltersAndPagination()
  }

  onYearChange(): void {
    this.currentPage = 1 // Reset to first page when changing year
    this.applyFiltersAndPagination()
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--
      this.applyFiltersAndPagination()
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++
      this.applyFiltersAndPagination()
    }
  }

  getNewsExcerpt(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  getReadTime(content: string): number {
    const wordsPerMinute = 200
    const wordCount = content.split(" ").length
    return Math.ceil(wordCount / wordsPerMinute)
  }

  formatNewsDate(dateStr: string): string {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  openNewsDetail(newsItem: NewsItem): void {
    // Implement modal or navigation to detailed view
    console.log("Opening news detail:", newsItem)
    // You can implement a modal here or navigate to a detailed page
  }
}
