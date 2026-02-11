// import { Component, OnInit, HostListener, ViewChild, ElementRef } from "@angular/core"
// import { CommonModule } from "@angular/common"
// import { FormsModule } from "@angular/forms"
// import { NgApexchartsModule } from "ng-apexcharts"
// import { DbCallingService } from "src/app/core/services/db-calling.service"
// import moment from "moment"
// import type {
//   ApexAxisChartSeries,
//   ApexChart,
//   ApexXAxis,
//   ApexYAxis,
//   ApexDataLabels,
//   ApexPlotOptions,
//   ApexLegend,
//   ApexGrid,
//   ApexResponsive,
//   ApexStroke,
//   ApexMarkers,
// } from "ng-apexcharts"

// export type ChartOptions = {
//   series: ApexAxisChartSeries
//   chart: ApexChart
//   xaxis: ApexXAxis
//   yaxis: ApexYAxis | ApexYAxis[]
//   dataLabels: ApexDataLabels
//   plotOptions: ApexPlotOptions
//   colors: string[]
//   grid: ApexGrid
//   legend: ApexLegend
//   stroke: ApexStroke
//   markers: ApexMarkers
//   responsive?: ApexResponsive[]
// }

// export type PieChartOptions = {
//   series: number[]
//   chart: ApexChart
//   labels: string[]
//   colors: string[]
//   legend: ApexLegend
//   plotOptions: ApexPlotOptions
//   dataLabels: ApexDataLabels
//   responsive: ApexResponsive[]
// }

// export interface NewsItem {
//   id: number
//   type: string
//   priority: string
//   date: string
//   year: number
//   category: string
//   title: string
//   content: string
//   timeAgo: string
//   createdAt: string
//   monthYear: string
//   siteLocation: string
//   eventDate: string
//   notification: string
//   description?: string
//   isActive?: boolean
// }

// interface WardData {
//   wardName: string
//   vehicleCount: number
//   totalNetWeight: number
//   transactionDate: string
// }

// @Component({
//   selector: "app-dashboard",
//   templateUrl: "./dashboard.component.html",
//   styleUrls: ["./dashboard.component.scss"],
//   standalone: true,
//   imports: [CommonModule, NgApexchartsModule, FormsModule],
// })
// export class DashboardComponent implements OnInit {
//   isLoading = true
//   isLoadingWardData = false
//   isLoadingNews = false
//   isLoadingCumulative = false
//   showFullscreenChart = false
//   isMobileView = false
//   isChartZoomed = false
//   zoomLevel = 100
//   @ViewChild("chartContainer") chartContainer!: ElementRef
//   @ViewChild("fullscreenChartContainer") fullscreenChartContainer!: ElementRef

//   kanjurData = {
//     trips: 0,
//     netWeight: 0,
//   }

//   deonarData = {
//     trips: 0,
//     netWeight: 0,
//   }

//   last30DaysSummary = {
//     trips: 0,
//     netWeight: 0,
//     averageWardTrips: 0,
//     averageWardWeight: 0,
//   }

//   wardSummary = {
//     totalWards: 0,
//     topWard: "",
//   }

//   selectedSite = "SWM"

//   private primaryColor = "#1a2a6c"
//   private secondaryColor = "#b21f1f"
//   private accentColor = "#00ffcc"
//   private successColor = "#10b981"
//   private infoColor = "#3b82f6"
//   private warningColor = "#f59e0b"

//   wardData: WardData[] = []
//   allNews: NewsItem[] = []
//   filteredNews: NewsItem[] = []
//   availableYears: number[] = []
//   selectedYear = ""
//   searchQuery = ""
//   currentPage = 1
//   pageSize = 6
//   totalItems = 0
//   totalPages = 0
//   yDate: any

//   chartWidth: string | number = "100%"
//   fullscreenChartWidth: string | number = "100%" // Added property for expanded chart width
//   isSwiping = false

//   private touchStartX = 0
//   private touchEndX = 0

//   public vehicleChartOptions: PieChartOptions = {
//     series: [0, 0],
//     chart: {
//       type: "donut",
//       height: 350,
//       fontFamily: "Raleway, sans-serif",
//     },
//     labels: ["Kanjur", "Deonar"],
//     colors: [this.primaryColor, this.secondaryColor],
//     legend: {
//       position: "bottom", // Moved legend to bottom for better mobile visibility in expanded view
//       fontSize: "14px",
//       fontWeight: 500,
//       markers: {
//         width: 12,
//         height: 12,
//         radius: 6,
//       },
//     },
//     plotOptions: {
//       pie: {
//         donut: {
//           size: "60%",
//           labels: {
//             show: true,
//             total: {
//               show: true,
//               label: "Total Trips",
//               fontSize: "16px",
//               fontWeight: 600,
//               color: this.primaryColor,
//               formatter: () => "0",
//             },
//           },
//         },
//       },
//     },
//     dataLabels: {
//       enabled: true,
//       formatter: (val: number) => {
//         return Math.round(val) + "%"
//       },
//       style: {
//         fontSize: "14px",
//         fontWeight: "bold",
//         colors: ["#fff"],
//       },
//     },
//     responsive: [
//       {
//         breakpoint: 768,
//         options: {
//           chart: {
//             height: 300,
//           },
//           legend: {
//             position: "bottom",
//           },
//         },
//       },
//     ],
//   }

