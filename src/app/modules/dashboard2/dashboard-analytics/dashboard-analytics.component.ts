// import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, OnChanges, HostListener, ViewChild, ElementRef } from "@angular/core"
// import { CommonModule } from "@angular/common"
// import { FormsModule } from "@angular/forms"
// import { NgApexchartsModule } from "ng-apexcharts"
// import { DbCallingService } from "src/app/core/services/db-calling.service"
// import { Subject, takeUntil } from "rxjs"

// @Component({
//   selector: 'app-dashboard-analytics',
//   imports: [CommonModule, NgApexchartsModule, FormsModule],
//   templateUrl: './dashboard-analytics.component.html',
//   styleUrl: './dashboard-analytics.component.scss'
// })
// export class DashboardAnalyticsComponent implements OnChanges, OnDestroy {
//   @Input() data: any;
//   @ViewChild('wardChartWrapper', { static: false }) wardChartWrapper!: ElementRef;

//   private destroy$ = new Subject<void>()
//   isLoading = true

//   pieChartOptionsSWMWeightDistribution!: any;
//   pieChartOptionsSWMVehicleType!: any;
//   wardwiseChartOptions!: any;

//   kanjurData = { trips: 0, netWeight: 0 }
//   deonarData = { trips: 0, netWeight: 0 }
//   totalData = { trips: 0, netWeight: 0 }

//   // Ward chart controls state
//   wardChartState = {
//     zoomLevel: 100,
//     isFullscreen: false,
//     showDataTable: false,
//     chartType: 'combined' as 'combined' | 'bar' | 'line',
//     showGridLines: true
//   }

//   // Ward data for table view
//   wardTableData: any[] = [];

//   // Distinct color palette to avoid white/invisible colors
//   private readonly distinctColors = [
//     '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
//     '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#6366f1', '#a855f7',
//     '#d946ef', '#0ea5e9', '#22c55e', '#eab308', '#dc2626', '#7c3aed',
//     '#db2777', '#0d9488'
//   ];

//   constructor(
//     private dbCallingService: DbCallingService,
//     private cdr: ChangeDetectorRef
//   ) { }

//   ngOnChanges(): void {
//     if (this.data?.length) {
//       this.loadPieChart()
//       this.loadVehicleTypePie();
//       this.prepareWardwiseChart();
//       this.updateChartResponsiveness()
//     }
//   }

//   loadPieChart() {
//     const swmData = this.data;

//     const kanjurTotal = swmData
//       .filter((x: any) => x.siteName === 'Kanjur')
//       .reduce((sum: number, cur: any) => sum + (cur.totalNetWeight || 0), 0);
//     const kanjurTotalTrips = swmData
//       .filter((x: any) => x.siteName === 'Kanjur')
//       .length;

//     const deonarTotal = swmData
//       .filter((x: any) => x.siteName === 'Deonar')
//       .reduce((sum: number, cur: any) => sum + (cur.totalNetWeight || 0), 0);
//     const deonarTotalTrips = swmData
//       .filter((x: any) => x.siteName === 'Deonar')
//       .length;

//     this.kanjurData.trips = kanjurTotalTrips;
//     this.kanjurData.netWeight = kanjurTotal;
//     this.deonarData.trips = deonarTotalTrips;
//     this.deonarData.netWeight = deonarTotal;
//     this.totalData.trips = kanjurTotalTrips + deonarTotalTrips;
//     this.totalData.netWeight = kanjurTotal + deonarTotal;

//     const series: number[] = [kanjurTotal, deonarTotal];
//     const total = kanjurTotal + deonarTotal;

