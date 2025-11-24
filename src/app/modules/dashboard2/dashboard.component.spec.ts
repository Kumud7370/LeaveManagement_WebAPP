import { ComponentFixture, TestBed } from "@angular/core/testing"
import { DashboardComponent } from "./dashboard.component"
import { NgApexchartsModule } from "ng-apexcharts"
import { FormsModule } from "@angular/forms"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { of } from "rxjs"

describe("DashboardComponent", () => {
  let component: DashboardComponent
  let fixture: ComponentFixture<DashboardComponent>
  let mockDbCallingService: jasmine.SpyObj<DbCallingService>

  beforeEach(async () => {
    const spy = jasmine.createSpyObj("DbCallingService", ["getWardwiseReport"])

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NgApexchartsModule, FormsModule],
      providers: [{ provide: DbCallingService, useValue: spy }],
    }).compileComponents()

    fixture = TestBed.createComponent(DashboardComponent)
    component = fixture.componentInstance
    mockDbCallingService = TestBed.inject(DbCallingService) as jasmine.SpyObj<DbCallingService>

    // Setup default mock responses
    mockDbCallingService.getWardwiseReport.and.returnValue(
      of({
        serviceResponse: 1,
        wardData: [{ wardName: "Ward A", vehicleCount: 10, totalNetWeight: 100, transactionDate: "2025-01-01" }],
      }),
    )

    fixture.detectChanges()
  })

  it("should create", () => {
    expect(component).toBeTruthy()
  })

  it("should have correct initial data values", () => {
    expect(component.kanjurData.trips).toBe(831)
    expect(component.kanjurData.netWeight).toBe(6140.29)
    expect(component.deonarData.trips).toBe(229)
    expect(component.deonarData.netWeight).toBe(1624.82)
    expect(component.totalData.trips).toBe(1060)
    expect(component.totalData.netWeight).toBe(7765.11)
  })

  it("should initialize chart options", () => {
    expect(component.vehicleChartOptions).toBeDefined()
    expect(component.vehicleChartOptions.series).toEqual([831, 229])
    expect(component.capacityVsActualChartOptions).toBeDefined()
  })

  it("should load dashboard data on init", () => {
    expect(mockDbCallingService.getWardwiseReport).toHaveBeenCalled()
  })

  it("should set loading to false after initialization", () => {
    component.ngOnInit()
    expect(component.isLoading).toBe(false)
  })
})