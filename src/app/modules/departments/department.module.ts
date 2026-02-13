import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { DepartmentListComponent } from './department-list/department-list.component';
import { DepartmentFormComponent } from './department-form/department-form.component';
import { DepartmentDetailsComponent } from './department-details/department-details.component';

const routes: Routes = [
  { 
    path: '', 
    component: DepartmentListComponent,
    data: { breadcrumb: 'Departments' }
  },
  { 
    path: 'create', 
    component: DepartmentFormComponent,
    data: { breadcrumb: 'Create Department' }
  },
  { 
    path: 'edit/:id', 
    component: DepartmentFormComponent,
    data: { breadcrumb: 'Edit Department' }
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
    DepartmentFormComponent,
    DepartmentDetailsComponent
  ]
})
export class DepartmentModule { }