//   public fullscreenChartOptions: ChartOptions = {
//     series: [],
//     chart: {
//       type: "line",
//       height: 600,
//       fontFamily: "Raleway, sans-serif",
//       toolbar: {
//         show: true,
//         tools: {
//           download: true,
//           selection: false,
//           zoom: true,
//           zoomin: true,
//           zoomout: true,
//           pan: true,
//           reset: true,
//         },
//       },
//       zoom: {
//         enabled: true,
//         type: "x",
//         autoScaleYaxis: true,
//       },
//     },
//     plotOptions: {
//       bar: {
//         horizontal: false,
//         columnWidth: "45%",
//         borderRadius: 4,
//         dataLabels: {
//           position: "top",
//         },
//       },
//     },
//     dataLabels: {
//       enabled: true,
//       enabledOnSeries: [0],
//       formatter: (val: number) => {
//         return val.toFixed(1)
//       },
//       offsetY: -20,
//       style: {
//         fontSize: "12px",
//         fontWeight: "bold",
//         colors: [this.successColor],
//       },
//     },
//     stroke: {
//       width: [0, 3],
//       curve: "smooth",
//     },
//     markers: {
//       size: [0, 6],
//       colors: [this.successColor, this.primaryColor],
//       strokeColors: "#fff",
//       strokeWidth: 2,
//       hover: {
//         size: 8,
//       },
//     },
//     xaxis: {
//       categories: [],
//       labels: {
//         style: {
//           fontSize: "13px",
//           fontWeight: 500,
//           colors: [],
//         },
//         rotate: -45,
//         rotateAlways: false,
//         hideOverlappingLabels: true,
//         trim: false,
//         maxHeight: 150,
//       },
//     },
//     yaxis: [
//       {
//         title: {
//           text: "Cumulative Net Weight (MT)",
//           style: {
//             color: this.successColor,
//             fontSize: "14px",
//             fontWeight: 600,
//           },
//         },
//         labels: {
//           style: {
//             colors: [this.successColor],
//             fontSize: "12px",
//           },
//           formatter: (val: number) => val.toFixed(0),
//         },
//       },
//       {
//         opposite: true,
//         title: {
//           text: "Average Ward Weight (MT)",
//           style: {
//             color: this.primaryColor,
//             fontSize: "14px",
//             fontWeight: 600,
//           },
//         },
//         labels: {
//           style: {
//             colors: [this.primaryColor],
//             fontSize: "12px",
//           },
//           formatter: (val: number) => val.toFixed(0),
//         },
//       },
//     ],
//     colors: [this.successColor, this.primaryColor],
//     grid: {
//       borderColor: "#e5e7eb",
//       strokeDashArray: 3,
//       padding: {
//         top: 10,
//         right: 20,
//         bottom: 10,
//         left: 15,
//       },
//     },
//     legend: {
//       position: "top",
//       horizontalAlign: "center",
//       fontSize: "14px",
//       fontWeight: 500,
//       markers: {
//         width: 12,
//         height: 12,
//         radius: 6,
//       },
//     },
//   }

