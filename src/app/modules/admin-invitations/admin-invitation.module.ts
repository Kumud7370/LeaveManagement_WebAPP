import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';

import { AdminInvitationRoutingModule } from './admin-invitation-routing.module';
import { InvitationListComponent } from './invitation-list/invitation-list.component';
import { AcceptInvitationComponent } from './accept-invitation/accept-invitation.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AgGridModule,
    AdminInvitationRoutingModule,
    InvitationListComponent,
    AcceptInvitationComponent
  ]
})
export class AdminInvitationModule { }