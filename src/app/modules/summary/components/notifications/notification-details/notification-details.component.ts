import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { NotificationsService } from '../../../services/notifications.service';
import { Notification } from '../../../models/notifications.model';

@Component({
    selector: 'app-notification-details',
    templateUrl: './notification-details.component.html',
    styleUrls: ['./notification-details.component.scss']
})
export class NotificationDetailsComponent implements OnInit, OnDestroy {
    notificationId: number = 0;
    notification: Notification | null = null;
    loading: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    isSystemNotification: boolean = true;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private notificationsService: NotificationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.notificationId = Number(params['id']);
            if (this.notificationId) {
                this.loadNotification();
            }
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadNotification(): void {
        // Try System first, then Entity
        this.loading = true;
        const sub = this.notificationsService.getNotification(this.notificationId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.mapNotification(response.message, true);
                    this.loading = false;
                } else {
                    // Try Entity notification
                    this.loadEntityNotification();
                }
            },
            error: () => {
                this.loadEntityNotification();
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntityNotification(): void {
        const sub = this.notificationsService.getEntityNotification(this.notificationId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.mapNotification(response.message, false);
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Notification not found.'
                    });
                    this.router.navigate(['/summary/notifications/notifications']);
                }
                this.loading = false;
            },
            error: () => {
                this.loading = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Notification not found.'
                });
                this.router.navigate(['/summary/notifications/notifications']);
            }
        });
        this.subscriptions.push(sub);
    }

    mapNotification(notificationData: any, isSystem: boolean): void {
        this.isSystemNotification = isSystem;
        this.notification = {
            id: notificationData?.Notification_ID || this.notificationId,
            moduleId: notificationData?.Module_ID || 0,
            typeId: notificationData?.Type_ID || 0,
            categoryId: notificationData?.Category_ID || 0,
            entityId: notificationData?.Entity_ID,
            title: this.isRegional ? (notificationData?.Title_Regional || notificationData?.Title || '') : (notificationData?.Title || ''),
            message: this.isRegional ? (notificationData?.Message_Regional || notificationData?.Message || '') : (notificationData?.Message || ''),
            titleRegional: notificationData?.Title_Regional,
            messageRegional: notificationData?.Message_Regional,
            referenceType: notificationData?.Reference_Type || null,
            referenceId: notificationData?.Reference_ID || null,
            createdAt: notificationData?.Created_At,
            isSystemNotification: isSystem
        };
    }

    navigateBack(): void {
        this.router.navigate(['/summary/notifications/notifications']);
    }

    sendNotification(): void {
        this.router.navigate(['/summary/notifications/notifications', this.notificationId, 'send']);
    }
}
