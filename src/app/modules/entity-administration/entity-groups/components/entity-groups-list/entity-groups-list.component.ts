import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { EntityGroupsService } from '../../services/entity-groups.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Group, GroupBackend } from 'src/app/modules/summary/models/groups.model';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Roles } from 'src/app/core/models/system-roles';

type GroupActionContext = 'list' | 'activate' | 'deactivate' | 'delete';

@Component({
    selector: 'app-entity-groups-list',
    templateUrl: './entity-groups-list.component.html',
    styleUrls: ['./entity-groups-list.component.scss']
})
export class EntityGroupsListComponent implements OnInit, OnDestroy, OnChanges {
    @Input() entityId?: number; // Optional: if provided, use this instead of current entity
    @Input() showHeader: boolean = true; // Show/hide header section

    groups: Group[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    activationControls: Record<string, FormControl<boolean>> = {};
    menuItems: MenuItem[] = [];
    currentGroup?: Group;
    accountSettings: IAccountSettings;
    activationGroupDialog: boolean = false;
    currentGroupForActivation?: Group;
    deleteGroupDialog: boolean = false;
    currentGroupForDelete?: Group;
    activeOnlyFilter: boolean = false;
    currentEntityId: number = 0;

    // Dialog for form
    formDialogVisible: boolean = false;
    formGroupId?: number;
    formEntityId?: number;

    constructor(
        private entityGroupsService: EntityGroupsService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.isLoading$ = this.entityGroupsService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        // Use provided entityId or get from service
        if (this.entityId && this.entityId > 0) {
            this.currentEntityId = this.entityId;
        } else {
            this.currentEntityId = this.entityGroupsService.getCurrentEntityId();
        }

        // Only check permissions and redirect if used as standalone page (not as child component)
        if (this.showHeader) {
            // Check if user is Entity Admin
            if (!this.isEntityAdmin()) {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Access Denied',
                    detail: 'Only Entity Administrators can access Entity Groups.'
                });
                this.router.navigate(['/company-administration']);
                return;
            }
        }

        this.configureMenuItems();
        this.loadGroups();
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Reload groups if entityId input changes
        if (changes['entityId'] && !changes['entityId'].firstChange && this.entityId) {
            this.currentEntityId = this.entityId;
            this.loadGroups();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadGroups(): void {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        const isRegional = this.accountSettings?.Language !== 'English';
        this.tableLoadingSpinner = true;

        // Update entityId if input changed
        if (this.entityId && this.entityId > 0) {
            this.currentEntityId = this.entityId;
        }

        if (!this.currentEntityId || this.currentEntityId <= 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Unable to get entity information.'
            });
            this.resetLoadingFlags();
            return;
        }

        const sub = this.entityGroupsService.listEntityGroups(this.currentEntityId, this.activeOnlyFilter).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                const groupsData = response?.message?.Account_Groups || response?.message || [];

                this.groups = Array.isArray(groupsData) ? groupsData.map((item: any) => {
                    const groupBackend = item as GroupBackend;
                    return {
                        id: String(groupBackend?.groupID || ''),
                        title: isRegional ? (groupBackend?.title_Regional || groupBackend?.title || '') : (groupBackend?.title || ''),
                        description: isRegional ? (groupBackend?.description_Regional || groupBackend?.description || '') : (groupBackend?.description || ''),
                        titleRegional: groupBackend?.title_Regional || '',
                        descriptionRegional: groupBackend?.description_Regional || '',
                        entityId: groupBackend?.entityID || 0,
                        active: Boolean(groupBackend?.isActive !== undefined ? groupBackend.isActive : true),
                        createAccountId: groupBackend?.createAccountID || 0
                    };
                }) : [];

                this.buildActivationControls();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    onActiveFilterChange(): void {
        this.loadGroups();
    }

    edit(group: Group): void {
        if (group.id) {
            this.formGroupId = Number(group.id);
            this.formEntityId = undefined; // Use group's entityId from loaded data
            this.formDialogVisible = true;
        }
    }

    viewDetails(group: Group): void {
        if (group.id) {
            this.router.navigate(['/company-administration/entity-groups', group.id]);
        }
    }

    openMenu(menuRef: any, group: Group, event: Event): void {
        this.currentGroup = group;
        this.menuItems = this.getMenuItemsForGroup(group);
        menuRef.toggle(event);
    }