//   public wardChartOptions: ChartOptions = {
//     series: [
//       {
//         name: "Cumulative Net Weight (MT)",
//         data: [],
//         type: "column",
//       },
//       {
//         name: "Average Ward Weight (MT)",
//         data: [],
//         type: "line",
//       },
//     ],
//     chart: {
//       type: "line",
//       height: 400,
//       fontFamily: "Raleway, sans-serif",
//       toolbar: {
//         show: true,
//         tools: {
//           download: true,
//           selection: false,
//           zoom: false,
//           zoomin: false,
//           zoomout: false,
//           pan: false,
//           reset: false,
//         },
//       },
//     },
//     plotOptions: {
//       bar: {
//         horizontal: false,
//         columnWidth: "55%",
//         borderRadius: 4,
//         dataLabels: {
//           position: "top",
//         },
//       },
//     },
//     dataLabels: {
//       enabled: true,
//       enabledOnSeries: [0],
//       formatter: (val: number) => {
//         return val.toFixed(1)
//       },
//       offsetY: -20,
//       style: {
//         fontSize: "11px",
//         fontWeight: "bold",
//         colors: [this.successColor],
//       },
//     },
//     stroke: {
//       width: [0, 3],
//       curve: "smooth",
//     },
//     markers: {
//       size: [0, 5],
//       colors: [this.successColor, this.primaryColor],
//       strokeColors: "#fff",
//       strokeWidth: 2,
//       hover: {
//         size: 7,
//       },
//     },
//     xaxis: {
//       categories: [],
//       labels: {
//         style: {
//           fontSize: "12px",
//           fontWeight: 500,
//           colors: [],
//         },
//         rotate: -45,
//         rotateAlways: false,
//         hideOverlappingLabels: true,
//         trim: false,
//         maxHeight: 120,
//       },
//       tickPlacement: "on",
//     },
//     yaxis: [
//       {
//         title: {
//           text: "Cumulative Net Weight (MT)",
//           style: {
//             color: this.successColor,
//             fontSize: "12px",
//             fontWeight: 600,
//           },
//         },
//         labels: {
//           style: {
//             colors: [this.successColor],
//             fontSize: "11px",
//           },
//           formatter: (val: number) => val.toFixed(0),
//         },
//       },
//       {
//         opposite: true,
//         title: {
//           text: "Average Ward Weight (MT)",
//           style: {
//             color: this.primaryColor,
//             fontSize: "12px",
//             fontWeight: 600,
//           },
//         },
//         labels: {
//           style: {
//             colors: [this.primaryColor],
//             fontSize: "11px",
//           },
//           formatter: (val: number) => val.toFixed(0),
//         },
//       },
//     ],
//     colors: [this.successColor, this.primaryColor],
//     grid: {
//       borderColor: "#e5e7eb",
//       strokeDashArray: 3,
//       xaxis: {
//         lines: {
//           show: false,
//         },
//       },
//       yaxis: {
//         lines: {
//           show: true,
//         },
//       },
//       padding: {
//         top: 0,
//         right: 15,
//         bottom: 10,
//         left: 10,
//       },
//     },
//     legend: {
//       position: "top",
//       horizontalAlign: "center",
//       fontSize: "13px",
//       fontWeight: 500,
//       markers: {
//         width: 12,
//         height: 12,
//         radius: 6,
//       },
//       itemMargin: {
//         horizontal: 10,
//         vertical: 5,
//       },
//     },
//     responsive: [
//       {
//         breakpoint: 1200,
//         options: {
//           chart: {
//             height: 380,
//           },
//           xaxis: {
//             labels: {
//               style: {
//                 fontSize: "11px",
//               },
//             },
//           },
//         },
//       },
//       {
//         breakpoint: 1024,
//         options: {
//           chart: {
//             height: 400,
//           },
//           plotOptions: {
//             bar: {
//               columnWidth: "60%",
//             },
//           },
//           xaxis: {
//             labels: {
//               style: {
//                 fontSize: "11px",
//               },
//               rotate: -45,
//               rotateAlways: true,
//             },
//           },
//           legend: {
//             fontSize: "12px",
//           },
//         },
//       },
//       {
//         breakpoint: 768,
//         options: {
//           chart: {
//             height: 420,
//           },
//           plotOptions: {
//             bar: {
//               columnWidth: "65%",
//             },
//           },
//           xaxis: {
//             labels: {
//               style: {
//                 fontSize: "10px",
//                 fontWeight: 600,
//               },
//               rotate: -45,
//               rotateAlways: true,
//               maxHeight: 100,
//             },
//           },
//           yaxis: [
//             {
//               title: {
//                 text: "Cumulative (MT)",
//                 style: {
//                   fontSize: "11px",
//                 },
//               },
//               labels: {
//                 style: {
//                   fontSize: "10px",
//                 },
//               },
//             },
//             {
//               title: {
//                 text: "Average (MT)",
//                 style: {
//                   fontSize: "11px",
//                 },
//               },
//               labels: {
//                 style: {
//                   fontSize: "10px",
//                 },
//               },
//             },
//           ],
//           legend: {
//             fontSize: "11px",
//             position: "bottom",
//             horizontalAlign: "center",
//           },
//           dataLabels: {
//             style: {
//               fontSize: "10px",
//               fontWeight: "bold",
//             },
//             offsetY: -18,
//           },
//           markers: {
//             size: [0, 4],
//           },
//           grid: {
//             padding: {
//               right: 10,
//               left: 5,
//             },
//           },
//         },
//       },
//       {
//         breakpoint: 640,
//         options: {
//           chart: {
//             height: 420,
//           },
//           plotOptions: {
//             bar: {
//               columnWidth: "70%",
//               borderRadius: 3,
//             },
//           },
//           xaxis: {
//             labels: {
//               style: {
//                 fontSize: "9px",
//                 fontWeight: 700,
//               },
//               rotate: -45,
//               rotateAlways: true,
//               maxHeight: 90,
//             },
//           },
//           yaxis: [
//             {
//               title: {
//                 text: "Cumulative",
//                 style: {
//                   fontSize: "10px",
//                   fontWeight: 600,
//                 },
//               },
//               labels: {
//                 style: {
//                   fontSize: "9px",
//                   fontWeight: 600,
//                 },
//               },
//             },
//             {
//               title: {
//                 text: "Average",
//                 style: {
//                   fontSize: "10px",
//                   fontWeight: 600,
//                 },
//               },
//               labels: {
//                 style: {
//                   fontSize: "9px",
//                   fontWeight: 600,
//                 },
//               },
//             },
//           ],
//           legend: {
//             fontSize: "10px",
//             position: "bottom",
//             markers: {
//               width: 10,
//               height: 10,
//             },
//           },
//           dataLabels: {
//             enabled: true,
//             style: {
//               fontSize: "9px",
//               fontWeight: "900",
//             },
//             offsetY: -16,
//           },
//           markers: {
//             size: [0, 4],
//             strokeWidth: 1.5,
//           },
//           stroke: {
//             width: [0, 2.5],
//           },
//           grid: {
//             padding: {
//               right: 8,
//               left: 3,
//             },
//           },
//         },
//       },
//       {
//         breakpoint: 480,
//         options: {
//           chart: {
//             height: 420,
//           },
//           plotOptions: {
//             bar: {
//               columnWidth: "75%",
//               borderRadius: 2,
//             },
//           },
//           xaxis: {
//             labels: {
//               style: {
//                 fontSize: "8px",
//                 fontWeight: 700,
//               },
//               rotate: -50,
//               rotateAlways: true,
//               maxHeight: 85,
//             },
//           },
//           yaxis: [
//             {
//               title: {
//                 text: "Total",
//                 style: {
//                   fontSize: "9px",
//                   fontWeight: 700,
//                 },
//               },
//               labels: {
//                 style: {
//                   fontSize: "8px",
//                   fontWeight: 700,
//                 },
//                 formatter: (val: number) => val.toFixed(0),
//               },
//             },
//             {
//               title: {
//                 text: "Avg",
//                 style: {
//                   fontSize: "9px",
//                   fontWeight: 700,
//                 },
//               },
//               labels: {
//                 style: {
//                   fontSize: "8px",
//                   fontWeight: 700,
//                 },
//                 formatter: (val: number) => val.toFixed(0),
//               },
//             },
//           ],
//           legend: {
//             fontSize: "9px",
//             position: "bottom",
//             markers: {
//               width: 8,
//               height: 8,
//             },
//             itemMargin: {
//               horizontal: 8,
//               vertical: 3,
//             },
//           },
//           dataLabels: {
//             enabled: true,
//             style: {
//               fontSize: "8px",
//               fontWeight: "900",
//             },
//             offsetY: -14,
//           },
//           markers: {
//             size: [0, 3],
//             strokeWidth: 1,
//           },
//           stroke: {
//             width: [0, 2],
//           },
//           grid: {
//             padding: {
//               top: 0,
//               right: 5,
//               bottom: 5,
//               left: 0,
//             },
//           },
//         },
//       },
//     ],
//   }

