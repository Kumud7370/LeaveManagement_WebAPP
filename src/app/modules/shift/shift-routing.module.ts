
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./shift-list/shift-list.component').then(m => m.ShiftListComponent),
        data: { breadcrumb: 'Shifts' }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ShiftRoutingModule { }