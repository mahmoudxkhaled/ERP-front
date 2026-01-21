import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { NotificationsManagementMainComponent } from './components/notifications-management-main/notifications-management-main.component';

const routes: Routes = [
    { path: '', component: NotificationsManagementMainComponent, data: { breadcrumb: 'Notifications Management' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class NotificationsManagementRoutingModule { }
