import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, Input, OnChanges } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { NgApexchartsModule } from "ng-apexcharts"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { Subject, takeUntil } from "rxjs"

export interface HistoricalRecord {
  year: number
  totalWeight: number
  totalTrips: number
  avgDaily: number
  efficiency: number
  yoyChange: number
}

@Component({
  selector: 'app-dashboard-comparison',
  imports: [CommonModule, NgApexchartsModule, FormsModule],
  templateUrl: './dashboard-comparison.component.html',
  styleUrl: './dashboard-comparison.component.scss'
})
export class DashboardComparisonComponent implements OnChanges, OnDestroy {
  @Input() searchParams: any;

  selectedYear = 2023;
  previousYear = 2022;
  data: any[] = [];

  kpis = {
    totalWeight: { current: 0, previous: 0 },
    totalTrips: { current: 0, previous: 0 },
    avgDailyWeight: { current: 0, previous: 0 },
    efficiency: { current: 0, previous: 0 }
  };

  monthlyComparisonChartOptions!: any;
  quarterlyComparisonChartOptions: any;
  yoyGrowthChartOptions: any;

  private destroy$ = new Subject<void>()
  isLoadingComparison = false
  availableYears: number[] = []
  filteredPreviousYears: number[] = [];
  historicalData: HistoricalRecord[] = []

  constructor(
    private dashboardService: DbCallingService,
    private cdr: ChangeDetectorRef
  ) { }

  @HostListener("window:resize", ["$event"])
  onResize(event: any) {
    this.updateChartResponsiveness()
  }

  ngOnChanges(): void {
    this.initializeAvailableYears();
    this.selectedYear = Math.max(...this.availableYears);
    this.updatePreviousYearOptions();
    this.loadDashboard();
    this.updateChartResponsiveness()
  }

  private initializeAvailableYears(): void {
    const currentYear = new Date().getFullYear()
    this.availableYears = []
    for (let i = currentYear; i >= currentYear - 5; i--) {
      this.availableYears.push(i)
    }
  }

  onSelectedYearChange() {
    this.updatePreviousYearOptions();
    if (this.previousYear >= this.selectedYear) {
      this.previousYear = this.filteredPreviousYears.at(-1)!;
    }
    this.loadDashboard();
  }

  updatePreviousYearOptions() {
    this.filteredPreviousYears = this.availableYears.filter(
      y => Number(y) < Number(this.selectedYear)
    );
    if (!this.previousYear && this.filteredPreviousYears.length) {
      this.previousYear = this.filteredPreviousYears.at(-1)!;
    }
  }

  getProgressWidth(current: number, previous: number): number {
    const max = Math.max(current, previous)
    if (max === 0) return 0
    return Math.min((current / max) * 100, 100)
  }

  safePercentChange(current: number, previous: number): number {
    if (!previous || previous === 0) {
      return previous === 0 && current === 0 ? 0 : 100 * (current - previous) / (previous === 0 ? 1 : previous)
    }
    return Number((((current - previous) / previous) * 100).toFixed(2))
  }

  loadDashboard() {
    const filters = {
      UserId: this.searchParams?.UserId || null,
      SiteName: this.searchParams?.SiteName || null,
      WardName: this.searchParams?.WardName || null,
      Agency: this.searchParams?.Agency || null,
      VehicleType: this.searchParams?.VehicleType || null,
      FromDate: `${this.previousYear}-01-01`,
      ToDate: `${this.selectedYear}-12-31`
    };
    
    this.isLoadingComparison = true;
    
    this.dashboardService.getDashboardMonthlySummary(filters)
      .subscribe(res => {
   
           this.data = res.data
      .filter((x: any) => x.siteName === 'Kanjur' || x.siteName === 'Deonar');
        this.prepareKPIs();
        this.prepareMonthlyChart();
        this.prepareQuarterlyTripsChart();
        this.prepareYoYGrowthChart();
        this.prepareTableData();
        this.isLoadingComparison = false;
        this.cdr.detectChanges();
      });
  }

