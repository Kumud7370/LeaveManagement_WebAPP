import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DashboardComponent } from 'src/app/modules/dashboard/dashboard.component';
import { DbCallingService } from '../../../core/services/db-calling.service';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let dbCallingServiceMock: jasmine.SpyObj<DbCallingService>;

  beforeEach(async () => {
    dbCallingServiceMock = jasmine.createSpyObj('DbCallingService', [
      'getDashboardGraphData',
      'getDashboardGraphWardwiseData'
    ]);
    
    dbCallingServiceMock.getDashboardGraphData.and.returnValue(of({
      Data: [
        { MonthYear: 'Jan 2023', VehicleCount: 120, TotalActNetWeight: 1500 },
        { MonthYear: 'Feb 2023', VehicleCount: 150, TotalActNetWeight: 1800 }
      ]
    }));
    
    dbCallingServiceMock.getDashboardGraphWardwiseData.and.returnValue(of({
      WBWidgetTable: [
        { WBName: 'Ward A', VehicleCount: 50, ActNetWt: 600 },
        { WBName: 'Ward B', VehicleCount: 70, ActNetWt: 850 }
      ]
    }));

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        HttpClientTestingModule,
        DashboardComponent
      ],
      providers: [
        { provide: DbCallingService, useValue: dbCallingServiceMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load graph data on init', () => {
    expect(dbCallingServiceMock.getDashboardGraphData).toHaveBeenCalled();
    expect(dbCallingServiceMock.getDashboardGraphWardwiseData).toHaveBeenCalled();
    expect(component.mbarChartLabelsMinor.length).toBe(2);    
  });
});