import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntityGroupsService } from '../../services/entity-groups.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { GroupMember, Group } from 'src/app/modules/summary/models/groups.model';
import { EntityAccount } from 'src/app/modules/entity-administration/entities/models/entities.model';

@Component({
    selector: 'app-entity-group-members',
    templateUrl: './entity-group-members.component.html',
    styleUrls: ['./entity-group-members.component.scss']
})
export class EntityGroupMembersComponent implements OnInit, OnDestroy {
    @Input() groupId: number = 0;
    @Input() entityId?: number; // Optional: if provided, use this instead of group's entityId
    @Output() membersUpdated = new EventEmitter<void>();

    members: GroupMember[] = [];
    loading: boolean = false;
    loadingMembers: boolean = false;

    // Account selection dialog
    addMembersDialogVisible: boolean = false;
    accountsForSelection: EntityAccount[] = [];
    selectedAccounts: EntityAccount[] = [];
    loadingAccountsTable: boolean = false;
    accountTableFirst: number = 0;
    accountTableRows: number = 10;
    accountTableTotalRecords: number = 0;
    accountTableTextFilter: string = '';
    selectedEntityId: string = '';
    includeSubentities: boolean = false;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    group: Group | null = null;

    private subscriptions: Subscription[] = [];

    constructor(
        private entityGroupsService: EntityGroupsService,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        // Initialize selectedEntityId from @Input() if provided
        if (this.entityId && this.entityId > 0) {
            this.selectedEntityId = this.entityId.toString();
        } else {
            // Fallback to localStorage
            const entityDetails = this.localStorageService.getEntityDetails();
            this.selectedEntityId = entityDetails?.Entity_ID?.toString() || '0';
        }

        if (this.groupId) {
            this.loadGroupInfo();
            this.loadMembers();
        }
    }

