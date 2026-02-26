import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { RolesService } from '../../../services/roles.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { EntityRole } from '../../../models/roles.model';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { SettingsConfigurationsService } from 'src/app/modules/system-administration/erp-functions/services/settings-configurations.service';
import { Function, Module } from 'src/app/modules/system-administration/erp-functions/models/settings-configurations.model';

@Component({
    selector: 'app-role-details',
    templateUrl: './role-details.component.html',
    styleUrls: ['./role-details.component.scss']
})
export class RoleDetailsComponent implements OnInit, OnDestroy {
    roleId: string = '';
    loading: boolean = false;
    loadingDetails: boolean = false;
    activeTabIndex: number = 0;

    roleDetails: EntityRole | null = null;
    entityName: string = '';
    functions: number[] = [];
    modules: number[] = [];
    functionsList: Function[] = [];
    modulesList: Module[] = [];
    accountsList: any[] = [];
    loadingAccounts: boolean = false;
    editRoleDialogVisible: boolean = false;

    /** Placeholder rows for Assigned Accounts table so skeleton cells show while loading. */
    get accountsTableValue(): any[] {
        if (this.loadingAccounts && this.accountsList.length === 0) {
            return Array(10).fill(null).map(() => ({}));
        }
        return this.accountsList;
    }

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private rolesService: RolesService,
        private entitiesService: EntitiesService,
        private settingsConfigurationsService: SettingsConfigurationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.roleId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.roleId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid role ID.'
            });
            this.router.navigate(['/entity-administration/roles/list']);
            return;
        }

        // Check for tab query parameter to set active tab
        const tabParam = this.route.snapshot.queryParams['tab'];
        if (tabParam !== undefined && tabParam !== null) {
            const tabIndex = parseInt(tabParam, 10);
            if (!isNaN(tabIndex) && tabIndex >= 0) {
                this.activeTabIndex = tabIndex;
            }
        }

        this.loadAllData();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadAllData(): void {
        this.loading = true;
        this.loadingDetails = true;

        const sub = this.rolesService.getEntityRoleDetails(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }



                const role = response?.message || {};
                this.roleDetails = {
                    id: String(role?.Entity_Role_ID || ''),
                    entityId: String(role?.Entity_ID || ''),
                    title: this.isRegional ? (role?.Title_Regional || role?.Title || '') : (role?.Title || ''),
                    description: this.isRegional ? (role?.Description_Regional || role?.Description || '') : (role?.Description || ''),
                    titleRegional: role?.Title_Regional || '',
                    descriptionRegional: role?.Description_Regional || '',
                    functions: [],
                    modules: []
                };

                // Load entity name
                if (this.roleDetails.entityId) {
                    this.loadEntityName(this.roleDetails.entityId);
                }

                // Load functions and modules separately
                this.loadFunctions();
                this.loadModules();
                // Load assigned accounts
                this.loadAssignedAccounts();

                this.loadingDetails = false;
                this.loading = false;
            },
            complete: () => {
                this.loading = false;
                this.loadingDetails = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadFunctions(): void {
        // Load role functions - API returns array of objects with functionID
        const sub = this.rolesService.getRoleFunctions(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    let functionIds: number[] = [];

                    // Handle new API response structure
                    if (Array.isArray(response.message)) {
                        if (response.message.length > 0 && typeof response.message[0] === 'object') {
                            // Array of objects - extract functionID from each
                            functionIds = response.message
                                .map((item: any) => item.functionID || item.Function_ID || item.id)
                                .filter((id: any) => id !== undefined && id !== null);
                            // Get unique function IDs
                            functionIds = [...new Set(functionIds)];
                        } else {
                            // Array of IDs (numbers)
                            functionIds = [...new Set(response.message as number[])];
                        }
                    } else if (response.message?.Functions && Array.isArray(response.message.Functions)) {
                        // Nested Functions array
                        functionIds = [...new Set(response.message.Functions as number[])];
                    }

                    this.functions = functionIds;

                    // Load full function details to get names
                    this.loadFunctionDetails(functionIds);

                    if (this.roleDetails) {
                        this.roleDetails.functions = this.functions;
                    }
                }
            },
            error: () => {
                // Handle error silently or show message if needed
            }
        });
        this.subscriptions.push(sub);
    }

    loadFunctionDetails(functionIds: number[]): void {
        // Load all available functions to get names
        const sub = this.settingsConfigurationsService.getFunctionsList().subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const allFunctions = this.settingsConfigurationsService.parseFunctionsList(
                        response,
                        this.isRegional
                    );
                    // Filter to only include functions that are assigned to this role
                    this.functionsList = allFunctions.filter((f: Function) => functionIds.includes(f.id)) as Function[];
                }
            }
        });
        this.subscriptions.push(sub);
    }

    loadModules(): void {
        // Load role modules - API returns array of objects with moduleID
        const sub = this.rolesService.getRoleModules(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    let moduleIds: number[] = [];

                    // Handle new API response structure
                    if (Array.isArray(response.message)) {
                        if (response.message.length > 0 && typeof response.message[0] === 'object') {
                            // Array of objects - extract moduleID from each
                            moduleIds = response.message
                                .map((item: any) => item.moduleID || item.Module_ID || item.id)
                                .filter((id: any) => id !== undefined && id !== null);
                            // Get unique module IDs
                            moduleIds = [...new Set(moduleIds)];
                        } else {
                            // Array of IDs (numbers)
                            moduleIds = [...new Set(response.message as number[])];
                        }
                    } else if (response.message?.Modules && Array.isArray(response.message.Modules)) {
                        // Nested Modules array
                        moduleIds = [...new Set(response.message.Modules as number[])];
                    }

                    this.modules = moduleIds;

                    // Load full module details to get names
                    this.loadModuleDetails(moduleIds);

                    if (this.roleDetails) {
                        this.roleDetails.modules = this.modules;
                    }
                }
            },
            error: () => {
                // Handle error silently or show message if needed
            }
        });
        this.subscriptions.push(sub);
    }

    loadModuleDetails(moduleIds: number[]): void {
        // Load all available modules to get names
        const sub = this.settingsConfigurationsService.getModulesList().subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const allModules = this.settingsConfigurationsService.parseModulesList(
                        response,
                        this.isRegional
                    );
                    // Filter to only include modules that are assigned to this role
                    this.modulesList = allModules.filter((m: Module) => moduleIds.includes(m.id)) as Module[];
                }
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntityName(entityId: string): void {
        const sub = this.entitiesService.getEntityDetails(entityId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const entity = response?.message || {};
                    this.entityName = this.isRegional ? (entity?.Name_Regional || entity?.Name || '') : (entity?.Name || '');
                }
            }
        });
        this.subscriptions.push(sub);
    }

    navigateBack(): void {
        // Check if we came from entity details context
        const queryParams = this.route.snapshot.queryParams;
        const entityId = queryParams['entityId'];
        if (entityId) {
            this.router.navigate(['/entity-administration/entities', entityId]);
        } else if (this.roleDetails?.entityId) {
            // Navigate to entity details of the role's entity
            this.router.navigate(['/entity-administration/entities', this.roleDetails.entityId]);
        } else {
            this.router.navigate(['/entity-administration/roles/list']);
        }
    }

    openEditRoleDialog(): void {
        this.editRoleDialogVisible = true;
    }

    handleRoleUpdated(): void {
        // Reload role details after update
        this.loadAllData();
    }

    openPermissionsDialog(): void {
        this.router.navigate(['/entity-administration/roles/permissions', this.roleId]);
    }

    loadAssignedAccounts(): void {
        if (!this.roleId) {
            return;
        }

        this.loadingAccounts = true;
        const sub = this.rolesService.getRoleAccountsList([Number(this.roleId)], false).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    let accounts: any[] = [];

                    // Handle response format - can be List<Account> or Dictionary<int, string>
                    if (Array.isArray(response.message)) {
                        // List<Account> format - array of account objects
                        accounts = response.message;
                    } else if (response.message && typeof response.message === 'object') {
                        // Dictionary<int, string> format - convert to array
                        // Format: { "1": "email1@example.com", "2": "email2@example.com" }
                        accounts = Object.keys(response.message).map((key: string) => {
                            const accountId = parseInt(key, 10);
                            const email = response.message[key];
                            return {
                                Account_ID: accountId,
                                Email: email
                            };
                        });
                    }

                    // Map account properties - only ID, Email, and Status
                    this.accountsList = accounts.map((account: any) => {
                        return {
                            accountId: account.Account_ID || 0,
                            email: account.Email || '',
                            accountState: account.Account_State !== undefined ? account.Account_State : 1
                        };
                    });
                }
                this.loadingAccounts = false;
            },
            error: () => {
                this.loadingAccounts = false;
                this.accountsList = [];
            }
        });

        this.subscriptions.push(sub);
    }

    handleAccountsUpdated(): void {
        // Reload accounts list after assignment/unassignment
        this.loadAssignedAccounts();
    }

    private handleBusinessError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11310':
                detail = 'Invalid Entity Role ID';
                break;
            case 'ERP11305':
                detail = 'Access Denied to Entity Roles';
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
        this.loading = false;
        return null;
    }
}
