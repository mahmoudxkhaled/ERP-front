import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { NotificationsManagementRoutingModule } from './notifications-management-routing.module';

// Main Component
import { NotificationsManagementMainComponent } from './components/notifications-management-main/notifications-management-main.component';

// Types
import { TypesListComponent } from './components/types/types-list/types-list.component';

// Categories
import { CategoriesListComponent } from './components/categories/categories-list/categories-list.component';
import { CategoryFormComponent } from './components/categories/category-form/category-form.component';
import { CategoryDetailsComponent } from './components/categories/category-details/category-details.component';

// Create Notification
import { CreateNotificationComponent } from './components/create-notification/create-notification.component';

// Send
import { SendNotificationComponent } from './components/send/send-notification.component';

@NgModule({
    declarations: [
        NotificationsManagementMainComponent,
        TypesListComponent,
        CategoriesListComponent,
        CategoryFormComponent,
        CategoryDetailsComponent,
        CreateNotificationComponent,
        SendNotificationComponent,
    ],
    imports: [
        NotificationsManagementRoutingModule,
        SharedModule,
    ],
    providers: [MessageService]
})
export class NotificationsManagementModule { }
