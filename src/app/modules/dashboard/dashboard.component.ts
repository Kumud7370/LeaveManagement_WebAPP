import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartDataset } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { DbCallingService } from 'src/app/core/services/db-calling.service';
import { CommonModule } from '@angular/common';
import { WardwiseGraphComponent } from 'src/app/modules/dashboard/wardwisegraph/wardwisegraph.component';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, NgChartsModule, WardwiseGraphComponent, RouterModule]
})
export class DashboardComponent implements OnInit {
  isLoading = true;
  hasError = false;

  // Active tab on the month-wise graph section
  activeMonthTab: 'weight' | 'vehicle' = 'weight';

  // Net Weight graph data
  public barChartData: ChartDataset<'bar'>[] = [
    {
      data: [],
      label: 'Net Weight (MT)',
      backgroundColor: 'rgba(75, 192, 192, 0.7)',
      borderColor: 'rgb(75, 192, 192)',
      borderWidth: 1
    }
  ];
  public barChartLabels: string[] = [];

  // Vehicle Count graph data
  public barChartDataMinor: ChartDataset<'bar'>[] = [
    {
      data: [],
      label: 'Vehicle Count',
      backgroundColor: 'rgba(153, 102, 255, 0.7)',
      borderColor: 'rgb(153, 102, 255)',
      borderWidth: 1
    }
  ];
  public mbarChartLabelsMinor: string[] = [];

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    },
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: 10 }
    }
  };

  public barChartLegend = true;

  constructor(private dbCallingService: DbCallingService) { }

  ngOnInit(): void {
    this.loadChartData();
  }

  loadChartData(): void {
    this.dbCallingService.getDashboardGraphData().subscribe(
      (res) => {
        const data = res.Data;
        if (data && data.length > 0) {
          this.barChartLabels = data.map((item: any) => item.MonthYear);
          this.barChartData[0].data = data.map((item: any) => item.TotalActNetWeight);

          this.mbarChartLabelsMinor = data.map((item: any) => item.MonthYear);
          this.barChartDataMinor[0].data = data.map((item: any) => item.VehicleCount);
        }
        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading chart data', error);
        this.isLoading = false;
        this.hasError = true;
      }
    );
  }

  retryLoadData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.loadChartData();
  }

  setActiveMonthTab(tab: 'weight' | 'vehicle'): void {
    this.activeMonthTab = tab;
  }
}
