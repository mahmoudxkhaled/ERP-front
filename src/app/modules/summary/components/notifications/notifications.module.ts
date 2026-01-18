import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { NotificationsRoutingModule } from './notifications-routing.module';

// Inbox
import { NotificationsInboxComponent } from './inbox/notifications-inbox.component';

// Categories
import { CategoriesListComponent } from './categories/categories-list/categories-list.component';
import { CategoryFormComponent } from './categories/category-form/category-form.component';
import { CategoryDetailsComponent } from './categories/category-details/category-details.component';

// Notifications
import { NotificationsListComponent } from './notifications-list/notifications-list.component';
import { NotificationFormComponent } from './notification-form/notification-form.component';
import { NotificationDetailsComponent } from './notification-details/notification-details.component';

// Send
import { SendNotificationComponent } from './send/send-notification.component';

@NgModule({
    declarations: [
        NotificationsInboxComponent,
        CategoriesListComponent,
        CategoryFormComponent,
        CategoryDetailsComponent,
        NotificationsListComponent,
        NotificationFormComponent,
        NotificationDetailsComponent,
        SendNotificationComponent,
    ],
    imports: [
        NotificationsRoutingModule,
        SharedModule,
    ],
    providers: [MessageService]
})
export class NotificationsModule { }
