import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryRoutingModule } from './summary-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';

// Components
import { ActionsComponent } from './components/actions/actions.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { ProfileOverviewComponent } from './components/profile/profile-overview/profile-overview.component';
import { ProfileEditComponent } from './components/profile/profile-edit/profile-edit.component';
import { SettingsComponent } from './components/settings/settings.component';

@NgModule({
    declarations: [
        ActionsComponent,
        NotificationsComponent,
        ProfileOverviewComponent,
        ProfileEditComponent,
        SettingsComponent,
    ],
    imports: [
        SummaryRoutingModule,
        SharedModule
    ]
})
export class SummaryModule { }
