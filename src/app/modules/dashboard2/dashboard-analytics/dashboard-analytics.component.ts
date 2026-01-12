import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, OnChanges, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { NgApexchartsModule } from "ng-apexcharts"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { Subject, takeUntil } from "rxjs"

@Component({
  selector: 'app-dashboard-analytics',
  imports: [CommonModule, NgApexchartsModule, FormsModule],
  templateUrl: './dashboard-analytics.component.html',
  styleUrl: './dashboard-analytics.component.scss'
})
export class DashboardAnalyticsComponent implements OnChanges, OnDestroy {
  @Input() data: any;
  private destroy$ = new Subject<void>()
  isLoading = true
  
  pieChartOptionsSWMWeightDistribution!: any;
  pieChartOptionsSWMVehicleType!: any;
  wardwiseChartOptions!: any;

  kanjurData = { trips: 0, netWeight: 0 }
  deonarData = { trips: 0, netWeight: 0 }
  totalData = { trips: 0, netWeight: 0 }

  // Distinct color palette to avoid white/invisible colors
  private readonly distinctColors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#6366f1', // Indigo
    '#a855f7', // Violet
    '#d946ef', // Fuchsia
    '#0ea5e9', // Light Blue
    '#22c55e', // Light Green
    '#eab308', // Yellow
    '#dc2626', // Dark Red
    '#7c3aed', // Dark Purple
    '#db2777', // Dark Pink
    '#0d9488'  // Dark Teal
  ];

  constructor(
    private dbCallingService: DbCallingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(): void {
    if (this.data?.length) {
      this.loadPieChart()
      this.loadVehicleTypePie();
      this.prepareWardwiseChart();
      this.updateChartResponsiveness()
    }
  }

  loadPieChart() {
    const swmData = this.data;

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

    const series: number[] = [kanjurTotal, deonarTotal];
    const total = kanjurTotal + deonarTotal;

    this.pieChartOptionsSWMWeightDistribution = {
      series,
      chart: {
        type: "donut",
        height: 320,
        fontFamily: 'inherit'
      },
      labels: ['Kanjur', 'Deonar'],
      colors: ['#3b82f6', '#10b981'], // Distinct blue and green
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        floating: false,
        fontSize: '12px',
        fontWeight: 500,
        itemMargin: {
          horizontal: 12,
          vertical: 5
        },
        markers: {
          width: 12,
          height: 12,
          radius: 2
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`,
        style: {
          fontSize: '13px',
          fontWeight: 700,
          colors: ['#fff']
        },
        dropShadow: {
          enabled: true,
          top: 2,
          left: 2,
          blur: 3,
          opacity: 0.5
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val.toFixed(2)} MT`
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600,
                color: '#2d3748'
              },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 700,
                color: '#1a202c',
                formatter: (val: string) => `${parseFloat(val).toFixed(2)} MT`
              },
              total: {
                show: true,
                label: 'Total Net Weight',
                fontSize: '13px',
                fontWeight: 600,
                color: '#4a5568',
                formatter: () => `${total.toFixed(2)} MT`
              }
            }
          }
        }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: { height: 300 },
            legend: {
              fontSize: '11px',
              itemMargin: { horizontal: 10, vertical: 4 }
            }
          }
        }
      ]
    };

    this.isLoading = false;
  }

  loadVehicleTypePie() {
    const swmVehcleTypeData = this.data
      .filter((x: any) => x.siteName === 'Kanjur' || x.siteName === 'Deonar');

    const grouped = swmVehcleTypeData.reduce((acc: any, cur: any) => {
      acc[cur.vehicleType] = (acc[cur.vehicleType] || 0) + cur.totalNetWeight;
      return acc;
    }, {});

    const labels = Object.keys(grouped);
    const series = Object.values(grouped) as number[];
    const total = series.reduce((a, b) => a + b, 0);

    // Generate distinct colors based on number of vehicle types
    const colors = labels.map((_, index) => this.distinctColors[index % this.distinctColors.length]);

    this.pieChartOptionsSWMVehicleType = {
      series,
      chart: {
        type: 'donut',
        height: 400,
        fontFamily: 'inherit'
      },
      labels,
      colors: colors, // Use distinct color palette
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        floating: false,
        fontSize: '11px',
        fontWeight: 500,
        itemMargin: {
          horizontal: 10,
          vertical: 5
        },
        markers: {
          width: 11,
          height: 11,
          radius: 2,
          offsetX: -2
        },
        formatter: function(seriesName: string, opts: any) {
          const value = opts.w.globals.series[opts.seriesIndex];
          const percentage = ((value / total) * 100).toFixed(1);
          // Truncate long vehicle type names for legend
          const displayName = seriesName.length > 20 
            ? seriesName.substring(0, 18) + '...' 
            : seriesName;
          return `${displayName}: ${percentage}%`;
        },
        onItemClick: {
          toggleDataSeries: true
        },
        onItemHover: {
          highlightDataSeries: true
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => {
          // Only show percentage if slice is larger than 3%
          return val > 3 ? `${val.toFixed(1)}%` : '';
        },
        style: {
          fontSize: '12px',
          fontWeight: 700,
          colors: ['#fff']
        },
        dropShadow: {
          enabled: true,
          top: 2,
          left: 2,
          blur: 3,
          opacity: 0.5
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val.toFixed(2)} MT (${((val/total)*100).toFixed(1)}%)`
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '14px',
                fontWeight: 600,
                offsetY: -5,
                color: '#2d3748'
              },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 700,
                offsetY: 5,
                color: '#1a202c',
                formatter: (val: string) => `${parseFloat(val).toFixed(2)} MT`
              },
              total: {
                show: true,
                label: 'Total Net Weight',
                fontSize: '13px',
                fontWeight: 600,
                color: '#4a5568',
                formatter: () => `${total.toFixed(2)} MT`
              }
            }
          }
        }
      },
      responsive: [
        {
          breakpoint: 991,
          options: {
            chart: {
              height: 360
            },
            legend: {
              fontSize: '10px',
              itemMargin: {
                horizontal: 8,
                vertical: 4
              },
              formatter: function(seriesName: string, opts: any) {
                const value = opts.w.globals.series[opts.seriesIndex];
                const percentage = ((value / total) * 100).toFixed(1);
                const displayName = seriesName.length > 16 
                  ? seriesName.substring(0, 14) + '...' 
                  : seriesName;
                return `${displayName}: ${percentage}%`;
              }
            },
            dataLabels: {
              style: {
                fontSize: '11px'
              },
              formatter: (val: number) => val > 4 ? `${val.toFixed(1)}%` : ''
            },
            plotOptions: {
              pie: {
                donut: {
                  size: '58%',
                  labels: {
                    name: { fontSize: '12px' },
                    value: { fontSize: '16px' },
                    total: { fontSize: '11px' }
                  }
                }
              }
            }
          }
        },
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 340
            },
            legend: {
              fontSize: '9.5px',
              itemMargin: {
                horizontal: 7,
                vertical: 3
              },
              formatter: function(seriesName: string, opts: any) {
                const value = opts.w.globals.series[opts.seriesIndex];
                const percentage = ((value / total) * 100).toFixed(1);
                const displayName = seriesName.length > 14 
                  ? seriesName.substring(0, 12) + '...' 
                  : seriesName;
                return `${displayName}: ${percentage}%`;
              }
            },
            dataLabels: {
              style: {
                fontSize: '10px'
              },
              formatter: (val: number) => val > 5 ? `${val.toFixed(1)}%` : ''
            },
            plotOptions: {
              pie: {
                donut: {
                  size: '56%',
                  labels: {
                    name: { fontSize: '11px' },
                    value: { fontSize: '15px' },
                    total: { fontSize: '10px' }
                  }
                }
              }
            }
          }
        },
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 320
            },
            legend: {
              fontSize: '9px',
              itemMargin: {
                horizontal: 6,
                vertical: 2
              },
              formatter: function(seriesName: string, opts: any) {
                const value = opts.w.globals.series[opts.seriesIndex];
                const percentage = ((value / total) * 100).toFixed(1);
                const displayName = seriesName.length > 12 
                  ? seriesName.substring(0, 10) + '...' 
                  : seriesName;
                return `${displayName}: ${percentage}%`;
              }
            },
            dataLabels: {
              style: {
                fontSize: '9px'
              },
              formatter: (val: number) => val > 8 ? `${val.toFixed(0)}%` : ''
            },
            plotOptions: {
              pie: {
                donut: {
                  size: '54%',
                  labels: {
                    name: { fontSize: '10px' },
                    value: { fontSize: '14px' },
                    total: { fontSize: '9px' }
                  }
                }
              }
            }
          }
        }
      ]
    };
  }

  prepareWardwiseChart(): void {
    const swmWardwiseChartData = this.data.filter(
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
        fontFamily: 'inherit',
        toolbar: { show: false }
      },
      colors: ['#3b82f6', '#10b981'],
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
        categories: wards,
        labels: {
          style: {
            fontSize: '11px',
            fontWeight: 500
          },
          rotate: -45,
          rotateAlways: false,
          trim: true,
          hideOverlappingLabels: true
        },
        tickPlacement: 'on'
      },
      yaxis: [
        {
          title: { 
            text: 'Total Net Weight (MT)',
            style: {
              fontSize: '12px',
              fontWeight: 600
            }
          },
          labels: {
            formatter: (val: number) => val.toFixed(2),
            style: {
              fontSize: '11px'
            }
          }
        },
        {
          opposite: true,
          title: { 
            text: 'Avg Net Weight / Day (MT)',
            style: {
              fontSize: '12px',
              fontWeight: 600
            }
          },
          labels: {
            formatter: (val: number) => val.toFixed(2),
            style: {
              fontSize: '11px'
            }
          }
        }
      ],
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number) => `${val.toFixed(2)} MT`
        }
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '12px',
        fontWeight: 500,
        itemMargin: {
          horizontal: 12,
          vertical: 5
        }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: { 
              height: 400
            },
            plotOptions: {
              bar: { columnWidth: '50%' }
            },
            xaxis: {
              labels: {
                style: {
                  fontSize: '9px',
                  fontWeight: 500
                },
                rotate: -45,
                rotateAlways: true,
                trim: true,
                hideOverlappingLabels: true,
                minHeight: 60
              }
            },
            yaxis: [
              {
                title: { 
                  text: 'Total (MT)',
                  style: {
                    fontSize: '10px',
                    fontWeight: 600
                  }
                },
                labels: {
                  formatter: (val: number) => val.toFixed(1),
                  style: {
                    fontSize: '9px'
                  }
                }
              },
              {
                opposite: true,
                title: { 
                  text: 'Avg/Day (MT)',
                  style: {
                    fontSize: '10px',
                    fontWeight: 600
                  }
                },
                labels: {
                  formatter: (val: number) => val.toFixed(1),
                  style: {
                    fontSize: '9px'
                  }
                }
              }
            ],
            legend: {
              fontSize: '10px',
              itemMargin: {
                horizontal: 8,
                vertical: 4
              }
            }
          }
        },
        {
          breakpoint: 480,
          options: {
            chart: { 
              height: 380
            },
            plotOptions: {
              bar: { columnWidth: '60%' }
            },
            xaxis: {
              labels: {
                style: {
                  fontSize: '8px',
                  fontWeight: 500
                },
                rotate: -45,
                rotateAlways: true,
                trim: true,
                hideOverlappingLabels: true,
                minHeight: 70
              }
            },
            yaxis: [
              {
                title: { 
                  text: 'Total',
                  style: {
                    fontSize: '9px',
                    fontWeight: 600
                  }
                },
                labels: {
                  formatter: (val: number) => val.toFixed(0),
                  style: {
                    fontSize: '8px'
                  }
                }
              },
              {
                opposite: true,
                title: { 
                  text: 'Avg',
                  style: {
                    fontSize: '9px',
                    fontWeight: 600
                  }
                },
                labels: {
                  formatter: (val: number) => val.toFixed(0),
                  style: {
                    fontSize: '8px'
                  }
                }
              }
            ],
            legend: {
              fontSize: '9px',
              itemMargin: {
                horizontal: 6,
                vertical: 3
              }
            }
          }
        }
      ]
    };

    this.isLoading = false;
  }

  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    // Debounce resize events for better performance
    this.updateChartResponsiveness()
  }

  private updateChartResponsiveness(): void {
    const windowWidth = window.innerWidth
    const isMobile = windowWidth < 768
    const isTablet = windowWidth >= 768 && windowWidth < 992
    const isSmallDesktop = windowWidth >= 992 && windowWidth < 1300

    // Adjust pie chart heights based on viewport
    if (this.pieChartOptionsSWMVehicleType?.chart) {
      if (isMobile) {
        this.pieChartOptionsSWMVehicleType.chart.height = 340
      } else if (isTablet) {
        this.pieChartOptionsSWMVehicleType.chart.height = 380
      } else {
        this.pieChartOptionsSWMVehicleType.chart.height = 400
      }
    }
    
    if (this.pieChartOptionsSWMWeightDistribution?.chart) {
      this.pieChartOptionsSWMWeightDistribution.chart.height = isMobile ? 300 : 320
    }

    // Adjust bar chart based on viewport
    const barCharts = [this.wardwiseChartOptions]

    barCharts.forEach((opt) => {
      if (opt?.chart) {
        if (isMobile && windowWidth <= 480) {
          opt.chart.height = 380
        } else if (isMobile) {
          opt.chart.height = 400
        } else if (isTablet) {
          opt.chart.height = 340
        } else {
          opt.chart.height = 360
        }
      }
      if (opt?.plotOptions?.bar) {
        if (isMobile && windowWidth <= 480) {
          opt.plotOptions.bar.columnWidth = "60%"
        } else if (isMobile) {
          opt.plotOptions.bar.columnWidth = "50%"
        } else if (isSmallDesktop) {
          opt.plotOptions.bar.columnWidth = "55%"
        } else {
          opt.plotOptions.bar.columnWidth = "45%"
        }
      }
    })

    this.cdr.detectChanges()
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }
}