import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription, of, EMPTY } from 'rxjs';
import { concatMap, catchError } from 'rxjs/operators';
import { GroupsService } from '../../../services/groups.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Group, GroupBackend } from '../../../models/groups.model';
import { IAccountSettings, IAccountDetails } from 'src/app/core/models/account-status.model';

type GroupActionContext = 'list' | 'activate' | 'deactivate' | 'delete';

@Component({
    selector: 'app-groups-list',
    templateUrl: './groups-list.component.html',
    styleUrls: ['./groups-list.component.scss']
})
export class GroupsListComponent implements OnInit, OnDestroy {
    @ViewChild('groupsTableContainer') groupsTableContainer?: ElementRef;

    groups: Group[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    activationControls: Record<string, FormControl<boolean>> = {};
    menuItems: MenuItem[] = [];
    currentGroup?: Group;
    activationGroupDialog: boolean = false;
    currentGroupForActivation?: Group;
    deleteGroupDialog: boolean = false;
    currentGroupForDelete?: Group;
    activeOnlyFilter: boolean = false;
    currentAccountId: number = 0;

    // Dialog for form
    formDialogVisible: boolean = false;
    formGroupId?: number;

    // Pagination (handled by PrimeNG automatically)
    first: number = 0;
    rows: number = 10;

    // Search functionality
    searchText: string = '';
    filteredGroups: Group[] = [];

    constructor(
        private groupsService: GroupsService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.isLoading$ = this.groupsService.isLoadingSubject.asObservable();
        const accountDetails = this.localStorageService.getAccountDetails() as IAccountDetails;
        this.currentAccountId = accountDetails?.Account_ID || 0;
    }

    ngOnInit(): void {
        this.loadGroups();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadGroups(): void {
        const accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        const isRegional = accountSettings?.Language !== 'English';
        this.tableLoadingSpinner = true;

        const accountId = this.groupsService.getCurrentAccountId();
        if (!accountId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Unable to get account information.'
            });
            this.resetLoadingFlags();
            return;
        }

        const sub = this.groupsService.listPersonalGroups(accountId, this.activeOnlyFilter).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                console.log('response', response);
                const groupsData = response?.message || [];
                this.groups = Array.isArray(groupsData) ? groupsData.map((item: any) => {
                    const groupBackend = item as GroupBackend;
                    return {
                        id: String(groupBackend?.groupID || ''),
                        title: isRegional ? (groupBackend?.title_Regional || groupBackend?.title || '') : (groupBackend?.title || ''),
                        description: isRegional ? (groupBackend?.description_Regional || groupBackend?.description || '') : (groupBackend?.description || ''),
                        entityId: groupBackend?.entityID || 0,
                        active: Boolean(groupBackend?.isActive !== undefined ? groupBackend.isActive : true), // Default to active if not provided
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
    }

    edit(group: Group): void {
        if (group.id) {
            this.formGroupId = Number(group.id);
            this.formDialogVisible = true;
        }
    }

    viewDetails(group: Group): void {
        if (group.id) {
            this.router.navigate(['/summary/groups', group.id]);
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
            ? this.groupsService.activateGroup(Number(group.id))
            : this.groupsService.deactivateGroup(Number(group.id));

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
        const sub = this.groupsService.getGroupMembers(groupId, true).pipe(
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
                return this.groupsService.removeGroupMembers(groupId, accountIds).pipe(
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
                return this.groupsService.deleteGroup(groupId);
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
        this.formDialogVisible = true;
    }

    onFormDialogClose(): void {
        this.formDialogVisible = false;
        this.formGroupId = undefined;
    }

    onFormSaved(): void {
        this.loadGroups();
    }


    private buildActivationControls(): void {
        this.activationControls = {};
        this.groups.forEach((group) => {
            this.activationControls[group.id] = new FormControl<boolean>(group.active, { nonNullable: true });
        });
    }


    getMenuItemsForGroup(group: Group): MenuItem[] {
        const items: MenuItem[] = [
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
                return 'Invalid Account ID';
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

