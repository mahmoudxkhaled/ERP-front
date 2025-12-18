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
    permissionsDialogVisible: boolean = false;

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
            this.router.navigate(['/company-administration/roles/list']);
            return;
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
        // Backend now returns full function objects directly
        const sub = this.rolesService.getRoleFunctions(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    // Parse the response to get function objects
                    const functionsList = this.settingsConfigurationsService.parseFunctionsList(
                        response,
                        this.isRegional
                    );
                    this.functionsList = functionsList;

                    // Extract IDs from the function objects
                    this.functions = functionsList.map(f => f.id);

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

    loadModules(): void {
        // Backend now returns full module objects directly
        const sub = this.rolesService.getRoleModules(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    // Parse the response to get module objects
                    const modulesList = this.settingsConfigurationsService.parseModulesList(
                        response,
                        this.isRegional
                    );
                    this.modulesList = modulesList;

                    // Extract IDs from the module objects
                    this.modules = modulesList.map(m => m.id);

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
            this.router.navigate(['/company-administration/entities', entityId]);
        } else if (this.roleDetails?.entityId) {
            // Navigate to entity details of the role's entity
            this.router.navigate(['/company-administration/entities', this.roleDetails.entityId]);
        } else {
            this.router.navigate(['/company-administration/roles/list']);
        }
    }

    editRole(): void {
        // Include entityId as query param if we have it
        const queryParams: any = {};
        const routeEntityId = this.route.snapshot.queryParams['entityId'];
        if (routeEntityId) {
            queryParams.entityId = routeEntityId;
        } else if (this.roleDetails?.entityId) {
            queryParams.entityId = this.roleDetails.entityId;
        }
        this.router.navigate(['/company-administration/roles', this.roleId, 'edit'], { queryParams });
    }

    openPermissionsDialog(): void {
        this.permissionsDialogVisible = true;
    }

    handlePermissionsUpdated(): void {
        this.loadAllData();
    }

    private handleBusinessError(response: any): void {
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
                detail = 'An error occurred while loading role details.';
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
    }
}
