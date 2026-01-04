import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardComparisonComponent } from './dashboard-comparison.component';

describe('DashboardComparisonComponent', () => {
  let component: DashboardComparisonComponent;
  let fixture: ComponentFixture<DashboardComparisonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComparisonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComparisonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
