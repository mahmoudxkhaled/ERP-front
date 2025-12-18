import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { ActionsComponent } from './components/actions/actions.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { ProfileComponent } from './components/profile/profile.component';
import { SettingsComponent } from './components/settings/settings.component';

const routes: Routes = [
    { path: '', redirectTo: 'actions', pathMatch: 'full' },
    { path: 'actions', component: ActionsComponent, data: { breadcrumb: 'actions' } },
    { path: 'notifications', component: NotificationsComponent, data: { breadcrumb: 'notifications' } },
    { path: 'profile', component: ProfileComponent, data: { breadcrumb: 'profile' } },
    { path: 'settings', component: SettingsComponent, data: { breadcrumb: 'settings' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SummaryRoutingModule { }
