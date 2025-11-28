import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';
import { FileUpload } from 'primeng/fileupload';


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
        private localStorageService: LocalStorageService
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
                } else {
                    this.entityDetails = response?.message || {};
                    console.log('entityDetails', this.entityDetails);
                }
                this.loadingDetails = false;
                this.loading = false;
            },
            error: () => {
                this.handleUnexpectedError();
                this.loading = false;
                this.loadingDetails = false;
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
                        // Convert base64 to byte array
                        const binaryString = atob(logoData.Image);
                        const byteArray = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            byteArray[i] = binaryString.charCodeAt(i);
                        }
                        // Extract image format (default to png if not provided)
                        const imageFormat = logoData.Image_Format || 'png';
                        // Build data URL with correct format
                        this.entityLogo = `data:image/${imageFormat.toLowerCase()};base64,${logoData.Image}`;
                        this.hasLogo = true;
                    } else {
                        // No logo available, use placeholder
                        this.entityLogo = 'assets/media/upload-photo.jpg';
                        this.hasLogo = false;
                    }
                } else {
                    // No logo available, use placeholder
                    this.entityLogo = 'assets/media/upload-photo.jpg';
                    this.hasLogo = false;
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

    /**
     * Determine if the entity has a parent entity
     */
    hasParentEntity(): boolean {
        const parentId = this.localStorageService.getParentEntityId();
        if (parentId === undefined || parentId === null) {
            return false;
        }

        const normalized = String(parentId).trim();
        return normalized !== '' && normalized !== '0';
    }

    /**
     * Get a display label for the parent entity
     */
    getParentEntityLabel(): string {
        const parentId = this.entityDetails.Parent_Entity_ID;
        return parentId ? ` ${parentId}` : 'Root Entity';
    }

    /**
     * Get entity status label
     */
    getStatusLabel(): string {
        if (!this.entityDetails) return 'Unknown';
        const isActive = this.entityDetails.Is_Active !== undefined
            ? this.entityDetails.Is_Active
            : (this.entityDetails.is_Active || this.entityDetails.active || false);
        return isActive ? 'Active' : 'Inactive';
    }

    /**
     * Get entity status severity
     */
    getStatusSeverity(): 'success' | 'danger' {
        if (!this.entityDetails) return 'danger';
        const isActive = this.entityDetails.Is_Active !== undefined
            ? this.entityDetails.Is_Active
            : (this.entityDetails.is_Active || this.entityDetails.active || false);
        return isActive ? 'success' : 'danger';
    }

    /**
     * Get entity type label
     */
    getTypeLabel(): string {
        if (!this.entityDetails) return 'Organization';
        const isPersonal = this.entityDetails.Is_Personal !== undefined
            ? this.entityDetails.Is_Personal
            : (this.entityDetails.is_Personal || this.entityDetails.isPersonal || false);
        return isPersonal ? 'Personal' : 'Organization';
    }

    /**
     * Get entity type severity
     */
    getTypeSeverity(): 'warning' | 'info' {
        if (!this.entityDetails) return 'info';
        const isPersonal = this.entityDetails.Is_Personal !== undefined
            ? this.entityDetails.Is_Personal
            : (this.entityDetails.is_Personal || this.entityDetails.isPersonal || false);
        return isPersonal ? 'warning' : 'info';
    }

    /**
     * Open edit entity dialog
     */
    openEditEntityDialog(): void {
        this.editEntityDialogVisible = true;
    }

    /**
     * Reload entity details after dialog save
     */
    handleEntityUpdated(): void {
        this.loadAllData();
    }


    /**
     * Handle file upload for logo
     */
    onLogoUpload(event: any): void {
        const file = event.files?.[0];
        if (!file) {
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid File Type',
                detail: 'Please select an image file (JPG, PNG, JPEG, WEBP).',
                life: 5000
            });
            return;
        }

        // File size constants
        const RECOMMENDED_FILE_SIZE = 200 * 1024; // 200KB recommended
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const recommendedSizeInKB = (RECOMMENDED_FILE_SIZE / 1024).toFixed(0);

        // Warn if file is larger than recommended but still allow
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

        // Read file as ArrayBuffer to get actual bytes
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const byteArray = new Uint8Array(arrayBuffer);
            const imageFormat = file.type.split('/')[1] || 'png';

            // Send byte array directly - packRequest will handle it
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

    /**
     * Upload logo to server
     */
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
            error: () => {
                this.handleUnexpectedError();
                this.loadingLogo = false;
            },
            complete: () => this.loadingLogo = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Allow clicking the logo area to trigger the file picker
     * Works both when no logo exists and when logo exists (to upload another one)
     */
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
                this.loadingLogo = false;
            },
            error: () => {
                this.handleUnexpectedError();
                this.loadingLogo = false;
            }
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
    private handleBusinessError(context: string, response: any): void {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(context, code);

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
    }


    /**
     * Get user-friendly error message based on error code
     */
    private getErrorMessage(context: string, code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11277':
                return 'Invalid account selected.';
            case 'ERP11278':
                return 'Account does not belong to this entity.';
            // Update_Entity_Contacts error codes
            case 'ERP11271':
                return 'Invalid Address format.';
            case 'ERP11272':
                return 'Invalid Phone number format.';
            case 'ERP11273':
                return 'Invalid Fax number format.';
            case 'ERP11274':
                return 'Invalid Email format.';
            // Assign_Entity_Logo error codes
            case 'ERP11281':
                return 'Unknown image format.';
            case 'ERP11282':
                return 'Empty image contents.';
            // Delete_Entity_Admin error code
            case 'ERP11279':
                return 'Account ID is not an admin of this entity.';
            default:
                if (context === 'details' || context === 'contacts' || context === 'admins') {
                    return code || 'Failed to load entity information.';
                }
                return code || 'An error occurred. Please try again.';
        }
    }


    /**
     * Handle unexpected errors
     */


    private handleUnexpectedError(): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An unexpected error occurred. Please try again.'
        });
    }
}



