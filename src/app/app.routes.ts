import { Routes } from '@angular/router';
import { MainLayoutComponent } from 'src/app/Layout/main-layout/main-layout.component';
import { AuthGuard } from './modules/login/auth.guard';
import { LoginComponent } from './modules/login/login.component';

export const routes: Routes = [
  {
    path: "login",
    component: LoginComponent,
  },
  {
    path: "register",
    loadComponent: () => import('./modules/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: "forgot-password",
    loadComponent: () => import('./modules/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: "",
    redirectTo: "login",
    pathMatch: "full"
  },
  {
    path: "",
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      {
        path: "dashboard",
        loadComponent: () => import("./modules/dashboard/dashboard.component").then((m) => m.DashboardComponent),
        data: { breadcrumb: "Dashboard" },
      },
      {
        path: "employees",
        children: [
          {
            path: "",
            loadComponent: () => import("./modules/employees/employee-list/employee-list.component")
              .then((m) => m.EmployeeListComponent),
            data: { breadcrumb: "Employees" },
          },
          {
            path: "create",
            loadComponent: () => import("./modules/employees/employee-form/employee-form.component")
              .then((m) => m.EmployeeFormComponent),
            data: { breadcrumb: "Add Employee" },
          },
          {
            path: "edit/:id",
            loadComponent: () => import("./modules/employees/employee-form/employee-form.component")
              .then((m) => m.EmployeeFormComponent),
            data: { breadcrumb: "Edit Employee" },
          },
          {
            path: ":id",
            loadComponent: () => import("./modules/employees/employee-details/employee-details.component")
              .then((m) => m.EmployeeDetailsComponent),
            data: { breadcrumb: "Employee Details" },
          },
        ]
      },

      {
        path: "departments",
        loadChildren: () => import("./modules/departments/department.module").then((m) => m.DepartmentModule),
        data: { breadcrumb: "Departments" },
      },

      {
  path: "designations",
  children: [
    {
      path: "",
      loadComponent: () => import("./modules/designation/designation-list/designation-list.component")
        .then((m) => m.DesignationListComponent),
      data: { breadcrumb: "Designations" },
    },
    {
      path: "create",
      loadComponent: () => import("./modules/designation/designation-form/designation-form.component")
        .then((m) => m.DesignationFormComponent),
      data: { breadcrumb: "Add Designation" },
    },
    {
      path: "edit/:id",
      loadComponent: () => import("./modules/designation/designation-form/designation-form.component")
        .then((m) => m.DesignationFormComponent),
      data: { breadcrumb: "Edit Designation" },
    },
  ]
},
    ],
  },
];