  prepareKPIs() {
    const currentYearData = this.data.filter(x => Number(x.summaryYear) === Number(this.selectedYear));
    const previousYearData = this.data.filter(x => Number(x.summaryYear) === Number(this.previousYear));

    const sumWeight = (arr: any[]) =>
      arr.reduce((a, b) => a + b.totalNetWeight, 0);

    const sumTrips = (arr: any[]) =>
      arr.reduce((a, b) => a + b.tripsCount, 0);

    this.kpis.totalWeight.current = sumWeight(currentYearData);
    this.kpis.totalWeight.previous = sumWeight(previousYearData);

    this.kpis.totalTrips.current = sumTrips(currentYearData);
    this.kpis.totalTrips.previous = sumTrips(previousYearData);

    const daysInYear = 365;

    this.kpis.avgDailyWeight.current = this.kpis.totalWeight.current / daysInYear;
    this.kpis.avgDailyWeight.previous = this.kpis.totalWeight.previous / daysInYear;

    this.kpis.efficiency.current = this.kpis.totalTrips.current > 0
      ? this.kpis.totalWeight.current / this.kpis.totalTrips.current
      : 0;

    this.kpis.efficiency.previous = this.kpis.totalTrips.previous > 0
      ? this.kpis.totalWeight.previous / this.kpis.totalTrips.previous
      : 0;
  }

