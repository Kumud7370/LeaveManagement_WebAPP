import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbCallingService } from 'src/app/core/services/db-calling.service';
import { ChartConfiguration, ChartDataset } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-wardwisegraph',
  templateUrl: './wardwisegraph.component.html',
  styleUrls: ['./wardwisegraph.component.scss'],
  standalone: true,
  imports: [CommonModule, NgChartsModule]
})
export class WardwiseGraphComponent implements OnInit {
  isLoading = true;
  hasError = false;

  // Updated: Combine labels and datasets in a single object
  public barChartDataWard = {
    labels: [] as string[],
    datasets: [
      { 
        data: [] as number[], 
        label: 'Net Weight (MT)',
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1
      }
    ]
  };

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Net Weight (MT)'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    }
  };

  constructor(private dbCallingService: DbCallingService) {}

  ngOnInit(): void {
    this.loadWardwiseData();
  }

  loadWardwiseData(): void {
    this.isLoading = true;
    this.hasError = false;

    this.dbCallingService.getDashboardGraphWardwiseData().subscribe({
      next: (res) => {
        const data = res.WBWidgetTable;
        if (data && data.length > 0) {
          // Clear previous data
          this.barChartDataWard.labels = [];
          this.barChartDataWard.datasets[0].data = [];

          data.forEach((item: any) => {
            this.barChartDataWard.labels.push(item.WBName);
            this.barChartDataWard.datasets[0].data.push(item.ActNetWt);
          });
        } else {
          // No data fallback
          this.barChartDataWard.labels = ['No Data'];
          this.barChartDataWard.datasets[0].data = [0];
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ward-wise data', error);
        this.barChartDataWard.labels = ['Error Loading Data'];
        this.barChartDataWard.datasets[0].data = [0];
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  retryLoadData(): void {
    this.loadWardwiseData();
  }
}
