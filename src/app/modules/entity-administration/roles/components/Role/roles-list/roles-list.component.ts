import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { RolesService } from '../../../services/roles.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { EntityRole, EntityRoleBackend } from '../../../models/roles.model';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';

type RoleActionContext = 'list' | 'delete';

@Component({
    selector: 'app-roles-list',
    templateUrl: './roles-list.component.html',
    styleUrls: ['./roles-list.component.scss']
})
export class RolesListComponent implements OnInit, OnDestroy, OnChanges {
    @Input() entityId?: number; // Optional: if provided, use this instead of localStorage

    roles: EntityRole[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    menuItems: MenuItem[] = [];
    currentRole?: EntityRole;
    accountSettings: IAccountSettings;
    deleteRoleDialog: boolean = false;
    currentRoleForDelete?: EntityRole;
    private _entityId: number = 0;

    // Getter to access entityId from template
    get entityIdForTemplate(): number {
        return this._entityId;
    }

    // Pagination
    first: number = 0;
    rows: number = 10;
    totalRecords: number = 0;

    constructor(
        private rolesService: RolesService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private entitiesService: EntitiesService
    ) {
        this.isLoading$ = this.rolesService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        // Use input entityId if provided, otherwise fall back to localStorage
        if (this.entityId && this.entityId > 0) {
            this._entityId = this.entityId;
        } else {
            this._entityId = Number(this.localStorageService.getEntityId()) || 0;
        }
        this.configureMenuItems();
        this.loadRoles();
    }


    ngOnChanges(changes: SimpleChanges): void {
        // If entityId input changes, update and reload
        if (changes['entityId'] && !changes['entityId'].firstChange) {
            if (this.entityId && this.entityId > 0) {
                this._entityId = this.entityId;
                this.first = 0; // Reset pagination
                this.loadRoles();
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadRoles(): void {

        if (!this._entityId || this._entityId === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please select an entity first.'
            });
            return;
        }

        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        const isRegional = this.accountSettings?.Language !== 'English';
        this.tableLoadingSpinner = true;

        // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
        const currentPage = Math.floor(this.first / this.rows) + 1;
        const lastRoleId = -currentPage;

        const sub = this.rolesService.listEntityRoles(this._entityId, lastRoleId, this.rows).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }
                this.totalRecords = Number(response.message?.Total_Count || 0);

                let rolesData: any = {};
                const messageData = response.message?.Entity_Roles || {};
                Object.keys(messageData).forEach((key) => {
                    const item = messageData[key];
                    if (typeof item === 'object' && item !== null && item.Entity_Role_ID !== undefined) {
                        rolesData[key] = item;
                    }
                });
                console.log('rolesData', rolesData);

                this.roles = Object.values(rolesData).map((item: any) => {
                    return {
                        id: String(item?.Entity_Role_ID || ''),
                        entityId: String(item?.Entity_ID || ''),
                        title: isRegional ? (item?.Title_Regional || item?.Title || '') : (item?.Title || ''),
                        description: isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
                        titleRegional: item?.Title_Regional || '',
                        descriptionRegional: item?.Description_Regional || '',
                        functions: item?.Functions || [],
                        modules: item?.Modules || []
                    };
                });
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        this.loadRoles();
    }

    edit(role: EntityRole): void {
        if (role.id) {
            // Include entityId as query param if we have it
            const queryParams: any = {};
            if (this._entityId && this._entityId > 0) {
                queryParams.entityId = this._entityId;
            }
            this.router.navigate(['/company-administration/roles', role.id, 'edit'], { queryParams });
        }
    }

    viewDetails(role: EntityRole): void {
        if (role.id) {
            // Include entityId as query param if we have it
            const queryParams: any = {};
            if (this._entityId && this._entityId > 0) {
                queryParams.entityId = this._entityId;
            }
            this.router.navigate(['/company-administration/roles', role.id], { queryParams });
        }
    }

    openMenu(menuRef: any, role: EntityRole, event: Event): void {
        this.currentRole = role;
        menuRef.toggle(event);
    }

    confirmDelete(role: EntityRole): void {
        this.currentRoleForDelete = role;
        this.deleteRoleDialog = true;
    }

    onCancelDeleteDialog(): void {
        this.deleteRoleDialog = false;
        this.currentRoleForDelete = undefined;
    }

    deleteRole(): void {
        if (!this.currentRoleForDelete) {
            return;
        }

        const role = this.currentRoleForDelete;

        const sub = this.rolesService.removeEntityRole(Number(role.id)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    this.deleteRoleDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `Role "${role.title}" deleted successfully.`,
                    life: 3000
                });
                this.deleteRoleDialog = false;
                this.loadRoles();
            },
            complete: () => {
                this.currentRoleForDelete = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    navigateToNew(): void {
        // Include entityId as query param if we have it
        const queryParams: any = {};
        if (this._entityId && this._entityId > 0) {
            queryParams.entityId = this._entityId;
        }
        this.router.navigate(['/company-administration/roles/new'], { queryParams });
    }

    assignToAccountDialogVisible: boolean = false;
    currentRoleForAssignment?: EntityRole;

    assignToAccount(role: EntityRole): void {
        this.currentRoleForAssignment = role;
        this.assignToAccountDialogVisible = true;
    }

    onAssignDialogClose(): void {
        this.assignToAccountDialogVisible = false;
        this.currentRoleForAssignment = undefined;
    }

    onRoleAssigned(): void {
        // Optionally reload roles list
        // this.loadRoles(true);
    }

    private configureMenuItems(): void {
        // Note: Delete permission check removed as 'Delete_Entity_Role' is not in the permission matrix
        // Backend API will enforce authorization

        this.menuItems = [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => this.currentRole && this.viewDetails(this.currentRole)
            },
            {
                label: 'Edit',
                icon: 'pi pi-pencil',
                command: () => this.currentRole && this.edit(this.currentRole)
            },
            {
                label: 'Assign to Account',
                icon: 'pi pi-user-plus',
                command: () => this.currentRole && this.assignToAccount(this.currentRole)
            },
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                command: () => this.currentRole && this.confirmDelete(this.currentRole)
            }
        ];
    }

    private handleBusinessError(context: RoleActionContext, response: any): void | null {
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
            case 'ERP11300':
                return 'Invalid Entity ID';
            case 'ERP11312':
                return 'Invalid value for the Filter_Count parameter (should be a minimum of 5 records, and a maximum of 100 records)';
            case 'ERP11310':
                return 'Invalid Entity Role ID';
            case 'ERP11305':
                return 'Access Denied to Entity Roles';
            default:
                return null;
        }
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11310':
                return 'Invalid Entity Role ID';
            case 'ERP11311':
                return 'Cannot remove Entity Role if already assigned to accounts. Role assignments should be removed first.';
            case 'ERP11305':
                return 'Access Denied to Entity Roles';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }
}