//     this.pieChartOptionsSWMWeightDistribution = {
//       series,
//       chart: {
//         type: "donut",
//         height: 320,
//         fontFamily: 'inherit'
//       },
//       labels: ['Kanjur', 'Deonar'],
//       colors: ['#3b82f6', '#10b981'],
//       legend: {
//         position: 'bottom',
//         horizontalAlign: 'center',
//         floating: false,
//         fontSize: '12px',
//         fontWeight: 500,
//         itemMargin: {
//           horizontal: 12,
//           vertical: 5
//         },
//         markers: {
//           width: 12,
//           height: 12,
//           radius: 2
//         }
//       },
//       dataLabels: {
//         enabled: true,
//         formatter: (val: number) => `${val.toFixed(1)}%`,
//         style: {
//           fontSize: '13px',
//           fontWeight: 700,
//           colors: ['#fff']
//         },
//         dropShadow: {
//           enabled: true,
//           top: 2,
//           left: 2,
//           blur: 3,
//           opacity: 0.5
//         }
//       },
//       tooltip: {
//         y: {
//           formatter: (val: number) => `${val.toFixed(2)} MT`
//         }
//       },
//       plotOptions: {
//         pie: {
//           donut: {
//             size: '65%',
//             labels: {
//               show: true,
//               name: {
//                 show: true,
//                 fontSize: '14px',
//                 fontWeight: 600,
//                 color: '#2d3748'
//               },
//               value: {
//                 show: true,
//                 fontSize: '20px',
//                 fontWeight: 700,
//                 color: '#1a202c',
//                 formatter: (val: string) => `${parseFloat(val).toFixed(2)} MT`
//               },
//               total: {
//                 show: true,
//                 label: 'Total Net Weight',
//                 fontSize: '13px',
//                 fontWeight: 600,
//                 color: '#4a5568',
//                 formatter: () => `${total.toFixed(2)} MT`
//               }
//             }
//           }
//         }
//       },
//       responsive: [
//         {
//           breakpoint: 768,
//           options: {
//             chart: { height: 300 },
//             legend: {
//               fontSize: '11px',
//               itemMargin: { horizontal: 10, vertical: 4 }
//             }
//           }
//         }
//       ]
//     };

//     this.isLoading = false;
//   }

//   loadVehicleTypePie() {
//     const swmVehcleTypeData = this.data
//       .filter((x: any) => x.siteName === 'Kanjur' || x.siteName === 'Deonar');

//     const grouped = swmVehcleTypeData.reduce((acc: any, cur: any) => {
//       acc[cur.vehicleType] = (acc[cur.vehicleType] || 0) + cur.totalNetWeight;
//       return acc;
//     }, {});

//     const labels = Object.keys(grouped);
//     const series = Object.values(grouped) as number[];
//     const total = series.reduce((a, b) => a + b, 0);

//     const colors = labels.map((_, index) => this.distinctColors[index % this.distinctColors.length]);