    onStatusToggle(group: Group): void {
        if (!this.canManageGroup(group)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Access Denied',
                detail: 'Only Entity Administrators can manage Entity Groups.'
            });
            return;
        }
        this.currentGroupForActivation = group;
        this.activationGroupDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activationGroupDialog = false;
        if (this.currentGroupForActivation) {
            const control = this.activationControls[this.currentGroupForActivation.id];
            if (control) {
                control.setValue(this.currentGroupForActivation.active, { emitEvent: false });
            }
        }
        this.currentGroupForActivation = undefined;
    }

    activation(value: boolean): void {
        if (!this.currentGroupForActivation) {
            return;
        }

        const group = this.currentGroupForActivation;
        const control = this.activationControls[group.id];
        if (!control) {
            return;
        }

        control.disable();
        const context: GroupActionContext = value ? 'activate' : 'deactivate';
        const toggle$ = value
            ? this.entityGroupsService.activateEntityGroup(Number(group.id))
            : this.entityGroupsService.deactivateEntityGroup(Number(group.id));

        const sub = toggle$.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(context, response);
                    control.setValue(!value, { emitEvent: false });
                    this.activationGroupDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: value ? 'Group activated successfully.' : 'Group deactivated successfully.',
                    life: 3000
                });
                group.active = value;
                this.activationGroupDialog = false;
                this.loadGroups();
            },
            complete: () => {
                control.enable();
                this.currentGroupForActivation = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    confirmDelete(group: Group): void {
        if (!this.canManageGroup(group)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Access Denied',
                detail: 'Only Entity Administrators can delete Entity Groups.'
            });
            return;
        }
        this.currentGroupForDelete = group;
        this.deleteGroupDialog = true;
    }

    onCancelDeleteDialog(): void {
        this.deleteGroupDialog = false;
        this.currentGroupForDelete = undefined;
    }

    deleteGroup(): void {
        if (!this.currentGroupForDelete) {
            return;
        }

        const group = this.currentGroupForDelete;

        const sub = this.entityGroupsService.deleteEntityGroup(Number(group.id)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    this.deleteGroupDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `${group.title} deleted successfully.`,
                    life: 3000
                });
                this.deleteGroupDialog = false;
                this.loadGroups();
            },
            complete: () => {
                this.currentGroupForDelete = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    navigateToNew(): void {
        this.formGroupId = undefined;
        this.formEntityId = this.currentEntityId;
        this.formDialogVisible = true;
    }

    onFormDialogClose(): void {
        this.formDialogVisible = false;
        this.formGroupId = undefined;
        this.formEntityId = undefined;
    }

    onFormSaved(): void {
        this.loadGroups(); // Reload groups after save
    }

    getStatusSeverity(status: boolean): string {
        return status ? 'success' : 'danger';
    }

    getStatusLabel(status: boolean): string {
        return status ? 'Active' : 'Inactive';
    }

    /**
     * Check if current user is Entity Admin
     */
    isEntityAdmin(): boolean {
        return this.entityGroupsService.isEntityAdmin();
    }

    /**
     * Check if user can manage Entity Groups
     */
    canManageGroup(group: Group): boolean {
        if (!this.isEntityAdmin()) {
            return false;
        }
        // Entity Groups (Entity_ID > 0) can be managed by any Entity Admin
        return group.entityId > 0;
    }

    private buildActivationControls(): void {
        this.activationControls = {};
        this.groups.forEach((group) => {
            this.activationControls[group.id] = new FormControl<boolean>(group.active, { nonNullable: true });
        });
    }

    private configureMenuItems(): void {
        this.menuItems = [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => this.currentGroup && this.viewDetails(this.currentGroup)
            },
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                command: () => this.currentGroup && this.confirmDelete(this.currentGroup)
            }
        ];
    }

    getMenuItemsForGroup(group: Group): MenuItem[] {
        const items: MenuItem[] = [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => this.viewDetails(group)
            }
        ];

        if (this.canManageGroup(group)) {
            items.push(
                {
                    label: 'Edit',
                    icon: 'pi pi-pencil',
                    command: () => this.edit(group)
                },
                {
                    label: 'Delete',
                    icon: 'pi pi-trash',
                    command: () => this.confirmDelete(group)
                }
            );
        }

        return items;
    }

    private handleBusinessError(context: GroupActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'activate':
                detail = this.getActivateErrorMessage(code) || '';
                break;
            case 'deactivate':
                detail = this.getDeactivateErrorMessage(code) || '';
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
            case 'ERP11287':
                return 'Invalid Entity ID';
            default:
                return null;
        }
    }

    private getActivateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11290':
                return 'Invalid Group ID';
            default:
                return null;
        }
    }

    private getDeactivateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11290':
                return 'Invalid Group ID';
            default:
                return null;
        }
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11290':
                return 'Invalid Group ID';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }
}
