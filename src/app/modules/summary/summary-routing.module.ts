import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { ActionsComponent } from './components/actions/actions.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { ProfileOverviewComponent } from './components/profile/profile-overview/profile-overview.component';
import { ProfileEditComponent } from './components/profile/profile-edit/profile-edit.component';
import { SettingsComponent } from './components/settings/settings.component';

const routes: Routes = [
    { path: '', redirectTo: 'actions', pathMatch: 'full' },
    { path: 'actions', component: ActionsComponent, data: { breadcrumb: 'actions' } },
    {
        path: 'notifications',
        loadChildren: () => import('./components/notifications/notifications.module').then(m => m.NotificationsModule),
        data: { breadcrumb: 'notifications' }
    },
    { path: 'profile', component: ProfileOverviewComponent, data: { breadcrumb: 'profile' } },
    { path: 'profile/edit', component: ProfileEditComponent, data: { breadcrumb: 'editProfile' } },
    { path: 'settings', component: SettingsComponent, data: { breadcrumb: 'settings' } },
    {
        path: 'groups',
        loadChildren: () => import('./components/groups/groups.module').then(m => m.GroupsModule),
        data: { breadcrumb: 'groups' }
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SummaryRoutingModule { }
