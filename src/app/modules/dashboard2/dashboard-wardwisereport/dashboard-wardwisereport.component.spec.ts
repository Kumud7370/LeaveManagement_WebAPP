import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardWardwisereportComponent } from './dashboard-wardwisereport.component';

describe('DashboardWardwisereportComponent', () => {
  let component: DashboardWardwisereportComponent;
  let fixture: ComponentFixture<DashboardWardwisereportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardWardwisereportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardWardwisereportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
