import { type ComponentFixture, TestBed } from "@angular/core/testing"
import { HttpClientTestingModule } from "@angular/common/http/testing"
import { NgChartsModule } from "ng2-charts"
import { WardwiseGraphComponent } from "src/app/modules/dashboard/wardwisegraph/wardwisegraph.component"
import { DbCallingService } from "src/app/core/services/db-calling.service"
import { of } from "rxjs"

describe("WardwisegraphComponent", () => {
  let component: WardwiseGraphComponent
  let fixture: ComponentFixture<WardwiseGraphComponent>
  let dbCallingServiceSpy: jasmine.SpyObj<DbCallingService>

  beforeEach(async () => {
    const spy = jasmine.createSpyObj("DbCallingService", ["getDashboardGraphWardwiseData"])

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NgChartsModule],
      declarations: [WardwiseGraphComponent],
      providers: [{ provide: DbCallingService, useValue: spy }],
    }).compileComponents()

    dbCallingServiceSpy = TestBed.inject(DbCallingService) as jasmine.SpyObj<DbCallingService>
    dbCallingServiceSpy.getDashboardGraphWardwiseData.and.returnValue(of({ WBWidgetTable: [] }))

    fixture = TestBed.createComponent(WardwiseGraphComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it("should create", () => {
    expect(component).toBeTruthy()
  })

  it("should call getDashboardGraphWardwiseData on init", () => {
    expect(dbCallingServiceSpy.getDashboardGraphWardwiseData).toHaveBeenCalled()
  })
})
