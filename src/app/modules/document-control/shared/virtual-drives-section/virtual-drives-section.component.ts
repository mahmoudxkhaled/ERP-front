import { Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuItem, MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VirtualDrivesService } from '../../services/virtual-drives.service';
import { VirtualDrivesFilters } from '../../models/virtual-drive.model';

export interface VirtualDriveRow {
    id: number;
    name: string;
    licenseId: number;
    /** True = Entity drive, false = Account drive (from API is_Entity). */
    isEntity: boolean;
    capacity: number;
    /** Free space in bytes (from API free_Space). */
    freeSpace: number;
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

    // Entity filter above table (API); License ID, Drive type, Status are in table filter row (client-side)
    entityFilterOptions = [
        { label: 'Account', value: -1 },
        { label: 'Entity', value: 1 },
        { label: 'Both', value: 0 }
    ];
    entityFilter = -1;

    /** Options for table column filter: Drive type (value matches row.isEntity). */
    driveTypeFilterOptions = [
        { label: 'fileSystem.admin.filterAll', value: null as boolean | null },
        { label: 'fileSystem.admin.driveTypeEntity', value: true },
        { label: 'fileSystem.admin.driveTypeAccount', value: false }
    ];
    /** Options for table column filter: Status (value matches row.active). */
    statusFilterOptions = [
        { label: 'fileSystem.admin.filterAll', value: null as boolean | null },
        { label: 'fileSystem.entityAdminStatus.active', value: true },
        { label: 'fileSystem.admin.inactive', value: false }
    ];

    // Dialog visibility flags
    createDriveDialogVisible = false;
    renameDriveDialogVisible = false;
    updateCapacityDialogVisible = false;
    driveDetailsDialogVisible = false;
    confirmStatusDialogVisible = false;

    /** Drive and target state for activate/deactivate confirmation. */
    confirmStatusDrive: VirtualDriveRow | null = null;
    confirmStatusToActive = false;

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

    // Row menu (3-dot)
    driveMenuItems: MenuItem[] = [];
    selectedDriveForMenu: VirtualDriveRow | null = null;

