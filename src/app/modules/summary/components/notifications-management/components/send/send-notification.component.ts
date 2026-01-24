import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { GroupsService } from '../../../../services/groups.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { RolesService } from 'src/app/modules/entity-administration/roles/services/roles.service';
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
export class SendNotificationComponent implements OnInit, OnDestroy {
    notificationId?: number;

    notification: Notification | null = null;
    loading: boolean = false;
    targetSelectionLoading: boolean = false; // Loading state for target selection section only
    sending: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    currentAccountId: number = 0;
    currentEntityId: number = 0;

    // Send target
    selectedTargetType: SendTargetType = 'accounts';

    // Accounts
    availableAccounts: any[] = [];
    filteredAccounts: any[] = [];
    selectedAccountIds: number[] = [];
    accountSearchFilter: string = '';

    // Groups (Personal Groups only)
    availableGroups: Group[] = [];
    filteredGroups: Group[] = [];
    selectedGroupIds: number[] = [];
    groupSearchFilter: string = '';

    // Roles
    availableRoles: any[] = [];
    filteredRoles: any[] = [];
    selectedRoleIds: number[] = [];
    roleSearchFilter: string = '';

    // Entities
    availableEntities: any[] = [];
    filteredEntities: any[] = [];
    selectedEntityIds: number[] = [];
    entitySearchFilter: string = '';

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private notificationsService: NotificationsService,
        private groupsService: GroupsService,
        private entitiesService: EntitiesService,
        private rolesService: RolesService,
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
        // Get notificationId from route query params
        this.route.queryParams.subscribe(params => {
            const id = params['id'] ? Number(params['id']) : undefined;
            if (id && id !== this.notificationId) {
                this.notificationId = id;
                this.loadNotification();
            } else if (!id) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'No Notification Selected',
                    detail: 'Please select a notification to send.'
                });
                setTimeout(() => {
                    this.goBack();
                }, 2000);
            }
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    goBack(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
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
        // API returns snake_case format
        const notificationId = notificationData?.notification_ID || this.notificationId || 0;
        const moduleId = notificationData?.module_ID || 0;
        const typeId = notificationData?.type_ID || 0;
        const categoryId = notificationData?.category_ID || 0;
        const entityId = notificationData?.entity_ID;
        const title = notificationData?.title || '';
        const titleRegional = notificationData?.title_Regional || '';
        const message = notificationData?.message || '';
        const messageRegional = notificationData?.message_Regional || '';
        const referenceType = notificationData?.reference_Type || null;
        const referenceId = notificationData?.reference_ID || null;
        const createdAt = notificationData?.created_At;

        this.notification = {
            id: notificationId,
            moduleId: moduleId,
            typeId: typeId,
            categoryId: categoryId,
            entityId: entityId,
            title: this.isRegional ? (titleRegional || title) : title,
            message: this.isRegional ? (messageRegional || message) : message,
            titleRegional: titleRegional,
            messageRegional: messageRegional,
            referenceType: referenceType,
            referenceId: referenceId,
            createdAt: createdAt,
            isSystemNotification: isSystem
        };
    }

    onTargetTypeChange(): void {
        // Reset selections when changing target type
        this.selectedAccountIds = [];
        this.selectedGroupIds = [];
        this.selectedRoleIds = [];
        this.selectedEntityIds = [];

        // Reset search filters
        this.accountSearchFilter = '';
        this.groupSearchFilter = '';
        this.roleSearchFilter = '';
        this.entitySearchFilter = '';

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
            this.targetSelectionLoading = true;
            const sub = this.entitiesService.getEntityAccountsList(this.currentEntityId.toString()).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const accounts = response?.message?.Accounts || [];
                        this.availableAccounts = Array.isArray(accounts) ? accounts : [];
                        this.filteredAccounts = [...this.availableAccounts];
                    }
                    this.targetSelectionLoading = false;
                },
                error: () => {
                    this.targetSelectionLoading = false;
                }
            });
            this.subscriptions.push(sub);
        }
    }

    loadGroups(): void {
        // Load personal groups only (owned by current user)
        this.targetSelectionLoading = true;
        const sub = this.groupsService.listPersonalGroups(this.currentAccountId, false).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    // API returns array directly in message
                    const groups = Array.isArray(response?.message) ? response.message : [];
                    this.availableGroups = groups.map((g: any) => ({
                        id: String(g.groupID),
                        title: this.isRegional ? (g.title_Regional || g.title) : g.title,
                        description: this.isRegional ? (g.description_Regional || g.description) : g.description,
                        entityId: g.entityID || 0,
                        active: Boolean(g.isActive),
                        createAccountId: g.createAccountID || 0
                    }));
                    this.filteredGroups = [...this.availableGroups];
                }
                this.targetSelectionLoading = false;
            },
            error: () => {
                this.targetSelectionLoading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    loadRoles(): void {
        // Load entity roles from current entity
        if (this.currentEntityId > 0) {
            this.targetSelectionLoading = true;
            const sub = this.rolesService.listEntityRoles(this.currentEntityId, 0, 100).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        // API returns Entity_Roles as object
                        const rolesData = response?.message?.Entity_Roles || {};
                        const rolesArray = Object.values(rolesData).filter((item: any) =>
                            typeof item === 'object' && item !== null && item.Entity_Role_ID !== undefined
                        );
                        this.availableRoles = rolesArray.map((item: any) => ({
                            id: item.Entity_Role_ID,
                            title: this.isRegional ? (item.Title_Regional || item.Title) : item.Title,
                            description: this.isRegional ? (item.Description_Regional || item.Description) : item.Description
                        }));
                        this.filteredRoles = [...this.availableRoles];
                    }
                    this.targetSelectionLoading = false;
                },
                error: () => {
                    this.targetSelectionLoading = false;
                }
            });
            this.subscriptions.push(sub);
        }
    }

    loadEntities(): void {
        this.targetSelectionLoading = true;
        const sub = this.entitiesService.listEntities(0, 100, '').subscribe({
            next: (response: any) => {
                if (response?.success) {
                    // API returns Entities_List or message as object
                    const entitiesData = response?.message?.Entities || {};
                    const entitiesArray = Object.values(entitiesData).filter((item: any) =>
                        typeof item === 'object' && item !== null && item.Entity_ID !== undefined
                    );
                    this.availableEntities = entitiesArray.map((item: any) => ({
                        id: item.Entity_ID,
                        code: item.Code || '',
                        name: this.isRegional ? (item.Name_Regional || item.Name) : item.Name,
                        description: this.isRegional ? (item.Description_Regional || item.Description) : item.Description
                    }));
                    this.filteredEntities = [...this.availableEntities];
                }
                this.targetSelectionLoading = false;
            },
            error: () => {
                this.targetSelectionLoading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    canSendToAll(): boolean {
        return this.permissionService.canSendNotificationToAll();
    }

    filterAccounts(): void {
        if (!this.accountSearchFilter || this.accountSearchFilter.trim() === '') {
            this.filteredAccounts = [...this.availableAccounts];
            return;
        }

        const searchTerm = this.accountSearchFilter.toLowerCase().trim();
        this.filteredAccounts = this.availableAccounts.filter((account: any) =>
            String(account.Account_ID).toLowerCase().includes(searchTerm) ||
            (account.Email && account.Email.toLowerCase().includes(searchTerm))
        );
    }

    filterGroups(): void {
        if (!this.groupSearchFilter || this.groupSearchFilter.trim() === '') {
            this.filteredGroups = [...this.availableGroups];
            return;
        }

        const searchTerm = this.groupSearchFilter.toLowerCase().trim();
        this.filteredGroups = this.availableGroups.filter((group: Group) =>
            String(group.id).toLowerCase().includes(searchTerm) ||
            (group.title && group.title.toLowerCase().includes(searchTerm)) ||
            (group.description && group.description.toLowerCase().includes(searchTerm))
        );
    }

    filterRoles(): void {
        if (!this.roleSearchFilter || this.roleSearchFilter.trim() === '') {
            this.filteredRoles = [...this.availableRoles];
            return;
        }

        const searchTerm = this.roleSearchFilter.toLowerCase().trim();
        this.filteredRoles = this.availableRoles.filter((role: any) =>
            String(role.id).toLowerCase().includes(searchTerm) ||
            (role.title && role.title.toLowerCase().includes(searchTerm)) ||
            (role.description && role.description.toLowerCase().includes(searchTerm))
        );
    }

    filterEntities(): void {
        if (!this.entitySearchFilter || this.entitySearchFilter.trim() === '') {
            this.filteredEntities = [...this.availableEntities];
            return;
        }

        const searchTerm = this.entitySearchFilter.toLowerCase().trim();
        this.filteredEntities = this.availableEntities.filter((entity: any) =>
            String(entity.id).toLowerCase().includes(searchTerm) ||
            (entity.code && entity.code.toLowerCase().includes(searchTerm)) ||
            (entity.name && entity.name.toLowerCase().includes(searchTerm)) ||
            (entity.description && entity.description.toLowerCase().includes(searchTerm))
        );
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
                // Extract Account_ID from selected account objects
                const accountIds = this.selectedAccountIds.map((account: any) =>
                    typeof account === 'object' ? account.Account_ID : account
                );
                sub = this.notificationsService.sendNotificationToAccounts(this.notificationId, accountIds).subscribe({
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
                // Extract group IDs from selected group objects
                const groupIds = this.selectedGroupIds.map((group: any) =>
                    typeof group === 'object' ? Number(group.id) : Number(group)
                );
                sub = this.notificationsService.sendNotificationToGroups(this.notificationId, groupIds).subscribe({
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
                // Extract role IDs from selected role objects
                const roleIds = this.selectedRoleIds.map((role: any) =>
                    typeof role === 'object' ? role.id : Number(role)
                );
                sub = this.notificationsService.sendNotificationToRoles(this.notificationId, roleIds).subscribe({
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
                // Extract entity IDs from selected entity objects
                const entityIds = this.selectedEntityIds.map((entity: any) =>
                    typeof entity === 'object' ? entity.id : Number(entity)
                );
                sub = this.notificationsService.sendNotificationToEntities(this.notificationId, entityIds).subscribe({
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

        // Navigate back after successful send
        setTimeout(() => {
            this.goBack();
        }, 1500);
    }
}
