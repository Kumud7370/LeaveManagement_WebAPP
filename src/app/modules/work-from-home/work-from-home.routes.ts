import { Routes } from '@angular/router';

export const wfhRequestRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./work-from-home-list/work-from-home-list.component').then(m => m.WfhRequestListComponent),
    data: { breadcrumb: 'Work From Home Requests' }
  }
];