import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepartmentListComponent } from './department-list/department-list.component';
import { DepartmentFormComponent } from './department-form/department-form.component';
import { DepartmentDetailsComponent } from './department-details/department-details.component';

const routes: Routes = [
  {
    path: '',
    component: DepartmentListComponent,
    data: { breadcrumb: 'Department List' }
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
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DepartmentRoutingModule { }