//   swmSites: any[] = []
//   rtsSites: any[] = []
//   allSites: any[] = []

//   constructor(private dbCallingService: DbCallingService) { }

//   ngOnInit(): void {
//     this.yDate = moment().subtract(1, "days").format("DD-MM-YYYY")
//     const obj = {
//       DateFrom: moment().format("YYYY-MM-DD"),
//       UserId: Number(sessionStorage.getItem("UserId")),
//     }
//     this.isLoadingWardData = true
//     this.dbCallingService.GetWBTripSummary(obj).subscribe({
//       next: (response) => {
//         if (response.isSuccess) {
//           this.swmSites = response.data.swmSites || []
//           this.rtsSites = response.data.rtsSites || []
//           this.allSites = [...this.swmSites, ...this.rtsSites]
//           this.processDynamicSiteData()
//         }
//         this.isLoadingWardData = false
//       },
//       error: (error) => {
//         console.error("Error fetching site locations:", error)
//         this.isLoadingWardData = false
//       },
//     })

//     this.loadLast30DaysData()

//     setTimeout(() => {
//       this.isLoading = false
//     }, 1000)
//     this.checkMobileView()
//     this.setupTouchZoom()
//     this.updateChartWidth()
//   }

//   @HostListener("window:resize")
//   onResize(): void {
//     this.checkMobileView()
//     this.updateChartWidth()
//     this.updateFullscreenChartWidth() // Handle resize for expanded view
//   }

//   checkMobileView(): void {
//     this.isMobileView = window.innerWidth <= 992
//   }

//   openFullscreenChart(): void {
//     this.showFullscreenChart = true
//     this.zoomLevel = 100

//     // Force mobile view detection
//     this.checkMobileView()

//     // Wait for DOM to update, then set chart dimensions
//     setTimeout(() => {
//       this.updateFullscreenChartWidth()

//       this.fullscreenChartOptions = {
//         ...this.fullscreenChartOptions,
//         series: this.wardChartOptions.series,
//         chart: {
//           ...this.fullscreenChartOptions.chart,
//           height: this.isMobileView ? 450 : 600,
//         },
//         xaxis: {
//           ...this.fullscreenChartOptions.xaxis,
//           categories: this.wardChartOptions.xaxis.categories || [],
//           labels: {
//             ...this.fullscreenChartOptions.xaxis.labels,
//             style: {
//               ...this.fullscreenChartOptions.xaxis.labels?.style,
//               colors: Array(this.wardChartOptions.xaxis.categories?.length || 0).fill(this.primaryColor),
//             },
//           },
//         },
//       }
//     }, 100)

//     document.body.style.overflow = "hidden"
//   }

//   closeFullscreenChart(): void {
//     this.showFullscreenChart = false
//     this.zoomLevel = 100
//     this.fullscreenChartWidth = "100%" // Reset width
//     document.body.style.overflow = ""
//   }

//   zoomIn(): void {
//     if (this.zoomLevel < 250) {
//       // Increased max zoom to 250%
//       this.zoomLevel += 20
//       this.updateFullscreenChartWidth() // Recalculate width on zoom
//     }
//   }

//   zoomOut(): void {
//     if (this.zoomLevel > 60) {
//       this.zoomLevel -= 20
//       this.updateFullscreenChartWidth() // Recalculate width on zoom
//     }
//   }

//   resetZoom(): void {
//     this.zoomLevel = 100
//     this.updateFullscreenChartWidth() // Reset width calculation
//   }

//   updateFullscreenChartWidth(): void {
//     if (this.isMobileView) {
//       const categoryCount = this.wardChartOptions.xaxis?.categories?.length || 0
//       const baseBarWidth = 70 // Minimum readable width per bar
//       const zoomFactor = this.zoomLevel / 100
//       const minWidth = Math.max(window.innerWidth - 32, categoryCount * baseBarWidth * zoomFactor)
//       this.fullscreenChartWidth = `${minWidth}px`
//     } else {
//       this.fullscreenChartWidth = "100%"
//     }
//   }

//   setupTouchZoom(): void {
//     if (!this.chartContainer?.nativeElement) return

//     let initialDistance = 0
//     let initialScale = this.zoomLevel / 100

//     const container = this.chartContainer.nativeElement