//     this.pieChartOptionsSWMVehicleType = {
//       series,
//       chart: {
//         type: 'donut',
//         height: 400,
//         fontFamily: 'inherit'
//       },
//       labels,
//       colors: colors,
//       legend: {
//         position: 'bottom',
//         horizontalAlign: 'center',
//         floating: false,
//         fontSize: '11px',
//         fontWeight: 500,
//         itemMargin: {
//           horizontal: 10,
//           vertical: 5
//         },
//         markers: {
//           width: 11,
//           height: 11,
//           radius: 2,
//           offsetX: -2
//         },
//         formatter: function (seriesName: string, opts: any) {
//           const value = opts.w.globals.series[opts.seriesIndex];
//           const percentage = ((value / total) * 100).toFixed(1);
//           const displayName = seriesName.length > 20
//             ? seriesName.substring(0, 18) + '...'
//             : seriesName;
//           return `${displayName}: ${percentage}%`;
//         },
//         onItemClick: {
//           toggleDataSeries: true
//         },
//         onItemHover: {
//           highlightDataSeries: true
//         }
//       },
//       dataLabels: {
//         enabled: true,
//         formatter: (val: number) => {
//           return val > 3 ? `${val.toFixed(1)}%` : '';
//         },
//         style: {
//           fontSize: '12px',
//           fontWeight: 700,
//           colors: ['#fff']
//         },
//         dropShadow: {
//           enabled: true,
//           top: 2,
//           left: 2,
//           blur: 3,
//           opacity: 0.5
//         }
//       },
//       tooltip: {
//         y: {
//           formatter: (val: number) => `${val.toFixed(2)} MT (${((val / total) * 100).toFixed(1)}%)`
//         }
//       },
//       plotOptions: {
//         pie: {
//           donut: {
//             size: '60%',
//             labels: {
//               show: true,
//               name: {
//                 show: true,
//                 fontSize: '14px',
//                 fontWeight: 600,
//                 offsetY: -5,
//                 color: '#2d3748'
//               },
//               value: {
//                 show: true,
//                 fontSize: '20px',
//                 fontWeight: 700,
//                 offsetY: 5,
//                 color: '#1a202c',
//                 formatter: (val: string) => `${parseFloat(val).toFixed(2)} MT`
//               },
//               total: {
//                 show: true,
//                 label: 'Total Net Weight',
//                 fontSize: '13px',
//                 fontWeight: 600,
//                 color: '#4a5568',
//                 formatter: () => `${total.toFixed(2)} MT`
//               }
//             }
//           }
//         }
//       },
//       responsive: [
//         {
//           breakpoint: 991,
//           options: {
//             chart: {
//               height: 360
//             },
//             legend: {
//               fontSize: '10px',
//               itemMargin: {
//                 horizontal: 8,
//                 vertical: 4
//               },
//               formatter: function (seriesName: string, opts: any) {
//                 const value = opts.w.globals.series[opts.seriesIndex];
//                 const percentage = ((value / total) * 100).toFixed(1);
//                 const displayName = seriesName.length > 16
//                   ? seriesName.substring(0, 14) + '...'
//                   : seriesName;
//                 return `${displayName}: ${percentage}%`;
//               }
//             },
//             dataLabels: {
//               style: {
//                 fontSize: '11px'
//               },
//               formatter: (val: number) => val > 4 ? `${val.toFixed(1)}%` : ''
//             },
//             plotOptions: {
//               pie: {
//                 donut: {
//                   size: '58%',
//                   labels: {
//                     name: { fontSize: '12px' },
//                     value: { fontSize: '16px' },
//                     total: { fontSize: '11px' }
//                   }
//                 }
//               }
//             }
//           }
//         },
//         {
//           breakpoint: 768,
//           options: {
//             chart: {
//               height: 340
//             },
//             legend: {
//               fontSize: '9.5px',
//               itemMargin: {
//                 horizontal: 7,
//                 vertical: 3
//               },
//               formatter: function (seriesName: string, opts: any) {
//                 const value = opts.w.globals.series[opts.seriesIndex];
//                 const percentage = ((value / total) * 100).toFixed(1);
//                 const displayName = seriesName.length > 14
//                   ? seriesName.substring(0, 12) + '...'
//                   : seriesName;
//                 return `${displayName}: ${percentage}%`;
//               }
//             },
//             dataLabels: {
//               style: {
//                 fontSize: '10px'
//               },
//               formatter: (val: number) => val > 5 ? `${val.toFixed(1)}%` : ''
//             },
//             plotOptions: {
//               pie: {
//                 donut: {
//                   size: '56%',
//                   labels: {
//                     name: { fontSize: '11px' },
//                     value: { fontSize: '15px' },
//                     total: { fontSize: '10px' }
//                   }
//                 }
//               }
//             }
//           }
//         },
//         {
//           breakpoint: 480,
//           options: {
//             chart: {
//               height: 320
//             },
//             legend: {
//               fontSize: '9px',
//               itemMargin: {
//                 horizontal: 6,
//                 vertical: 2
//               },
//               formatter: function (seriesName: string, opts: any) {
//                 const value = opts.w.globals.series[opts.seriesIndex];
//                 const percentage = ((value / total) * 100).toFixed(1);
//                 const displayName = seriesName.length > 12
//                   ? seriesName.substring(0, 10) + '...'
//                   : seriesName;
//                 return `${displayName}: ${percentage}%`;
//               }
//             },
//             dataLabels: {
//               style: {
//                 fontSize: '9px'
//               },
//               formatter: (val: number) => val > 8 ? `${val.toFixed(0)}%` : ''
//             },
//             plotOptions: {
//               pie: {
//                 donut: {
//                   size: '54%',
//                   labels: {
//                     name: { fontSize: '10px' },
//                     value: { fontSize: '14px' },
//                     total: { fontSize: '9px' }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       ]
//     };
//   }

//   prepareWardwiseChart(): void {
//     const swmWardwiseChartData = this.data.filter(
//       (x: any) => x.siteName === 'Kanjur' || x.siteName === 'Deonar'
//     );

//     const grouped = swmWardwiseChartData.reduce((acc: any, cur: any) => {
//       if (!acc[cur.ward]) {
//         acc[cur.ward] = {
//           totalNetWeight: 0,
//           avgNetWeightPerDay: 0
//         };
//       }
//       acc[cur.ward].totalNetWeight += cur.totalNetWeight || 0;
//       acc[cur.ward].avgNetWeightPerDay += cur.avgNetWeightPerDay || 0;
//       return acc;
//     }, {});

//     const wards = Object.keys(grouped);
//     const totalValues = wards.map(w => +grouped[w].totalNetWeight.toFixed(2));
//     const avgLineData = wards.map(w => +grouped[w].avgNetWeightPerDay.toFixed(2));

