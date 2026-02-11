// import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, OnChanges, HostListener } from "@angular/core"
// import { CommonModule } from "@angular/common"
// import { FormsModule } from "@angular/forms"
// import { NgApexchartsModule } from "ng-apexcharts"
// import { DbCallingService } from "src/app/core/services/db-calling.service"
// import { Subject, takeUntil, forkJoin, of, Observable } from "rxjs"
// import moment from "moment"

// export interface WardWiseSummaryRow {
//   ward: string;
//   totalNetWeight: number;
//   tripsCount: number;
//   avgNetWeight: number;
// }
// @Component({
//   selector: 'app-dashboard-wardwisereport',
//   imports: [CommonModule, FormsModule, NgApexchartsModule],
//   templateUrl: './dashboard-wardwisereport.component.html',
//   styleUrl: './dashboard-wardwisereport.component.scss'
// })
// export class DashboardWardwisereportComponent {

//  @Input() data: any;
//   private destroy$ = new Subject<void>()
//   isLoading = true
//   isRefreshing = false
//   isExporting = false
//   swmWardwiseTableData: WardWiseSummaryRow[] = []
//   rtsWardwiseTableData: WardWiseSummaryRow[] = []
//   constructor(private dbCallingService: DbCallingService,
//     private cdr: ChangeDetectorRef) {
//   }

//   ngOnChanges(): void {
//  //   console.log('Ward-wise report data changed:', this.data);
//     if (this.data?.length) {

//       this.prepareSWMWardwiseTable();
//       this.prepareRTSWardWardwiseTable();
//       this.updateChartResponsiveness();

//     }
//   }
// prepareSWMWardwiseTable(): void {

//   const swmWardwiseData = this.data.filter(
//     (x: any) => x.siteName === 'Kanjur' || x.siteName === 'Deonar'
//   );
//     console.log('swmWardwiseData data changed:', swmWardwiseData);
//   const grouped = swmWardwiseData.reduce((acc: any, cur: any) => {

//     if (!acc[cur.ward]) {
//       acc[cur.ward] = {
//         ward: cur.ward,
//         totalNetWeight: 0,
//         tripsCount: 0
//       };
//     }

//     acc[cur.ward].totalNetWeight += cur.totalNetWeight || 0;
//     acc[cur.ward].tripsCount += cur.tripsCount || 0;

//     return acc;
//   }, {});

//   /* ✅ Final ward-wise table rows */
//   this.swmWardwiseTableData = Object.values(grouped).map((x: any) => ({
//     ward: x.ward,
//     totalNetWeight: +x.totalNetWeight.toFixed(2),
//     tripsCount: x.tripsCount,
//     avgNetWeight: x.tripsCount > 0
//       ? +(x.totalNetWeight / x.tripsCount).toFixed(2)
//       : 0
//   }));

//   this.isLoading = false;
// }
// prepareRTSWardWardwiseTable(): void {

//   const rtsWardwiseData = this.data.filter(
//     (x: any) => x.siteName === 'MRTS-WARD' || x.siteName === 'GRTS-WARD' || x.siteName === 'VRTS-WARD'
//   );
//     console.log('rtsWardwiseData data changed:', rtsWardwiseData);
//   const grouped = rtsWardwiseData.reduce((acc: any, cur: any) => {

//     if (!acc[cur.ward]) {
//       acc[cur.ward] = {
//         ward: cur.ward,
//         totalNetWeight: 0,
//         tripsCount: 0
//       };
//     }

//     acc[cur.ward].totalNetWeight += cur.totalNetWeight || 0;
//     acc[cur.ward].tripsCount += cur.tripsCount || 0;

//     return acc;
//   }, {});

//   /* ✅ Final ward-wise table rows */
//   this.rtsWardwiseTableData = Object.values(grouped).map((x: any) => ({
//     ward: x.ward,
//     totalNetWeight: +x.totalNetWeight.toFixed(2),
//     tripsCount: x.tripsCount,
//     avgNetWeight: x.tripsCount > 0
//       ? +(x.totalNetWeight / x.tripsCount).toFixed(2)
//       : 0
//   }));

//   this.isLoading = false;
// }


//   @HostListener("window:resize", ["$event"])
//   onResize(event: any) {
//     this.updateChartResponsiveness()
//   }
//   private updateChartResponsiveness(): void {
//     const isMobile = window.innerWidth < 768



//     this.cdr.detectChanges()
//   }
//   ngOnDestroy(): void {
//     this.destroy$.next()
//     this.destroy$.complete()
//   }
// }

