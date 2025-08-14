import { type ComponentFixture, TestBed } from "@angular/core/testing"
import { Dashboard2Component } from "./dashboard.component"
import { NgApexchartsModule } from "ng-apexcharts"
import { FormsModule } from "@angular/forms"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { of } from "rxjs"

describe("DashboardComponent", () => {
  let component: Dashboard2Component
  let fixture: ComponentFixture<Dashboard2Component>
  let mockDbCallingService: jasmine.SpyObj<DbCallingService>

  beforeEach(async () => {
    const spy = jasmine.createSpyObj("DbCallingService", ["getWardwiseReport", "getImportantUpdates"])

    await TestBed.configureTestingModule({
      imports: [Dashboard2Component, NgApexchartsModule, FormsModule],
      providers: [{ provide: DbCallingService, useValue: spy }],
    }).compileComponents()

    fixture = TestBed.createComponent(Dashboard2Component)
    component = fixture.componentInstance
    mockDbCallingService = TestBed.inject(DbCallingService) as jasmine.SpyObj<DbCallingService>

    // Setup default mock responses
    mockDbCallingService.getWardwiseReport.and.returnValue(
      of({
        serviceResponse: 1,
        wardData: [
          { wardName: "Ward A", vehicleCount: 10, totalNetWeight: 100, transactionDate: "2025-01-01" },
          { wardName: "Ward B", vehicleCount: 15, totalNetWeight: 150, transactionDate: "2025-01-01" },
        ],
      })
    )

    mockDbCallingService.getImportantUpdates.and.returnValue(
      of([
        {
          id: 1,
          type: "News",
          priority: "High",
          date: "2025-01-01",
          year: 2025,
          category: "System",
          title: "Test News",
          content: "Test content",
          timeAgo: "1 hour ago",
          createdAt: "2025-01-01T00:00:00Z",
          monthYear: "01-2025",
          siteLocation: "Mumbai",
          eventDate: "2025-01-01",
          notification: "Test notification",
        },
      ])
    )

    fixture.detectChanges()
  })

  it("should create", () => {
    expect(component).toBeTruthy()
  })

  it("should have correct initial data values", () => {
    expect(component.kanjurData.vehicles).toBe(831)
    expect(component.kanjurData.netWeight).toBe(6140.29)
    expect(component.deonarData.vehicles).toBe(229)
    expect(component.deonarData.netWeight).toBe(1624.82)
    expect(component.totalData.vehicles).toBe(1060)
    expect(component.totalData.netWeight).toBe(7765.11)
  })

  it("should initialize chart options", () => {
    expect(component.vehicleChartOptions).toBeDefined()
    expect(component.vehicleChartOptions.series).toEqual([831, 229])
    expect(component.wardChartOptions).toBeDefined()
  })

  it("should load ward data on init", () => {
    expect(mockDbCallingService.getWardwiseReport).toHaveBeenCalled()
    expect(component.wardData.length).toBeGreaterThan(0)
  })

  it("should load news data on init", () => {
    expect(mockDbCallingService.getImportantUpdates).toHaveBeenCalled()
  })

  it("should set loading to false after initialization", (done) => {
    component.ngOnInit()
    expect(component.isLoading).toBe(true)
    setTimeout(() => {
      expect(component.isLoading).toBe(false)
      done()
    }, 1100)
  })

  it("should filter news by search query", () => {
    component.allNews = [
      {
        id: 1,
        type: "News",
        priority: "High",
        date: "2025-01-01",
        year: 2025,
        category: "System",
        title: "Test News",
        content: "Test content",
        timeAgo: "1 hour ago",
        createdAt: "2025-01-01T00:00:00Z",
        monthYear: "01-2025",
        siteLocation: "Mumbai",
        eventDate: "2025-01-01",
        notification: "Test notification",
      },
    ]
    component.searchQuery = "Test"
    component.onSearchChange()
    expect(component.filteredNews.length).toBe(1)
  })

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
})
