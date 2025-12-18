import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../../services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings, IEntityDetails } from 'src/app/core/models/account-status.model';
import { FileUpload } from 'primeng/fileupload';
import { EntityLogoService } from 'src/app/core/services/entity-logo.service';


@Component({
    selector: 'app-entity-details',
    templateUrl: './entity-details.component.html',
    styleUrls: ['./entity-details.component.scss']
})
export class EntityDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('logoUploader') logoUploader?: FileUpload;

    entityId: string = '';
    loading: boolean = false;
    loadingDetails: boolean = false;
    loadingLogo: boolean = false
    activeTabIndex: number = 0;

    entityDetails: any = null;
    entityLogo: string = 'assets/media/upload-photo.jpg';
    hasLogo: boolean = false;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private entityLogoService: EntityLogoService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.entityId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.entityId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid entity ID.'
            });
            this.router.navigate(['/company-administration/entities/list']);
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

        const sub = this.entitiesService.getEntityDetails(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }
                this.entityDetails = response?.message || {};
                this.loadingDetails = false;
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
        this.loadLogo();
    }

    loadLogo(): void {
        const sub = this.entitiesService.getEntityLogo(this.entityId).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message) {
                    const logoData = response.message;
                    if (logoData?.Image && logoData.Image.trim() !== '') {
                        const imageFormat = logoData.Image_Format || 'png';
                        this.entityLogo = `data:image/${imageFormat.toLowerCase()};base64,${logoData.Image}`;
                        this.hasLogo = true;

                        const base64String = logoData.Image;
                        const entityDetails = this.localStorageService.getEntityDetails() as IEntityDetails;
                        if (entityDetails) {
                            entityDetails.Logo = base64String;
                            this.localStorageService.setItem('Entity_Details', entityDetails);
                        }

                        this.entityLogoService.updateLogo(base64String);
                    } else {
                        this.setPlaceholderLogo();
                    }
                } else {
                    this.setPlaceholderLogo();
                }
                this.loadingLogo = false;
            },
            error: () => {
                this.entityLogo = 'assets/media/upload-photo.jpg';
                this.hasLogo = false;
                this.loadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    private setPlaceholderLogo(): void {
        this.entityLogo = 'assets/media/upload-photo.jpg';
        this.hasLogo = false;
        const entityDetails = this.localStorageService.getEntityDetails() as IEntityDetails;
        if (entityDetails) {
            entityDetails.Logo = '';
            this.localStorageService.setItem('Entity_Details', entityDetails);
        }
        this.entityLogoService.updateLogo(null);
    }



    getEntityName(): string {
        if (!this.entityDetails) return '';
        return this.isRegional
            ? (this.entityDetails.Name_Regional || this.entityDetails.name_Regional || this.entityDetails.name || this.entityDetails.Name || '')
            : (this.entityDetails.Name || this.entityDetails.name || '');
    }

    getEntityDescription(): string {
        if (!this.entityDetails) return '';
        return this.isRegional
            ? (this.entityDetails.Description_Regional || this.entityDetails.description_Regional || this.entityDetails.description || this.entityDetails.Description || '')
            : (this.entityDetails.Description || this.entityDetails.description || '');
    }

    getEntityCode(): string {
        if (!this.entityDetails) return '';
        return this.entityDetails.Code || this.entityDetails.code || '';
    }


    hasParentEntity(): boolean {
        const parentId = this.localStorageService.getParentEntityId();
        if (parentId === undefined || parentId === null) {
            return false;
        }

        const normalized = String(parentId).trim();
        return normalized !== '' && normalized !== '0';
    }

    getParentEntityLabel(): string {
        const parentId = this.entityDetails.Parent_Entity_ID;
        return parentId ? ` ${parentId}` : 'Root Entity';
    }

    getStatusLabel(): string {
        if (!this.entityDetails) return 'Unknown';
        const isActive = this.entityDetails.Is_Active !== undefined
            ? this.entityDetails.Is_Active
            : (this.entityDetails.is_Active || this.entityDetails.active || false);
        return isActive ? 'Active' : 'Inactive';
    }

    getStatusSeverity(): 'success' | 'danger' {
        if (!this.entityDetails) return 'danger';
        const isActive = this.entityDetails.Is_Active !== undefined
            ? this.entityDetails.Is_Active
            : (this.entityDetails.is_Active || this.entityDetails.active || false);
        return isActive ? 'success' : 'danger';
    }

    getTypeLabel(): string {
        if (!this.entityDetails) return 'Organization';
        const isPersonal = this.entityDetails.Is_Personal !== undefined
            ? this.entityDetails.Is_Personal
            : (this.entityDetails.is_Personal || this.entityDetails.isPersonal || false);
        return isPersonal ? 'Personal' : 'Organization';
    }

    getTypeSeverity(): 'warning' | 'info' {
        if (!this.entityDetails) return 'info';
        const isPersonal = this.entityDetails.Is_Personal !== undefined
            ? this.entityDetails.Is_Personal
            : (this.entityDetails.is_Personal || this.entityDetails.isPersonal || false);
        return isPersonal ? 'warning' : 'info';
    }

    openEditEntityDialog(): void {
        if (this.entityId) {
            this.router.navigate(['/company-administration/entities', this.entityId, 'edit']);
        }
    }

    handleEntityUpdated(): void {
        this.loadAllData();
    }

    onLogoUpload(event: any): void {
        const file = event.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid File Type',
                detail: 'Please select an image file (JPG, PNG, JPEG, WEBP).',
                life: 5000
            });
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
            this.loadingLogo = false;
            this.logoUploader?.clear();
            return;

        }

        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const byteArray = new Uint8Array(arrayBuffer);
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
        };
        reader.readAsArrayBuffer(file);
    }


    uploadLogo(byteArray: Uint8Array, imageFormat: string): void {
        this.loadingLogo = true;

        const base64String = btoa(
            String.fromCharCode.apply(null, Array.from(byteArray))
        );

        const sub = this.entitiesService.assignEntityLogo(
            this.entityId,
            imageFormat,
            base64String
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('uploadLogo', response);
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

            complete: () => this.loadingLogo = false
        });

        this.subscriptions.push(sub);
    }


    onLogoAreaClick(): void {
        if (this.loadingLogo) {
            return;
        }
        this.logoUploader?.choose();
    }

    onLogoAreaKeydown(event: KeyboardEvent | Event): void {
        event.preventDefault();
        this.onLogoAreaClick();
    }


    removeLogo(): void {
        this.loadingLogo = true;
        const sub = this.entitiesService.removeEntityLogo(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('removeLogo', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Logo removed successfully.',
                    life: 3000
                });

                this.setPlaceholderLogo();
                this.loadingLogo = false;
            },
        });

        this.subscriptions.push(sub);
    }

    navigateBack(): void {
        this.router.navigate(['/company-administration/entities/list']);
    }

    getEntityIdAsNumber(): number {
        return Number(this.entityId) || 0;
    }

    private handleBusinessError(context: string, response: any): void | null {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(context, code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        return null
    }


    private getErrorMessage(context: string, code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11277':
                return 'Invalid Account ID (issued if the Account ID does not exist in the database, or if an entity administrator tries to assign an account outside his entity tree)';
            case 'ERP11278':
                return 'Invalid action. The Entity Admin account must be assigned directly to the entity (i.e. the Account\'s Entity_ID must be equal to the Entity_ID)';
            case 'ERP11281':
                return 'Unknown image file format';
            case 'ERP11282':
                return 'Empty contents for Image file';
            case 'ERP11279':
                return 'Invalid Account ID. Provided ID is not part of the Entity\'s admins';
            default:
                return null;
        }
    }



}



