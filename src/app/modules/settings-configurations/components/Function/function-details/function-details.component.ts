import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { SettingsConfigurationsService } from '../../../services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { FileUpload } from 'primeng/fileupload';
import { Function } from '../../../models/settings-configurations.model';

@Component({
    selector: 'app-function-details',
    templateUrl: './function-details.component.html',
    styleUrls: ['./function-details.component.scss']
})
export class FunctionDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('logoUploader') logoUploader?: FileUpload;

    functionId: number = 0;
    loading: boolean = false;
    loadingDetails: boolean = false;
    loadingLogo: boolean = false;
    activeTabIndex: number = 0;

    functionDetails: Function | null = null;
    functionLogo: string = 'assets/media/upload-photo.jpg';
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
        this.functionId = idParam ? Number(idParam) : 0;
        if (!this.functionId || this.functionId === 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid function ID.'
            });
            this.router.navigate(['/company-administration/settings-configurations/functions/list']);
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

        const sub = this.settingsConfigurationsService.getFunctionDetails(this.functionId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

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

    loadLogo(): void {
        const sub = this.settingsConfigurationsService.getFunctionLogo(this.functionId).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message) {
                    const logoData = response.message;
                    if (logoData?.Logo_Image && logoData.Logo_Image.trim() !== '') {
                        const imageFormat = logoData.Image_Format || 'png';
                        this.functionLogo = `data:image/${imageFormat.toLowerCase()};base64,${logoData.Logo_Image}`;
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
        this.functionLogo = 'assets/media/upload-photo.jpg';
        this.hasLogo = false;
    }

    navigateBack(): void {
        this.router.navigate(['/company-administration/settings-configurations/functions/list']);
    }

    editFunction(): void {
        this.router.navigate(['/company-administration/settings-configurations/functions', this.functionId, 'edit']);
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

    activateFunction(): void {
        if (!this.functionDetails) {
            return;
        }

        this.loading = true;
        const sub = this.settingsConfigurationsService.activateFunction(this.functionId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Function activated successfully.'
                });
                this.loadAllData();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    deactivateFunction(): void {
        if (!this.functionDetails) {
            return;
        }

        this.loading = true;
        const sub = this.settingsConfigurationsService.deactivateFunction(this.functionId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Function deactivated successfully.'
                });
                this.loadAllData();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    getStatusLabel(): string {
        if (!this.functionDetails) return 'Unknown';
        return this.functionDetails.isActive ? 'Active' : 'Inactive';
    }

    getStatusSeverity(): 'success' | 'danger' {
        if (!this.functionDetails) return 'danger';
        return this.functionDetails.isActive ? 'success' : 'danger';
    }

    private handleBusinessError(response: any): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11400':
                detail = 'Invalid Function ID';
                break;
            case 'ERP11406':
                detail = 'Function already Active';
                break;
            case 'ERP11407':
                detail = 'Function already Inactive';
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
