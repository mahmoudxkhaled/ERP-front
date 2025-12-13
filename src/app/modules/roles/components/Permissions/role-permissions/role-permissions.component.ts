import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { RolesService } from '../../../services/roles.service';
import { SettingsConfigurationsService } from 'src/app/modules/settings-configurations/services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';

@Component({
    selector: 'app-role-permissions',
    templateUrl: './role-permissions.component.html',
    styleUrls: ['./role-permissions.component.scss']
})
export class RolePermissionsComponent implements OnInit, OnDestroy {
    private _visible: boolean = false;

    @Input()
    get visible(): boolean {
        return this._visible;
    }
    set visible(value: boolean) {
        this._visible = value;
        if (value) {
            this.prepareDialog();
        }
    }

    @Input() roleId: string = '';
    @Input() roleTitle: string = '';

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() permissionsUpdated = new EventEmitter<void>();

    loading: boolean = false;
    saving: boolean = false;
    loadingFunctions: boolean = false;
    loadingModules: boolean = false;

    // Functions
    functions: number[] = [];
    availableFunctions: number[] = [];
    selectedFunctions: number[] = [];
    functionsWildcard: boolean = false;
    functionsExceptions: number[] = [];

    // Modules
    modules: number[] = [];
    availableModules: number[] = [];
    selectedModules: number[] = [];
    modulesWildcard: boolean = false;
    modulesExceptions: number[] = [];

    private subscriptions: Subscription[] = [];
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    constructor(
        private rolesService: RolesService,
        private settingsConfigurationsService: SettingsConfigurationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.loadAvailableFunctionsAndModules();
    }

