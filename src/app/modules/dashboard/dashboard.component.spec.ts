import { type ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { ApiClientService } from 'src/app/core/services/api/apiClient';
import { UpcomingHolidaysWidgetComponent } from '../holiday/upcoming-holidays-widget/upcoming-holidays-widget.component';
import { of, throwError } from 'rxjs';

import { Component, Input } from '@angular/core';
@Component({ selector: 'app-upcoming-holidays-widget', template: '', standalone: true })
class MockHolidaysWidget { @Input() count = 5; }

const MOCK_ATT_STATS = {
  data: { presentCount: 42, absentCount: 8, lateCount: 5, earlyLeaveCount: 3 }
};
const MOCK_LATE      = { data: [
  { employeeName: 'Alice', employeeCode: 'E001', checkInTime: '2026-01-01T09:30:00Z', shiftName: 'Morning' },
  { employeeName: 'Bob',   employeeCode: 'E002', checkInTime: '2026-01-01T09:45:00Z', shiftName: 'Morning' },
]};
const MOCK_EARLY     = { data: [
  { employeeName: 'Carol', employeeCode: 'E003', checkOutTime: '2026-01-01T16:00:00Z', shiftName: 'Morning' },
]};
const MOCK_PENDING   = { data: [
  { employeeName: 'Dave', employeeCode: 'E004', leaveTypeName: 'Casual Leave',
    startDate: '2026-01-10T00:00:00Z', totalDays: 2, leaveStatus: 'Pending' },
  { employeeName: 'Eve',  employeeCode: 'E005', leaveTypeName: 'Sick Leave',
    startDate: '2026-01-12T00:00:00Z', totalDays: 1, leaveStatus: 'Pending' },
]};
const MOCK_EMPLOYEES  = { data: Array.from({ length: 50 }, (_, i) => ({ id: `emp-${i}` })) };
const MOCK_DEPTS      = { data: [
  { name: 'Engineering', employeeCount: 20 },
  { name: 'HR',          employeeCount: 10 },
  { name: 'Finance',     employeeCount: 15 },
]};
const MOCK_HOLIDAYS   = { data: [
  { name: 'Republic Day', date: '2026-01-26T00:00:00Z' },
]};
const MOCK_ALL_LEAVES = { data: { items: [
  { appliedDate: new Date().toISOString(), leaveStatus: 'Pending',  employeeName: 'Dave' },
  { appliedDate: new Date().toISOString(), leaveStatus: 'Approved', employeeName: 'Eve'  },
  { appliedDate: new Date().toISOString(), leaveStatus: 'Rejected', employeeName: 'Frank'},
  { appliedDate: new Date().toISOString(), leaveStatus: 'Approved', employeeName: 'Gina' },
]}};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockApi: jasmine.SpyObj<ApiClientService>;

  beforeEach(async () => {
    mockApi = jasmine.createSpyObj<ApiClientService>('ApiClientService', [
      'getAttendanceStatistics',
      'getLateAttendance',
      'getEarlyLeave',
      'getPendingLeaves',
      'getActiveEmployees',
      'getActiveDepartments',
      'getUpcomingHolidays',
      'filterLeaves',
    ]);

    mockApi.getAttendanceStatistics.and.returnValue(of(MOCK_ATT_STATS));
    mockApi.getLateAttendance      .and.returnValue(of(MOCK_LATE));
    mockApi.getEarlyLeave          .and.returnValue(of(MOCK_EARLY));
    mockApi.getPendingLeaves       .and.returnValue(of(MOCK_PENDING));
    mockApi.getActiveEmployees     .and.returnValue(of(MOCK_EMPLOYEES));
    mockApi.getActiveDepartments   .and.returnValue(of(MOCK_DEPTS));
    mockApi.getUpcomingHolidays    .and.returnValue(of(MOCK_HOLIDAYS));
    mockApi.filterLeaves           .and.returnValue(of(MOCK_ALL_LEAVES));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NgApexchartsModule, FormsModule],
      providers: [{ provide: ApiClientService, useValue: mockApi }],
    })
    .overrideComponent(DashboardComponent, {
      remove: { imports: [UpcomingHolidaysWidgetComponent] },
      add:    { imports: [MockHolidaysWidget] },
    })
    .compileComponents();

    fixture   = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise stat values to 0', () => {
    const fresh = new DashboardComponent(mockApi as any, { detectChanges: () => {} } as any);
    expect(fresh.presentToday).toBe(0);
    expect(fresh.absentToday).toBe(0);
    expect(fresh.lateToday).toBe(0);
    expect(fresh.earlyLeaveToday).toBe(0);
    expect(fresh.leavePending).toBe(0);
    expect(fresh.leaveApproved).toBe(0);
    expect(fresh.leaveRejected).toBe(0);
    expect(fresh.leaveCancelled).toBe(0);
    expect(fresh.leaveTotal).toBe(0);
    expect(fresh.activeEmployees).toBe(0);
    expect(fresh.activeDepartments).toBe(0);
  });

  it('should initialise all four charts', () => {
    component.initEmptyChartsPublic();
    expect(component.attendanceBarChart).toBeDefined();
    expect(component.leaveTrendLineChart).toBeDefined();
    expect(component.leaveDonutChart).toBeDefined();
    expect(component.deptDonutChart).toBeDefined();
  });

  it('should call all required API methods on loadDashboard()', () => {
    component.loadDashboard();
    expect(mockApi.getAttendanceStatistics).toHaveBeenCalled();
    expect(mockApi.getLateAttendance)      .toHaveBeenCalled();
    expect(mockApi.getEarlyLeave)          .toHaveBeenCalled();
    expect(mockApi.getPendingLeaves)       .toHaveBeenCalled();
    expect(mockApi.getActiveEmployees)     .toHaveBeenCalled();
    expect(mockApi.getActiveDepartments)   .toHaveBeenCalled();
    expect(mockApi.getUpcomingHolidays)    .toHaveBeenCalled();
    expect(mockApi.filterLeaves)           .toHaveBeenCalled();
  });

  it('should populate attendance stats from API response', () => {
    component.loadDashboard();
    expect(component.presentToday).toBe(42);
    expect(component.absentToday) .toBe(8);
    expect(component.lateToday)   .toBe(5);
    expect(component.earlyLeaveToday).toBe(3);
  });

  it('should populate late list from API response', () => {
    component.loadDashboard();
    expect(component.lateList.length).toBe(2);
    expect(component.lateList[0].employeeName).toBe('Alice');
  });

  it('should populate early leave list from API response', () => {
    component.loadDashboard();
    expect(component.earlyList.length).toBe(1);
    expect(component.earlyList[0].employeeName).toBe('Carol');
  });

  it('should populate pendingLeavesList from API response', () => {
    component.loadDashboard();
    expect(component.pendingLeavesList.length).toBe(2);
    expect(component.pendingLeavesList[0].employeeName).toBe('Dave');
  });

  it('should set activeEmployees from getActiveEmployees response', () => {
    component.loadDashboard();
    expect(component.activeEmployees).toBe(50);
  });

  it('should set activeDepartments from getActiveDepartments response', () => {
    component.loadDashboard();
    expect(component.activeDepartments).toBe(3);
  });

  it('should set nextHolidayName from getUpcomingHolidays response', () => {
    component.loadDashboard();
    expect(component.nextHolidayName).toBe('Republic Day');
  });

  it('should calculate leave totals from filterLeaves response', () => {
    component.loadDashboard();
    expect(component.leaveTotal)    .toBe(4);
    expect(component.leavePending)  .toBe(1);
    expect(component.leaveApproved) .toBe(2);
    expect(component.leaveRejected) .toBe(1);
    expect(component.leaveCancelled).toBe(0);
  });

  it('should calculate attendance percentage correctly', () => {
    component.presentToday = 80;
    component.absentToday  = 20;
    expect(component.attendancePct()).toBe(80);
  });

  it('should return 0 attendance percent when no employees', () => {
    component.presentToday = 0;
    component.absentToday  = 0;
    expect(component.attendancePct()).toBe(0);
  });

  it('should resolve numeric leave status to name', () => {
    expect(component.statusName(0)).toBe('Pending');
    expect(component.statusName(1)).toBe('Approved');
    expect(component.statusName(2)).toBe('Rejected');
    expect(component.statusName(3)).toBe('Cancelled');
  });

  it('should return string leave status unchanged', () => {
    expect(component.statusName('Approved')).toBe('Approved');
    expect(component.statusName('Pending')) .toBe('Pending');
  });

  it('should return correct CSS class for leave status', () => {
    expect(component.statusClass(0)).toBe('badge-pending');
    expect(component.statusClass(1)).toBe('badge-approved');
    expect(component.statusClass(2)).toBe('badge-rejected');
    expect(component.statusClass(3)).toBe('badge-cancelled');
  });

  it('should format a valid date string', () => {
    const result = component.fmt('2026-01-26T00:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('2026');
  });

  it('should return em-dash for empty date', () => {
    expect(component.fmt('')).toBe('—');
  });

  it('should set isLoading to false after data loads', fakeAsync(() => {
    component.loadDashboard();
    tick();
    expect(component.isLoading).toBeFalse();
  }));

  it('should set loadingError when all APIs fail', fakeAsync(() => {
    mockApi.getAttendanceStatistics.and.returnValue(throwError(() => ({ error: { message: 'Server error' } })));
    mockApi.getLateAttendance      .and.returnValue(throwError(() => ({})));
    mockApi.getEarlyLeave          .and.returnValue(throwError(() => ({})));
    mockApi.getPendingLeaves       .and.returnValue(throwError(() => ({})));
    mockApi.getActiveEmployees     .and.returnValue(throwError(() => ({})));
    mockApi.getActiveDepartments   .and.returnValue(throwError(() => ({})));
    mockApi.getUpcomingHolidays    .and.returnValue(throwError(() => ({})));
    mockApi.filterLeaves           .and.returnValue(throwError(() => ({})));

    component.loadDashboard();
    tick();
    expect(component.isLoading).toBeFalse();
  }));

  it('should detect mobile view correctly', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(500);
    component.checkMobileView();
    expect(component.isMobileView).toBeTrue();
  });

  it('should detect desktop view correctly', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(1200);
    component.checkMobileView();
    expect(component.isMobileView).toBeFalse();
  });
});