import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryRoutingModule } from './summary-routing.module';

// Components
import { ActionsComponent } from './components/actions/actions.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { ProfileComponent } from './components/profile/profile.component';
import { SettingsComponent } from './components/settings/settings.component';
import { LogoutComponent } from './components/logout/logout.component';

@NgModule({
    declarations: [
        ActionsComponent,
        NotificationsComponent,
        ProfileComponent,
        SettingsComponent,
        LogoutComponent
    ],
    imports: [
        CommonModule,
        SummaryRoutingModule
    ]
})
export class SummaryModule { }
