import { type ComponentFixture, TestBed } from "@angular/core/testing"
import { DashboardComponent } from "../dashboard2/dashboard.component"
import { NgApexchartsModule } from "ng-apexcharts"
import { FormsModule } from "@angular/forms"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { of } from "rxjs"

describe("DashboardComponent", () => {
  let component: DashboardComponent
  let fixture: ComponentFixture<DashboardComponent>
  let mockDbCallingService: jasmine.SpyObj<DbCallingService>

  beforeEach(async () => {
    const spy = jasmine.createSpyObj("DbCallingService", [
      "getWardwiseReport",
      "GetWBTripSummary",
      "getCumulativeTripSummary",
      "getAllWards",
      "getVehicleTypes",
      "getAgencies",
      "getOverviewMetrics",
      "getYearlyComparison",
    ])

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NgApexchartsModule, FormsModule],
      providers: [{ provide: DbCallingService, useValue: spy }],
    }).compileComponents()

    fixture = TestBed.createComponent(DashboardComponent)
    component = fixture.componentInstance
    mockDbCallingService = TestBed.inject(DbCallingService) as jasmine.SpyObj<DbCallingService>

    // Setup default mock responses
    // mockDbCallingService.getWardwiseReport.and.returnValue(
    //   of({
    //     serviceResponse: 1,
    //     wardData: [{ wardName: "Ward A", vehicleCount: 10, totalNetWeight: 100, transactionDate: "2025-01-01" }],
    //   }),
    // )

    // mockDbCallingService.getWards.and.returnValue(
    //   of({
    //     data: [{ wardName: "Ward A" }, { wardName: "Ward B" }, { wardName: "Ward C" }],
    //   }),
    // )

    // mockDbCallingService.getVehicleTypes.and.returnValue(
    //   of({
    //     data: [{ vehicleTypeName: "COMPACTOR" }, { vehicleTypeName: "MINI COMPACTOR" }, { vehicleTypeName: "DUMPER" }],
    //   }),
    // )

    // mockDbCallingService.GetAgencies.and.returnValue(
    //   of({
    //     data: [{ agencyName: "Agency A" }, { agencyName: "Agency B" }],
    //   }),
    // )

    // mockDbCallingService.getCumulativeTripSummary.and.returnValue(
    //   of({
    //     data: {
    //       today: 100,
    //       lastDay: 95,
    //       week: 650,
    //       month: 2800,
    //       year: 35000,
    //     },
    //   }),
    // )

    // mockDbCallingService.GetWBTripSummary.and.returnValue(
    //   of({
    //     data: {
    //       swmSites: [{ siteName: "Kanjur", vehicleCount: 831, netWeight: 6140.29 }],
    //       rtsSites: [{ siteName: "Deonar", vehicleCount: 229, netWeight: 1624.82 }],
    //     },
    //   }),
    // )

    fixture.detectChanges()
  })

  it("should create", () => {
    expect(component).toBeTruthy()
  })

  it("should have correct initial data values", () => {
    expect(component.kanjurData).toBeDefined()
    expect(component.deonarData).toBeDefined()
    expect(component.totalData).toBeDefined()
  })

  it("should initialize chart options", () => {
    expect(component.vehicleChartOptions).toBeDefined()
    expect(component.capacityVsActualChartOptions).toBeDefined()
    expect(component.monthlyComparisonChartOptions).toBeDefined()
    expect(component.quarterlyComparisonChartOptions).toBeDefined()
    expect(component.yoyGrowthChartOptions).toBeDefined()
  })

  it("should load dashboard data on init", () => {
    expect(mockDbCallingService.getWardwiseReport).toHaveBeenCalled()
  })

  it("should load filters from API on init", () => {
    expect(mockDbCallingService.getWards).toHaveBeenCalled()
    expect(mockDbCallingService.getVehicleTypes).toHaveBeenCalled()
    expect(mockDbCallingService.GetAgencies).toHaveBeenCalled()
  })

  it("should set loading to false after initialization", () => {
    component.ngOnInit()
    expect(component.isLoading).toBe(false)
  })

  it("should initialize available years for comparison", () => {
    expect(component.availableYears.length).toBeGreaterThan(0)
    expect(component.availableYears[0]).toBe(new Date().getFullYear())
  })

  it("should switch sections correctly", () => {
    component.switchSection("performance")
    expect(component.activeSection).toBe("performance")

    component.switchSection("overview")
    expect(component.activeSection).toBe("overview")
  })

  it("should toggle sidebar", () => {
    const initialState = component.sidebarCollapsed
    component.toggleSidebar()
    expect(component.sidebarCollapsed).toBe(!initialState)
  })

  it("should toggle filters", () => {
    const initialState = component.filtersCollapsed
    component.toggleFilters()
    expect(component.filtersCollapsed).toBe(!initialState)
  })

  it("should calculate active filters count", () => {
    component.globalTimeRange = "day"
    component.selectedWard = ""
    component.selectedAgency = ""
    component.selectedVehicleType = ""
    expect(component.getActiveFiltersCount()).toBe(0)

    component.selectedWard = "Ward A"
    expect(component.getActiveFiltersCount()).toBe(1)
  })

  it("should show custom date range when custom option selected", () => {
    component.globalTimeRange = "custom"
    component.onTimeRangeChange()
    expect(component.showCustomDateRange).toBe(true)
  })

  it("should calculate progress width correctly", () => {
    expect(component.getProgressWidth(100, 80)).toBe(100)
    expect(component.getProgressWidth(80, 100)).toBe(80)
    expect(component.getProgressWidth(0, 0)).toBe(0)
  })

  it("should have comparison data initialized", () => {
    expect(component.comparisonData).toBeDefined()
    expect(component.comparisonData.currentYear).toBeDefined()
    expect(component.comparisonData.previousYear).toBeDefined()
    expect(component.comparisonData.changes).toBeDefined()
    expect(component.comparisonData.siteWise).toBeDefined()
  })

  it("should load comparison data when year changes", () => {
    const loadSpy = spyOn(component, "loadComparisonData")
    component.onComparisonYearChange()
    expect(loadSpy).toHaveBeenCalled()
  })

  it("should clear all filters correctly", () => {
    component.selectedWard = "Ward A"
    component.selectedAgency = "Agency A"
    component.selectedVehicleType = "COMPACTOR"
    component.globalTimeRange = "month"

    component.clearAllFilters()

    expect(component.selectedWard).toBe("")
    expect(component.selectedAgency).toBe("")
    expect(component.selectedVehicleType).toBe("")
    expect(component.globalTimeRange).toBe("day")
  })
})
