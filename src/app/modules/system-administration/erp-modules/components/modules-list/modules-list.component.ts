import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { SettingsConfigurationsService } from 'src/app/modules/system-administration/settings-configurations.service';
import { Function, Module } from '../../../erp-functions/models/settings-configurations.model';


type ModuleActionContext = 'list' | 'activate' | 'deactivate';

@Component({
    selector: 'app-modules-list',
    templateUrl: './modules-list.component.html',
    styleUrls: ['./modules-list.component.scss']
})
export class ModulesListComponent implements OnInit, OnDestroy {
    @ViewChild('modulesTableContainer') modulesTableContainer?: ElementRef;

    modules: Module[] = [];
    functions: Function[] = []; // For mapping function IDs to names
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    menuItems: MenuItem[] = [];
    currentModule?: Module;
    accountSettings: IAccountSettings;
    activateModuleDialog: boolean = false;
    currentModuleForActivation?: Module;
    logoDialogVisible: boolean = false;
    currentModuleForLogo?: Module;
    activationControls: Record<number, FormControl<boolean>> = {};

    // Pagination (handled by PrimeNG automatically)
    first: number = 0;
    rows: number = 10;

    // Search functionality
    searchText: string = '';
    filteredModules: Module[] = [];

    constructor(
        private settingsConfigurationsService: SettingsConfigurationsService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoading$ = this.settingsConfigurationsService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.configureMenuItems();
        // Load functions first, then modules after functions are loaded
        this.loadFunctions();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadFunctions(): void {
        const isRegional = this.accountSettings?.Language !== 'English';
        const sub = this.settingsConfigurationsService.getFunctionsList().subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.functions = this.settingsConfigurationsService.parseFunctionsList(response, isRegional);
                }
            },
            complete: () => {
                // Load modules after functions are loaded
                this.loadModules();
            }
        });
        this.subscriptions.push(sub);
    }

    loadModules(forceReload: boolean = false): void {
        // Note: We removed the isLoadingSubject check because it was preventing
        // the initial load. Since loadModules() is called after loadFunctions()
        // completes, we don't need to check if another call is in progress.

        const isRegional = this.accountSettings?.Language !== 'English';
        this.tableLoadingSpinner = true;

        const sub = this.settingsConfigurationsService.getModulesList().subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                // Parse modules list
                this.modules = this.settingsConfigurationsService.parseModulesList(response, isRegional);
                this.applySearchFilter();
                this.buildActivationControls();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    buildActivationControls(): void {
        this.activationControls = {};
        this.modules.forEach((moduleItem) => {
            this.activationControls[moduleItem.id] = new FormControl<boolean>(
                moduleItem.isActive ?? true,
                { nonNullable: true }
            );
        });
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
            if (this.modulesTableContainer) {
                this.modulesTableContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);
    }

    edit(moduleItem: Module): void {
        if (moduleItem.id) {
            this.router.navigate(['/system-administration/erp-modules', moduleItem.id, 'edit']);
        }
    }

    viewDetails(moduleItem: Module): void {
        if (moduleItem.id) {
            this.router.navigate(['/system-administration/erp-modules', moduleItem.id]);
        }
    }

    openMenu(menuRef: any, moduleItem: Module, event: Event): void {
        this.currentModule = moduleItem;
        menuRef.toggle(event);
    }

    onStatusToggle(moduleItem: Module): void {
        this.currentModuleForActivation = moduleItem;
        this.activateModuleDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activateModuleDialog = false;
        if (this.currentModuleForActivation) {
            const control = this.activationControls[this.currentModuleForActivation.id];
            if (control) {
                control.setValue(this.currentModuleForActivation.isActive ?? true, { emitEvent: false });
            }
        }
        this.currentModuleForActivation = undefined;
    }

    activation(value: boolean): void {
        if (!this.currentModuleForActivation) {
            return;
        }

        const moduleItem = this.currentModuleForActivation;
        const control = this.activationControls[moduleItem.id];
        if (!control) {
            return;
        }

        control.disable();
        const action = value ? 'activate' : 'deactivate';
        const apiCall = value
            ? this.settingsConfigurationsService.activateModule(moduleItem.id)
            : this.settingsConfigurationsService.deactivateModule(moduleItem.id);

        const sub = apiCall.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(action, response);
                    control.setValue(!value, { emitEvent: false });
                    this.activateModuleDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Module "${moduleItem.name}" ${value ? 'activated' : 'deactivated'} successfully.`,
                    life: 3000
                });
                moduleItem.isActive = value;
                this.activateModuleDialog = false;
                this.loadModules(true);
            },
            complete: () => {
                control.enable();
                this.currentModuleForActivation = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    openLogoDialog(moduleItem: Module): void {
        this.currentModuleForLogo = moduleItem;
        this.logoDialogVisible = true;
    }

    onLogoDialogClose(): void {
        this.logoDialogVisible = false;
        this.currentModuleForLogo = undefined;
    }

    onLogoUpdated(): void {
        this.loadModules(true);
    }

    navigateToNew(): void {
        this.router.navigate(['/system-administration/erp-modules/new']);
    }

    getFunctionName(functionId: number): string {
        const functionItem = this.functions.find(f => f.id === functionId);
        return functionItem ? functionItem.name : `Function #${functionId}`;
    }

    private configureMenuItems(): void {
        this.menuItems = [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => this.currentModule && this.viewDetails(this.currentModule)
            },
            {
                label: 'Edit',
                icon: 'pi pi-pencil',
                command: () => this.currentModule && this.edit(this.currentModule)
            },
            {
                label: 'Manage Logo',
                icon: 'pi pi-image',
                command: () => this.currentModule && this.openLogoDialog(this.currentModule)
            },
        ];
    }

    private handleBusinessError(context: ModuleActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'activate':
            case 'deactivate':
                detail = this.getActivationErrorMessage(code) || '';
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
        // Get_Modules_List (715) has no specific error codes
        return null;
    }

    private getActivationErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11410':
                return 'Invalid Module ID';
            case 'ERP11411':
                return 'Module already Active';
            case 'ERP11412':
                return 'Module already Inactive';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
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
            this.filteredModules = [...this.modules];
            return;
        }

        const searchTerm = this.searchText.toLowerCase().trim();
        this.filteredModules = this.modules.filter((moduleItem) => {
            const codeMatch = moduleItem.code?.toLowerCase().includes(searchTerm) || false;
            const nameMatch = moduleItem.name?.toLowerCase().includes(searchTerm) || false;
            const idMatch = String(moduleItem.id).includes(searchTerm) || false;
            const urlMatch = moduleItem.url?.toLowerCase().includes(searchTerm) || false;
            const functionNameMatch = this.getFunctionName(moduleItem.functionId).toLowerCase().includes(searchTerm) || false;
            
            return codeMatch || nameMatch || idMatch || urlMatch || functionNameMatch;
        });
    }
}