//     container.addEventListener(
//       "touchstart",
//       (e: TouchEvent) => {
//         if (e.touches.length === 2) {
//           initialDistance = this.getDistance(e.touches[0], e.touches[1])
//           initialScale = this.zoomLevel / 100
//         } else if (e.touches.length === 1) {
//           this.touchStartX = e.touches[0].clientX
//         }
//       },
//       { passive: true },
//     )

//     container.addEventListener(
//       "touchmove",
//       (e: TouchEvent) => {
//         if (e.touches.length === 2) {
//           e.preventDefault()
//           const currentDistance = this.getDistance(e.touches[0], e.touches[1])
//           const scaleFactor = currentDistance / initialDistance

//           // Auto-open fullscreen if zooming in significantly
//           if (scaleFactor > 1.2 && !this.showFullscreenChart) {
//             this.openFullscreenChart()
//             return
//           }

//           const newScale = Math.min(Math.max(0.6, initialScale * scaleFactor), 2.5)
//           this.zoomLevel = Math.round(newScale * 100)
//           this.updateFullscreenChartWidth() // Support pinch-to-zoom width update
//         }
//       },
//       { passive: false },
//     )

//     container.addEventListener(
//       "touchend",
//       (e: TouchEvent) => {
//         if (e.changedTouches.length === 1 && !this.showFullscreenChart) {
//           this.touchEndX = e.changedTouches[0].clientX
//           this.handleSwipe()
//         }
//       },
//       { passive: true },
//     )
//   }

//   private handleSwipe(): void {
//     const swipeDistance = this.touchStartX - this.touchEndX
//     if (Math.abs(swipeDistance) > 50) {
//       this.isSwiping = true
//       setTimeout(() => (this.isSwiping = false), 1000)
//     }
//   }

//   private getDistance(touch1: Touch, touch2: Touch): number {
//     const dx = touch1.clientX - touch2.clientX
//     const dy = touch1.clientY - touch2.clientY
//     return Math.sqrt(dx * dx + dy * dy)
//   }

//   switchSite(site: string): void {
//     if (this.selectedSite === site) return
//     this.selectedSite = site
//     this.isLoadingCumulative = true
//     this.loadLast30DaysData()
//   }

//   processDynamicSiteData(): void {
//     let kanjurTrips = 0
//     let kanjurWeight = 0
//     let deonarTrips = 0
//     let deonarWeight = 0

//     this.swmSites.forEach((site) => {
//       if (site.siteName && site.siteName.toLowerCase().includes("kanjur")) {
//         kanjurTrips += site.vehicleCount || 0
//         kanjurWeight += site.netWeight || 0
//       } else if (site.siteName && site.siteName.toLowerCase().includes("deonar")) {
//         deonarTrips += site.vehicleCount || 0
//         deonarWeight += site.netWeight || 0
//       }
//     })

//     this.rtsSites.forEach((site) => {
//       if (site.siteName && site.siteName.toLowerCase().includes("kanjur")) {
//         kanjurTrips += site.vehicleCount || 0
//         kanjurWeight += site.netWeight || 0
//       } else if (site.siteName && site.siteName.toLowerCase().includes("deonar")) {
//         deonarTrips += site.vehicleCount || 0
//         deonarWeight += site.netWeight || 0
//       }
//     })

//     this.kanjurData = {
//       trips: kanjurTrips,
//       netWeight: kanjurWeight,
//     }

//     this.deonarData = {
//       trips: deonarTrips,
//       netWeight: deonarWeight,
//     }

//     this.updatePieChart()
//   }

//   loadLast30DaysData(): void {
//     const payload = {
//       UserId: Number(sessionStorage.getItem("UserId")),
//       FromDate: null,
//       ToDate: null,
//       SiteName: this.selectedSite,
//     }

//     this.dbCallingService.getCumulativeTripSummary(payload).subscribe({
//       next: (response) => {
//         if (response && response.data && response.data.length > 0) {
//           this.processCumulativeChartData(response.data)
//         } else {
//           this.wardChartOptions = {
//             ...this.wardChartOptions,
//             series: [
//               { name: "Cumulative Net Weight (MT)", data: [], type: "column" },
//               { name: "Average Ward Weight (MT)", data: [], type: "line" },
//             ],
//             xaxis: {
//               ...this.wardChartOptions.xaxis,
//               categories: [],
//             },
//           }
//         }
//         this.isLoadingCumulative = false
//       },
//       error: (error) => {
//         console.error("Error fetching cumulative summary:", error)
//         this.isLoadingCumulative = false
//       },
//     })
//   }

//   // processCumulativeChartData(data: any[]): void {
//   //   if (!data || data.length === 0) return

//   //   const wardNames: string[] = []
//   //   const cumulativeWeightData: number[] = []
//   //   const averageWeightData: number[] = []

//   //   data.forEach((item) => {
//   //     wardNames.push(item.ward)
//   //     cumulativeWeightData.push(Number(item.cumulativeNetWeight))
//   //     averageWeightData.push(Number(item.averageNetWeight))
//   //   })

//   //   const seriesData = [
//   //     {
//   //       name: "Cumulative Net Weight (MT)",
//   //       data: cumulativeWeightData,
//   //       type: "column" as const,
//   //     },
//   //     {
//   //       name: "Average Ward Weight (MT)",
//   //       data: averageWeightData,
//   //       type: "line" as const,
//   //     },
//   //   ]

