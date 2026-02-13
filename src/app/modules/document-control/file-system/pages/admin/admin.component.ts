import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VirtualDrivesService } from 'src/app/modules/document-control/file-system/services/virtual-drives.service';
import { VirtualDrivesFilters } from 'src/app/modules/document-control/file-system/models/virtual-drive.model';

export interface LicenseRow {
    productKey: string;
    count: number;
    expiry: string;
}

export interface VirtualDriveRow {
    id: number;
    name: string;
    licenseId: number;
    capacity: number;
    active: boolean;
}

@Component({
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
    capacityUsedPercent = 65;
    capacityUsedLabel = '';

    // Loading state for the virtual drives table
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;

    entityFilterOptions = [
        { label: 'Account', value: -1 },
        { label: 'Entity', value: 1 },
        { label: 'Both', value: 0 }
    ];
    entityFilter = -1;
    licenseIdFilter = 0;
    activeOnlyFilter = true;

    createDriveDialogVisible = false;
    renameDriveDialogVisible = false;
    updateCapacityDialogVisible = false;
    syncUnderDevDialogVisible = false;
    driveDetailsDialogVisible = false;

    newDriveName = '';
    newDriveLicenseId = 3;
    newDriveCapacity = 100;
    renameDriveName = '';
    updateCapacityValue = 100;
    selectedDriveForRename: VirtualDriveRow | null = null;
    selectedDriveForCapacity: VirtualDriveRow | null = null;
    selectedDriveForDetails: VirtualDriveRow | null = null;

    licenses: LicenseRow[] = [
        { productKey: 'fileSystem.admin.productEnterprise', count: 100, expiry: '2024-12-31' },
        { productKey: 'fileSystem.admin.productStoragePack', count: 50, expiry: '2024-06-30' }
    ];

    virtualDrives: VirtualDriveRow[] = [];

    constructor(
        private translate: TranslationService,
        private messageService: MessageService,
        private virtualDrivesService: VirtualDrivesService
    ) {
        this.isLoading$ = this.virtualDrivesService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.capacityUsedLabel = this.translate.getInstant('fileSystem.systemAdmin.capacityUsedLabel');
        this.loadVirtualDrives();
    }

    getProductLabel(row: LicenseRow): string {
        return this.translate.getInstant(row.productKey);
    }

    getDriveName(row: VirtualDriveRow): string {
        // For now we use the name as-is; later we can add translation if needed.
        return row.name;
    }

    /**
     * When loading and the drives list is empty, return placeholder rows
     * so the table can show skeleton cells. This mirrors the Entities list style.
     */
    get virtualDrivesTableValue(): VirtualDriveRow[] {
        if (this.tableLoadingSpinner && this.virtualDrives.length === 0) {
            return Array(5).fill(null).map(() => ({
                id: 0,
                name: '',
                licenseId: 0,
                capacity: 0,
                active: false
            }));
        }
        return this.virtualDrives;
    }

    /**
     * Build filters object for List_Drives API from current UI state.
     */
    private getCurrentFilters(): VirtualDrivesFilters {
        return {
            entityFilter: this.entityFilter,
            licenseId: this.licenseIdFilter,
            activeOnly: this.activeOnlyFilter
        };
    }

    /**
     * Load virtual drives from backend using List_Drives API.
     */
    loadVirtualDrives(): void {
        const filters = this.getCurrentFilters();
        this.tableLoadingSpinner = true;

        this.virtualDrivesService.listDrives(filters).subscribe({
            next: (response: any) => {
                console.log('loadVirtualDrives', response);
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                // Response.message is expected to hold drives collection.
                // We keep the mapping simple and defensive.
                const drivesRaw = response.message?.Drives || response.message || [];

                const drivesArray: any[] = Array.isArray(drivesRaw)
                    ? drivesRaw
                    : Object.values(drivesRaw);

                this.virtualDrives = drivesArray.map((item: any) => {
                    return {
                        id: Number(item?.Drive_ID ?? 0),
                        name: String(item?.Drive_Name ?? ''),
                        licenseId: Number(item?.License_ID ?? 0),
                        capacity: Number(item?.Capacity ?? 0),
                        active: Boolean(item?.Is_Active)
                    } as VirtualDriveRow;
                });
            },
            complete: () => {
                this.tableLoadingSpinner = false;
            }
        });
    }

    showCreateDriveDialog(): void {
        this.newDriveName = '';
        this.newDriveLicenseId = 3;
        this.newDriveCapacity = 100;
        this.createDriveDialogVisible = true;
    }

    hideCreateDriveDialog(): void {
        this.createDriveDialogVisible = false;
    }

    onCreateDriveConfirm(): void {
        this.hideCreateDriveDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.admin.createDriveSuccess')
        });
    }

    showRenameDriveDialog(row: VirtualDriveRow): void {
        this.selectedDriveForRename = row;
        this.renameDriveName = this.getDriveName(row);
        this.renameDriveDialogVisible = true;
    }

    hideRenameDriveDialog(): void {
        this.renameDriveDialogVisible = false;
        this.selectedDriveForRename = null;
    }

    onRenameDriveSave(): void {
        this.hideRenameDriveDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.admin.renameDriveSuccess')
        });
    }

    showUpdateCapacityDialog(row: VirtualDriveRow): void {
        this.selectedDriveForCapacity = row;
        this.updateCapacityValue = 100;
        this.updateCapacityDialogVisible = true;
    }

    hideUpdateCapacityDialog(): void {
        this.updateCapacityDialogVisible = false;
        this.selectedDriveForCapacity = null;
    }

    onUpdateCapacitySave(): void {
        this.hideUpdateCapacityDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.admin.updateCapacitySuccess')
        });
    }

    onActivateDrive(row: VirtualDriveRow): void {
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.admin.activateDriveSuccess')
        });
    }

    onDeactivateDrive(row: VirtualDriveRow): void {
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.admin.deactivateDriveSuccess')
        });
    }

    showSyncUnderDevDialog(): void {
        this.syncUnderDevDialogVisible = true;
    }

    hideSyncUnderDevDialog(): void {
        this.syncUnderDevDialogVisible = false;
    }

    showDriveDetailsDialog(row: VirtualDriveRow): void {
        this.selectedDriveForDetails = row;
        this.driveDetailsDialogVisible = true;
    }

    hideDriveDetailsDialog(): void {
        this.driveDetailsDialogVisible = false;
        this.selectedDriveForDetails = null;
    }

    /**
     * Handle business error codes returned from Virtual Drives APIs.
     * This follows the same simple pattern used in EntitiesListComponent.
     */
    private handleBusinessError(context: 'list', response: any): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            default:
                detail = '';
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }

        if (context === 'list') {
            this.tableLoadingSpinner = false;
        }
    }

    /**
     * Map Virtual Drives list related error codes to a user-friendly message.
     * We start with common storage errors and can extend if backend adds more.
     */
    private getListErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP12000':
                return 'Access denied while listing virtual drives.';
            case 'ERP12005':
                return 'Missing storage access token.';
            case 'ERP12006':
                return 'Invalid storage access token.';
            case 'ERP12012':
                return 'File server database error occurred while listing drives.';
            case 'ERP12248':
                return 'Invalid entity filter for listing drives.';
            case 'ERP12290':
                return 'Invalid drive ID.';
            case 'ERP12292':
                return 'Access denied to the drives of this owner ID.';
            default:
                return null;
        }
    }
}
