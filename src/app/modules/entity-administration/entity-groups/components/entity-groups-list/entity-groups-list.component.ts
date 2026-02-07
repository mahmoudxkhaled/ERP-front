import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription, of } from 'rxjs';
import { concatMap, catchError } from 'rxjs/operators';
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
    @ViewChild('groupsTableContainer') groupsTableContainer?: ElementRef;

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

    // Pagination (handled by PrimeNG automatically)
    first: number = 0;
    rows: number = 10;

    // Search functionality
    searchText: string = '';
    filteredGroups: Group[] = [];

    /** When loading and filteredGroups is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): Group[] {
        if (this.tableLoadingSpinner && this.filteredGroups.length === 0) {
            return Array(10).fill(null).map(() => ({} as Group));
        }
        return this.filteredGroups;
    }

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

                this.applySearchFilter();
                this.buildActivationControls();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    onActiveFilterChange(): void {
        this.loadGroups();
        // Note: applySearchFilter is called inside loadGroups() after data is loaded
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
        const groupId = Number(group.id);

        // Step 1: Get all group members first
        const sub = this.entityGroupsService.getGroupMembers(groupId, true).pipe(
            // Step 2: Remove all members if they exist
            concatMap((membersResponse: any) => {
                if (!membersResponse?.success) {
                    // If we can't get members, try to delete group anyway
                    return of(null);
                }

                const membersData = membersResponse?.message || {};

                // Extract all account IDs from dictionary format: { accountId: email }
                const accountIds: number[] = Object.keys(membersData).map((key) => Number(key));

                // If there are no members, skip removal step
                if (accountIds.length === 0) {
                    return of(null);
                }

                // Remove all members
                return this.entityGroupsService.removeGroupMembers(groupId, accountIds).pipe(
                    catchError((error) => {
                        // If removal fails, still try to delete group
                        this.messageService.add({
                            severity: 'warn',
                            summary: 'Warning',
                            detail: 'Failed to remove some members, but continuing with group deletion.',
                            life: 3000
                        });
                        return of(null);
                    })
                );
            }),
            // Step 3: Delete the group after members are removed (or if no members)
            concatMap(() => {
                return this.entityGroupsService.deleteEntityGroup(groupId);
            })
        ).subscribe({
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
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'An error occurred while deleting the group.',
                    life: 3000
                });
                this.deleteGroupDialog = false;
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
        return [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => this.viewDetails(group)
            },
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
        ];
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

    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        // Scroll to top of table when page changes
        this.scrollToTableTop();
    }

    scrollToTableTop(): void {
        // Use setTimeout to ensure the DOM has updated before scrolling
        setTimeout(() => {
            if (this.groupsTableContainer) {
                this.groupsTableContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);
    }

    onSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.searchText = target?.value || '';
        this.applySearchFilter();
        // Reset to first page when searching
        this.first = 0;
    }

    clearSearch(): void {
        this.searchText = '';
        this.applySearchFilter();
        this.first = 0;
    }

    private applySearchFilter(): void {
        if (!this.searchText || this.searchText.trim() === '') {
            this.filteredGroups = [...this.groups];
            return;
        }

        const searchTerm = this.searchText.toLowerCase().trim();
        this.filteredGroups = this.groups.filter((group) => {
            const idMatch = group.id?.toLowerCase().includes(searchTerm) || false;
            const titleMatch = group.title?.toLowerCase().includes(searchTerm) || false;
            const descriptionMatch = group.description?.toLowerCase().includes(searchTerm) || false;

            return idMatch || titleMatch || descriptionMatch;
        });
    }
}
