import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryRoutingModule } from './summary-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';

// Components
import { ActionsComponent } from './components/actions/actions.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { ProfileComponent } from './components/profile/profile.component';
import { SettingsComponent } from './components/settings/settings.component';

@NgModule({
    declarations: [
        ActionsComponent,
        NotificationsComponent,
        ProfileComponent,
        SettingsComponent,
    ],
    imports: [
        SummaryRoutingModule,
        SharedModule
    ]
})
export class SummaryModule { }
