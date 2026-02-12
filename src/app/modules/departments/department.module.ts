import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { DepartmentListComponent } from './department-list/department-list.component';
import { DepartmentFormComponent } from './department-form/department-form.component';
import { DepartmentDetailsComponent } from './department-details/department-details.component';

const routes: Routes = [
  { path: '', component: DepartmentListComponent },
  { path: 'create', component: DepartmentFormComponent },
  { path: 'edit/:id', component: DepartmentFormComponent },
  { path: ':id', component: DepartmentDetailsComponent }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    // Import standalone components instead of declaring them
    DepartmentListComponent,
    DepartmentFormComponent,
    DepartmentDetailsComponent
  ]
})
export class DepartmentModule { }