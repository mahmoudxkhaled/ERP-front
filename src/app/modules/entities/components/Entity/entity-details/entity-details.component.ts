import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings, IEntityDetails } from 'src/app/core/models/IAccountStatusResponse';
import { FileUpload } from 'primeng/fileupload';
import { EntityLogoService } from 'src/app/core/Services/entity-logo.service';


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
    loadingLogo: boolean = false;
    activeTabIndex: number = 0;

    // Entity Details
    entityDetails: any = null;
    entityLogo: string = 'assets/media/upload-photo.jpg';
    hasLogo: boolean = false;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    // Edit entity dialog
    editEntityDialogVisible: boolean = false;

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

    /**
     * Load all required data in parallel
     */
    loadAllData(): void {
        this.loading = true;
        this.loadingDetails = true;
        this.loadingLogo = true;

        // Load entity details
        const sub = this.entitiesService.getEntityDetails(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }
                this.entityDetails = response?.message || {};
                console.log('entityDetails', this.entityDetails);
                this.loadingDetails = false;
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);

        // Load optional logo separately
        this.loadLogo();
    }

    /**
     * Load entity logo
     */
    loadLogo(): void {
        const sub = this.entitiesService.getEntityLogo(this.entityId).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message) {
                    const logoData = response.message;
                    console.log('logoData', logoData);
                    // Response structure: { Image_Format: string, Image: string (base64) }
                    if (logoData?.Image && logoData.Image.trim() !== '') {
                        // Extract image format (default to png if not provided)
                        const imageFormat = logoData.Image_Format || 'png';
                        // Build data URL with correct format
                        this.entityLogo = `data:image/${imageFormat.toLowerCase()};base64,${logoData.Image}`;
                        this.hasLogo = true;

                        // Extract base64 string (without data URL prefix) for localStorage
                        const base64String = logoData.Image;

                        // Update Entity_Details in localStorage with the logo
                        const entityDetails = this.localStorageService.getEntityDetails() as IEntityDetails;
                        if (entityDetails) {
                            entityDetails.Logo = base64String;
                            this.localStorageService.setItem('Entity_Details', entityDetails);
                        }

                        // Emit logo change through service to notify topbar
                        this.entityLogoService.updateLogo(base64String);
                    } else {
                        // No logo available, use placeholder
                        this.entityLogo = 'assets/media/upload-photo.jpg';
                        this.hasLogo = false;

                        // Clear logo from localStorage
                        const entityDetails = this.localStorageService.getEntityDetails() as IEntityDetails;
                        if (entityDetails) {
                            entityDetails.Logo = '';
                            this.localStorageService.setItem('Entity_Details', entityDetails);
                        }

                        // Emit null to notify topbar that logo was removed
                        this.entityLogoService.updateLogo(null);
                    }
                } else {
                    // No logo available, use placeholder
                    this.entityLogo = 'assets/media/upload-photo.jpg';
                    this.hasLogo = false;

                    // Clear logo from localStorage
                    const entityDetails = this.localStorageService.getEntityDetails() as IEntityDetails;
                    if (entityDetails) {
                        entityDetails.Logo = '';
                        this.localStorageService.setItem('Entity_Details', entityDetails);
                    }

                    // Emit null to notify topbar that logo was removed
                    this.entityLogoService.updateLogo(null);
                }
                this.loadingLogo = false;
            },
            error: () => {
                // Logo is optional, so we don't show error - use placeholder
                this.entityLogo = 'assets/media/upload-photo.jpg';
                this.hasLogo = false;
                this.loadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
    }



    /**
     * Get entity name (with regional support)
     */
    getEntityName(): string {
        if (!this.entityDetails) return '';
        return this.isRegional
            ? (this.entityDetails.Name_Regional || this.entityDetails.name_Regional || this.entityDetails.name || this.entityDetails.Name || '')
            : (this.entityDetails.Name || this.entityDetails.name || '');
    }

    /**
     * Get entity description (with regional support)
     */
    getEntityDescription(): string {
        if (!this.entityDetails) return '';
        return this.isRegional
            ? (this.entityDetails.Description_Regional || this.entityDetails.description_Regional || this.entityDetails.description || this.entityDetails.Description || '')
            : (this.entityDetails.Description || this.entityDetails.description || '');
    }

    /**
     * Get entity code with null safety
     */
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
        this.editEntityDialogVisible = true;
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

        // Convert byte array to base64 string
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

        // Trigger the file uploader
        this.logoUploader?.choose();
    }

    /**
     * Support keyboard users when focusing the logo area
     */
    onLogoAreaKeydown(event: KeyboardEvent | Event): void {
        event.preventDefault();
        this.onLogoAreaClick();
    }


    /**
     * Remove entity logo
     */
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

                // Use placeholder after removal
                this.entityLogo = 'assets/media/upload-photo.jpg';
                this.hasLogo = false;

                // Clear logo from localStorage
                const entityDetails = this.localStorageService.getEntityDetails() as IEntityDetails;
                if (entityDetails) {
                    entityDetails.Logo = '';
                    this.localStorageService.setItem('Entity_Details', entityDetails);
                }

                // Emit null to notify topbar that logo was removed
                this.entityLogoService.updateLogo(null);

                this.loadingLogo = false;
            },
        });

        this.subscriptions.push(sub);
    }


    /**
     * Navigate back to entities list
     */
    navigateBack(): void {
        this.router.navigate(['/company-administration/entities/list']);
    }

    /**
     * Handle business errors from API responses
     */
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


    /**
     * Get user-friendly error message based on error code
     */
    private getErrorMessage(context: string, code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11277':
                return 'Invalid Account ID (issued if the Account ID does not exist in the database, or if an entity administrator tries to assign an account outside his entity tree)';
            case 'ERP11278':
                return 'Invalid action. The Entity Admin account must be assigned directly to the entity (i.e. the Account\'s Entity_ID must be equal to the Entity_ID)';
            // Assign_Entity_Logo error codes
            case 'ERP11281':
                return 'Unknown image file format';
            case 'ERP11282':
                return 'Empty contents for Image file';
            // Delete_Entity_Admin error code
            case 'ERP11279':
                return 'Invalid Account ID. Provided ID is not part of the Entity\'s admins';
            default:
                return null;
        }
    }



}