  prepareMonthlyChart() {
    const isMobile = window.innerWidth < 768;
    const isSmallMobile = window.innerWidth < 480;
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const yearData = (year: number) =>
      months.map(m =>
        this.data
          .filter(x => Number(x.summaryYear) === year && Number(x.summaryMonth) === m)
          .reduce((a, b) => a + b.totalNetWeight, 0)
      );

    // Use abbreviated month names for mobile
    const monthLabels = isMobile 
      ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Full month names for tooltip
    const fullMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    this.monthlyComparisonChartOptions = {
      series: [
        { name: `${this.selectedYear}`, data: yearData(Number(this.selectedYear)) },
        { name: `${this.previousYear}`, data: yearData(Number(this.previousYear)) }
      ],
      chart: {
        type: 'bar',
        height: isMobile ? 400 : 420,
        toolbar: { 
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          }
        },
        fontFamily: 'inherit',
        animations: {
          enabled: true,
          speed: 800
        }
      },
      plotOptions: {
        bar: {
          columnWidth: isMobile ? '85%' : '65%',
          borderRadius: 4,
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: { 
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      legend: { 
        position: 'top',
        horizontalAlign: 'center',
        fontSize: isMobile ? '11px' : '14px',
        fontWeight: 600,
        markers: {
          width: 10,
          height: 10,
          radius: 2
        },
        itemMargin: {
          horizontal: isMobile ? 10 : 15,
          vertical: 8
        },
        offsetY: 0
      },
      colors: ['#3b82f6', '#10b981'],
      xaxis: {
        categories: monthLabels,
        labels: {
          style: {
            fontSize: isSmallMobile ? '11px' : (isMobile ? '12px' : '13px'),
            fontWeight: 600,
            cssClass: 'month-label'
          },
          rotate: 0,
          rotateAlways: false,
          hideOverlappingLabels: false,
          trim: false,
          offsetY: 0
        },
        axisBorder: {
          show: true,
          color: '#e5e7eb',
          height: 1
        },
        axisTicks: {
          show: true,
          height: 4,
          color: '#cbd5e1'
        },
        crosshairs: {
          show: true
        },
        tooltip: {
          enabled: false
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: isMobile ? '11px' : '12px',
            fontWeight: 500
          },
          formatter: (val: number) => {
            if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
            if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
            return val.toFixed(0);
          }
        },
        title: {
          text: isMobile ? 'MT' : 'Weight (MT)',
          style: {
            fontSize: isMobile ? '12px' : '13px',
            fontWeight: 600,
            color: '#6b7280'
          }
        }
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        },
        padding: {
          top: 0,
          right: isMobile ? 5 : 20,
          bottom: isMobile ? 10 : 5,
          left: isMobile ? 0 : 10
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        x: {
          formatter: (val: any, opts: any) => {
            const monthIndex = opts?.dataPointIndex;
            return fullMonthNames[monthIndex] || val;
          }
        },
        y: {
          formatter: (val: any) => `${val.toFixed(2)} MT`
        },
        style: {
          fontSize: '12px'
        },
        marker: {
          show: true
        }
      },
      states: {
        hover: {
          filter: {
            type: 'darken',
            value: 0.15
          }
        },
        active: {
          filter: {
            type: 'darken',
            value: 0.25
          }
        }
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 400
            },
            plotOptions: {
              bar: {
                columnWidth: '85%'
              }
            },
            xaxis: {
              labels: {
                style: {
                  fontSize: '11px'
                }
              }
            },
            yaxis: {
              title: {
                text: 'MT'
              },
              labels: {
                style: {
                  fontSize: '11px'
                }
              }
            },
            legend: {
              fontSize: '11px',
              itemMargin: {
                horizontal: 10
              }
            }
          }
        },
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 400
            },
            plotOptions: {
              bar: {
                columnWidth: '85%'
              }
            },
            xaxis: {
              labels: {
                style: {
                  fontSize: '12px'
                }
              }
            },
            yaxis: {
              labels: {
                style: {
                  fontSize: '11px'
                }
              }
            },
            legend: {
              fontSize: '11px',
              itemMargin: {
                horizontal: 10
              }
            }
          }
        }
      ]
    };
  }

  prepareQuarterlyTripsChart() {
    const isMobile = window.innerWidth < 768;
    const quarters = [1, 2, 3, 4];

    const tripsByQuarter = (year: number) =>
      quarters.map(q =>
        this.data
          .filter(x =>
            Number(x.summaryYear) === year &&
            Math.ceil(Number(x.summaryMonth) / 3) === q
          )
          .reduce((a, b) => a + b.tripsCount, 0)
      );

    this.quarterlyComparisonChartOptions = {
      series: [
        { name: `${this.selectedYear}`, data: tripsByQuarter(Number(this.selectedYear)) },
        { name: `${this.previousYear}`, data: tripsByQuarter(Number(this.previousYear)) }
      ],
      chart: {
        type: 'bar',
        height: isMobile ? 320 : 350,
        toolbar: { 
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          }
        },
        fontFamily: 'inherit'
      },
      plotOptions: {
        bar: {
          columnWidth: isMobile ? '60%' : '45%',
          borderRadius: 6,
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: { 
        enabled: !isMobile,
        formatter: (val: number) => val.toString(),
        offsetY: -20,
        style: {
          fontSize: '11px',
          fontWeight: 600,
          colors: ['#374151']
        }
      },
      colors: ['#8b5cf6', '#f59e0b'],
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      legend: {
        position: 'top',
        horizontalAlign: 'center',
        fontSize: isMobile ? '12px' : '14px',
        markers: {
          width: 10,
          height: 10,
          radius: 2
        },
        itemMargin: {
          horizontal: isMobile ? 8 : 15,
          vertical: 5
        }
      },
      xaxis: {
        categories: ['Q1', 'Q2', 'Q3', 'Q4'],
        labels: {
          style: {
            fontSize: isMobile ? '11px' : '13px',
            fontWeight: 600
          }
        },
        axisBorder: {
          show: true,
          color: '#e5e7eb'
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: isMobile ? '10px' : '12px',
            fontWeight: 500
          },
          formatter: (val: number) => {
            if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
            return val.toFixed(0);
          }
        },
        title: {
          text: 'Number of Trips',
          style: {
            fontSize: isMobile ? '11px' : '13px',
            fontWeight: 600
          }
        }
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
        padding: {
          top: 0,
          right: isMobile ? 10 : 20,
          bottom: 0,
          left: isMobile ? 5 : 10
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val: number) => `${val} Trips`
        },
        style: {
          fontSize: '12px'
        }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 320
            },
            plotOptions: {
              bar: {
                columnWidth: '60%'
              }
            },
            dataLabels: {
              enabled: false
            }
          }
        }
      ]
    };
  }

  prepareYoYGrowthChart() {
    const isMobile = window.innerWidth < 768;
    
    const totalWeight = (year: number) =>
      this.data
        .filter(x => Number(x.summaryYear) === year)
        .reduce((a, b) => a + b.totalNetWeight, 0);

    const totalTrips = (year: number) =>
      this.data
        .filter(x => Number(x.summaryYear) === year)
        .reduce((a, b) => a + b.tripsCount, 0);

    const weightGrowth = this.calculateGrowth(
      totalWeight(Number(this.selectedYear)),
      totalWeight(Number(this.previousYear))
    );
    
    const tripsGrowth = this.calculateGrowth(
      totalTrips(Number(this.selectedYear)),
      totalTrips(Number(this.previousYear))
    );

    this.yoyGrowthChartOptions = {
      series: [
        {
          name: 'Growth %',
          data: [weightGrowth, tripsGrowth]
        }
      ],
      chart: {
        type: 'bar',
        height: isMobile ? 320 : 350,
        toolbar: { 
          show: true,
          tools: {
            download: true,
            selection: false,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          }
        },
        fontFamily: 'inherit'
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: isMobile ? '50%' : '40%',
          borderRadius: 6,
          distributed: true,
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`,
        offsetY: -25,
        style: {
          fontSize: isMobile ? '11px' : '12px',
          fontWeight: 700,
          colors: ['#374151']
        }
      },
      colors: ['#10b981', '#3b82f6'],
      legend: {
        show: false
      },
      xaxis: {
        categories: isMobile 
          ? ['Weight', 'Trips']
          : ['Weight Growth', 'Trips Growth'],
        labels: {
          style: {
            fontSize: isMobile ? '10px' : '12px',
            fontWeight: 600
          },
          rotate: 0,
          trim: true
        },
        axisBorder: {
          show: true,
          color: '#e5e7eb'
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: isMobile ? '10px' : '12px',
            fontWeight: 500
          },
          formatter: (val: number) => `${val.toFixed(0)}%`
        },
        title: {
          text: 'Growth Percentage (%)',
          style: {
            fontSize: isMobile ? '11px' : '13px',
            fontWeight: 600
          }
        }
      },
      grid: {
        borderColor: '#f1f5f9',
        strokeDashArray: 3,
        padding: {
          top: 0,
          right: isMobile ? 10 : 20,
          bottom: 0,
          left: isMobile ? 5 : 10
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val.toFixed(2)}%`
        },
        style: {
          fontSize: '12px'
        }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 320
            },
            plotOptions: {
              bar: {
                columnWidth: '50%'
              }
            },
            xaxis: {
              categories: ['Weight', 'Trips'],
              labels: {
                style: {
                  fontSize: '10px'
                }
              }
            }
          }
        }
      ]
    };
  }

  calculateGrowth(current: number, previous: number): number {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  }

  prepareTableData() {
    this.historicalData = [];
    const years = [...new Set(this.data.map(x => x.summaryYear))].sort();

    const yearlyStats = years.map(year => {
      const yearData = this.data.filter(x => x.summaryYear === year);

      const totalWeight = yearData.reduce((a, b) => a + b.totalNetWeight, 0);
      const totalTrips = yearData.reduce((a, b) => a + b.tripsCount, 0);

      const daysInYear = 365;
      const avgDaily = totalWeight / daysInYear;

      const efficiency = totalTrips > 0 ? totalWeight / totalTrips : 0;

      return {
        year,
        totalWeight,
        totalTrips,
        avgDaily,
        efficiency,
        yoyChange: 0
      };
    });

    for (let i = 1; i < yearlyStats.length; i++) {
      yearlyStats[i].yoyChange = this.calculateGrowth(
        yearlyStats[i].totalWeight,
        yearlyStats[i - 1].totalWeight
      );
    }

    this.historicalData = yearlyStats.reverse();
  }

  private updateChartResponsiveness(): void {
    const isMobile = window.innerWidth < 768;
    const isSmallMobile = window.innerWidth < 480;

    // Update monthly chart with proper month labels
    if (this.monthlyComparisonChartOptions) {
      const monthLabels = isMobile 
        ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      this.monthlyComparisonChartOptions = {
        ...this.monthlyComparisonChartOptions,
        chart: {
          ...this.monthlyComparisonChartOptions.chart,
          height: isMobile ? 400 : 420
        },
        xaxis: {
          ...this.monthlyComparisonChartOptions.xaxis,
          categories: monthLabels,
          labels: {
            ...this.monthlyComparisonChartOptions.xaxis.labels,
            style: {
              fontSize: isSmallMobile ? '11px' : (isMobile ? '12px' : '13px'),
              fontWeight: 600
            },
            rotate: 0,
            rotateAlways: false
          }
        },
        yaxis: {
          ...this.monthlyComparisonChartOptions.yaxis,
          title: {
            ...this.monthlyComparisonChartOptions.yaxis.title,
            text: isMobile ? 'MT' : 'Weight (MT)'
          }
        }
      };
    }

    // Update quarterly chart
    if (this.quarterlyComparisonChartOptions) {
      this.quarterlyComparisonChartOptions = {
        ...this.quarterlyComparisonChartOptions,
        chart: {
          ...this.quarterlyComparisonChartOptions.chart,
          height: isMobile ? 320 : 350
        }
      };
    }

    // Update YoY growth chart
    if (this.yoyGrowthChartOptions) {
      this.yoyGrowthChartOptions = {
        ...this.yoyGrowthChartOptions,
        chart: {
          ...this.yoyGrowthChartOptions.chart,
          height: isMobile ? 320 : 350
        }
      };
    }

    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}