//     // Prepare table data
//     this.wardTableData = wards.map((ward, index) => ({
//       ward,
//       totalNetWeight: totalValues[index],
//       avgNetWeightPerDay: avgLineData[index]
//     }));

//     const windowWidth = window.innerWidth;
//     const isMobile = windowWidth < 768;
//     const isTablet = windowWidth >= 768 && windowWidth < 992;

//     // Calculate dynamic width for mobile horizontal scroll
//     // Each ward needs minimum 50px width for clear visibility
//     const minBarWidth = 50;
//     const calculatedWidth = wards.length * minBarWidth;
//     const baseWidth = isMobile ? Math.max(calculatedWidth, windowWidth - 40) : '100%';

//     // Apply zoom
//     const zoomedWidth = typeof baseWidth === 'number'
//       ? baseWidth * (this.wardChartState.zoomLevel / 100)
//       : baseWidth;

//     // Determine series based on chart type
//     let series: any[] = [];
//     if (this.wardChartState.chartType === 'combined') {
//       series = [
//         {
//           name: 'Total Net Weight (MT)',
//           type: 'column',
//           data: totalValues
//         },
//         {
//           name: 'Avg Net Weight / Day (MT)',
//           type: 'line',
//           data: avgLineData
//         }
//       ];
//     } else if (this.wardChartState.chartType === 'bar') {
//       series = [{
//         name: 'Total Net Weight (MT)',
//         type: 'column',
//         data: totalValues
//       }];
//     } else {
//       series = [{
//         name: 'Avg Net Weight / Day (MT)',
//         type: 'line',
//         data: avgLineData
//       }];
//     }

//     this.wardwiseChartOptions = {
//       series,
//       chart: {
//         type: 'line',
//         height: this.wardChartState.isFullscreen ? window.innerHeight - 200 : (isMobile ? 380 : isTablet ? 380 : 400),
//         width: zoomedWidth,
//         fontFamily: 'inherit',
//         toolbar: {
//           show: true,
//           tools: {
//             download: true,
//             selection: false,
//             zoom: !isMobile,
//             zoomin: !isMobile,
//             zoomout: !isMobile,
//             pan: !isMobile,
//             reset: !isMobile
//           }
//         },
//         zoom: {
//           enabled: !isMobile
//         },
//         animations: {
//           enabled: true,
//           easing: 'easeinout',
//           speed: 600
//         }
//       },
//       colors: this.wardChartState.chartType === 'line' ? ['#10b981'] : ['#3b82f6', '#10b981'],
//       fill: {
//         type: this.wardChartState.chartType === 'line' ? 'solid' : ['gradient', 'solid'],
//         gradient: {
//           shade: 'light',
//           type: 'vertical',
//           shadeIntensity: 0.25,
//           gradientToColors: ['#60a5fa'],
//           opacityFrom: 0.85,
//           opacityTo: 0.65,
//           stops: [0, 100]
//         }
//       },
//       stroke: {
//         width: this.wardChartState.chartType === 'bar' ? [0] : this.wardChartState.chartType === 'line' ? [3] : [0, 3],
//         curve: 'smooth'
//       },
//       plotOptions: {
//         bar: {
//           columnWidth: isMobile ? '65%' : '50%',
//           borderRadius: 6,
//           borderRadiusApplication: 'end',
//           dataLabels: {
//             position: 'top'
//           }
//         }
//       },
//       dataLabels: {
//         enabled: !isMobile && this.wardChartState.chartType !== 'line',
//         enabledOnSeries: [0],
//         offsetY: -20,
//         style: {
//           fontSize: '10px',
//           fontWeight: 600,
//           colors: ['#2d3748']
//         },
//         background: {
//           enabled: true,
//           foreColor: '#fff',
//           borderRadius: 3,
//           padding: 3,
//           opacity: 0.9,
//           borderWidth: 1,
//           borderColor: '#e5e7eb'
//         },
//         formatter: (val: number) => val ? val.toFixed(1) : '0'
//       },
//       markers: {
//         size: this.wardChartState.chartType === 'bar' ? [0] : this.wardChartState.chartType === 'line' ? [5] : [0, 5],
//         colors: ['#ffffff'],
//         strokeColors: ['#10b981'],
//         strokeWidth: 2,
//         hover: {
//           size: 7,
//           sizeOffset: 3
//         }
//       },
//       xaxis: {
//         categories: wards,
//         labels: {
//           style: {
//             fontSize: isMobile ? '10px' : '11px',
//             fontWeight: 500,
//             colors: '#4a5568'
//           },
//           rotate: isMobile ? 0 : -35,
//           rotateAlways: false,
//           trim: false,
//           hideOverlappingLabels: false,
//           maxHeight: isMobile ? undefined : 120
//         },
//         axisBorder: {
//           show: true,
//           color: '#cbd5e1',
//           height: 1
//         },
//         axisTicks: {
//           show: true,
//           color: '#cbd5e1',
//           height: 6
//         },
//         tickPlacement: 'on'
//       },
//       yaxis: this.getYAxisConfig(isMobile),
//       grid: {
//         show: this.wardChartState.showGridLines,
//         borderColor: '#f1f5f9',
//         strokeDashArray: 3,
//         position: 'back',
//         xaxis: {
//           lines: {
//             show: false
//           }
//         },
//         yaxis: {
//           lines: {
//             show: true
//           }
//         },
//         padding: {
//           top: 20,
//           right: isMobile ? 15 : 20,
//           bottom: 10,
//           left: isMobile ? 5 : 10
//         }
//       },
//       tooltip: {
//         shared: true,
//         intersect: false,
//         theme: 'light',
//         x: {
//           show: true
//         },
//         y: {
//           formatter: (val: number) => val ? `${val.toFixed(2)} MT` : '0 MT'
//         }
//       },
//       legend: {
//         position: 'top',
//         horizontalAlign: 'center',
//         fontSize: isMobile ? '11px' : '12px',
//         fontWeight: 500,
//         offsetY: 0,
//         itemMargin: {
//           horizontal: isMobile ? 10 : 15,
//           vertical: 5
//         },
//         markers: {
//           width: 12,
//           height: 12,
//           radius: 3
//         }
//       }
//     };

