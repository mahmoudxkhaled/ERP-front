import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { GroupsService } from '../../../../services/groups.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Group } from '../../../../models/groups.model';
import { IAccountSettings, IAccountDetails } from 'src/app/core/models/account-status.model';
import { NotificationsService } from '../../../../services/notifications.service';
import { Notification } from '../../../../models/notifications.model';

type SendTargetType = 'accounts' | 'groups' | 'roles' | 'entities' | 'all';

@Component({
    selector: 'app-send-notification',
    templateUrl: './send-notification.component.html',
    styleUrls: ['./send-notification.component.scss']
})
export class SendNotificationComponent implements OnInit, OnDestroy, OnChanges {
    @Input() visible: boolean = false;
    @Input() notificationId?: number;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() sent = new EventEmitter<void>();

    notification: Notification | null = null;
    loading: boolean = false;
    sending: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    currentAccountId: number = 0;
    currentEntityId: number = 0;

    // Send target
    selectedTargetType: SendTargetType = 'accounts';

    // Accounts
    availableAccounts: any[] = [];
    selectedAccountIds: number[] = [];

    // Groups (Personal Groups only)
    availableGroups: Group[] = [];
    selectedGroupIds: number[] = [];

    // Roles
    availableRoles: any[] = [];
    selectedRoleIds: number[] = [];

    // Entities
    availableEntities: any[] = [];
    selectedEntityIds: number[] = [];

    private subscriptions: Subscription[] = [];

    constructor(
        private notificationsService: NotificationsService,
        private groupsService: GroupsService,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
        const accountDetails = this.localStorageService.getAccountDetails() as IAccountDetails;
        this.currentAccountId = accountDetails?.Account_ID || 0;
        this.currentEntityId = this.notificationsService.getCurrentEntityId();
    }

    ngOnInit(): void {
        if (this.notificationId && this.visible) {
            this.loadNotification();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['notificationId'] && this.notificationId && !this.notification && this.visible) {
            this.loadNotification();
        }
        if (changes['visible'] && this.visible && this.notificationId && !this.notification) {
            this.loadNotification();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadNotificationById(notificationId: number): void {
        this.notificationId = notificationId;
        this.loadNotification();
    }

    loadNotification(): void {
        if (!this.notificationId) {
            return;
        }

        this.loading = true;
        // Try System first, then Entity
        const sub = this.notificationsService.getNotification(this.notificationId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.mapNotification(response.message, true);
                } else {
                    this.loadEntityNotification();
                }
                this.loading = false;
            },
            error: () => {
                this.loadEntityNotification();
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntityNotification(): void {
        if (!this.notificationId) {
            return;
        }

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
            }
        });
        this.subscriptions.push(sub);
    }