    loadGroupInfo(): void {
        if (!this.groupId) {
            return;
        }

        const sub = this.entityGroupsService.getEntityGroup(this.groupId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const groupData = response?.message ?? {};
                    this.group = {
                        id: String(groupData?.Group_ID || groupData?.groupID || this.groupId),
                        title: this.isRegional ? (groupData?.Title_Regional || groupData?.title_Regional || groupData?.Title || groupData?.title || '') : (groupData?.Title || groupData?.title || ''),
                        description: this.isRegional ? (groupData?.Description_Regional || groupData?.description_Regional || groupData?.Description || groupData?.description || '') : (groupData?.Description || groupData?.description || ''),
                        entityId: groupData?.Entity_ID || groupData?.entityID || 0,
                        active: Boolean(groupData?.Is_Active !== undefined ? groupData.Is_Active : (groupData?.is_Active !== undefined ? groupData.is_Active : true)),
                        createAccountId: groupData?.Create_Account_ID || groupData?.createAccountID || 0
                    };
                }
            }
        });

        this.subscriptions.push(sub);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadMembers(): void {
        if (!this.groupId) {
            return;
        }

        this.loadingMembers = true;
        const sub = this.entityGroupsService.getGroupMembers(this.groupId, true).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('getMembers', response);
                    return;
                }
                const membersData = response?.message?.Accounts || response?.message || {};

                // Handle both dictionary and array formats
                if (typeof membersData === 'object' && !Array.isArray(membersData)) {
                    // Dictionary format: { accountId: email }
                    this.members = Object.keys(membersData).map((key) => {
                        const accountId = Number(key);
                        const email = membersData[key];
                        return {
                            accountId: accountId,
                            email: email || '',
                            entityId: undefined,
                            entityName: undefined
                        };
                    });
                } else if (Array.isArray(membersData)) {
                    // Array format: [accountId1, accountId2, ...]
                    this.members = membersData.map((item: any) => {
                        const accountId = typeof item === 'number' ? item : (item?.Account_ID || item?.accountId || 0);
                        return {
                            accountId: accountId,
                            email: item?.Email || item?.email || '',
                            entityId: item?.Entity_ID || item?.entityId,
                            entityName: item?.Entity_Name || item?.entityName
                        };
                    });
                } else {
                    this.members = [];
                }

                this.loadingMembers = false;
            },
            error: () => {
                this.loadingMembers = false;
            }
        });

        this.subscriptions.push(sub);
    }

    openAddMembersDialog(): void {
        if (!this.canManageGroup()) {
            this.messageService.add({
                severity: 'error',
                summary: 'Access Denied',
                detail: 'Only Entity Administrators can manage Entity Groups.'
            });
            return;
        }
        this.addMembersDialogVisible = true;
        this.selectedAccounts = [];
        this.accountTableTextFilter = '';
        this.accountTableFirst = 0;
        this.loadAccountsForSelection();
    }

    closeAddMembersDialog(): void {
        this.addMembersDialogVisible = false;
        this.selectedAccounts = [];
    }

    loadAccountsForSelection(): void {
        this.loadingAccountsTable = true;

        // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
        const currentPage = Math.floor(this.accountTableFirst / this.accountTableRows) + 1;
        const lastAccountId = -currentPage;

        const sub = this.entitiesService.getEntityAccountsList(
            this.selectedEntityId,
            this.includeSubentities,
            false, // activeOnly
            lastAccountId,
            this.accountTableRows,
            this.accountTableTextFilter
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.loadingAccountsTable = false;
                    return;
                }

                this.accountTableTotalRecords = Number(response.message?.Total_Count || 0);
                const accountsData = response?.message?.Accounts || {};
                const accountsArray = Array.isArray(accountsData) ? accountsData : Object.values(accountsData);

                this.accountsForSelection = accountsArray.map((account: any) => {
                    return {
                        accountId: String(account?.Account_ID || ''),
                        userId: account?.User_ID || 0,
                        email: account?.Email || '',
                        systemRoleId: account?.System_Role_ID || 0,
                        roleName: '',
                        entityRoleId: account?.Entity_Role_ID || 0,
                        entityRoleName: '',
                        accountState: account?.Account_State || 0,
                        Two_FA: account?.Two_FA || false,
                        Last_Login: account?.Last_Login || ''
                    };
                });

                // Filter out accounts already in the group
                const existingAccountIds = this.members.map(m => String(m.accountId));
                this.accountsForSelection = this.accountsForSelection.filter(
                    account => !existingAccountIds.includes(account.accountId)
                );

                this.loadingAccountsTable = false;
            },
            error: () => {
                this.loadingAccountsTable = false;
            }
        });

        this.subscriptions.push(sub);
    }

    onAccountTablePageChange(event: any): void {
        this.accountTableFirst = event.first;
        this.accountTableRows = event.rows;
        this.loadAccountsForSelection();
    }

    onAccountTableSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        const searchValue = target?.value || '';
        this.accountTableTextFilter = searchValue;
        this.accountTableFirst = 0;
        this.loadAccountsForSelection();
    }

    onEntityFilterChange(): void {
        this.accountTableFirst = 0;
        this.loadAccountsForSelection();
    }

    addSelectedMembers(): void {
        if (this.selectedAccounts.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'No Selection',
                detail: 'Please select at least one account to add.'
            });
            return;
        }

        if (!this.canManageGroup()) {
            this.messageService.add({
                severity: 'error',
                summary: 'Access Denied',
                detail: 'Only Entity Administrators can manage Entity Groups.'
            });
            return;
        }

        const accountIds = this.selectedAccounts.map(account => Number(account.accountId));
        this.loading = true;

        const sub = this.entityGroupsService.addGroupMembers(this.groupId, accountIds).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('addMembers', response);
                    return;
                }
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `${this.selectedAccounts.length} member(s) added successfully.`,
                    life: 3000
                });

                this.closeAddMembersDialog();
                this.loadMembers();
                this.membersUpdated.emit();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    removeMember(member: GroupMember): void {
        if (!member.accountId) {
            return;
        }

        if (!this.canManageGroup()) {
            this.messageService.add({
                severity: 'error',
                summary: 'Access Denied',
                detail: 'Only Entity Administrators can manage Entity Groups.'
            });
            return;
        }

        this.loading = true;
        const accountIds = [Number(member.accountId)];

        const sub = this.entityGroupsService.removeGroupMembers(this.groupId, accountIds).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('removeMember', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Member removed successfully.',
                    life: 3000
                });

                this.loadMembers();
                this.membersUpdated.emit();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Check if user can manage Entity Groups
     */
    canManageGroup(): boolean {
        if (!this.entityGroupsService.isEntityAdmin()) {
            return false;
        }
        if (!this.permissionService.can('Add_Group_Members') || !this.permissionService.can('Remove_Group_Members')) {
            return false;
        }
        // Entity Groups (Entity_ID > 0) can be managed by any Entity Admin
        return this.group ? this.group.entityId > 0 : false;
    }

    private handleBusinessError(context: string, response: any): void {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(context, code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
        this.loadingMembers = false;
    }

    private getErrorMessage(context: string, code: string): string | null {
        switch (code) {
            case 'ERP11290':
                return 'Invalid Group ID';
            case 'ERP11288':
                return 'Invalid one or more Account ID';
            default:
                return null;
        }
    }
}