//   //   this.wardChartOptions = {
//   //     ...this.wardChartOptions,
//   //     series: seriesData,
//   //     xaxis: {
//   //       ...this.wardChartOptions.xaxis,
//   //       categories: wardNames,
//   //       labels: {
//   //         ...this.wardChartOptions.xaxis.labels,
//   //         style: {
//   //           ...this.wardChartOptions.xaxis.labels?.style,
//   //           colors: Array(wardNames.length).fill(this.primaryColor),
//   //         },
//   //         rotate: -45,
//   //         rotateAlways: false,
//   //         hideOverlappingLabels: true,
//   //         trim: false,
//   //         maxHeight: 120,
//   //       },
//   //     },
//   //     stroke: {
//   //       width: [0, 3],
//   //       curve: "smooth",
//   //     },
//   //     markers: {
//   //       size: [0, 5],
//   //       colors: [this.successColor, this.primaryColor],
//   //       strokeColors: "#fff",
//   //       strokeWidth: 2,
//   //       hover: {
//   //         size: 7,
//   //       },
//   //     },
//   //   }

//   //   this.fullscreenChartOptions = {
//   //     ...this.fullscreenChartOptions,
//   //     series: seriesData,
//   //     xaxis: {
//   //       ...this.fullscreenChartOptions.xaxis,
//   //       categories: wardNames,
//   //       labels: {
//   //         ...this.fullscreenChartOptions.xaxis.labels,
//   //         style: {
//   //           ...this.fullscreenChartOptions.xaxis.labels?.style,
//   //           colors: Array(wardNames.length).fill(this.primaryColor),
//   //         },
//   //       },
//   //     },
//   //   }
//   // }
//   processCumulativeChartData(data: any[]): void {
//     if (!data || data.length === 0) return

//     const wardNames: string[] = []
//     const cumulativeWeightData: number[] = []
//     const averageWeightData: number[] = []

//     data.forEach((item) => {
//       wardNames.push(item.ward)
//       cumulativeWeightData.push(Number(item.cumulativeNetWeight))
//       averageWeightData.push(Number(item.averageNetWeight))
//     })

//     const seriesData = [
//       {
//         name: "Cumulative Net Weight (MT)",
//         data: cumulativeWeightData,
//         type: "column" as const,
//       },
//       {
//         name: "Average Ward Weight (MT)",
//         data: averageWeightData,
//         type: "line" as const,
//       },
//     ]

//     // Determine chart configuration based on data count
//     const categoryCount = wardNames.length
//     const isLargeDataset = categoryCount > 30
//     const isMediumDataset = categoryCount > 15

//     // Calculate optimal chart height for desktop
//     const desktopHeight = isLargeDataset ? 500 : isMediumDataset ? 450 : 400

//     // Configure label rotation
//     let labelRotation = 0
//     if (categoryCount > 20) labelRotation = -45
//     else if (categoryCount > 10) labelRotation = -30

//     this.wardChartOptions = {
//       ...this.wardChartOptions,
//       series: seriesData,
//       chart: {
//         ...this.wardChartOptions.chart,
//         height: this.isMobileView ? 420 : desktopHeight,
//       },
//       plotOptions: {
//         bar: {
//           horizontal: false,
//           columnWidth: categoryCount > 20 ? '75%' : categoryCount > 10 ? '65%' : '55%',
//           borderRadius: 4,
//           dataLabels: {
//             position: "top",
//           },
//         },
//       },
//       xaxis: {
//         ...this.wardChartOptions.xaxis,
//         categories: wardNames,
//         labels: {
//           ...this.wardChartOptions.xaxis.labels,
//           style: {
//             ...this.wardChartOptions.xaxis.labels?.style,
//             fontSize: categoryCount > 20 ? '10px' : '12px',
//             colors: Array(wardNames.length).fill(this.primaryColor),
//           },
//           rotate: labelRotation,
//           rotateAlways: categoryCount > 10,
//           hideOverlappingLabels: true,
//           trim: false,
//           maxHeight: 120,
//         },
//       },
//       dataLabels: {
//         enabled: categoryCount <= 25, // Disable data labels for very large datasets
//         enabledOnSeries: [0],
//         formatter: (val: number) => {
//           return val.toFixed(1)
//         },
//         offsetY: -20,
//         style: {
//           fontSize: categoryCount > 20 ? '10px' : '11px',
//           fontWeight: "bold",
//           colors: [this.successColor],
//         },
//       },
//       stroke: {
//         width: [0, 3],
//         curve: "smooth",
//       },
//       markers: {
//         size: [0, categoryCount > 25 ? 4 : 5],
//         colors: [this.successColor, this.primaryColor],
//         strokeColors: "#fff",
//         strokeWidth: 2,
//         hover: {
//           size: 7,
//         },
//       },
//     }

//     this.fullscreenChartOptions = {
//       ...this.fullscreenChartOptions,
//       series: seriesData,
//       xaxis: {
//         ...this.fullscreenChartOptions.xaxis,
//         categories: wardNames,
//         labels: {
//           ...this.fullscreenChartOptions.xaxis.labels,
//           style: {
//             ...this.fullscreenChartOptions.xaxis.labels?.style,
//             colors: Array(wardNames.length).fill(this.primaryColor),
//           },
//         },
//       },
//     }

//     // Update chart width for scrolling if needed
//     this.updateChartWidth()
//   }

//   calculateLast30DaysSummary(wardData: WardData[]): void {
//     let totalTrips = 0
//     let totalWeight = 0
//     const uniqueWards = new Set<string>()

//     wardData.forEach((item) => {
//       totalTrips += item.vehicleCount || 0
//       totalWeight += item.totalNetWeight || 0
//       if (item.wardName) {
//         uniqueWards.add(item.wardName)
//       }
//     })

