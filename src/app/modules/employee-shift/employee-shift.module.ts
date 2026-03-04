import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./employee-shift-list/employee-shift-list.component')
        .then(m => m.EmployeeShiftListComponent),
    data: { breadcrumb: 'Employee Shifts' }
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class EmployeeShiftModule { }