import { type ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { ApiClientService } from 'src/app/core/services/api/apiClient';
import { of, throwError } from 'rxjs';

const MOCK_EMPLOYEES = { data: Array.from({ length: 50 }, (_, i) => ({ id: `emp-${i}` })) };
const MOCK_DEPTS     = { data: [
  { name: 'Engineering', employeeCount: 20 },
  { name: 'HR',          employeeCount: 10 },
  { name: 'Finance',     employeeCount: 15 },
]};
const MOCK_PENDING = { data: [
  { employeeName: 'Dave', employeeCode: 'E004', leaveTypeName: 'Casual Leave',
    startDate: '2026-01-10T00:00:00Z', totalDays: 2, leaveStatus: 'Pending' },
  { employeeName: 'Eve',  employeeCode: 'E005', leaveTypeName: 'Sick Leave',
    startDate: '2026-01-12T00:00:00Z', totalDays: 1, leaveStatus: 'Pending' },
]};
const MOCK_ALL_LEAVES = { data: { items: [
  { appliedDate: new Date().toISOString(), leaveStatus: 'Pending',  employeeName: 'Dave', leaveTypeName: 'Casual Leave' },
  { appliedDate: new Date().toISOString(), leaveStatus: 'Approved', employeeName: 'Eve',  leaveTypeName: 'Sick Leave'   },
  { appliedDate: new Date().toISOString(), leaveStatus: 'Rejected', employeeName: 'Frank',leaveTypeName: 'Casual Leave' },
  { appliedDate: new Date().toISOString(), leaveStatus: 'Approved', employeeName: 'Gina', leaveTypeName: 'Annual Leave' },
]}};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockApi: jasmine.SpyObj<ApiClientService>;

  beforeEach(async () => {
    mockApi = jasmine.createSpyObj<ApiClientService>('ApiClientService', [
      'getActiveEmployees',
      'getActiveDepartments',
      'getPendingLeaves',
      'filterLeaves',
    ]);

    mockApi.getActiveEmployees  .and.returnValue(of(MOCK_EMPLOYEES));
    mockApi.getActiveDepartments.and.returnValue(of(MOCK_DEPTS));
    mockApi.getPendingLeaves    .and.returnValue(of(MOCK_PENDING));
    mockApi.filterLeaves        .and.returnValue(of(MOCK_ALL_LEAVES));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NgApexchartsModule, FormsModule],
      providers: [{ provide: ApiClientService, useValue: mockApi }],
    })
    .compileComponents();

    fixture   = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Creation ────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Initial state ───────────────────────────────────────────────
  it('should initialise all stat values to 0', () => {
    const fresh = new DashboardComponent(mockApi as any, { detectChanges: () => {} } as any);
    expect(fresh.totalEmployees)   .toBe(0);
    expect(fresh.totalDepartments) .toBe(0);
    expect(fresh.totalDesignations).toBe(0);
    expect(fresh.leavePending)     .toBe(0);
    expect(fresh.leaveApproved)    .toBe(0);
    expect(fresh.leaveRejected)    .toBe(0);
    expect(fresh.leaveCancelled)   .toBe(0);
    expect(fresh.leaveTotal)       .toBe(0);
    expect(fresh.totalLeaveTypes)          .toBe(0);
    expect(fresh.avgLeaveBalance)          .toBe(0);
    expect(fresh.totalLeaveBalanceRecords) .toBe(0);
  });

  it('should initialise all four charts', () => {
    component.initEmptyChartsPublic();
    expect(component.leaveDonutChart)    .toBeDefined();
    expect(component.deptDonutChart)     .toBeDefined();
    expect(component.leaveTrendLineChart).toBeDefined();
    expect(component.leaveTypeBarChart)  .toBeDefined();
  });

  // ── API calls ───────────────────────────────────────────────────
  it('should call all required API methods on loadDashboard()', () => {
    component.loadDashboard();
    expect(mockApi.getActiveEmployees)  .toHaveBeenCalled();
    expect(mockApi.getActiveDepartments).toHaveBeenCalled();
    expect(mockApi.getPendingLeaves)    .toHaveBeenCalled();
    expect(mockApi.filterLeaves)        .toHaveBeenCalled();
  });

  // ── Workforce stats ─────────────────────────────────────────────
  it('should set totalEmployees from getActiveEmployees response', () => {
    component.loadDashboard();
    expect(component.totalEmployees).toBe(50);
  });

  it('should set totalDepartments from getActiveDepartments response', () => {
    component.loadDashboard();
    expect(component.totalDepartments).toBe(3);
  });

  it('should populate departmentList from getActiveDepartments response', () => {
    component.loadDashboard();
    expect(component.departmentList.length).toBe(3);
    expect(component.departmentList[0].name).toBe('Engineering');
  });

  // ── Leave stats ─────────────────────────────────────────────────
  it('should populate pendingLeavesList from getPendingLeaves response', () => {
    component.loadDashboard();
    expect(component.pendingLeavesList.length).toBe(2);
    expect(component.pendingLeavesList[0].employeeName).toBe('Dave');
  });

  it('should calculate leave totals from filterLeaves response', () => {
    component.loadDashboard();
    expect(component.leaveTotal)    .toBe(4);
    expect(component.leavePending)  .toBe(1);
    expect(component.leaveApproved) .toBe(2);
    expect(component.leaveRejected) .toBe(1);
    expect(component.leaveCancelled).toBe(0);
  });

  // ── Status helpers ──────────────────────────────────────────────
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

  // ── Date formatter ──────────────────────────────────────────────
  it('should format a valid date string', () => {
    const result = component.fmt('2026-01-26T00:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('2026');
  });

  it('should return em-dash for empty date', () => {
    expect(component.fmt('')).toBe('—');
  });

  // ── Loading state ───────────────────────────────────────────────
  it('should set isLoading to false after data loads', fakeAsync(() => {
    component.loadDashboard();
    tick();
    expect(component.isLoading).toBeFalse();
  }));

  it('should set isLoading to false even when all APIs fail', fakeAsync(() => {
    mockApi.getActiveEmployees  .and.returnValue(throwError(() => ({})));
    mockApi.getActiveDepartments.and.returnValue(throwError(() => ({})));
    mockApi.getPendingLeaves    .and.returnValue(throwError(() => ({})));
    mockApi.filterLeaves        .and.returnValue(throwError(() => ({ error: { message: 'Server error' } })));

    component.loadDashboard();
    tick();
    expect(component.isLoading).toBeFalse();
  }));

  // ── Responsive ──────────────────────────────────────────────────
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