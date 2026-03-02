import { Routes } from '@angular/router';

export const leaveRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./leave-list/leave-list.component').then(m => m.LeaveListComponent),
    data: { breadcrumb: 'Leave Management' }
  },

  {
  path: "my-leaves",
  loadComponent: () =>
    import("./my-leaves/my-leaves.component")
      .then((m) => m.MyLeavesComponent),
  data: { breadcrumb: "My Leaves" },
},
];