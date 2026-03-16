import { Routes } from '@angular/router';
import { MainLayoutComponent } from 'src/app/Layout/main-layout/main-layout.component';
import { AuthGuard } from './modules/login/auth.guard';
import { LoginComponent } from './modules/login/login.component';
import { SettingsComponent } from './shared/settings/settings.component';

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
    path: "accept-invitation",
    loadComponent: () => import('./modules/admin-invitations/accept-invitation/accept-invitation.component')
      .then(m => m.AcceptInvitationComponent),
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
        loadComponent: () => import("./modules/dashboard/dashboard.component")
          .then((m) => m.DashboardComponent),
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
        loadChildren: () => import("./modules/departments/department.module")
          .then((m) => m.DepartmentModule),
        data: { breadcrumb: "Departments" },
      },

      {
        path: "admin-invitations",
        loadChildren: () => import("./modules/admin-invitations/admin-invitation.module")
          .then((m) => m.AdminInvitationModule),
        data: { breadcrumb: "Admin Invitations" },
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

      {
        path: "leave",
        children: [
          {
            path: "",
            redirectTo: "list",
            pathMatch: "full"
          },
          {
            path: "list",
            loadComponent: () => import("./modules/leave/leave-list/leave-list.component")
              .then((m) => m.LeaveListComponent),
            data: { breadcrumb: "Leave Management" },
          },
        ]
      },

      {
        path: "leave-types",
        children: [
          {
            path: "",
            loadComponent: () => import("./modules/leave-type/leave-type-list/leave-type-list.component")
              .then((m) => m.LeaveTypeListComponent),
            data: { breadcrumb: "Leave Types" },
          }
        ]
      },

      {
        path: "leave-balance",
        children: [
          {
            path: "",
            redirectTo: "list",
            pathMatch: "full"
          },
          {
            path: "list",
            loadComponent: () => import("./modules/leave-balance/leave-balance-list/leave-balance-list.component")
              .then((m) => m.LeaveBalanceListComponent),
            data: { breadcrumb: "Leave Balances" },
          }
        ]
      },

      {
        path: "my-leaves",
        loadComponent: () =>
          import("./modules/leave/my-leaves/my-leaves.component")
            .then((m) => m.MyLeavesComponent),
        data: { breadcrumb: "My Leaves" },
      },
      {
        path: 'settings',
        component: SettingsComponent,
        data: { breadcrumb: 'Settings' },
      },

    ],
  },
];