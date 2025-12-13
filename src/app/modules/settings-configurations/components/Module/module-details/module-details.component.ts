import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { SettingsConfigurationsService } from '../../../services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Module, Function } from '../../../models/settings-configurations.model';

@Component({
    selector: 'app-module-details',
    templateUrl: './module-details.component.html',
    styleUrls: ['./module-details.component.scss']
})
export class ModuleDetailsComponent implements OnInit, OnDestroy {
    moduleId: number = 0;
    loading: boolean = false;
    loadingDetails: boolean = false;
    loadingLogo: boolean = false;
    activeTabIndex: number = 0;

    moduleDetails: Module | null = null;
    functionDetails: Function | null = null;
    moduleLogo: string = 'assets/media/upload-photo.jpg';
    hasLogo: boolean = false;
    logoDialogVisible: boolean = false;

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
        const idParam = this.route.snapshot.paramMap.get('id');
        this.moduleId = idParam ? Number(idParam) : 0;
        if (!this.moduleId || this.moduleId === 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid module ID.'
            });
            this.router.navigate(['/company-administration/settings-configurations/modules/list']);
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
        this.loadingLogo = true;

        const sub = this.settingsConfigurationsService.getModuleDetails(this.moduleId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                const moduleData = response?.message || {};
                this.moduleDetails = {
                    id: moduleData.Module_ID || 0,
                    functionId: moduleData.Function_ID || 0,
                    code: moduleData.Code || '',
                    name: this.isRegional ? (moduleData.Name_Regional || moduleData.Name || '') : (moduleData.Name || ''),
                    nameRegional: moduleData.Name_Regional || '',
                    defaultOrder: moduleData.Default_Order,
                    url: moduleData.URL || '',
                    isActive: moduleData.Is_Active ?? true
                };

                // Load function details
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
        this.loadLogo();
    }

    loadFunctionDetails(functionId: number): void {
        const sub = this.settingsConfigurationsService.getFunctionDetails(functionId).subscribe({
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

    loadLogo(): void {
        const sub = this.settingsConfigurationsService.getModuleLogo(this.moduleId).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message) {
                    const logoData = response.message;
                    if (logoData?.Logo_Image && logoData.Logo_Image.trim() !== '') {
                        const imageFormat = logoData.Image_Format || 'png';
                        this.moduleLogo = `data:image/${imageFormat.toLowerCase()};base64,${logoData.Logo_Image}`;
                        this.hasLogo = true;
                    } else {
                        this.setPlaceholderLogo();
                    }
                } else {
                    this.setPlaceholderLogo();
                }
                this.loadingLogo = false;
            },
            error: () => {
                this.setPlaceholderLogo();
                this.loadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    private setPlaceholderLogo(): void {
        this.moduleLogo = 'assets/media/upload-photo.jpg';
        this.hasLogo = false;
    }

    navigateBack(): void {
        this.router.navigate(['/company-administration/settings-configurations/modules/list']);
    }

    editModule(): void {
        this.router.navigate(['/company-administration/settings-configurations/modules', this.moduleId, 'edit']);
    }

    openLogoDialog(): void {
        this.logoDialogVisible = true;
    }

    onLogoDialogClose(): void {
        this.logoDialogVisible = false;
    }

    onLogoUpdated(): void {
        this.loadLogo();
    }

    activateModule(): void {
        if (!this.moduleDetails) {
            return;
        }

        this.loading = true;
        const sub = this.settingsConfigurationsService.activateModule(this.moduleId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Module activated successfully.'
                });
                this.loadAllData();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    deactivateModule(): void {
        if (!this.moduleDetails) {
            return;
        }

        this.loading = true;
        const sub = this.settingsConfigurationsService.deactivateModule(this.moduleId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Module deactivated successfully.'
                });
                this.loadAllData();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    getStatusLabel(): string {
        if (!this.moduleDetails) return 'Unknown';
        return this.moduleDetails.isActive ? 'Active' : 'Inactive';
    }

    getStatusSeverity(): 'success' | 'danger' {
        if (!this.moduleDetails) return 'danger';
        return this.moduleDetails.isActive ? 'success' : 'danger';
    }

    private handleBusinessError(response: any): void {
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
                detail = 'An error occurred while processing the request.';
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
