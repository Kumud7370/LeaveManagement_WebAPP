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
            loadComponent: () => import("./modules/dashboard/employees/components/employee-list/employee-list.component")
              .then((m) => m.EmployeeListComponent),
            data: { breadcrumb: "Employees" },
          },
          {
            path: "create",
            loadComponent: () => import("./modules/dashboard/employees/components/employee-form/employee-form.component")
              .then((m) => m.EmployeeFormComponent),
            data: { breadcrumb: "Add Employee" },
          },
          {
            path: "edit/:id",
            loadComponent: () => import("./modules/dashboard/employees/components/employee-form/employee-form.component")
              .then((m) => m.EmployeeFormComponent),
            data: { breadcrumb: "Edit Employee" },
          },
          {
            path: ":id",
            loadComponent: () => import("./modules/dashboard/employees/components/employee-details/employee-details.component")
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

      // Uncomment these as needed
      // {
      //   path: "dashboard2",
      //   loadComponent: () => import("./modules/dashboard2/dashboard.component").then((m) => m.DashboardComponent),
      //   data: { breadcrumb: "Dashboard2" },
      // },
      // {
      //   path: "search-report",
      //   loadComponent: () =>
      //     import("./modules/search-report/search-report.component").then((m) => m.SearchReportComponent),
      //   data: { breadcrumb: "Search Report" },
      // },
      // {
      //   path: "export",
      //   loadComponent: () => import("./modules/export/export.component").then((m) => m.ExportComponent),
      //   data: { breadcrumb: "Export to Excel" },
      // },
      // {
      //   path: "ward-report",
      //   loadComponent: () => import("./modules/ward-report/ward-report.component").then((m) => m.WardReportComponent),
      //   data: { breadcrumb: "Wardwise Report" },
      // },
      // {
      //   path: "shift-report",
      //   loadComponent: () =>
      //     import("./modules/shift-report/shift-report.component").then((m) => m.ShiftReportComponent),
      //   data: { breadcrumb: "Shiftwise Report" },
      // },
      // {
      //   path: "logsheet",
      //   children: [
      //     { path: "", redirectTo: "generatelogsheet", pathMatch: "full" },
      //     {
      //       path: "generatelogsheet",
      //       loadComponent: () =>
      //         import("./modules/logsheet/generatelogsheet/generatelogsheet.component").then(
      //           (m) => m.GeneratelogsheetComponent,
      //         ),
      //       data: { breadcrumb: "Generate Logsheet" },
      //     },
      //     {
      //       path: "logsheetlist",
      //       loadComponent: () =>
      //         import("./modules/logsheet/logsheetlist/logsheetlist.component").then((m) => m.LogsheetlistComponent),
      //       data: { breadcrumb: "Logsheet Report" },
      //     },
      //   ],
      // },
      // {
      //   path: "remarks",
      //   loadComponent: () => import("./modules/remarks/remarks.component").then((m) => m.RemarkFilterComponent),
      //   data: { breadcrumb: "Remarks & Correction" },
      // },
      // {
      //   path: "billing-report",
      //   loadComponent: () => import("./modules/billing-report/billing-report.component").then((m) => m.BillingReportComponent),
      //   data: { breadcrumb: "Billing Report" },
      // },
      // {
      //   path: "verifications",
      //   loadComponent: () => import("./modules/verifications/verification.component").then((m) => m.VerificationComponent),
      //   data: { breadcrumb: "Verification" },
      // },
      // {
      //   path: "vehiclelist",
      //   loadComponent: () =>
      //     import("./modules/vehicle-master/vehicle-master.component").then((m) => m.VehicleMasterComponent),
      //   data: { breadcrumb: "Vehicle List" },
      // },
      // {
      //   path: "agencylist",
      //   loadComponent: () =>
      //     import("./modules/agency-master/agency-master.component").then((m) => m.AgencyMasterComponent),
      //   data: { breadcrumb: "Agency List" },
      // },
    ],
  },
];