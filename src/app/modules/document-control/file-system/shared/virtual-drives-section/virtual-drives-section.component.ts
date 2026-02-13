import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VirtualDrivesService } from '../../services/virtual-drives.service';
import { VirtualDrivesFilters } from '../../models/virtual-drive.model';

export interface VirtualDriveRow {
    id: number;
    name: string;
    licenseId: number;
    capacity: number;
    active: boolean;
}

/**
 * Shared component for displaying and managing Virtual Drives.
 * Used by both SSM (System Storage Management) and ESM (Entity Storage Management).
 *
 * Mode 'ssm' shows full filters (entity filter, license ID, active only) and all actions.
 * Mode 'esm' shows entity-owned drives only (simpler view, no entity filter).
 */
@Component({
    selector: 'app-virtual-drives-section',
    templateUrl: './virtual-drives-section.component.html',
    styleUrls: ['./virtual-drives-section.component.scss']
})
export class VirtualDrivesSectionComponent implements OnInit {
    /**
     * Mode determines what filters and actions are available.
     * 'ssm' = System Storage Management (full filters, all actions)
     * 'esm' = Entity Storage Management (entity-owned only, simpler view)
     */
    @Input() mode: 'ssm' | 'esm' = 'ssm';

    // Loading state
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;

    // Filters (SSM mode uses all, ESM mode uses only licenseId and activeOnly)
    entityFilterOptions = [
        { label: 'Account', value: -1 },
        { label: 'Entity', value: 1 },
        { label: 'Both', value: 0 }
    ];
    entityFilter = -1;
    licenseIdFilter = 0;
    activeOnlyFilter = true;

    // Dialog visibility flags
    createDriveDialogVisible = false;
    renameDriveDialogVisible = false;
    updateCapacityDialogVisible = false;
    driveDetailsDialogVisible = false;

    // Form values for dialogs
    newDriveName = '';
    newDriveLicenseId = 3;
    newDriveCapacity = 100;
    renameDriveName = '';
    updateCapacityValue = 100;
    selectedDriveForRename: VirtualDriveRow | null = null;
    selectedDriveForCapacity: VirtualDriveRow | null = null;
    selectedDriveForDetails: VirtualDriveRow | null = null;

    // Data
    virtualDrives: VirtualDriveRow[] = [];

    constructor(
        private translate: TranslationService,
        private messageService: MessageService,
        private virtualDrivesService: VirtualDrivesService
    ) {
        this.isLoading$ = this.virtualDrivesService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        // For ESM mode, set entity filter to 1 (Entity) by default
        if (this.mode === 'esm') {
            this.entityFilter = 1;
        }
        this.loadVirtualDrives();
    }

    /**
     * When loading and the drives list is empty, return placeholder rows
     * so the table can show skeleton cells.
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
     * Whether to show entity filter dropdown (SSM only).
     */
    get showEntityFilter(): boolean {
        return this.mode === 'ssm';
    }

    /**
     * Whether to show create button (both modes, but ESM might be restricted later).
     */
    get showCreateButton(): boolean {
        return true;
    }

    /**
     * Whether to show activate/deactivate buttons (SSM only, per permissions).
     */
    get showActivateDeactivate(): boolean {
        return this.mode === 'ssm';
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
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                // Response.message is expected to hold drives collection.
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

    getDriveName(row: VirtualDriveRow): string {
        return row.name;
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
        if (!this.newDriveName.trim()) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Drive name is required.'
            });
            return;
        }

        this.virtualDrivesService.createDrive(
            this.newDriveName,
            this.newDriveLicenseId,
            this.newDriveCapacity
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('create', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: this.translate.getInstant('fileSystem.admin.createDriveSuccess')
                });
                this.hideCreateDriveDialog();
                this.loadVirtualDrives();
            }
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
        if (!this.selectedDriveForRename || !this.renameDriveName.trim()) {
            return;
        }

        this.virtualDrivesService.renameDrive(
            this.selectedDriveForRename.id,
            this.renameDriveName
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('rename', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: this.translate.getInstant('fileSystem.admin.renameDriveSuccess')
                });
                this.hideRenameDriveDialog();
                this.loadVirtualDrives();
            }
        });
    }

    showUpdateCapacityDialog(row: VirtualDriveRow): void {
        this.selectedDriveForCapacity = row;
        this.updateCapacityValue = row.capacity;
        this.updateCapacityDialogVisible = true;
    }

    hideUpdateCapacityDialog(): void {
        this.updateCapacityDialogVisible = false;
        this.selectedDriveForCapacity = null;
    }

    onUpdateCapacitySave(): void {
        if (!this.selectedDriveForCapacity) {
            return;
        }

        this.virtualDrivesService.updateDriveCapacity(
            this.selectedDriveForCapacity.id,
            this.updateCapacityValue
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('updateCapacity', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: this.translate.getInstant('fileSystem.admin.updateCapacitySuccess')
                });
                this.hideUpdateCapacityDialog();
                this.loadVirtualDrives();
            }
        });
    }

    onActivateDrive(row: VirtualDriveRow): void {
        this.virtualDrivesService.activateDrive(row.id).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('activate', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: this.translate.getInstant('fileSystem.admin.activateDriveSuccess')
                });
                this.loadVirtualDrives();
            }
        });
    }

    onDeactivateDrive(row: VirtualDriveRow): void {
        this.virtualDrivesService.deactivateDrive(row.id).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('deactivate', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: this.translate.getInstant('fileSystem.admin.deactivateDriveSuccess')
                });
                this.loadVirtualDrives();
            }
        });
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
     */
    private handleBusinessError(context: 'list' | 'create' | 'rename' | 'updateCapacity' | 'activate' | 'deactivate', response: any): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'create':
                detail = this.getCreateErrorMessage(code) || '';
                break;
            case 'rename':
                detail = this.getRenameErrorMessage(code) || '';
                break;
            case 'updateCapacity':
                detail = this.getUpdateCapacityErrorMessage(code) || '';
                break;
            case 'activate':
            case 'deactivate':
                detail = this.getActivateDeactivateErrorMessage(code) || '';
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

    private getCreateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP12271':
                return 'Invalid drive name.';
            case 'ERP12272':
                return 'Invalid license ID.';
            case 'ERP12273':
                return 'This license already has an assigned drive.';
            case 'ERP12274':
                return 'Invalid drive capacity. Capacity must be between 0 and the license maximum.';
            default:
                return null;
        }
    }

    private getRenameErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP12271':
                return 'Invalid drive name.';
            case 'ERP12290':
                return 'Invalid drive ID.';
            default:
                return null;
        }
    }

    private getUpdateCapacityErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP12274':
                return 'Invalid drive capacity. Capacity must be between 0 and the license maximum.';
            case 'ERP12290':
                return 'Invalid drive ID.';
            default:
                return null;
        }
    }

    private getActivateDeactivateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP12290':
                return 'Invalid drive ID.';
            case 'ERP12291':
                return 'Drive is inactive.';
            default:
                return null;
        }
    }
}