//     this.isLoading = false;
//   }

//   getYAxisConfig(isMobile: boolean): any[] {
//     if (this.wardChartState.chartType === 'bar') {
//       return [{
//         seriesName: 'Total Net Weight (MT)',
//         title: {
//           text: isMobile ? 'Total (MT)' : 'Total Net Weight (MT)',
//           style: {
//             fontSize: isMobile ? '11px' : '12px',
//             fontWeight: 600,
//             color: '#3b82f6'
//           }
//         },
//         labels: {
//           formatter: (val: number) => val ? val.toFixed(1) : '0',
//           style: {
//             fontSize: isMobile ? '10px' : '11px',
//             colors: '#64748b'
//           }
//         },
//         axisBorder: {
//           show: true,
//           color: '#3b82f6'
//         }
//       }];
//     } else if (this.wardChartState.chartType === 'line') {
//       return [{
//         seriesName: 'Avg Net Weight / Day (MT)',
//         title: {
//           text: isMobile ? 'Avg (MT)' : 'Avg / Day (MT)',
//           style: {
//             fontSize: isMobile ? '11px' : '12px',
//             fontWeight: 600,
//             color: '#10b981'
//           }
//         },
//         labels: {
//           formatter: (val: number) => val ? val.toFixed(1) : '0',
//           style: {
//             fontSize: isMobile ? '10px' : '11px',
//             colors: '#64748b'
//           }
//         },
//         axisBorder: {
//           show: true,
//           color: '#10b981'
//         }
//       }];
//     } else {
//       return [
//         {
//           seriesName: 'Total Net Weight (MT)',
//           title: {
//             text: isMobile ? 'Total (MT)' : 'Total Net Weight (MT)',
//             style: {
//               fontSize: isMobile ? '11px' : '12px',
//               fontWeight: 600,
//               color: '#3b82f6'
//             }
//           },
//           labels: {
//             formatter: (val: number) => val ? val.toFixed(1) : '0',
//             style: {
//               fontSize: isMobile ? '10px' : '11px',
//               colors: '#64748b'
//             }
//           },
//           axisBorder: {
//             show: true,
//             color: '#3b82f6'
//           }
//         },
//         {
//           seriesName: 'Avg Net Weight / Day (MT)',
//           opposite: true,
//           title: {
//             text: isMobile ? 'Avg (MT)' : 'Avg / Day (MT)',
//             style: {
//               fontSize: isMobile ? '11px' : '12px',
//               fontWeight: 600,
//               color: '#10b981'
//             }
//           },
//           labels: {
//             formatter: (val: number) => val ? val.toFixed(1) : '0',
//             style: {
//               fontSize: isMobile ? '10px' : '11px',
//               colors: '#64748b'
//             }
//           },
//           axisBorder: {
//             show: true,
//             color: '#10b981'
//           }
//         }
//       ];
//     }
//   }

