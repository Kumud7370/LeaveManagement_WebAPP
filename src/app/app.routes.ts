import { Routes } from '@angular/router';
import { MainLayoutComponent } from 'src/app/Layout/main-layout/main-layout.component';
import { AuthGuard } from './modules/login/auth.guard';


export const routes: Routes = [
  {
    path: "login",
    loadComponent: () => import("./modules/login/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "",
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      {
        path: "dashboard",
        loadComponent: () => import("./modules/dashboard/dashboard.component").then((m) => m.DashboardComponent),
        data: { breadcrumb: "Dashboard" },
      },
      {
        path: "search-report",
        loadComponent: () =>
          import("./modules/search-report/search-report.component").then((m) => m.SearchReportComponent),
        data: { breadcrumb: "Search Report" },
      },
      {
        path: "export",
        loadComponent: () => import("./modules/export/export.component").then((m) => m.ExportComponent),
        data: { breadcrumb: "Export to Excel" },
      },
      {
        path: "ward-report",
        loadComponent: () => import("./modules/ward-report/ward-report.component").then((m) => m.WardReportComponent),
        data: { breadcrumb: "Wardwise Report" },
      },
      {
        path: "shift-report",
        loadComponent: () =>
          import("./modules/shift-report/shift-report.component").then((m) => m.ShiftReportComponent),
        data: { breadcrumb: "Shiftwise Report" },
      },
      {
        path: "logsheet",
        children: [
          { path: "", redirectTo: "generatelogsheet", pathMatch: "full" },
          {
            path: "generatelogsheet",
            loadComponent: () =>
              import("./modules/logsheet/generatelogsheet/generatelogsheet.component").then(
                (m) => m.GeneratelogsheetComponent,
              ),
            data: { breadcrumb: "Generate Logsheet" },
          },
          {
            path: "logsheetlist",
            loadComponent: () =>
              import("./modules/logsheet/logsheetlist/logsheetlist.component").then((m) => m.LogsheetlistComponent),
            data: { breadcrumb: "Logsheet Report" },
          },
        ],
      },
      {
        path: "remarks",
        loadComponent: () => import("./modules/remarks/remarks.component").then((m) => m.RemarkFilterComponent),
        data: { breadcrumb: "Remarks & Correction" },
      },
            {
        path: "billing-report",
        loadComponent: () => import("./modules/billing-report/billing-report.component").then((m) => m.BillingReportComponent),
        data: { breadcrumb: "Billing Report" },
      },
    ],
  },
  { path: "**", redirectTo: "" },
]
