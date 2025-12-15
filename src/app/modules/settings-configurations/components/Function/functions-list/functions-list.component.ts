import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { SettingsConfigurationsService } from '../../../services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { Function } from '../../../models/settings-configurations.model';
import { IAccountSettings } from 'src/app/core/models/account-status.model';

type FunctionActionContext = 'list' | 'activate' | 'deactivate';

@Component({
    selector: 'app-functions-list',
    templateUrl: './functions-list.component.html',
    styleUrls: ['./functions-list.component.scss']
})
export class FunctionsListComponent implements OnInit, OnDestroy {
    @ViewChild('functionsTableContainer') functionsTableContainer?: ElementRef;

    functions: Function[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    menuItems: MenuItem[] = [];
    currentFunction?: Function;
    accountSettings: IAccountSettings;
    activateFunctionDialog: boolean = false;
    currentFunctionForActivation?: Function;
    logoDialogVisible: boolean = false;
    currentFunctionForLogo?: Function;
    activationControls: Record<number, FormControl<boolean>> = {};

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
        this.loadFunctions();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadFunctions(forceReload: boolean = false): void {
        if (this.settingsConfigurationsService.isLoadingSubject.value && !forceReload) {
            return;
        }

        const isRegional = this.accountSettings?.Language !== 'English';
        this.tableLoadingSpinner = true;

        const sub = this.settingsConfigurationsService.getFunctionsList().subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                // Parse functions list
                this.functions = this.settingsConfigurationsService.parseFunctionsList(response, isRegional);
                this.buildActivationControls();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    buildActivationControls(): void {
        this.activationControls = {};
        this.functions.forEach((functionItem) => {
            this.activationControls[functionItem.id] = new FormControl<boolean>(
                functionItem.isActive ?? true,
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
            if (this.functionsTableContainer) {
                this.functionsTableContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);
    }

    edit(functionItem: Function): void {
        if (functionItem.id) {
            this.router.navigate(['/company-administration/settings-configurations/functions', functionItem.id, 'edit']);
        }
    }

    viewDetails(functionItem: Function): void {
        if (functionItem.id) {
            this.router.navigate(['/company-administration/settings-configurations/functions', functionItem.id]);
        }
    }

    openMenu(menuRef: any, functionItem: Function, event: Event): void {
        this.currentFunction = functionItem;
        menuRef.toggle(event);
    }

    onStatusToggle(functionItem: Function): void {
        this.currentFunctionForActivation = functionItem;
        this.activateFunctionDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activateFunctionDialog = false;
        if (this.currentFunctionForActivation) {
            const control = this.activationControls[this.currentFunctionForActivation.id];
            if (control) {
                control.setValue(this.currentFunctionForActivation.isActive ?? true, { emitEvent: false });
            }
        }
        this.currentFunctionForActivation = undefined;
    }

    activation(value: boolean): void {
        if (!this.currentFunctionForActivation) {
            return;
        }

        const functionItem = this.currentFunctionForActivation;
        const control = this.activationControls[functionItem.id];
        if (!control) {
            return;
        }

        control.disable();
        const action = value ? 'activate' : 'deactivate';
        const apiCall = value
            ? this.settingsConfigurationsService.activateFunction(functionItem.id)
            : this.settingsConfigurationsService.deactivateFunction(functionItem.id);

        const sub = apiCall.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(action, response);
                    control.setValue(!value, { emitEvent: false });
                    this.activateFunctionDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Function "${functionItem.name}" ${value ? 'activated' : 'deactivated'} successfully.`,
                    life: 3000
                });
                functionItem.isActive = value;
                this.activateFunctionDialog = false;
                this.loadFunctions(true);
            },
            complete: () => {
                control.enable();
                this.currentFunctionForActivation = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    openLogoDialog(functionItem: Function): void {
        this.currentFunctionForLogo = functionItem;
        this.logoDialogVisible = true;
    }

    onLogoDialogClose(): void {
        this.logoDialogVisible = false;
        this.currentFunctionForLogo = undefined;
    }

    onLogoUpdated(): void {
        this.loadFunctions(true);
    }

    navigateToNew(): void {
        this.router.navigate(['/company-administration/settings-configurations/functions/new']);
    }

    private configureMenuItems(): void {
        this.menuItems = [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => this.currentFunction && this.viewDetails(this.currentFunction)
            },
            {
                label: 'Edit',
                icon: 'pi pi-pencil',
                command: () => this.currentFunction && this.edit(this.currentFunction)
            },
            {
                label: 'Manage Logo',
                icon: 'pi pi-image',
                command: () => this.currentFunction && this.openLogoDialog(this.currentFunction)
            },
        ];
    }

    private handleBusinessError(context: FunctionActionContext, response: any): void | null {
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
        // Get_Functions_List (705) has no specific error codes
        return null;
    }

    private getActivationErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11400':
                return 'Invalid Function ID';
            case 'ERP11406':
                return 'Function already Active';
            case 'ERP11407':
                return 'Function already Inactive';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }
}
