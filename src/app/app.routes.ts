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

      // ==================== DASHBOARD ====================
      {
        path: "dashboard",
        loadComponent: () => import("./modules/dashboard/dashboard.component")
          .then((m) => m.DashboardComponent),
        data: { breadcrumb: "Dashboard" },
      },

      // ==================== EMPLOYEES MODULE ====================
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

      // ==================== ATTENDANCE MODULE ====================
      {
        path: 'attendance',
        children: [
          {
            path: '',
            redirectTo: 'check-in-out',
            pathMatch: 'full'
          },
          {
            path: 'check-in-out',
            loadComponent: () =>
              import('./modules/attendance/attendance-check-in-out/attendance-check-in-out.component')
                .then(m => m.AttendanceCheckInOutComponent),
            data: { breadcrumb: 'Check In / Out' }
          },
          {
            path: 'list',
            loadComponent: () =>
              import('./modules/attendance/attendance-list/attendance-list.component')
                .then(m => m.AttendanceListComponent),
            data: { breadcrumb: 'Attendance List' }
          },
          {
            path: 'summary',
            loadComponent: () =>
              import('./modules/attendance/attendance-summary/attendance-summary.component')
                .then(m => m.AttendanceSummaryComponent),
            data: { breadcrumb: 'My Summary' }
          }
        ]
      },

      // ==================== ATTENDANCE REGULARIZATION MODULE ====================
      {
        path: "attendance-regularization",
        children: [
          {
            path: "",
            redirectTo: "list",
            pathMatch: "full"
          },
          {
            path: "list",
            loadComponent: () => import("./modules/attendance-regularization/regularization-list/regularization-list.component")
              .then((m) => m.RegularizationListComponent),
            data: { breadcrumb: "Regularization Requests" },
          },
          {
            path: "create",
            loadComponent: () => import("./modules/attendance-regularization/regularization-form/regularization-form.component")
              .then((m) => m.RegularizationFormComponent),
            data: { breadcrumb: "Request Regularization" },
          },
          {
            path: "edit/:id",
            loadComponent: () => import("./modules/attendance-regularization/regularization-form/regularization-form.component")
              .then((m) => m.RegularizationFormComponent),
            data: { breadcrumb: "Edit Regularization" },
          },
          {
            path: "details/:id",
            loadComponent: () => import("./modules/attendance-regularization/regularization-details/regularization-details.component")
              .then((m) => m.RegularizationDetailsComponent),
            data: { breadcrumb: "Regularization Details" },
          }
        ]
      },

      // ==================== DEPARTMENTS MODULE ====================
      {
        path: "departments",
        loadChildren: () => import("./modules/departments/department.module")
          .then((m) => m.DepartmentModule),
        data: { breadcrumb: "Departments" },
      },

      // ==================== ADMIN INVITATIONS MODULE ====================
      {
        path: "admin-invitations",
        loadChildren: () => import("./modules/admin-invitations/admin-invitation.module")
          .then((m) => m.AdminInvitationModule),
        data: { breadcrumb: "Admin Invitations" },
      },

      // ==================== DESIGNATIONS MODULE ====================
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

      // ==================== HOLIDAYS MODULE ====================
      {
        path: "holidays",
        loadChildren: () => import("./modules/holiday/holiday.module")
          .then((m) => m.HolidayModule),
        data: { breadcrumb: "Holidays" },
      },

      {
        path: "shifts",
        loadChildren: () => import("./modules/shift/shift.module")
          .then(m => m.ShiftModule),
        data: { breadcrumb: "Shifts" },
      },

      {
        path: 'employee-shifts',
        loadChildren: () =>
          import('./modules/employee-shift/employee-shift.module')
            .then(m => m.EmployeeShiftModule),
        data: { breadcrumb: 'Employee Shifts' },
      },

      // ==================== LEAVE MODULE ====================
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

      // ==================== LEAVE TYPE MODULE ====================
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
        path: "wfh-requests",
        children: [
          {
            path: "",
            redirectTo: "list",
            pathMatch: "full"
          },
          {
            path: "list",
            loadComponent: () => import("./modules/work-from-home/work-from-home-list/work-from-home-list.component")
              .then((m) => m.WfhRequestListComponent),
            data: { breadcrumb: "WFH Requests" },
          },
          
        ]
      },

      {
        path: "my-wfh-requests",
        loadComponent: () =>
          import("./modules/work-from-home/my-wfh-requests/my-wfh-requests.component")
            .then((m) => m.MyWfhRequestsComponent),
        data: { breadcrumb: "My WFH Requests" },
      },

    ],
  },
];