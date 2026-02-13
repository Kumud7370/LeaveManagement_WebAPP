import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { DepartmentListComponent } from './department-list/department-list.component';
import { DepartmentDetailsComponent } from './department-details/department-details.component';

const routes: Routes = [
  { 
    path: '', 
    component: DepartmentListComponent,
    data: { breadcrumb: 'Departments' }
  },
  { 
    path: ':id', 
    component: DepartmentDetailsComponent,
    data: { breadcrumb: 'Department Details' }
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    DepartmentListComponent,
    DepartmentDetailsComponent
  ]
})
export class DepartmentModule { }