//     const wardCount = uniqueWards.size || 1

//     this.last30DaysSummary = {
//       trips: totalTrips,
//       netWeight: Number(totalWeight.toFixed(2)),
//       averageWardTrips: Number((totalTrips / wardCount).toFixed(2)),
//       averageWardWeight: Number((totalWeight / wardCount).toFixed(2)),
//     }
//   }

//   updatePieChart(): void {
//     const totalTrips = this.kanjurData.trips + this.deonarData.trips

//     this.vehicleChartOptions = {
//       ...this.vehicleChartOptions,
//       series: [this.kanjurData.trips, this.deonarData.trips],
//       plotOptions: {
//         pie: {
//           donut: {
//             size: "60%",
//             labels: {
//               show: true,
//               total: {
//                 show: true,
//                 label: "Total Trips",
//                 fontSize: "16px",
//                 fontWeight: 600,
//                 color: this.primaryColor,
//                 formatter: () => totalTrips.toString(),
//               },
//             },
//           },
//         },
//       },
//     }
//   }

//   loadWardData(): void {
//     this.isLoadingWardData = true
//     const currentDate = new Date()
//     const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`

//     const payload = {
//       WeighBridge: "",
//       FromDate: `${currentMonth}-01`,
//       ToDate: "",
//       FullDate: "",
//       WardName: "",
//       Act_Shift: "",
//       TransactionDate: `${currentMonth}-01`,
//     }

//     console.log("Loading ward data with payload:", payload)

//     this.dbCallingService.getWardwiseReport(payload).subscribe({
//       next: (response) => {
//         console.log("Ward API Response:", response)
//         if (
//           response &&
//           (response.serviceResponse === 1 || response.ServiceResponse === "Successful") &&
//           response.wardData?.length
//         ) {
//           this.wardData = response.wardData
//           this.processWardDataForChart()
//           this.calculateWardSummary()
//         } else {
//           console.log("No ward data found")
//           this.resetWardData()
//         }
//         this.isLoadingWardData = false
//       },
//       error: (error) => {
//         console.error("Ward API Error:", error)
//         this.resetWardData()
//         this.isLoadingWardData = false
//       },
//     })
//   }

//   processWardDataForChart(): void {
//     if (!this.wardData || this.wardData.length === 0) {
//       this.resetWardData()
//       return
//     }

//     const wardMap = new Map<string, { vehicles: number; weight: number }>()

//     this.wardData.forEach((item) => {
//       const wardName = item.wardName || "Unknown"
//       const vehicles = item.vehicleCount || 0
//       const weight = item.totalNetWeight || 0

//       if (wardMap.has(wardName)) {
//         const existing = wardMap.get(wardName)!
//         existing.vehicles += vehicles
//         existing.weight += weight
//       } else {
//         wardMap.set(wardName, { vehicles, weight })
//       }
//     })

//     const wardNames: string[] = []
//     const vehicleData: number[] = []
//     const weightData: number[] = []

//     wardMap.forEach((data, wardName) => {
//       wardNames.push(wardName)
//       vehicleData.push(data.vehicles)
//       weightData.push(Number(data.weight.toFixed(1)))
//     })

//     this.wardChartOptions = {
//       ...this.wardChartOptions,
//       series: [
//         {
//           name: "Trips",
//           data: vehicleData,
//         },
//         {
//           name: "Weight (MT)",
//           data: weightData,
//         },
//       ],
//       xaxis: {
//         ...this.wardChartOptions.xaxis,
//         categories: wardNames,
//         labels: {
//           ...this.wardChartOptions.xaxis.labels,
//           style: {
//             ...this.wardChartOptions.xaxis.labels?.style,
//             colors: Array(wardNames.length).fill(this.primaryColor),
//           },
//         },
//       },
//     }

//     console.log("Ward chart updated with data:", { wardNames, vehicleData, weightData })
//   }

//   calculateWardSummary(): void {
//     if (!this.wardData || this.wardData.length === 0) {
//       this.wardSummary = { totalWards: 0, topWard: "" }
//       return
//     }

//     const uniqueWards = new Set(this.wardData.map((item) => item.wardName))
//     this.wardSummary.totalWards = uniqueWards.size

//     const wardTotals = new Map<string, number>()
//     this.wardData.forEach((item) => {
//       const wardName = item.wardName || "Unknown"
//       const weight = item.totalNetWeight || 0
//       wardTotals.set(wardName, (wardTotals.get(wardName) || 0) + weight)
//     })

//     let maxWeight = 0
//     let topWard = ""
//     wardTotals.forEach((weight, wardName) => {
//       if (weight > maxWeight) {
//         maxWeight = weight
//         topWard = wardName
//       }
//     })

//     this.wardSummary.topWard = topWard
//     console.log("Ward summary calculated:", this.wardSummary)
//   }

//   resetWardData(): void {
//     this.wardData = []
//     this.wardSummary = { totalWards: 0, topWard: "" }
//     this.wardChartOptions = {
//       ...this.wardChartOptions,
//       series: [
//         { name: "Trips", data: [] },
//         { name: "Weight (MT)", data: [] },
//       ],
//       xaxis: {
//         ...this.wardChartOptions.xaxis,
//         categories: [],
//       },
//     }
//   }

//   refreshWardData(): void {
//     this.loadWardData()
//   }

//   loadNewsData(): void {
//     this.isLoadingNews = true

