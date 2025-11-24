import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { NgApexchartsModule } from "ng-apexcharts"
import { DbCallingService } from "src/app/core/services/db-calling.service"
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

  kanjurData = {
    trips: 0,
    netWeight: 0,
  }

  deonarData = {
    trips: 0,
    netWeight: 0,
  }

  last30DaysSummary = {
    trips: 0,
    netWeight: 0,
    averageWardTrips: 0,
    averageWardWeight: 0,
  }

  wardSummary = {
    totalWards: 0,
    topWard: "",
  }

  private primaryColor = "#1a2a6c"
  private secondaryColor = "#b21f1f"
  private accentColor = "#00ffcc"
  private successColor = "#10b981"
  private infoColor = "#3b82f6"
  private warningColor = "#f59e0b"

  wardData: WardData[] = []
  allNews: NewsItem[] = []
  filteredNews: NewsItem[] = []
  availableYears: number[] = []
  selectedYear = ""
  searchQuery = ""
  currentPage = 1
  pageSize = 6
  totalItems = 0
  totalPages = 0
  yDate: any

  public vehicleChartOptions: PieChartOptions = {
    series: [0, 0],
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
              label: "Total Trips",
              fontSize: "16px",
              fontWeight: 600,
              color: this.primaryColor,
              formatter: () => "0",
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
        name: "Cumulative Net Weight (MT)",
        data: [],
        type: "column",
      },
      {
        name: "Average Ward Weight (MT)",
        data: [],
        type: "line",
      },
    ],
    chart: {
      type: "bar",
      height: 400,
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
        columnWidth: "50%",
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
          return val.toFixed(1) + " MT"
        } else {
          return val.toFixed(1) + " MT"
        }
      },
      offsetY: -20,
      style: {
        fontSize: "10px",
        fontWeight: "bold",
        colors: [this.successColor],
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
          text: "Cumulative Net Weight (MT)",
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
      {
        opposite: true,
        title: {
          text: "Average Ward Weight (MT)",
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
    ],
    colors: [this.successColor, this.primaryColor],
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

  swmSites: any[] = []
  rtsSites: any[] = []
  allSites: any[] = []

  constructor(private dbCallingService: DbCallingService) { }

  ngOnInit(): void {
    this.yDate = moment().subtract(1, "days").format("DD-MM-YYYY")
    const obj = {
      DateFrom: moment().format("YYYY-MM-DD"),
      UserId: Number(sessionStorage.getItem("UserId")),
    }
    this.isLoadingWardData = true
    this.dbCallingService.GetWBTripSummary(obj).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.swmSites = response.data.swmSites || []
          this.rtsSites = response.data.rtsSites || []
          this.allSites = [...this.swmSites, ...this.rtsSites]
          this.processDynamicSiteData()
        }
        this.isLoadingWardData = false
      },
      error: (error) => {
        console.error("Error fetching site locations:", error)
        this.isLoadingWardData = false
      },
    })

    // this.loadLast30DaysData()
    this.loadLast30DaysData();

    setTimeout(() => {
      this.isLoading = false
    }, 1000)
  }

  processDynamicSiteData(): void {
    let kanjurTrips = 0
    let kanjurWeight = 0
    let deonarTrips = 0
    let deonarWeight = 0

    this.swmSites.forEach((site) => {
      if (site.siteName && site.siteName.toLowerCase().includes("kanjur")) {
        kanjurTrips += site.vehicleCount || 0
        kanjurWeight += site.netWeight || 0
      } else if (site.siteName && site.siteName.toLowerCase().includes("deonar")) {
        deonarTrips += site.vehicleCount || 0
        deonarWeight += site.netWeight || 0
      }
    })

    this.rtsSites.forEach((site) => {
      if (site.siteName && site.siteName.toLowerCase().includes("kanjur")) {
        kanjurTrips += site.vehicleCount || 0
        kanjurWeight += site.netWeight || 0
      } else if (site.siteName && site.siteName.toLowerCase().includes("deonar")) {
        deonarTrips += site.vehicleCount || 0
        deonarWeight += site.netWeight || 0
      }
    })

    this.kanjurData = {
      trips: kanjurTrips,
      netWeight: kanjurWeight,
    }

    this.deonarData = {
      trips: deonarTrips,
      netWeight: deonarWeight,
    }

    this.updatePieChart()
  }

  // loadLast30DaysData(): void {
  //   const toDate = moment().format("YYYY-MM-DD")
  //   const fromDate = moment().subtract(30, "days").format("YYYY-MM-DD")

  //   const payload = {
  //     WeighBridge: "",
  //     FromDate: fromDate,
  //     ToDate: toDate,
  //     FullDate: "",
  //     WardName: "",
  //     Act_Shift: "",
  //     TransactionDate: "",
  //   }

  //   this.dbCallingService.getWardwiseReport(payload).subscribe({
  //     next: (response) => {
  //       if (response && response.wardData && response.wardData.length > 0) {
  //         this.calculateLast30DaysSummary(response.wardData)
  //         this.processLast30DaysChartData(response.wardData)
  //       }
  //     },
  //     error: (error) => {
  //       console.error("Error fetching 30-day data:", error)
  //     },
  //   })
  // }
  loadLast30DaysData(): void {
    const payload = {
      UserId: Number(sessionStorage.getItem("UserId")),
      FromDate: null,
      ToDate: null,
      SiteName: "SWM"
    };

    this.dbCallingService.getCumulativeTripSummary(payload).subscribe({
      next: (response) => {
        if (response && response.data && response.data.length > 0) {
          this.processCumulativeChartData(response.data);
        }
      },
      error: (error) => {
        console.error("Error fetching cumulative summary:", error);
      },
    });
  }

  processCumulativeChartData(data: any[]): void {
    if (!data || data.length === 0) return;

    const wardNames: string[] = [];
    const cumulativeWeightData: number[] = [];
    const averageWeightData: number[] = [];

    data.forEach(item => {
      wardNames.push(item.ward);
      cumulativeWeightData.push(Number(item.cumulativeNetWeight));
      averageWeightData.push(Number(item.averageNetWeight));
    });

    this.wardChartOptions = {
      ...this.wardChartOptions,
      series: [
        {
          name: "Cumulative Net Weight (MT)",
          data: cumulativeWeightData,
          type: "column",
        },
        {
          name: "Average Ward Weight (MT)",
          data: averageWeightData,
          type: "line",
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
    };

    console.log("Cumulative Chart Updated:", {
      wardNames,
      cumulativeWeightData,
      averageWeightData
    });
  }


  calculateLast30DaysSummary(wardData: WardData[]): void {
    let totalTrips = 0
    let totalWeight = 0
    const uniqueWards = new Set<string>()

    wardData.forEach((item) => {
      totalTrips += item.vehicleCount || 0
      totalWeight += item.totalNetWeight || 0
      if (item.wardName) {
        uniqueWards.add(item.wardName)
      }
    })

    const wardCount = uniqueWards.size || 1

    this.last30DaysSummary = {
      trips: totalTrips,
      netWeight: Number(totalWeight.toFixed(2)),
      averageWardTrips: Number((totalTrips / wardCount).toFixed(2)),
      averageWardWeight: Number((totalWeight / wardCount).toFixed(2)),
    }

    console.log("Last 30 days summary:", this.last30DaysSummary)
  }

  processLast30DaysChartData(wardData: WardData[]): void {
    if (!wardData || wardData.length === 0) {
      return
    }

    const wardMap = new Map<string, { cumulativeWeight: number; count: number }>()

    wardData.forEach((item) => {
      const wardName = item.wardName || "Unknown"
      const weight = item.totalNetWeight || 0

      if (wardMap.has(wardName)) {
        const existing = wardMap.get(wardName)!
        existing.cumulativeWeight += weight
        existing.count += 1
      } else {
        wardMap.set(wardName, { cumulativeWeight: weight, count: 1 })
      }
    })

    const wardNames: string[] = []
    const cumulativeWeightData: number[] = []
    const averageWeightData: number[] = []

    wardMap.forEach((data, wardName) => {
      wardNames.push(wardName)
      cumulativeWeightData.push(Number(data.cumulativeWeight.toFixed(2)))
      averageWeightData.push(Number((data.cumulativeWeight / data.count).toFixed(2)))
    })

    this.wardChartOptions = {
      ...this.wardChartOptions,
      series: [
        {
          name: "Cumulative Net Weight (MT)",
          data: cumulativeWeightData,
          type: "column",
        },
        {
          name: "Average Ward Weight (MT)",
          data: averageWeightData,
          type: "line",
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

    console.log("Last 30 days chart updated:", {
      wardNames,
      cumulativeWeightData,
      averageWeightData,
    })
  }

  updatePieChart(): void {
    const totalTrips = this.kanjurData.trips + this.deonarData.trips

    this.vehicleChartOptions = {
      ...this.vehicleChartOptions,
      series: [this.kanjurData.trips, this.deonarData.trips],
      plotOptions: {
        pie: {
          donut: {
            size: "60%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total Trips",
                fontSize: "16px",
                fontWeight: 600,
                color: this.primaryColor,
                formatter: () => totalTrips.toString(),
              },
            },
          },
        },
      },
    }
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
          name: "Trips",
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
    console.log("Ward summary calculated:", this.wardSummary)
  }

  resetWardData(): void {
    this.wardData = []
    this.wardSummary = { totalWards: 0, topWard: "" }
    this.wardChartOptions = {
      ...this.wardChartOptions,
      series: [
        { name: "Trips", data: [] },
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
    this.availableYears = Array.from(new Set(this.allNews.map((news) => news.year)))
      .sort()
      .reverse()

    this.applyFiltersAndPagination()
  }

  applyFiltersAndPagination(): void {
    let filtered = [...this.allNews]

    if (this.selectedYear) {
      filtered = filtered.filter((news) => news.year.toString() === this.selectedYear)
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (news) =>
          news.title.toLowerCase().includes(query) ||
          news.content.toLowerCase().includes(query) ||
          news.category.toLowerCase().includes(query),
      )
    }

    this.totalItems = filtered.length
    this.totalPages = Math.ceil(this.totalItems / this.pageSize)

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
    this.currentPage = 1
    this.applyFiltersAndPagination()
  }

  onYearChange(): void {
    this.currentPage = 1
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
    console.log("Opening news detail:", newsItem)
  }
}
