import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InvitationListComponent } from './invitation-list/invitation-list.component';
import { AcceptInvitationComponent } from './accept-invitation/accept-invitation.component';

const routes: Routes = [
  {
    path: '',
    component: InvitationListComponent,
    data: { breadcrumb: 'Invitations' }
  },
  {
    path: 'accept',
    component: AcceptInvitationComponent,
    data: { breadcrumb: 'Accept Invitation' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminInvitationRoutingModule { }