import { type ComponentFixture, TestBed } from "@angular/core/testing"
import { DashboardComponent } from "./dashboard.component"
import { NgApexchartsModule } from "ng-apexcharts"

describe("DashboardComponent", () => {
  let component: DashboardComponent
  let fixture: ComponentFixture<DashboardComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NgApexchartsModule],
    }).compileComponents()

    fixture = TestBed.createComponent(DashboardComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it("should create", () => {
    expect(component).toBeTruthy()
  })

  it("should have correct data values", () => {
    expect(component.kanjurData.vehicles).toBe(831)
    expect(component.kanjurData.netWeight).toBe(6140.29)
    expect(component.deonarData.vehicles).toBe(229)
    expect(component.deonarData.netWeight).toBe(1624.82)
    expect(component.totalData.vehicles).toBe(1060)
    expect(component.totalData.netWeight).toBe(7765.11)
  })

  it("should initialize chart options", () => {
    expect(component.vehicleChartOptions).toBeDefined()
    expect(component.weightChartOptions).toBeDefined()
    expect(component.vehicleChartOptions.series).toEqual([831, 229])
    expect(component.weightChartOptions.series[0].data).toEqual([6140.29, 1624.82])
  })

  it("should set loading to false after initialization", (done) => {
    component.ngOnInit()
    expect(component.isLoading).toBe(true)

    setTimeout(() => {
      expect(component.isLoading).toBe(false)
      done()
    }, 1100)
  })
})
