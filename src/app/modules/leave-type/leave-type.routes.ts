import { Routes } from '@angular/router';

export const leaveTypeRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./leave-type-list/leave-type-list.component').then(m => m.LeaveTypeListComponent),
    data: { breadcrumb: 'Leave Types' }
  }
];