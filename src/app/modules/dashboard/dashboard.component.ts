import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { NgApexchartsModule } from "ng-apexcharts"
import type {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
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
  dataLabels: ApexDataLabels
  plotOptions: ApexPlotOptions
  colors: string[]
  grid: ApexGrid
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

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
})
export class DashboardComponent implements OnInit {
  isLoading = true

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

  // Chart colors matching search-report theme
  private primaryColor = "#1a2a6c"
  private secondaryColor = "#b21f1f"
  private accentColor = "#00ffcc"
  private successColor = "#10b981"

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

  // Net Weight Bar Chart Options
  public weightChartOptions: ChartOptions = {
    series: [
      {
        name: "Net Weight (MT)",
        data: [6140.29, 1624.82],
      },
    ],
    chart: {
      type: "bar",
      height: 350,
      fontFamily: "Raleway, sans-serif",
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 8,
        dataLabels: {
          position: "top",
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => {
        return val.toFixed(2) + " MT"
      },
      offsetY: -20,
      style: {
        fontSize: "12px",
        fontWeight: "bold",
        colors: [this.primaryColor],
      },
    },
    xaxis: {
      categories: ["Kanjur", "Deonar"],
      labels: {
        style: {
          fontSize: "14px",
          fontWeight: 500,
          colors: [this.primaryColor, this.primaryColor],
        },
      },
    },
    colors: [this.successColor],
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
  }

  constructor() {}

  ngOnInit(): void {
    // Simulate loading
    setTimeout(() => {
      this.isLoading = false
    }, 1000)
  }
}
