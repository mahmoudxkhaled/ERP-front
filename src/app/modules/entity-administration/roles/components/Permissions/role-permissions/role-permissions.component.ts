import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { RolesService } from '../../../services/roles.service';
import { SettingsConfigurationsService } from 'src/app/modules/system-administration/erp-functions/services/settings-configurations.service';
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
            // Reset state when opening dialog
            this.loading = false;
            this.saving = false;
            this.loadingFunctions = false;
            this.loadingModules = false;
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
    availableFunctions: any[] = []; // Store full objects with id and name
    selectedFunctions: number[] = []; // Store IDs for selected items
    functionsWildcard: boolean = false;
    functionsExceptions: number[] = [];

    // Modules
    modules: number[] = [];
    availableModules: any[] = []; // Store full objects with id and name
    selectedModules: number[] = []; // Store IDs for selected items
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
        // Ensure arrays are initialized
        this.availableFunctions = this.availableFunctions || [];
        this.availableModules = this.availableModules || [];
        this.selectedFunctions = this.selectedFunctions || [];
        this.selectedModules = this.selectedModules || [];

        // Load available functions
        const functionsSub = this.settingsConfigurationsService.getFunctionsList().subscribe({
            next: (response) => {
                if (response?.success) {
                    // Store full objects with id and name for display
                    const parsedFunctions = this.settingsConfigurationsService.parseFunctionsList(response, this.isRegional);
                    this.availableFunctions = parsedFunctions || [];
                } else {
                    this.availableFunctions = [];
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Warning',
                        detail: 'Failed to load available functions.'
                    });
                }
            },
            error: () => {
                this.availableFunctions = [];
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
                    // Store full objects with id and name for display
                    const parsedModules = this.settingsConfigurationsService.parseModulesList(response, this.isRegional);
                    this.availableModules = parsedModules || [];
                } else {
                    this.availableModules = [];
                    this.messageService.add({
                        severity: 'warn',
                        summary: 'Warning',
                        detail: 'Failed to load available modules.'
                    });
                }
            },
            error: () => {
                this.availableModules = [];
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
        // Ensure arrays are initialized
        this.selectedFunctions = this.selectedFunctions || [];
        this.selectedModules = this.selectedModules || [];
        this.availableFunctions = this.availableFunctions || [];
        this.availableModules = this.availableModules || [];
        this.functionsExceptions = this.functionsExceptions || [];
        this.modulesExceptions = this.modulesExceptions || [];
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
                    let functionsList: number[] = [];

                    if (Array.isArray(response.message)) {
                        // Check if it's an array of objects or array of IDs
                        if (response.message.length > 0 && typeof response.message[0] === 'object') {
                            // Array of function objects - extract functionID from each
                            functionsList = response.message
                                .map((func: any) => func.functionID || func.Function_ID || func.id)
                                .filter((id: any) => id !== undefined && id !== null);
                        } else {
                            // Array of IDs (numbers)
                            functionsList = response.message;
                        }
                    } else if (response.message?.Functions && Array.isArray(response.message.Functions)) {
                        // Nested Functions array
                        functionsList = response.message.Functions;
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
                    let modulesList: number[] = [];

                    if (Array.isArray(response.message)) {
                        // Check if it's an array of objects or array of IDs
                        if (response.message.length > 0 && typeof response.message[0] === 'object') {
                            // Array of module objects - extract moduleID from each
                            modulesList = response.message
                                .map((module: any) => module.moduleID || module.Module_ID || module.id)
                                .filter((id: any) => id !== undefined && id !== null);
                        } else {
                            // Array of IDs (numbers)
                            modulesList = response.message;
                        }
                    } else if (response.message?.Modules && Array.isArray(response.message.Modules)) {
                        // Nested Modules array
                        modulesList = response.message.Modules;
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
        // Note: functionsWildcard is already toggled by two-way binding, so check the NEW state
        if (this.functionsWildcard) {
            // Just switched TO wildcard mode (all functions allowed)
            // Clear all selections - user can then select exceptions if needed
            this.selectedFunctions = [];
            this.functionsExceptions = [];
        } else {
            // Just switched FROM wildcard mode (back to normal selection)
            // Save current exceptions for reference
            if (this.selectedFunctions.length > 0) {
                this.functionsExceptions = [...this.selectedFunctions];
            }
            // In normal mode, selected items represent allowed functions
            // Start with empty list - user needs to select which functions are allowed
            this.selectedFunctions = [];
        }
    }

    toggleModulesWildcard(): void {
        // Note: modulesWildcard is already toggled by two-way binding, so check the NEW state
        if (this.modulesWildcard) {
            // Just switched TO wildcard mode (all modules allowed)
            // Clear all selections - user can then select exceptions if needed
            this.selectedModules = [];
            this.modulesExceptions = [];
        } else {
            // Just switched FROM wildcard mode (back to normal selection)
            // Save current exceptions for reference
            if (this.selectedModules.length > 0) {
                this.modulesExceptions = [...this.selectedModules];
            }
            // In normal mode, selected items represent allowed modules
            // Start with empty list - user needs to select which modules are allowed
            this.selectedModules = [];
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

    /**
     * Get function name by ID
     */
    getFunctionName(functionId: number): string {
        if (!this.availableFunctions || !Array.isArray(this.availableFunctions)) {
            return `Function #${functionId}`;
        }
        const functionObj = this.availableFunctions.find(f => f && f.id === functionId);
        return functionObj && functionObj.name ? functionObj.name : `Function #${functionId}`;
    }

    /**
     * Get module name by ID
     */
    getModuleName(moduleId: number): string {
        if (!this.availableModules || !Array.isArray(this.availableModules)) {
            return `Module #${moduleId}`;
        }
        const moduleObj = this.availableModules.find(m => m && m.id === moduleId);
        return moduleObj && moduleObj.name ? moduleObj.name : `Module #${moduleId}`;
    }

    closeDialog(): void {
        this.onVisibleChange(false);
    }

    onDialogHide(): void {
        // Reset all state when dialog is hidden
        this.loading = false;
        this.saving = false;
        this.loadingFunctions = false;
        this.loadingModules = false;
        // Ensure arrays are never null
        this.selectedFunctions = this.selectedFunctions || [];
        this.selectedModules = this.selectedModules || [];
        this.availableFunctions = this.availableFunctions || [];
        this.availableModules = this.availableModules || [];
        this.functionsExceptions = this.functionsExceptions || [];
        this.modulesExceptions = this.modulesExceptions || [];
        this.onVisibleChange(false);
    }

    onVisibleChange(value: boolean): void {
        this._visible = value;
        this.visibleChange.emit(value);
    }

    private handleBusinessError(type: 'functions' | 'modules', response: any): void | null {
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
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.saving = false;
        return null;
    }
}
