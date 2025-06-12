import { TestBed } from "@angular/core/testing"
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing"
import { DbCallingService } from "./db-calling.service"
import { environment } from "src/environments/environment"

describe("DbCallingService", () => {
  let service: DbCallingService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DbCallingService],
    })
    service = TestBed.inject(DbCallingService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    httpMock.verify()
  })

  it("should be created", () => {
    expect(service).toBeTruthy()
  })

  it("should get dashboard graph data", () => {
    const mockData = { Data: [] }

    service.getDashboardGraphData().subscribe((data) => {
      expect(data).toEqual(mockData)
    })

    const req = httpMock.expectOne(`${environment.apiUrl}/dashboard/graph-data`)
    expect(req.request.method).toBe("GET")
    req.flush(mockData)
  })

  it("should get dashboard graph wardwise data", () => {
    const mockData = { WBWidgetTable: [] }

    service.getDashboardGraphWardwiseData().subscribe((data) => {
      expect(data).toEqual(mockData)
    })

    const req = httpMock.expectOne(`${environment.apiUrl}/dashboard/graph-wardwise-data`)
    expect(req.request.method).toBe("GET")
    req.flush(mockData)
  })

  it("should get widget data", () => {
    const mockData = { WBWidgetTable: [] }

    service.getWidgetData().subscribe((data) => {
      expect(data).toEqual(mockData)
    })

    const req = httpMock.expectOne(`${environment.apiUrl}/dashboard/widget-data`)
    expect(req.request.method).toBe("GET")
    req.flush(mockData)
  })
})
