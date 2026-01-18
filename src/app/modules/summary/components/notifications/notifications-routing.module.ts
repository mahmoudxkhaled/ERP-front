import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { NotificationsInboxComponent } from './inbox/notifications-inbox.component';
import { CategoriesListComponent } from './categories/categories-list/categories-list.component';
import { CategoryDetailsComponent } from './categories/category-details/category-details.component';
import { NotificationsListComponent } from './notifications-list/notifications-list.component';
import { NotificationDetailsComponent } from './notification-details/notification-details.component';
import { SendNotificationComponent } from './send/send-notification.component';

const routes: Routes = [
    { path: '', redirectTo: 'inbox', pathMatch: 'full' },
    { path: 'inbox', component: NotificationsInboxComponent, data: { breadcrumb: 'Inbox' } },
    { path: 'categories', component: CategoriesListComponent, data: { breadcrumb: 'Categories' } },
    { path: 'categories/:id', component: CategoryDetailsComponent, data: { breadcrumb: 'Category Details' } },
    { path: 'notifications', component: NotificationsListComponent, data: { breadcrumb: 'Notifications' } },
    { path: 'notifications/:id', component: NotificationDetailsComponent, data: { breadcrumb: 'Notification Details' } },
    { path: 'notifications/:id/send', component: SendNotificationComponent, data: { breadcrumb: 'Send Notification' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class NotificationsRoutingModule { }
