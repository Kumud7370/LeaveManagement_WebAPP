import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { NgApexchartsModule } from "ng-apexcharts"
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
  yaxis: ApexYAxis | ApexYAxis[] // Remove optional to ensure it's always defined
  dataLabels: ApexDataLabels
  plotOptions: ApexPlotOptions
  colors: string[]
  grid: ApexGrid
  legend: ApexLegend // Remove optional to ensure it's always defined
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

interface NewsItem {
  date: string
  year: string
  title: string
  content: string
}

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
})
export class DashboardComponent implements OnInit {
  isLoading = true
  isLoadingWardData = false

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
    totalWards: 12,
    topWard: "Ward A",
  }

  // Chart colors matching search-report theme
  private primaryColor = "#1a2a6c"
  private secondaryColor = "#b21f1f"
  private accentColor = "#00ffcc"
  private successColor = "#10b981"
  private infoColor = "#3b82f6"
  private warningColor = "#f59e0b"

  // Mock ward data for chart
  wardData = [
    { wardName: "Ward A", vehicles: 145, weight: 1250.5 },
    { wardName: "Ward B", vehicles: 132, weight: 1180.3 },
    { wardName: "Ward C", vehicles: 98, weight: 890.2 },
    { wardName: "Ward D", vehicles: 87, weight: 765.8 },
    { wardName: "Ward E", vehicles: 76, weight: 680.4 },
    { wardName: "Ward F", vehicles: 65, weight: 590.1 },
  ]

  // News data
  allNews: NewsItem[] = [
    {
      date: "August 2, 2025",
      year: "2025",
      title: "Tech Giants Unite to Build Next-Gen AI Platform",
      content:
        "In a collaborative push, global technology firms have come together to launch a decentralized AI development platform. This open system supports multilingual neural engines and offers customizable LLMs for enterprise and research-grade usage. Early beta access has attracted over 50,000 developers.",
    },
    {
      date: "May 3, 2025",
      year: "2025",
      title: "DevMind IDE Revolutionizes AI-Assisted Coding",
      content:
        "A new AI-first Integrated Development Environment (IDE) named DevMind is making waves in the developer world. It provides intelligent code suggestions, auto-documentation, and built-in debugging powered by generative AI. Adoption is rising fast among backend and full-stack teams.",
    },
    {
      date: "February 16, 2025",
      year: "2025",
      title: "Global Hackathon Breaks Records with 300K+ Participants",
      content:
        "The 2025 Global Hackathon broke all participation records, uniting engineers across 120 countries under the theme 'Code for Earth.' Winning entries included energy-aware compilers and decentralized public healthcare apps for underserved regions.",
    },
    {
      date: "October 22, 2024",
      year: "2024",
      title: "React 19 Brings Built-in AI Coding Assistant",
      content:
        "React 19 introduces a native AI assistant to help developers optimize their components, improve accessibility, and debug complex state flows. The assistant integrates seamlessly with popular IDEs and cloud build tools.",
    },
    {
      date: "July 20, 2024",
      year: "2024",
      title: "Cross-Cloud Kubernetes Platform Reshapes DevOps",
      content:
        "A new cross-cloud orchestration layer for Kubernetes is now allowing real-time workload shifting across AWS, Azure, and GCP. This is expected to minimize downtime and reduce infrastructure costs for hybrid-cloud environments.",
    },
    {
      date: "March 28, 2024",
      year: "2024",
      title: "SpaceX Begins Beta for Mars Data Protocols",
      content:
        "In preparation for interplanetary communication, SpaceX has deployed early versions of Martian data protocols that manage 20-minute transmission delays and signal loss. Initial use will be telemetry for deep-space rovers.",
    },
  ]

  // News management
  filteredNews: NewsItem[] = []
  availableYears: string[] = []
  selectedYear = "all"
  expandedNewsItems = new Set<number>()
  newsDisplayLimit = 6

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
        data: this.wardData.map((w) => w.vehicles),
      },
      {
        name: "Weight (MT)",
        data: this.wardData.map((w) => w.weight),
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
      categories: this.wardData.map((w) => w.wardName),
      labels: {
        style: {
          fontSize: "12px",
          fontWeight: 500,
          colors: Array(this.wardData.length).fill(this.primaryColor),
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

  constructor() {}

  ngOnInit(): void {
    // Initialize news
    this.initializeNews()

    // Simulate loading
    setTimeout(() => {
      this.isLoading = false
    }, 1000)
  }

  initializeNews(): void {
    // Get available years
    this.availableYears = Array.from(new Set(this.allNews.map((news) => news.year)))
      .sort()
      .reverse()

    // Initialize filtered news
    this.filterNewsByYear("all")
  }

  filterNewsByYear(year: string): void {
    this.selectedYear = year
    this.expandedNewsItems.clear()

    if (year === "all") {
      this.filteredNews = this.allNews.slice(0, this.newsDisplayLimit)
    } else {
      const yearNews = this.allNews.filter((news) => news.year === year)
      this.filteredNews = yearNews.slice(0, this.newsDisplayLimit)
    }
  }

  toggleNewsExpansion(index: number): void {
    if (this.expandedNewsItems.has(index)) {
      this.expandedNewsItems.delete(index)
    } else {
      this.expandedNewsItems.add(index)
    }
  }

  getNewsContent(newsItem: NewsItem, index: number): string {
    const isExpanded = this.expandedNewsItems.has(index)
    if (isExpanded || newsItem.content.length <= 150) {
      return newsItem.content
    }
    return newsItem.content.substring(0, 150) + "..."
  }

  loadMoreNews(): void {
    const currentLength = this.filteredNews.length
    const sourceNews =
      this.selectedYear === "all" ? this.allNews : this.allNews.filter((news) => news.year === this.selectedYear)

    const nextBatch = sourceNews.slice(currentLength, currentLength + 6)
    this.filteredNews = [...this.filteredNews, ...nextBatch]
  }

  refreshWardData(): void {
    this.isLoadingWardData = true

    // Simulate API call
    setTimeout(() => {
      // Update ward data with new values (simulated)
      this.wardData = this.wardData.map((ward) => ({
        ...ward,
        vehicles: ward.vehicles + Math.floor(Math.random() * 10) - 5,
        weight: ward.weight + Math.random() * 100 - 50,
      }))

      // Update chart
      this.wardChartOptions = {
        ...this.wardChartOptions,
        series: [
          {
            name: "Vehicles",
            data: this.wardData.map((w) => Math.max(0, w.vehicles)),
          },
          {
            name: "Weight (MT)",
            data: this.wardData.map((w) => Math.max(0, Number(w.weight.toFixed(1)))),
          },
        ],
      }

      // Update ward summary
      const topWardByWeight = this.wardData.reduce((prev, current) => (prev.weight > current.weight ? prev : current))
      this.wardSummary.topWard = topWardByWeight.wardName

      this.isLoadingWardData = false
    }, 2000)
  }
}