    /** Drive ID currently being toggled (activate/deactivate) so we can disable its switch. */
    togglingDriveId: number | null = null;

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
        this.buildDriveMenuItems();
        this.loadVirtualDrives();
    }

    /**
     * Build menu items for the 3-dot row menu. Called when opening the menu so the correct drive is set.
     */
    buildDriveMenuItems(): void {
        const drive = this.selectedDriveForMenu;
        this.driveMenuItems = [
            {
                label: this.translate.getInstant('fileSystem.admin.viewDetails'),
                icon: 'pi pi-eye',
                command: () => {
                    if (drive) this.showDriveDetailsDialog(drive);
                }
            },
            {
                label: this.translate.getInstant('fileSystem.admin.renameDrive'),
                icon: 'pi pi-pencil',
                command: () => {
                    if (drive) this.showRenameDriveDialog(drive);
                }
            },
            {
                label: this.translate.getInstant('fileSystem.admin.updateCapacity'),
                icon: 'pi pi-chart-bar',
                command: () => {
                    if (drive) this.showUpdateCapacityDialog(drive);
                }
            }
        ];
        if (this.showActivateDeactivate && drive) {
            if (drive.active) {
                this.driveMenuItems.push({
                    label: this.translate.getInstant('fileSystem.admin.deactivateDrive'),
                    icon: 'pi pi-times',
                    command: () => this.showConfirmStatusDialog(drive, false)
                });
            } else {
                this.driveMenuItems.push({
                    label: this.translate.getInstant('fileSystem.admin.activateDrive'),
                    icon: 'pi pi-check',
                    command: () => this.showConfirmStatusDialog(drive, true)
                });
            }
        }
    }

    /**
     * Open the 3-dot row menu for a drive.
     */
    openDriveMenu(menu: { toggle: (e: Event) => void }, row: VirtualDriveRow, event: Event): void {
        this.selectedDriveForMenu = row;
        this.buildDriveMenuItems();
        menu.toggle(event);
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
                isEntity: false,
                capacity: 0,
                freeSpace: 0,
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
     * Map a drive object from the API to VirtualDriveRow.
     * API returns: drive_ID, name, license_ID, owner_ID, is_Entity, capacity, free_Space, is_Active.
     */
    private mapDriveToRow(item: any): VirtualDriveRow {
        const id = Number(item?.drive_ID ?? item?.Drive_ID ?? 0);
        const name = String(item?.name ?? item?.Drive_Name ?? '');
        const licenseId = Number(item?.license_ID ?? item?.License_ID ?? 0);
        const isEntity = Boolean(item?.is_Entity ?? item?.Is_Entity);
        const capacity = Number(item?.capacity ?? item?.Capacity ?? 0);
        const freeSpace = Number(item?.free_Space ?? item?.Free_Space ?? 0);
        const active = Boolean(item?.is_Active ?? item?.Is_Active);
        return { id, name, licenseId, isEntity, capacity, freeSpace, active };
    }

    /** Display label for drive type: Entity or Account. */
    getDriveTypeDisplay(row: VirtualDriveRow): string {
        return row.isEntity
            ? this.translate.getInstant('fileSystem.admin.driveTypeEntity')
            : this.translate.getInstant('fileSystem.admin.driveTypeAccount');
    }

    /**
     * Build filters object for List_Drives API. Only entity is used; License ID and Status
     * are filtered in the table (client-side) so we load all for the selected entity.
     */
    private getCurrentFilters(): VirtualDrivesFilters {
        return {
            entityFilter: this.entityFilter,
            licenseId: 0,
            activeOnly: false
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
                console.log('response listDrives', response);
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                // message can be the array of drives directly, or an object with Drives property
                const raw = response.message;
                const drivesRaw = Array.isArray(raw) ? raw : (raw?.Drives ?? []);

                this.virtualDrives = drivesRaw.map((item: any) => this.mapDriveToRow(item));
            },
            complete: () => {
                this.tableLoadingSpinner = false;
            }
        });
    }

    getDriveName(row: VirtualDriveRow): string {
        return row.name;
    }

    /** Bytes per GB (1024^3). Used to convert user input (GB) to API (bytes). */
    private readonly bytesPerGb = 1024 * 1024 * 1024;

    /** Convert Gigabytes to bytes for the API. User enters e.g. 20 meaning 20 GB. */
    private gbToBytes(gb: number): number {
        return Math.round((gb ?? 0) * this.bytesPerGb);
    }

    /** Convert bytes from API to Gigabytes for display/edit in the UI. */
    private bytesToGb(bytes: number): number {
        const b = bytes ?? 0;
        if (b <= 0) return 0;
        return Math.round(b / this.bytesPerGb);
    }

    /** Format bytes to GB or MB for display (used for capacity and free space from API). */
    formatBytesToSize(bytes: number): string {
        const b = bytes ?? 0;
        const gb = b / (1024 * 1024 * 1024);
        if (gb >= 1) return gb.toFixed(2) + ' GB';
        const mb = b / (1024 * 1024);
        return mb >= 1 ? (mb.toFixed(2) + ' MB') : (b / 1024).toFixed(2) + ' KB';
    }

    getCapacityDisplay(row: VirtualDriveRow): string {
        return this.formatBytesToSize(row.capacity);
    }

    getFreeSpaceDisplay(row: VirtualDriveRow): string {
        return this.formatBytesToSize(row.freeSpace);
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

        // API expects capacity in bytes; user enters GB (e.g. 20 = 20 GB)
        const capacityInBytes = this.gbToBytes(this.newDriveCapacity);
        this.virtualDrivesService.createDrive(
            this.newDriveName,
            this.newDriveLicenseId,
            capacityInBytes
        ).subscribe({
            next: (response: any) => {
                console.log('response createDrive', response);
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
        // Show capacity in GB (API stores bytes)
        this.updateCapacityValue = this.bytesToGb(row.capacity);
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

        // API expects capacity in bytes; user enters GB (e.g. 20 = 20 GB)
        const capacityInBytes = this.gbToBytes(this.updateCapacityValue);
        this.virtualDrivesService.updateDriveCapacity(
            this.selectedDriveForCapacity.id,
            capacityInBytes
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

    /**
     * Called when the status toggle is switched. Shows confirmation dialog first.
     */
    onStatusToggle(row: VirtualDriveRow, event: { checked?: boolean } | boolean): void {
        const checked = typeof event === 'boolean' ? event : (event?.checked ?? false);
        this.showConfirmStatusDialog(row, checked);
    }

    /**
     * Show confirmation dialog before activating or deactivating a drive.
     */
    showConfirmStatusDialog(row: VirtualDriveRow, toActive: boolean): void {
        this.confirmStatusDrive = row;
        this.confirmStatusToActive = toActive;
        this.confirmStatusDialogVisible = true;
    }

    hideConfirmStatusDialog(): void {
        this.confirmStatusDialogVisible = false;
        this.confirmStatusDrive = null;
    }

    /**
     * User cancelled the activate/deactivate confirmation. Revert the toggle.
     */
    onCancelStatusChange(): void {
        if (this.confirmStatusDrive) {
            this.confirmStatusDrive.active = !this.confirmStatusToActive;
        }
        this.hideConfirmStatusDialog();
    }

    /**
     * User confirmed activate/deactivate. Call the service.
     */
    onConfirmStatusChange(): void {
        const row = this.confirmStatusDrive;
        if (!row) {
            this.hideConfirmStatusDialog();
            return;
        }
        const toActive = this.confirmStatusToActive;
        this.hideConfirmStatusDialog();
        this.togglingDriveId = row.id;

        const serviceCall = toActive
            ? this.virtualDrivesService.activateDrive(row.id)
            : this.virtualDrivesService.deactivateDrive(row.id);

        serviceCall.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(toActive ? 'activate' : 'deactivate', response);
                    row.active = !toActive;
                    return;
                }
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: toActive
                        ? this.translate.getInstant('fileSystem.admin.activateDriveSuccess')
                        : this.translate.getInstant('fileSystem.admin.deactivateDriveSuccess')
                });
                this.loadVirtualDrives();
            },
            error: () => {
                row.active = !toActive;
            },
            complete: () => {
                this.togglingDriveId = null;
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
