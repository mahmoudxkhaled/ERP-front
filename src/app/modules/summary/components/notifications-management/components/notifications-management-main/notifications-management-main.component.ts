import { Component, OnInit } from '@angular/core';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';

@Component({
    selector: 'app-notifications-management-main',
    templateUrl: './notifications-management-main.component.html',
    styleUrls: ['./notifications-management-main.component.scss']
})
export class NotificationsManagementMainComponent implements OnInit {
    activeTabIndex: number = 0;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    isSystemAdmin: boolean = false;
    isEntityAdmin: boolean = false;

    constructor(
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService,
        private notificationsService: NotificationsService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
        this.isSystemAdmin = this.notificationsService.isSystemAdmin();
        this.isEntityAdmin = this.notificationsService.isEntityAdmin();
    }

    ngOnInit(): void {
        // Start with Types tab (index 0)
        this.activeTabIndex = 0;
    }

    canAccessManagement(): boolean {
        return this.isSystemAdmin || this.isEntityAdmin;
    }

    canAccessTypes(): boolean {
        return this.permissionService.canListNotificationTypes();
    }

    canAccessCategories(): boolean {
        return this.permissionService.canListNotificationCategories() ||
            this.permissionService.canListEntityNotificationCategories();
    }

    canCreateNotification(): boolean {
        return this.permissionService.canCreateNotification() ||
            this.permissionService.canCreateEntityNotification();
    }

    canSendNotification(): boolean {
        return this.permissionService.canSendNotificationToAccounts() ||
            this.permissionService.canSendNotificationToGroups() ||
            this.permissionService.canSendNotificationToRoles() ||
            this.permissionService.canSendNotificationToEntities() ||
            this.permissionService.canSendNotificationToAll();
    }

    currentNotificationId?: number;

    onNotificationCreated(notificationId: number): void {
        // After creating notification, navigate to Send tab
        this.currentNotificationId = notificationId;
        this.activeTabIndex = 3; // Send tab index
    }
}
