// import { type ComponentFixture, TestBed } from "@angular/core/testing"
// import { DashboardComponent } from "./dashboard.component"
// import { NgApexchartsModule } from "ng-apexcharts"
// import { FormsModule } from "@angular/forms"
// import { DbCallingService } from "src/app/core/services/db-calling.service"
// import { of } from "rxjs"

// describe("DashboardComponent", () => {
//   let component: DashboardComponent
//   let fixture: ComponentFixture<DashboardComponent>
//   let mockDbCallingService: jasmine.SpyObj<DbCallingService>

//   beforeEach(async () => {
//     const spy = jasmine.createSpyObj("DbCallingService", [
//       "GetWBTripSummary",
//       "getWardwiseReport",
//       "getImportantUpdates",
//     ])

//     await TestBed.configureTestingModule({
//       imports: [DashboardComponent, NgApexchartsModule, FormsModule],
//       providers: [{ provide: DbCallingService, useValue: spy }],
//     }).compileComponents()

//     fixture = TestBed.createComponent(DashboardComponent)
//     component = fixture.componentInstance
//     mockDbCallingService = TestBed.inject(DbCallingService) as jasmine.SpyObj<DbCallingService>

//     mockDbCallingService.GetWBTripSummary.and.returnValue(
//       of({
//         isSuccess: true,
//         data: {
//           swmSites: [
//             {
//               siteName: "Kanjur",
//               vehicleCount: 831,
//               netWeight: 6140.29,
//               colorCode: "#1a2a6c",
//             },
//           ],
//           rtsSites: [
//             {
//               siteName: "Deonar Refuse",
//               vehicleCount: 229,
//               netWeight: 1624.82,
//               colorCode: "#b21f1f",
//             },
//           ],
//         },
//       }),
//     )

//     mockDbCallingService.getWardwiseReport.and.returnValue(
//       of({
//         serviceResponse: 1,
//         wardData: [
//           { wardName: "Ward A", vehicleCount: 10, totalNetWeight: 100, transactionDate: "2025-01-01" },
//           { wardName: "Ward B", vehicleCount: 15, totalNetWeight: 150, transactionDate: "2025-01-01" },
//         ],
//       }),
//     )

//     mockDbCallingService.getImportantUpdates.and.returnValue(
//       of([
//         {
//           id: 1,
//           type: "News",
//           priority: "High",
//           date: "2025-01-01",
//           year: 2025,
//           category: "System",
//           title: "Test News",
//           content: "Test content",
//           timeAgo: "1 hour ago",
//           createdAt: "2025-01-01T00:00:00Z",
//           monthYear: "01-2025",
//           siteLocation: "Mumbai",
//           eventDate: "2025-01-01",
//           notification: "Test notification",
//         },
//       ]),
//     )

//     fixture.detectChanges()
//   })

//   it("should create", () => {
//     expect(component).toBeTruthy()
//   })

//   it("should have correct initial data structure", () => {
//     expect(component.kanjurData).toBeDefined()
//     expect(component.kanjurData.trips).toBe(0)
//     expect(component.kanjurData.netWeight).toBe(0)
//     expect(component.deonarData).toBeDefined()
//     expect(component.deonarData.trips).toBe(0)
//     expect(component.deonarData.netWeight).toBe(0)
//   })

//   it("should have last 30 days summary initialized", () => {
//     expect(component.last30DaysSummary).toBeDefined()
//     expect(component.last30DaysSummary.trips).toBe(0)
//     expect(component.last30DaysSummary.netWeight).toBe(0)
//     expect(component.last30DaysSummary.averageWardTrips).toBe(0)
//     expect(component.last30DaysSummary.averageWardWeight).toBe(0)
//   })

//   it("should initialize chart options", () => {
//     expect(component.vehicleChartOptions).toBeDefined()
//     expect(component.wardChartOptions).toBeDefined()
//   })

//   it("should load site data on init", () => {
//     expect(mockDbCallingService.GetWBTripSummary).toHaveBeenCalled()
//     expect(component.swmSites.length).toBeGreaterThan(0)
//   })

//   it("should process dynamic site data correctly", () => {
//     component.swmSites = [
//       {
//         siteName: "Kanjur",
//         vehicleCount: 831,
//         netWeight: 6140.29,
//         colorCode: "#1a2a6c",
//       },
//     ]
//     component.rtsSites = [
//       {
//         siteName: "Deonar Refuse",
//         vehicleCount: 229,
//         netWeight: 1624.82,
//         colorCode: "#b21f1f",
//       },
//     ]

//     component.processDynamicSiteData()

//     expect(component.kanjurData.trips).toBe(831)
//     expect(component.kanjurData.netWeight).toBe(6140.29)
//     expect(component.deonarData.trips).toBe(229)
//     expect(component.deonarData.netWeight).toBe(1624.82)
//   })

//   it("should calculate last 30 days summary correctly", () => {
//     const wardData = [
//       { wardName: "Ward A", vehicleCount: 10, totalNetWeight: 100, transactionDate: "2025-01-01" },
//       { wardName: "Ward B", vehicleCount: 15, totalNetWeight: 150, transactionDate: "2025-01-01" },
//       { wardName: "Ward C", vehicleCount: 20, totalNetWeight: 200, transactionDate: "2025-01-01" },
//     ]

//     component.calculateLast30DaysSummary(wardData)

//     expect(component.last30DaysSummary.trips).toBe(45)
//     expect(component.last30DaysSummary.netWeight).toBe(450)
//     expect(component.last30DaysSummary.averageWardTrips).toBe(15)
//     expect(component.last30DaysSummary.averageWardWeight).toBe(150)
//   })

//   it("should set loading to false after initialization", (done) => {
//     component.ngOnInit()
//     expect(component.isLoading).toBe(true)
//     setTimeout(() => {
//       expect(component.isLoading).toBe(false)
//       done()
//     }, 1100)
//   })

//   it("should handle pagination correctly", () => {
//     component.totalItems = 20
//     component.pageSize = 6
//     component.currentPage = 1
//     component.totalPages = Math.ceil(component.totalItems / component.pageSize)

//     expect(component.totalPages).toBe(4)

//     component.goToNextPage()
//     expect(component.currentPage).toBe(2)

//     component.goToPreviousPage()
//     expect(component.currentPage).toBe(1)
//   })
// })