    private loadAvailableFunctionsAndModules(): void {
        // Load available functions
        const functionsSub = this.settingsConfigurationsService.getFunctionsList().subscribe({
            next: (response) => {
                if (response?.success) {
                    const functions = this.settingsConfigurationsService.parseFunctionsList(response, this.isRegional);
                    // Extract IDs for the multi-select dropdown
                    this.availableFunctions = functions.map(f => f.id);
                } else {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Warning',
                        detail: 'Failed to load available functions.'
                    });
                }
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'An error occurred while loading available functions.'
                });
            }
        });

        // Load available modules
        const modulesSub = this.settingsConfigurationsService.getModulesList().subscribe({
            next: (response) => {
                if (response?.success) {
                    const modules = this.settingsConfigurationsService.parseModulesList(response, this.isRegional);
                    // Extract IDs for the multi-select dropdown
                    this.availableModules = modules.map(m => m.id);
                } else {
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Warning',
                        detail: 'Failed to load available modules.'
                    });
                }
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'An error occurred while loading available modules.'
                });
            }
        });

        this.subscriptions.push(functionsSub, modulesSub);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private prepareDialog(): void {
        if (!this.roleId) {
            return;
        }
        this.loadPermissions();
    }

    private loadPermissions(): void {
        if (!this.roleId) {
            return;
        }

        this.loading = true;
        this.loadingFunctions = true;
        this.loadingModules = true;

        // Load functions
        const functionsSub = this.rolesService.getRoleFunctions(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    // Backend now returns full objects, but we need to check the structure
                    // It might be an array of IDs or an object with Functions property
                    let functionsList: number[] = [];
                    if (Array.isArray(response.message)) {
                        // Direct array of IDs
                        functionsList = response.message;
                    } else if (response.message?.Functions && Array.isArray(response.message.Functions)) {
                        // Nested Functions array
                        functionsList = response.message.Functions;
                    } else if (response.message && typeof response.message === 'object') {
                        // If it's an object, we need to extract IDs - but this shouldn't happen for permissions
                        // Permissions should be arrays of IDs (with wildcard/exception logic)
                        functionsList = [];
                    }
                    this.parsePermissionList(functionsList, 'functions');
                }
                this.loadingFunctions = false;
                this.loading = false;
            },
            error: () => {
                this.loadingFunctions = false;
                this.loading = false;
            }
        });

        // Load modules
        const modulesSub = this.rolesService.getRoleModules(Number(this.roleId)).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    // Backend now returns full objects, but we need to check the structure
                    // It might be an array of IDs or an object with Modules property
                    let modulesList: number[] = [];
                    if (Array.isArray(response.message)) {
                        // Direct array of IDs
                        modulesList = response.message;
                    } else if (response.message?.Modules && Array.isArray(response.message.Modules)) {
                        // Nested Modules array
                        modulesList = response.message.Modules;
                    } else if (response.message && typeof response.message === 'object') {
                        // If it's an object, we need to extract IDs - but this shouldn't happen for permissions
                        // Permissions should be arrays of IDs (with wildcard/exception logic)
                        modulesList = [];
                    }
                    this.parsePermissionList(modulesList, 'modules');
                }
                this.loadingModules = false;
            },
            error: () => {
                this.loadingModules = false;
            }
        });

        this.subscriptions.push(functionsSub, modulesSub);
    }

    private parsePermissionList(list: number[], type: 'functions' | 'modules'): void {
        if (!list || list.length === 0) {
            if (type === 'functions') {
                this.functions = [];
                this.functionsWildcard = false;
                this.functionsExceptions = [];
                this.selectedFunctions = [];
            } else {
                this.modules = [];
                this.modulesWildcard = false;
                this.modulesExceptions = [];
                this.selectedModules = [];
            }
            return;
        }

        // Check if wildcard (contains 0)
        const hasWildcard = list.includes(0);
        const exceptions = list.filter(id => id < 0).map(id => Math.abs(id));

        if (type === 'functions') {
            this.functionsWildcard = hasWildcard;
            this.functionsExceptions = exceptions;
            if (hasWildcard) {
                // Wildcard mode: show exceptions as selected
                this.selectedFunctions = exceptions;
            } else {
                // Normal mode: show selected functions
                this.selectedFunctions = list.filter(id => id > 0);
            }
            this.functions = list;
        } else {
            this.modulesWildcard = hasWildcard;
            this.modulesExceptions = exceptions;
            if (hasWildcard) {
                // Wildcard mode: show exceptions as selected
                this.selectedModules = exceptions;
            } else {
                // Normal mode: show selected modules
                this.selectedModules = list.filter(id => id > 0);
            }
            this.modules = list;
        }
    }

    toggleFunctionsWildcard(): void {
        this.functionsWildcard = !this.functionsWildcard;
        if (this.functionsWildcard) {
            // Switch to wildcard mode: clear selected functions, show exceptions
            this.selectedFunctions = [...this.functionsExceptions];
        } else {
            // Switch to normal mode: use current selected functions
            this.selectedFunctions = this.functions.filter(id => id > 0);
        }
    }

    toggleModulesWildcard(): void {
        this.modulesWildcard = !this.modulesWildcard;
        if (this.modulesWildcard) {
            // Switch to wildcard mode: clear selected modules, show exceptions
            this.selectedModules = [...this.modulesExceptions];
        } else {
            // Switch to normal mode: use current selected modules
            this.selectedModules = this.modules.filter(id => id > 0);
        }
    }

    savePermissions(): void {
        if (!this.roleId) {
            return;
        }

        this.saving = true;

        // Build functions list
        let functionsToSave: number[] = [];
        if (this.functionsWildcard) {
            functionsToSave = [0, ...this.selectedFunctions.map(id => -id)];
        } else {
            functionsToSave = [...this.selectedFunctions];
        }

        // Build modules list
        let modulesToSave: number[] = [];
        if (this.modulesWildcard) {
            modulesToSave = [0, ...this.selectedModules.map(id => -id)];
        } else {
            modulesToSave = [...this.selectedModules];
        }

        // Save functions
        const functionsSub = this.rolesService.setRoleFunctions(Number(this.roleId), functionsToSave).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('functions', response);
                    return;
                }
                this.saveModules(modulesToSave);
            },
            error: () => {
                this.saving = false;
            }
        });

        this.subscriptions.push(functionsSub);
    }

    private saveModules(modulesToSave: number[]): void {
        const modulesSub = this.rolesService.setRoleModules(Number(this.roleId), modulesToSave).subscribe({
            next: (response: any) => {
                this.saving = false;
                if (!response?.success) {
                    this.handleBusinessError('modules', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Permissions updated successfully.'
                });

                this.permissionsUpdated.emit();
                this.closeDialog();
            },
            error: () => {
                this.saving = false;
            }
        });

        this.subscriptions.push(modulesSub);
    }

    closeDialog(): void {
        this.onVisibleChange(false);
    }

    onDialogHide(): void {
        this.onVisibleChange(false);
    }

    onVisibleChange(value: boolean): void {
        this._visible = value;
        this.visibleChange.emit(value);
    }

    private handleBusinessError(type: 'functions' | 'modules', response: any): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11310':
                detail = 'Invalid Entity Role ID';
                break;
            case 'ERP11316':
                detail = type === 'functions' ? 'Invalid Functions list format' : 'Invalid Modules list format';
                break;
            case 'ERP11318':
                detail = 'Invalid Modules list format';
                break;
            case 'ERP11305':
                detail = 'Access Denied to Entity Roles';
                break;
            default:
                detail = `An error occurred while saving ${type}.`;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.saving = false;
    }
}