    mapNotification(notificationData: any, isSystem: boolean): void {
        this.notification = {
            id: notificationData?.Notification_ID || this.notificationId || 0,
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

    onTargetTypeChange(): void {
        // Reset selections when changing target type
        this.selectedAccountIds = [];
        this.selectedGroupIds = [];
        this.selectedRoleIds = [];
        this.selectedEntityIds = [];

        // Load data based on target type
        switch (this.selectedTargetType) {
            case 'accounts':
                this.loadAccounts();
                break;
            case 'groups':
                this.loadGroups();
                break;
            case 'roles':
                this.loadRoles();
                break;
            case 'entities':
                this.loadEntities();
                break;
        }
    }

    loadAccounts(): void {
        // Load accounts from current entity
        if (this.currentEntityId > 0) {
            this.loading = true;
            const sub = this.entitiesService.getEntityAccountsList(this.currentEntityId.toString()).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const accounts = response?.message?.Accounts || response?.Accounts || [];
                        this.availableAccounts = Array.isArray(accounts) ? accounts : [];
                    }
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                }
            });
            this.subscriptions.push(sub);
        }
    }

    loadGroups(): void {
        // Load personal groups only (owned by current user)
        this.loading = true;
        const sub = this.groupsService.listPersonalGroups(this.currentAccountId, false).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const groups = response?.message?.Groups || response?.Groups || [];
                    this.availableGroups = Array.isArray(groups) ? groups.map((g: any) => ({
                        id: String(g.groupID || g.id),
                        title: this.isRegional ? (g.title_Regional || g.title || '') : (g.title || ''),
                        description: this.isRegional ? (g.description_Regional || g.description || '') : (g.description || ''),
                        entityId: g.entityID || g.entityId || 0,
                        active: Boolean(g.is_Active !== undefined ? g.is_Active : g.active),
                        createAccountId: g.createAccountID || g.createAccountId || 0
                    })) : [];
                }
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    loadRoles(): void {
        // TODO: Implement roles loading
        this.availableRoles = [];
    }

    loadEntities(): void {
        // TODO: Implement entities loading
        this.availableEntities = [];
    }

    canSendToAll(): boolean {
        return this.permissionService.canSendNotificationToAll();
    }

    send(): void {
        if (!this.notificationId) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please select a notification first.'
            });
            return;
        }

        this.sending = true;

        let sub: Subscription;

        switch (this.selectedTargetType) {
            case 'accounts':
                if (this.selectedAccountIds.length === 0) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Validation',
                        detail: 'Please select at least one account.'
                    });
                    this.sending = false;
                    return;
                }
                sub = this.notificationsService.sendNotificationToAccounts(this.notificationId, this.selectedAccountIds).subscribe({
                    next: (response: any) => {
                        this.handleSendResponse(response);
                    }
                });
                break;

            case 'groups':
                if (this.selectedGroupIds.length === 0) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Validation',
                        detail: 'Please select at least one group.'
                    });
                    this.sending = false;
                    return;
                }
                sub = this.notificationsService.sendNotificationToGroups(this.notificationId, this.selectedGroupIds).subscribe({
                    next: (response: any) => {
                        this.handleSendResponse(response);
                    }
                });
                break;

            case 'roles':
                if (this.selectedRoleIds.length === 0) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Validation',
                        detail: 'Please select at least one role.'
                    });
                    this.sending = false;
                    return;
                }
                sub = this.notificationsService.sendNotificationToRoles(this.notificationId, this.selectedRoleIds).subscribe({
                    next: (response: any) => {
                        this.handleSendResponse(response);
                    }
                });
                break;

            case 'entities':
                if (this.selectedEntityIds.length === 0) {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Validation',
                        detail: 'Please select at least one entity.'
                    });
                    this.sending = false;
                    return;
                }
                sub = this.notificationsService.sendNotificationToEntities(this.notificationId, this.selectedEntityIds).subscribe({
                    next: (response: any) => {
                        this.handleSendResponse(response);
                    }
                });
                break;

            case 'all':
                sub = this.notificationsService.sendNotificationToAll(this.notificationId).subscribe({
                    next: (response: any) => {
                        this.handleSendResponse(response);
                    }
                });
                break;

            default:
                this.sending = false;
                return;
        }

        this.subscriptions.push(sub);
    }

    private handleSendResponse(response: any): void {
        this.sending = false;

        if (!response?.success) {
            const code = String(response?.message || '');
            let detail = '';

            switch (code) {
                case 'ERP11466':
                    detail = 'Invalid Account IDs';
                    break;
                case 'ERP11467':
                    detail = 'Invalid Group IDs';
                    break;
                case 'ERP11468':
                    detail = 'Invalid Entity Role IDs';
                    break;
                case 'ERP11469':
                    detail = 'Invalid Entity IDs';
                    break;
                default:
                    detail = 'Failed to send notification. Please try again.';
            }

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
            return;
        }

        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Notification sent successfully.'
        });

        // Reset selections
        this.selectedAccountIds = [];
        this.selectedGroupIds = [];
        this.selectedRoleIds = [];
        this.selectedEntityIds = [];

        // Close dialog and emit sent event
        this.closeDialog();
        this.sent.emit();
    }

    closeDialog(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        // Reset selections when closing
        this.selectedAccountIds = [];
        this.selectedGroupIds = [];
        this.selectedRoleIds = [];
        this.selectedEntityIds = [];
        this.selectedTargetType = 'accounts';
    }
}
