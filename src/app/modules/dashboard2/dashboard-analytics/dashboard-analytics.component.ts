import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, OnChanges, HostListener } from "@angular/core"
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
  stroke?: ApexStroke,
  tooltip: ApexTooltip;
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
  selector: 'app-dashboard-analytics',
  imports: [CommonModule, NgApexchartsModule, FormsModule],
  templateUrl: './dashboard-analytics.component.html',
  styleUrl: './dashboard-analytics.component.scss'
})
export class DashboardAnalyticsComponent implements OnChanges, OnDestroy {
  @Input() data: any;
  private destroy$ = new Subject<void>()
  isLoading = true
  isRefreshing = false
  isExporting = false
  pieChartOptionsSWMWeightDistribution!: any;
  pieChartOptionsSWMVehicleType!: any;


  wardwiseChartOptions!: any;

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
  constructor(private dbCallingService: DbCallingService,
    private cdr: ChangeDetectorRef) {

  }

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

    const series: number[] = [
      kanjurTotal,
      deonarTotal
    ];

    const total = kanjurTotal + deonarTotal;

    this.pieChartOptionsSWMWeightDistribution = {
      series,
      chart: {
        type: "donut",          // 🔥 changed from pie
        height: 320
      },
      labels: ['Kanjur', 'Deonar'],
      legend: {
        position: 'bottom'
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val.toFixed(2)} MT`
        }
      },
      plotOptions: {             // 🔥 added
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Net Weight',
                formatter: () => `${total.toFixed(2)} MT`
              }
            }
          }
        }
      }
    };

    this.isLoading = false;
  }

  loadVehicleTypePie() {
    const swmVehcleTypeData = this.data
      .filter((x: any) => x.siteName === 'Kanjur' || x.siteName === 'Deonar');

    // 🔹 Group by VehicleType
    const grouped = swmVehcleTypeData.reduce((acc: any, cur: any) => {
      acc[cur.vehicleType] = (acc[cur.vehicleType] || 0) + cur.totalNetWeight;
      return acc;
    }, {});

    const labels = Object.keys(grouped);
    const series = Object.values(grouped) as number[];

    const total = series.reduce((a, b) => a + b, 0);

    this.pieChartOptionsSWMVehicleType = {
      series,
      chart: {
        type: 'donut',
        height: 340
      },
      labels,
      legend: {
        position: 'bottom'
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`
      },
      tooltip: {
        y: {
          formatter: (val: number) =>
            `${val.toFixed(2)} MT`
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Net Weight',
                formatter: () => `${total.toFixed(2)} MT`
              }
            }
          }
        }
      }
    };
  }

  // prepareWardwiseChart() {

  //   // 🔹 Group by Ward and sum TotalNetWeight
  //       const swmWardwiseChartData =  this.data
  //     .filter((x: any) => x.siteName === 'Kanjur' || x.siteName === 'Deonar');

  //   const grouped = swmWardwiseChartData.reduce((acc: any, cur: any) => {
  //     acc[cur.ward] = (acc[cur.ward] || 0) + cur.totalNetWeight;
  //     return acc;
  //   }, {});

  //   const wards = Object.keys(grouped);
  //   const values = Object.values(grouped) as number[];

  //   this.wardwiseChartOptions = {
  //     series: [
  //       {
  //         name: 'Total Net Weight (MT)',
  //         data: values
  //       }
  //     ],
  //     chart: {
  //       type: 'bar',
  //       height: 320
  //     },
  //     plotOptions: {
  //       bar: {
  //         columnWidth: '45%',
  //         borderRadius: 6
  //       }
  //     },
  //     dataLabels: {
  //       enabled: false
  //     },
  //     xaxis: {
  //       categories: wards
  //     },
  //     tooltip: {
  //       y: {
  //         formatter: (val: number) => `${val.toFixed(2)} MT`
  //       }
  //     }
  //   };

  //   this.isLoading = false;
  // }
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

    const totalValues = wards.map(w =>
      +grouped[w].totalNetWeight.toFixed(2)
    );

    const avgLineData = wards.map(w =>
      +grouped[w].avgNetWeightPerDay.toFixed(2)
    );

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
        toolbar: { show: false }
      },
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
        categories: wards
      },

      /* 🔥 TWO Y-AXES (IMPORTANT FIX) */
      yaxis: [
        {
          title: { text: 'Total Net Weight (MT)' },
          labels: {
            formatter: (val: number) => val.toFixed(2)
          }
        },
        {
          opposite: true,
          title: { text: 'Avg Net Weight / Day (MT)' },
          labels: {
            formatter: (val: number) => val.toFixed(2)
          }
        }
      ],

      tooltip: {
        shared: true,
        y: {
          formatter: (val: number) => `${val.toFixed(2)} MT`
        }
      },

      legend: {
        position: 'bottom'
      }
    };

    this.isLoading = false;
  }
  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    this.updateChartResponsiveness()
  }
  private updateChartResponsiveness(): void {
    const isMobile = window.innerWidth < 768

    // Adjust Donut Chart
    if (this.pieChartOptionsSWMVehicleType.chart) {
      this.pieChartOptionsSWMVehicleType.chart.height = isMobile ? 300 : 350
    }
    if (this.pieChartOptionsSWMWeightDistribution.chart) {
      this.pieChartOptionsSWMWeightDistribution.chart.height = isMobile ? 300 : 350
    }
    // Adjust Bar Charts
    const barCharts = [

      this.wardwiseChartOptions,
    ]

    barCharts.forEach((opt) => {
      if (opt.chart) opt.chart.height = isMobile ? 280 : 350
      if (opt.plotOptions?.bar) {
        opt.plotOptions.bar.columnWidth = isMobile ? "80%" : "60%"
      }
    })

    this.cdr.detectChanges()
  }
  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }
}
