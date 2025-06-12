import { type ComponentFixture, TestBed } from "@angular/core/testing"
import { RouterTestingModule } from "@angular/router/testing"
import { HttpClientTestingModule } from "@angular/common/http/testing"
import { DashboardComponent } from "./dashboard.component"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { of } from "rxjs"
import { NO_ERRORS_SCHEMA } from "@angular/core"

describe("DashboardComponent", () => {
  let component: DashboardComponent
  let fixture: ComponentFixture<DashboardComponent>
  let dbCallingServiceSpy: jasmine.SpyObj<DbCallingService>

  beforeEach(async () => {
    const spy = jasmine.createSpyObj("DbCallingService", ["getDashboardGraphData", "getDashboardGraphWardwiseData"])

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [DashboardComponent],
      providers: [{ provide: DbCallingService, useValue: spy }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents()

    dbCallingServiceSpy = TestBed.inject(DbCallingService) as jasmine.SpyObj<DbCallingService>
    dbCallingServiceSpy.getDashboardGraphData.and.returnValue(of({ Data: [] }))
    dbCallingServiceSpy.getDashboardGraphWardwiseData.and.returnValue(of({ WBWidgetTable: [] }))

    fixture = TestBed.createComponent(DashboardComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it("should create", () => {
    expect(component).toBeTruthy()
  })

  it("should set active tab", () => {
    component.setActiveMonthTab("vehicle")
    expect(component.activeMonthTab).toBe("vehicle")
  })

  it("should call getDashboardGraphData on init", () => {
    expect(dbCallingServiceSpy.getDashboardGraphData).toHaveBeenCalled()
  })

  it("should call getDashboardGraphWardwiseData on init", () => {
    expect(dbCallingServiceSpy.getDashboardGraphWardwiseData).toHaveBeenCalled()
  })
})