//   // Ward Chart Control Methods - FIXED: Added optional event parameter
//   zoomIn(event?: Event): void {
//     if (event) {
//       event.preventDefault();
//     }
//     if (this.wardChartState.zoomLevel < 200) {
//       this.wardChartState.zoomLevel += 25;
//       this.prepareWardwiseChart();
//     }
//   }

//   zoomOut(event?: Event): void {
//     if (event) {
//       event.preventDefault();
//     }
//     if (this.wardChartState.zoomLevel > 50) {
//       this.wardChartState.zoomLevel -= 25;
//       this.prepareWardwiseChart();
//     }
//   }

//   resetZoom(event?: Event): void {
//     if (event) {
//       event.preventDefault();
//     }
//     this.wardChartState.zoomLevel = 100;
//     this.prepareWardwiseChart();
//   }

//   toggleFullscreen(event?: Event): void {
//     if (event) {
//       event.preventDefault();
//     }

//     const element = this.wardChartWrapper?.nativeElement;

//     if (!this.wardChartState.isFullscreen) {
//       if (element.requestFullscreen) {
//         element.requestFullscreen();
//       } else if (element.webkitRequestFullscreen) {
//         element.webkitRequestFullscreen();
//       } else if (element.msRequestFullscreen) {
//         element.msRequestFullscreen();
//       }
//       this.wardChartState.isFullscreen = true;
//     } else {
//       if (document.exitFullscreen) {
//         document.exitFullscreen();
//       } else if ((document as any).webkitExitFullscreen) {
//         (document as any).webkitExitFullscreen();
//       } else if ((document as any).msExitFullscreen) {
//         (document as any).msExitFullscreen();
//       }
//       this.wardChartState.isFullscreen = false;
//     }

//     setTimeout(() => this.prepareWardwiseChart(), 100);
//   }

//   toggleDataTable(): void {
//     this.wardChartState.showDataTable = !this.wardChartState.showDataTable;
//   }

//   changeChartType(type: 'combined' | 'bar' | 'line'): void {
//     this.wardChartState.chartType = type;
//     this.prepareWardwiseChart();
//   }

//   toggleGridLines(): void {
//     this.wardChartState.showGridLines = !this.wardChartState.showGridLines;
//     this.prepareWardwiseChart();
//   }

//   exportToCSV(): void {
//     const csvContent = [
//       ['Ward', 'Total Net Weight (MT)', 'Avg Net Weight / Day (MT)'],
//       ...this.wardTableData.map(row => [row.ward, row.totalNetWeight, row.avgNetWeightPerDay])
//     ].map(row => row.join(',')).join('\n');

//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'ward-wise-data.csv';
//     a.click();
//     window.URL.revokeObjectURL(url);
//   }

//   @HostListener("window:resize", ["$event"])
//   onResize(event: any) {
//     this.updateChartResponsiveness()
//   }

//   @HostListener('document:fullscreenchange', ['$event'])
//   @HostListener('document:webkitfullscreenchange', ['$event'])
//   @HostListener('document:mozfullscreenchange', ['$event'])
//   @HostListener('document:MSFullscreenChange', ['$event'])
//   onFullscreenChange(event?: Event) {
//     if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
//       this.wardChartState.isFullscreen = false;
//       setTimeout(() => this.prepareWardwiseChart(), 100);
//     }
//   }

//   private updateChartResponsiveness(): void {
//     const windowWidth = window.innerWidth
//     const isMobile = windowWidth < 768
//     const isTablet = windowWidth >= 768 && windowWidth < 992

//     if (this.pieChartOptionsSWMVehicleType?.chart) {
//       if (isMobile) {
//         this.pieChartOptionsSWMVehicleType.chart.height = 340
//       } else if (isTablet) {
//         this.pieChartOptionsSWMVehicleType.chart.height = 380
//       } else {
//         this.pieChartOptionsSWMVehicleType.chart.height = 400
//       }
//     }

//     if (this.pieChartOptionsSWMWeightDistribution?.chart) {
//       this.pieChartOptionsSWMWeightDistribution.chart.height = isMobile ? 300 : 320
//     }

//     // Rebuild ward chart on resize for proper width calculation
//     if (this.data?.length) {
//       this.prepareWardwiseChart();
//     }

//     this.cdr.detectChanges()
//   }

//   ngOnDestroy(): void {
//     this.destroy$.next()
//     this.destroy$.complete()
//   }
// }