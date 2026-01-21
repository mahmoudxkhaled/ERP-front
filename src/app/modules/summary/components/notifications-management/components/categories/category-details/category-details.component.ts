import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { NotificationCategory } from 'src/app/modules/summary/models/notifications.model';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';

@Component({
    selector: 'app-category-details',
    templateUrl: './category-details.component.html',
    styleUrls: ['./category-details.component.scss']
})
export class CategoryDetailsComponent implements OnInit, OnDestroy {
    categoryId: number = 0;
    category: NotificationCategory | null = null;
    loading: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    isSystemCategory: boolean = true;

    private subscriptions: Subscription[] = [];

    constructor(
        private notificationsService: NotificationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        // This component can be used as a dialog or standalone
        // For now, it's mainly used within tabs, so no route params needed
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadCategory(categoryId: number): void {
        this.categoryId = categoryId;
        // Try System first, then Entity
        this.loading = true;
        const sub = this.notificationsService.getNotificationCategory(this.categoryId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.mapCategory(response.message, true);
                    this.loading = false;
                } else {
                    // Try Entity category
                    this.loadEntityCategory();
                }
            },
            error: () => {
                this.loadEntityCategory();
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntityCategory(): void {
        const sub = this.notificationsService.getEntityNotificationCategory(this.categoryId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.mapCategory(response.message, false);
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Category not found.'
                    });
                }
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Category not found.'
                });
            }
        });
        this.subscriptions.push(sub);
    }

    mapCategory(categoryData: any, isSystem: boolean): void {
        this.isSystemCategory = isSystem;
        this.category = {
            id: categoryData?.Category_ID || this.categoryId,
            typeId: categoryData?.Type_ID || 0,
            title: this.isRegional ? (categoryData?.Title_Regional || categoryData?.Title || '') : (categoryData?.Title || ''),
            description: this.isRegional ? (categoryData?.Description_Regional || categoryData?.Description || '') : (categoryData?.Description || ''),
            titleRegional: categoryData?.Title_Regional,
            descriptionRegional: categoryData?.Description_Regional,
            sendEmail: Boolean(categoryData?.Send_Email),
            canBeUnsubscribed: Boolean(categoryData?.Can_Be_Unsubscribed),
            entityId: categoryData?.Entity_ID,
            isSystemCategory: isSystem
        };
    }
}
