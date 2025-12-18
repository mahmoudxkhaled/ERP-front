import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { FileUpload } from 'primeng/fileupload';
import { SettingsConfigurationsService } from '../../../erp-functions/services/settings-configurations.service';
import { Function, Module } from 'src/app/modules/system-administration/settings-configurations.model';

@Component({
    selector: 'app-module-details',
    templateUrl: './module-details.component.html',
    styleUrls: ['./module-details.component.scss']
})
export class ModuleDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('logoUploader') logoUploader?: FileUpload;

    moduleId: number = 0;
    loading: boolean = false;
    loadingDetails: boolean = false;
    loadingLogo: boolean = false;
    uploadingLogo: boolean = false;
    activeTabIndex: number = 0;

    moduleDetails: Module | null = null;
    functionDetails: Function | null = null;
    moduleLogo: string = 'assets/media/upload-photo.jpg';
    hasLogo: boolean = false;
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
        const idParam = this.route.snapshot.paramMap.get('id');
        this.moduleId = idParam ? Number(idParam) : 0;
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
                    if (logoData?.Image && logoData.Image.trim() !== '') {
                        const imageFormat = logoData.Image_Format || 'png';
                        this.moduleLogo = `data:image/${imageFormat.toLowerCase()};base64,${logoData.Image}`;
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
        this.router.navigate(['/system-administration/erp-modules/list']);
    }

    editModule(): void {
        this.router.navigate(['/system-administration/erp-modules', this.moduleId, 'edit']);
    }

    onLogoUpload(event: any): void {
        const file = event.files?.[0];
        if (!file) {
            return;
        }

        // Validate file type by MIME type
        if (!file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid File Type',
                detail: 'Please select an image file (JPG, PNG, JPEG, WEBP).',
                life: 5000
            });
            this.logoUploader?.clear();
            return;
        }

        const RECOMMENDED_FILE_SIZE = 200 * 1024;
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const recommendedSizeInKB = (RECOMMENDED_FILE_SIZE / 1024).toFixed(0);

        if (file.size > RECOMMENDED_FILE_SIZE) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Large File Size',
                detail: `File size (${fileSizeInMB}MB) is larger than recommended (${recommendedSizeInKB}KB). Upload may take longer.`,
                life: 5000
            });
            this.uploadingLogo = false;
            this.logoUploader?.clear();
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const byteArray = new Uint8Array(arrayBuffer);
            // Extract format from MIME type
            const imageFormat = file.type.split('/')[1] || 'png';

            this.uploadLogo(byteArray, imageFormat);
        };
        reader.onerror = () => {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to read file. Please try again.',
                life: 5000
            });
            this.uploadingLogo = false;
        };
        reader.readAsArrayBuffer(file);
    }

    uploadLogo(byteArray: Uint8Array, imageFormat: string): void {
        this.uploadingLogo = true;

        const base64String = btoa(
            String.fromCharCode.apply(null, Array.from(byteArray))
        );

        const sub = this.settingsConfigurationsService.setModuleLogo(
            this.moduleId,
            imageFormat,
            base64String
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleLogoUploadError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Logo uploaded successfully.',
                    life: 3000
                });

                this.loadLogo();
            },
            complete: () => {
                this.uploadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    removeLogo(): void {
        if (!this.moduleId || this.moduleId === 0) {
            return;
        }

        this.uploadingLogo = true;

        // Send empty string to remove the logo
        const sub = this.settingsConfigurationsService.setModuleLogo(
            this.moduleId,
            'png',
            ''
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    // Check if error is ERP11409 (empty contents) - this is expected for removal
                    const errorCode = String(response?.message || '');
                    if (errorCode === 'ERP11409') {
                        // API accepted empty string as removal
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Logo removed successfully.',
                            life: 3000
                        });
                        this.loadLogo();
                    } else {
                        this.handleLogoUploadError(response);
                    }
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Logo removed successfully.',
                    life: 3000
                });

                this.loadLogo();
            },
            complete: () => {
                this.uploadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    private handleLogoUploadError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11410':
                detail = 'Invalid Module ID';
                break;
            case 'ERP11408':
                detail = 'Unknown image file format';
                break;
            case 'ERP11409':
                detail = 'Empty contents for logo file';
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
        this.uploadingLogo = false;
        return null;
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
