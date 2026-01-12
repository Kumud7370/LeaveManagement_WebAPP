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
      "getWards",
      "getVehicleTypes",
      "GetAgencies",
      "getDashboardOverallKpis",
      "getDashboardAnalyticsSummary",
    ])

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NgApexchartsModule, FormsModule],
      providers: [{ provide: DbCallingService, useValue: spy }],
    }).compileComponents()

    fixture = TestBed.createComponent(DashboardComponent)
    component = fixture.componentInstance
    mockDbCallingService = TestBed.inject(DbCallingService) as jasmine.SpyObj<DbCallingService>

    // Setup minimal mock responses to prevent errors
    mockDbCallingService.getWards.and.returnValue(of({ data: [] }))
    mockDbCallingService.getVehicleTypes.and.returnValue(of({ data: [] }))
    mockDbCallingService.GetAgencies.and.returnValue(of({ data: [] }))
    mockDbCallingService.getDashboardOverallKpis.and.returnValue(of({ data: [] }))
    mockDbCallingService.getDashboardAnalyticsSummary.and.returnValue(of({ data: [] }))

    fixture.detectChanges()
  })

  it("should create", () => {
    expect(component).toBeTruthy()
  })

  it("should have correct initial data values", () => {
    expect(component.kanjurData).toBeDefined()
    expect(component.deonarData).toBeDefined()
    expect(component.totalData).toBeDefined()
    expect(component.mrtswardData).toBeDefined()
    expect(component.grtswardData).toBeDefined()
    expect(component.vrtswardData).toBeDefined()
    expect(component.wardTotalData).toBeDefined()
  })

  it("should initialize chart options", () => {
    expect(component.wardwiseChartOptions).toBeDefined()
  })

  it("should load dashboard data on init", () => {
    expect(mockDbCallingService.getDashboardOverallKpis).toHaveBeenCalled()
    expect(mockDbCallingService.getDashboardAnalyticsSummary).toHaveBeenCalled()
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

    component.selectedAgency = "Agency A"
    expect(component.getActiveFiltersCount()).toBe(2)

    component.selectedVehicleType = "COMPACTOR"
    expect(component.getActiveFiltersCount()).toBe(3)
  })

  it("should show custom date range when custom option selected", () => {
    component.globalTimeRange = "custom"
    component.onTimeRangeChange()
    expect(component.showCustomDateRange).toBe(true)
  })

  it("should hide custom date range when non-custom option selected", () => {
    component.globalTimeRange = "custom"
    component.onTimeRangeChange()
    expect(component.showCustomDateRange).toBe(true)

    component.globalTimeRange = "day"
    component.onTimeRangeChange()
    expect(component.showCustomDateRange).toBe(false)
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

  it("should call loadDashboardData when filters change", () => {
    spyOn(component, "loadDashboardData")
    component.onGlobalFilterChange()
    expect(component.loadDashboardData).toHaveBeenCalled()
  })

  it("should call loadDashboardData when time range changes (non-custom)", () => {
    spyOn(component, "onGlobalFilterChange")
    component.globalTimeRange = "week"
    component.onTimeRangeChange()
    expect(component.onGlobalFilterChange).toHaveBeenCalled()
  })

  it("should not call loadDashboardData when custom time range selected", () => {
    spyOn(component, "onGlobalFilterChange")
    component.globalTimeRange = "custom"
    component.onTimeRangeChange()
    expect(component.onGlobalFilterChange).not.toHaveBeenCalled()
  })

  it("should apply custom date range when both dates are set", () => {
    spyOn(component, "onGlobalFilterChange")
    component.customDateFrom = "2025-01-01"
    component.customDateTo = "2025-01-10"
    component.applyCustomDateRange()
    expect(component.onGlobalFilterChange).toHaveBeenCalled()
  })

  it("should not apply custom date range when dates are missing", () => {
    spyOn(component, "onGlobalFilterChange")
    component.customDateFrom = ""
    component.customDateTo = ""
    component.applyCustomDateRange()
    expect(component.onGlobalFilterChange).not.toHaveBeenCalled()
  })

  it("should refresh all data when refreshAllData is called", () => {
    spyOn(component, "loadDashboardData")
    
    component.refreshAllData()
    
    expect(component.isRefreshing).toBe(true)
    expect(component.loadDashboardData).toHaveBeenCalled()
  })

  it("should set isExporting flag when exporting data", () => {
    component.exportAllData()
    expect(component.isExporting).toBe(true)
  })

  it("should initialize with overview section active", () => {
    expect(component.activeSection).toBe("overview")
  })

  it("should initialize with sidebar not collapsed", () => {
    expect(component.sidebarCollapsed).toBe(false)
  })

  it("should initialize with filters not collapsed", () => {
    expect(component.filtersCollapsed).toBe(false)
  })

  it("should have initial time range as day", () => {
    expect(component.globalTimeRange).toBe("day")
  })

  it("should have empty initial filter selections", () => {
    expect(component.selectedWard).toBe("")
    expect(component.selectedAgency).toBe("")
    expect(component.selectedVehicleType).toBe("")
  })

  it("should initialize available filters as empty arrays", () => {
    expect(component.availableWards).toEqual([])
    expect(component.availableAgencies).toEqual([])
    expect(component.availableVehicleTypes).toEqual([])
  })

  it("should set searchParams when loading dashboard data", () => {
    component.loadDashboardData()
    expect(component.searchParams).toBeDefined()
    expect(component.searchParams.UserId).toBeDefined()
    expect(component.searchParams.SiteName).toBe("SWM")
  })

  it("should handle drillDownMetric calls without errors", () => {
    spyOn(console, "log")
    component.drillDownMetric("today")
    expect(console.log).toHaveBeenCalledWith("Drill down to:", "today")
  })

  it("should handle scrollToSection calls without errors", () => {
    component.scrollToSection("overview")
    // Just verify it doesn't throw an error
    expect(component).toBeTruthy()
  })
})