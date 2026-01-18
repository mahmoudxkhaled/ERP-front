import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Notification, NotificationBackend } from '../../../models/notifications.model';
import { NotificationsService } from '../../../services/notifications.service';

type NotificationActionContext = 'list' | 'delete';

@Component({
    selector: 'app-notifications-list',
    templateUrl: './notifications-list.component.html',
    styleUrls: ['./notifications-list.component.scss']
})
export class NotificationsListComponent implements OnInit, OnDestroy {
    notifications: Notification[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    menuItems: MenuItem[] = [];
    currentNotification?: Notification;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    isSystemAdmin: boolean = false;
    isEntityAdmin: boolean = false;
    currentEntityId: number = 0;

    // Dialog for form
    formDialogVisible: boolean = false;
    formNotificationId?: number;
    isSystemNotification: boolean = true;

    // Filters
    selectedTypeIds: number[] = [];
    selectedCategoryIds: number[] = [];
    textFilter: string = '';

    // Pagination
    lastNotificationId: number = 0;
    totalCount: number = 0;
    filterCount: number = 20;

    // Delete dialog
    deleteNotificationDialog: boolean = false;
    currentNotificationForDelete?: Notification;

    constructor(
        private notificationsService: NotificationsService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.isLoading$ = this.notificationsService.isLoadingSubject.asObservable();
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
        this.isSystemAdmin = this.notificationsService.isSystemAdmin();
        this.isEntityAdmin = this.notificationsService.isEntityAdmin();
        this.currentEntityId = this.notificationsService.getCurrentEntityId();
    }

    ngOnInit(): void {
        this.configureMenuItems();
        this.loadNotifications();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    configureMenuItems(): void {
        this.menuItems = [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => {
                    if (this.currentNotification) {
                        this.viewDetails(this.currentNotification);
                    }
                }
            },
            {
                label: 'Send',
                icon: 'pi pi-send',
                command: () => {
                    if (this.currentNotification) {
                        this.sendNotification(this.currentNotification);
                    }
                }
            },
            {
                label: 'Edit',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.currentNotification) {
                        this.edit(this.currentNotification);
                    }
                }
            },
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                command: () => {
                    if (this.currentNotification) {
                        this.confirmDelete(this.currentNotification);
                    }
                }
            }
        ];
    }

    loadNotifications(): void {
        this.tableLoadingSpinner = true;

        if (this.isSystemAdmin) {
            // Load System Notifications
            const sub = this.notificationsService.listNotifications(
                this.selectedTypeIds,
                this.selectedCategoryIds,
                this.textFilter,
                this.lastNotificationId,
                this.filterCount
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('list', response);
                        return;
                    }

                    const responseData = response?.message || response;
                    this.totalCount = responseData?.Total_Count || 0;
                    const notificationsData = responseData?.Notifications || responseData?.message || [];

                    const systemNotifications = Array.isArray(notificationsData) ? notificationsData.map((item: any) => {
                        const notificationBackend = item as NotificationBackend;
                        return {
                            id: notificationBackend?.Notification_ID || 0,
                            moduleId: notificationBackend?.Module_ID || 0,
                            typeId: notificationBackend?.Type_ID || 0,
                            categoryId: notificationBackend?.Category_ID || 0,
                            entityId: undefined,
                            title: this.isRegional ? (notificationBackend?.Title_Regional || notificationBackend?.Title || '') : (notificationBackend?.Title || ''),
                            message: this.isRegional ? (notificationBackend?.Message_Regional || notificationBackend?.Message || '') : (notificationBackend?.Message || ''),
                            titleRegional: notificationBackend?.Title_Regional,
                            messageRegional: notificationBackend?.Message_Regional,
                            referenceType: notificationBackend?.Reference_Type || null,
                            referenceId: notificationBackend?.Reference_ID || null,
                            createdAt: notificationBackend?.Created_At,
                            isSystemNotification: true
                        };
                    }) : [];

                    this.notifications = [...this.notifications, ...systemNotifications];
                },
                error: () => {
                    this.resetLoadingFlags();
                },
                complete: () => {
                    this.resetLoadingFlags();
                }
            });
            this.subscriptions.push(sub);
        }

        if (this.isEntityAdmin && this.currentEntityId > 0) {
            // Load Entity Notifications
            const sub = this.notificationsService.listEntityNotifications(
                this.currentEntityId,
                this.selectedTypeIds,
                this.selectedCategoryIds,
                this.textFilter,
                this.lastNotificationId,
                this.filterCount
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('list', response);
                        return;
                    }

                    const responseData = response?.message || response;
                    const notificationsData = responseData?.Notifications || responseData?.message || [];

                    const entityNotifications = Array.isArray(notificationsData) ? notificationsData.map((item: any) => {
                        const notificationBackend = item as NotificationBackend;
                        return {
                            id: notificationBackend?.Notification_ID || 0,
                            moduleId: notificationBackend?.Module_ID || 0,
                            typeId: notificationBackend?.Type_ID || 0,
                            categoryId: notificationBackend?.Category_ID || 0,
                            entityId: notificationBackend?.Entity_ID,
                            title: this.isRegional ? (notificationBackend?.Title_Regional || notificationBackend?.Title || '') : (notificationBackend?.Title || ''),
                            message: this.isRegional ? (notificationBackend?.Message_Regional || notificationBackend?.Message || '') : (notificationBackend?.Message || ''),
                            titleRegional: notificationBackend?.Title_Regional,
                            messageRegional: notificationBackend?.Message_Regional,
                            referenceType: notificationBackend?.Reference_Type || null,
                            referenceId: notificationBackend?.Reference_ID || null,
                            createdAt: notificationBackend?.Created_At,
                            isSystemNotification: false
                        };
                    }) : [];

                    this.notifications = [...this.notifications, ...entityNotifications];
                },
                error: () => {
                    this.resetLoadingFlags();
                },
                complete: () => {
                    this.resetLoadingFlags();
                }
            });
            this.subscriptions.push(sub);
        }
    }

    navigateToNew(isSystem: boolean = true): void {
        this.isSystemNotification = isSystem;
        this.formNotificationId = undefined;
        this.formDialogVisible = true;
    }

    edit(notification: Notification): void {
        this.isSystemNotification = notification.isSystemNotification;
        this.formNotificationId = notification.id;
        this.formDialogVisible = true;
    }

    viewDetails(notification: Notification): void {
        this.router.navigate(['/summary/notifications/notifications', notification.id]);
    }

    sendNotification(notification: Notification): void {
        this.router.navigate(['/summary/notifications/notifications', notification.id, 'send']);
    }

    openMenu(menu: any, notification: Notification, event: Event): void {
        this.currentNotification = notification;
        menu.toggle(event);
    }

    confirmDelete(notification: Notification): void {
        this.currentNotificationForDelete = notification;
        this.deleteNotificationDialog = true;
    }

    deleteNotification(): void {
        if (!this.currentNotificationForDelete) {
            return;
        }

        const notification = this.currentNotificationForDelete;
        const sub = notification.isSystemNotification
            ? this.notificationsService.deleteNotification(notification.id).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('delete', response);
                        return;
                    }

                    this.notifications = this.notifications.filter(n => n.id !== notification.id);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Notification deleted successfully.'
                    });
                    this.deleteNotificationDialog = false;
                    this.currentNotificationForDelete = undefined;
                }
            })
            : this.notificationsService.deleteEntityNotification(notification.id).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('delete', response);
                        return;
                    }

                    this.notifications = this.notifications.filter(n => n.id !== notification.id);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Notification deleted successfully.'
                    });
                    this.deleteNotificationDialog = false;
                    this.currentNotificationForDelete = undefined;
                }
            });

        this.subscriptions.push(sub);
    }

    onFilterChange(): void {
        this.lastNotificationId = 0;
        this.notifications = [];
        this.loadNotifications();
    }

    onFormDialogClose(): void {
        this.formDialogVisible = false;
        this.formNotificationId = undefined;
    }

    onFormSaved(): void {
        this.onFormDialogClose();
        this.lastNotificationId = 0;
        this.notifications = [];
        this.loadNotifications();
    }

    canManageNotification(notification: Notification): boolean {
        if (notification.isSystemNotification) {
            return this.permissionService.canUpdateNotification() || this.permissionService.canDeleteNotification();
        } else {
            return this.permissionService.canUpdateEntityNotification() || this.permissionService.canDeleteEntityNotification();
        }
    }

    canSendNotification(): boolean {
        return this.permissionService.canSendNotificationToAccounts() ||
            this.permissionService.canSendNotificationToGroups() ||
            this.permissionService.canSendNotificationToRoles() ||
            this.permissionService.canSendNotificationToEntities() ||
            this.permissionService.canSendNotificationToAll();
    }

    private handleBusinessError(context: NotificationActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'delete':
                detail = this.getDeleteErrorMessage(code) || '';
                break;
            default:
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }

        if (context === 'list') {
            this.resetLoadingFlags();
        }
        return null;
    }

    private getListErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11456':
                return 'Invalid one or more Type_ID';
            case 'ERP11457':
                return 'Invalid one or more Category_ID';
            case 'ERP11458':
                return 'Filter_Count must be between 5 and 100';
            default:
                return null;
        }
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11465':
                return 'Invalid Notification ID';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }
}
