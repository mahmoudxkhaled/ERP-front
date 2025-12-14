import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { SettingsConfigurationsService } from '../../../services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { Module, Function } from '../../../models/settings-configurations.model';
import { IAccountSettings } from 'src/app/core/models/account-status.model';

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

    // Pagination (handled by PrimeNG automatically)
    first: number = 0;
    rows: number = 10;

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
                // totalRecords will be calculated by getFilteredModules().length in the template
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
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
            this.router.navigate(['/company-administration/settings-configurations/modules', moduleItem.id, 'edit']);
        }
    }

    viewDetails(moduleItem: Module): void {
        if (moduleItem.id) {
            this.router.navigate(['/company-administration/settings-configurations/modules', moduleItem.id]);
        }
    }

    openMenu(menuRef: any, moduleItem: Module, event: Event): void {
        this.currentModule = moduleItem;
        menuRef.toggle(event);
    }

    confirmActivation(moduleItem: Module): void {
        this.currentModuleForActivation = moduleItem;
        this.activateModuleDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activateModuleDialog = false;
        this.currentModuleForActivation = undefined;
    }

    activation(isActivate: boolean): void {
        if (!this.currentModuleForActivation) {
            return;
        }

        const moduleItem = this.currentModuleForActivation;
        const action = isActivate ? 'activate' : 'deactivate';
        const apiCall = isActivate
            ? this.settingsConfigurationsService.activateModule(moduleItem.id)
            : this.settingsConfigurationsService.deactivateModule(moduleItem.id);

        const sub = apiCall.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(action, response);
                    this.activateModuleDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Module "${moduleItem.name}" ${isActivate ? 'activated' : 'deactivated'} successfully.`,
                    life: 3000
                });
                this.activateModuleDialog = false;
                this.loadModules(true);
            },
            complete: () => {
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
        this.router.navigate(['/company-administration/settings-configurations/modules/new']);
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
            {
                label: 'Activate/Deactivate',
                icon: 'pi pi-power-off',
                command: () => this.currentModule && this.confirmActivation(this.currentModule)
            }
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
}