//     const payload = {
//       Type: "News",
//       Priority: "",
//       Date: new Date(),
//       Year: new Date().getFullYear(),
//       Category: "",
//       Title: "",
//       Content: "",
//       TimeAgo: "",
//       CreatedAt: new Date(),
//       MonthYear: "",
//       SiteLocation: "",
//       EventDate: "",
//       Notification: "",
//       PageNumber: this.currentPage,
//       PageSize: this.pageSize,
//     }

//     console.log("Loading news data with payload:", payload)

//     this.dbCallingService.getImportantUpdates(payload).subscribe({
//       next: (response: any) => {
//         console.log("News API Response:", response)
//         const newsItems = response?.data || []
//         if (newsItems.length > 0) {
//           this.allNews = newsItems
//           this.filteredNews = [...this.allNews]
//           this.processNewsData()
//         } else {
//           console.log("No news data found")
//           this.resetNewsData()
//         }
//         this.isLoadingNews = false
//       },
//       error: (error: any) => {
//         console.error("News API Error:", error)
//         this.resetNewsData()
//         this.isLoadingNews = false
//       },
//     })
//   }

//   processNewsData(): void {
//     this.availableYears = Array.from(new Set(this.allNews.map((news) => news.year)))
//       .sort()
//       .reverse()

//     this.applyFiltersAndPagination()
//   }

//   applyFiltersAndPagination(): void {
//     let filtered = [...this.allNews]

//     if (this.selectedYear) {
//       filtered = filtered.filter((news) => news.year.toString() === this.selectedYear)
//     }

//     if (this.searchQuery.trim()) {
//       const query = this.searchQuery.toLowerCase().trim()
//       filtered = filtered.filter(
//         (news) =>
//           news.title.toLowerCase().includes(query) ||
//           news.content.toLowerCase().includes(query) ||
//           news.category.toLowerCase().includes(query),
//       )
//     }

//     this.totalItems = filtered.length
//     this.totalPages = Math.ceil(this.totalItems / this.pageSize)

//     const startIndex = (this.currentPage - 1) * this.pageSize
//     const endIndex = startIndex + this.pageSize
//     this.filteredNews = filtered.slice(startIndex, endIndex)

//     console.log("Filtered news:", {
//       total: this.totalItems,
//       pages: this.totalPages,
//       currentPage: this.currentPage,
//       filtered: this.filteredNews.length,
//     })
//   }

//   resetNewsData(): void {
//     this.allNews = []
//     this.filteredNews = []
//     this.availableYears = []
//     this.totalItems = 0
//     this.totalPages = 0
//     this.currentPage = 1
//   }

//   onSearchChange(): void {
//     this.currentPage = 1
//     this.applyFiltersAndPagination()
//   }

//   onYearChange(): void {
//     this.currentPage = 1
//     this.applyFiltersAndPagination()
//   }

//   goToPreviousPage(): void {
//     if (this.currentPage > 1) {
//       this.currentPage--
//       this.applyFiltersAndPagination()
//     }
//   }

//   goToNextPage(): void {
//     if (this.currentPage < this.totalPages) {
//       this.currentPage++
//       this.applyFiltersAndPagination()
//     }
//   }

//   getNewsExcerpt(content: string, maxLength: number): string {
//     if (content.length <= maxLength) return content
//     return content.substring(0, maxLength) + "..."
//   }

//   getReadTime(content: string): number {
//     const wordsPerMinute = 200
//     const wordCount = content.split(" ").length
//     return Math.ceil(wordCount / wordsPerMinute)
//   }

//   formatNewsDate(dateStr: string): string {
//     if (!dateStr) return ""
//     const date = new Date(dateStr)
//     return date.toLocaleDateString("en-US", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     })
//   }

//   openNewsDetail(newsItem: NewsItem): void {
//     console.log("Opening news detail:", newsItem)
//   }

//   // updateChartWidth(): void {
//   //   if (this.isMobileView) {
//   //     const categoryCount = this.wardChartOptions.xaxis?.categories?.length || 0
//   //     const barPadding = 80
//   //     const minWidth = Math.max(window.innerWidth - 40, categoryCount * barPadding)
//   //     this.chartWidth = `${minWidth}px`
//   //   } else {
//   //     this.chartWidth = "100%"
//   //   }
//   // }

//   updateChartWidth(): void {
//     const categoryCount = this.wardChartOptions.xaxis?.categories?.length || 0

//     if (this.isMobileView) {
//       // Mobile: Always enable horizontal scroll for better readability
//       const barPadding = 80
//       const minWidth = Math.max(window.innerWidth - 40, categoryCount * barPadding)
//       this.chartWidth = `${minWidth}px`
//     } else {
//       // Desktop: Smart scrolling based on data density
//       if (categoryCount > 30) {
//         // Very large dataset: Enable horizontal scroll
//         const barWidth = 50 // Narrower bars for many categories
//         const minWidth = categoryCount * barWidth
//         this.chartWidth = `${Math.max(minWidth, 1000)}px`
//       } else if (categoryCount > 20) {
//         // Medium-large dataset: Slight scroll if needed
//         const barWidth = 55
//         const minWidth = categoryCount * barWidth
//         const containerWidth = this.chartContainer?.nativeElement?.offsetWidth || 1200
//         this.chartWidth = minWidth > containerWidth ? `${minWidth}px` : '100%'
//       } else {
//         // Small to medium dataset: No scroll, fit to container
//         this.chartWidth = "100%"
//       }
//     }
//   }
// }
