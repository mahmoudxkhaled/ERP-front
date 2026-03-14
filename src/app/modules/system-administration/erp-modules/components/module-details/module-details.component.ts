import { Component, OnDestroy, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { SettingsConfigurationsService } from 'src/app/modules/system-administration/settings-configurations.service';
import { Function, Module } from '../../../erp-functions/models/settings-configurations.model';

@Component({
    selector: 'app-module-details',
    templateUrl: './module-details.component.html',
    styleUrls: ['./module-details.component.scss']
})
export class ModuleDetailsComponent implements OnInit, OnChanges, OnDestroy {
    @Input() moduleIdInput: number | null = null;
    @Input() dialogMode: boolean = false;
    @Output() closed = new EventEmitter<void>();
    @Output() editRequested = new EventEmitter<void>();

    private _routeId: number = 0;
    get moduleId(): number {
        return this.dialogMode ? (this.moduleIdInput ?? 0) : this._routeId;
    }
    loading: boolean = false;
    loadingDetails: boolean = false;

    moduleDetails: Module | null = null;
    functionDetails: Function | null = null;
    activationControl: FormControl<boolean> = new FormControl<boolean>(false, { nonNullable: true });
    activateModuleDialog: boolean = false;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private settingsConfigurationsService: SettingsConfigurationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        if (this.dialogMode) {
            if (!this.moduleId || this.moduleId === 0) {
                this.closed.emit();
                return;
            }
            this.loadAllData();
            return;
        }
        const idParam = this.route.snapshot.paramMap.get('id');
        this._routeId = idParam ? Number(idParam) : 0;
        if (!this.moduleId || this.moduleId === 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid module ID.'
            });
            this.router.navigate(['/system-administration/erp-modules/list']);
            return;
        }
        this.loadAllData();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.dialogMode && changes['moduleIdInput'] && this.moduleId > 0) {
            this.loadAllData();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadAllData(): void {
        this.loading = true;
        this.loadingDetails = true;

        const options = this.dialogMode ? { silent: true } : undefined;
        const sub = this.settingsConfigurationsService.getModuleDetails(this.moduleId, options).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                const moduleData = response?.message || {};
                const isActive = moduleData.Is_Active ?? true;
                this.moduleDetails = {
                    id: moduleData.Module_ID || 0,
                    functionId: moduleData.Function_ID || 0,
                    code: moduleData.Code || '',
                    name: this.isRegional ? (moduleData.Name_Regional || moduleData.Name || '') : (moduleData.Name || ''),
                    nameRegional: moduleData.Name_Regional || '',
                    defaultOrder: moduleData.Default_Order,
                    url: moduleData.URL || '',
                    isActive: isActive
                };
                this.activationControl.setValue(isActive, { emitEvent: false });

                if (this.moduleDetails.functionId) {
                    this.loadFunctionDetails(this.moduleDetails.functionId);
                }

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

    loadFunctionDetails(functionId: number): void {
        const options = this.dialogMode ? { silent: true } : undefined;
        const sub = this.settingsConfigurationsService.getFunctionDetails(functionId, options).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const functionData = response?.message || {};
                    this.functionDetails = {
                        id: functionData.Function_ID || 0,
                        code: functionData.Code || '',
                        name: this.isRegional ? (functionData.Name_Regional || functionData.Name || '') : (functionData.Name || ''),
                        nameRegional: functionData.Name_Regional || '',
                        defaultOrder: functionData.Default_Order,
                        url: functionData.URL || '',
                        isActive: functionData.Is_Active ?? true
                    };
                }
            }
        });
        this.subscriptions.push(sub);
    }

    navigateBack(): void {
        if (this.dialogMode) {
            this.closed.emit();
            return;
        }
        this.router.navigate(['/system-administration/erp-modules/list']);
    }

    editModule(): void {
        if (this.dialogMode) {
            this.editRequested.emit();
            return;
        }
        this.router.navigate(['/system-administration/erp-modules', this.moduleId, 'edit']);
    }

    onStatusToggle(): void {
        this.activateModuleDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activateModuleDialog = false;
        if (this.moduleDetails) {
            this.activationControl.setValue(this.moduleDetails.isActive ?? true, { emitEvent: false });
        }
    }

    activation(value: boolean): void {
        if (!this.moduleDetails) {
            return;
        }

        this.activationControl.disable();
        const action = value ? 'activate' : 'deactivate';
        const apiCall = value
            ? this.settingsConfigurationsService.activateModule(this.moduleId)
            : this.settingsConfigurationsService.deactivateModule(this.moduleId);

        const sub = apiCall.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    this.activationControl.setValue(!value, { emitEvent: false });
                    this.activateModuleDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Module ${value ? 'activated' : 'deactivated'} successfully.`
                });
                if (this.moduleDetails) {
                    this.moduleDetails.isActive = value;
                }
                this.activateModuleDialog = false;
                this.loadAllData();
            },
            complete: () => {
                this.activationControl.enable();
            }
        });

        this.subscriptions.push(sub);
    }

    activateModule(): void {
        this.activation(true);
    }

    deactivateModule(): void {
        this.activation(false);
    }

    getStatusLabel(): string {
        if (!this.moduleDetails) return 'Unknown';
        return this.moduleDetails.isActive ? 'Active' : 'Inactive';
    }

    getStatusSeverity(): 'success' | 'danger' {
        if (!this.moduleDetails) return 'danger';
        return this.moduleDetails.isActive ? 'success' : 'danger';
    }

    private handleBusinessError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11410':
                detail = 'Invalid Module ID';
                break;
            case 'ERP11411':
                detail = 'Module already Active';
                break;
            case 'ERP11412':
                detail = 'Module already Inactive';
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
