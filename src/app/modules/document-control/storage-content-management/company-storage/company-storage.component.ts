import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { VirtualDrivesService } from 'src/app/modules/system-administration/system-storage-management/services/virtual-drives.service';
import { VirtualDrivesFilters } from 'src/app/modules/system-administration/system-storage-management/models/virtual-drive.model';
import { AccessRight, FsPermissionsService } from '../../storage/folder-management/services/fs-permissions.service';

export interface FileSystemOption {
    id: number;
    name: string;
    accessRight: number;
}

@Component({
    selector: 'app-company-storage',
    templateUrl: './company-storage.component.html',
    styleUrls: ['./company-storage.component.scss']
})
export class CompanyStorageComponent implements OnInit {
    selectedDriveId: number | null = null;
    selectedFileSystemId: number | null = null;
    entityDriveOptions: { id: number; name: string }[] = [];
    fileSystemOptionsInDrive: FileSystemOption[] = [];
    loadingDrives = false;
    loadingFileSystemsInDrive = false;

    // Permissions UX (read-only)
    permissionsDialogVisible = false;
    permissionsLoading = false;
    selectedFileSystemEffectiveRight: AccessRight = 'None';
    selectedFileSystemPermissionsRaw: any[] = [];
    selectedFileSystemPermissionsRows: { accessType: number; accessRight: number; permissionId: number }[] = [];

    constructor(
        private translate: TranslationService,
        private localStorageService: LocalStorageService,
        private virtualDrivesService: VirtualDrivesService,
        private fsPermissionsService: FsPermissionsService
    ) { }

    ngOnInit(): void {
        this.loadDrives();
    }

    /**
     * Load drives from List_Drives API (entity filter = 1 for entity-owned drives).
     */
    loadDrives(): void {
        this.loadingDrives = true;
        const filters: VirtualDrivesFilters = {
            entityFilter: 1,
            licenseId: 0,
            activeOnly: false
        };
        this.virtualDrivesService.listDrives(filters).subscribe({
            next: (response: any) => {
                this.loadingDrives = false;
                if (!response?.success) {
                    return;
                }
                const raw = response.message;
                const list = Array.isArray(raw) ? raw : (raw?.Drives ?? raw?.message ?? []);
                this.entityDriveOptions = (list || []).map((item: any) => ({
                    id: Number(item?.Drive_ID ?? item?.drive_ID ?? 0),
                    name: String(item?.Name ?? item?.name ?? '')
                })).filter((d: { id: number; name: string }) => d.id > 0);
                if (this.entityDriveOptions.length > 0) {
                    this.selectedDriveId = this.entityDriveOptions[0].id;
                    this.loadFileSystemsInDrive();
                }
            },
            error: () => this.loadingDrives = false
        });
    }

    onDriveSelected(): void {
        this.selectedFileSystemId = null;
        this.selectedFileSystemEffectiveRight = 'None';
        this.selectedFileSystemPermissionsRaw = [];
        this.selectedFileSystemPermissionsRows = [];
        if (this.selectedDriveId == null) {
            this.fileSystemOptionsInDrive = [];
            return;
        }
        this.loadFileSystemsInDrive();
    }

    /**
     * Load file systems for the current account using List_Account_File_Systems (1174).
     * If the response includes Drive_ID/drive_ID, we filter by selectedDriveId.
     */
    loadFileSystemsInDrive(): void {
        const driveId = this.selectedDriveId;
        if (driveId == null) {
            this.fileSystemOptionsInDrive = [];
            return;
        }
        this.loadingFileSystemsInDrive = true;
        this.fileSystemOptionsInDrive = [];

        const accountId = this.localStorageService.getAccountDetails()?.Account_ID ?? 0;
        if (accountId <= 0) {
            this.loadingFileSystemsInDrive = false;
            this.fileSystemOptionsInDrive = [];
            return;
        }

        this.fsPermissionsService.listAccountFileSystems(accountId, true).subscribe({
            next: (response: any) => {
                this.loadingFileSystemsInDrive = false;
                if (!response?.success) {
                    this.fileSystemOptionsInDrive = [];
                    return;
                }
                const msg = response?.message;

                // Backend shape observed:
                // { "1": { file_system_id, file_system_name, access_right, ... }, "2": { ... } }
                const list = Array.isArray(msg)
                    ? msg
                    : (msg && typeof msg === 'object' ? Object.values(msg) : []);

                this.fileSystemOptionsInDrive = (list || [])
                    .map((item: any) => ({
                        id: Number(item?.file_system_id ?? item?.file_System_ID ?? item?.File_System_ID ?? 0),
                        name: String(item?.file_system_name ?? item?.name ?? item?.Name ?? ''),
                        accessRight: Number(
                            item?.access_right ?? item?.access_Right ?? item?.Access_Right ?? item?.effective_access_right ?? -1
                        )
                    }))
                    .filter((fs: FileSystemOption) => fs.id > 0 && fs.name.trim() !== '');

                // Note: List_Account_File_Systems does not include drive_ID in the observed response,
                // so we cannot reliably filter file systems by selected drive here.
                if (this.selectedDriveId === driveId && this.fileSystemOptionsInDrive.length > 0) {
                    this.selectedFileSystemId = this.fileSystemOptionsInDrive[0].id;
                    this.onFileSystemSelected();
                }
            },
            error: () => {
                this.loadingFileSystemsInDrive = false;
                this.fileSystemOptionsInDrive = [];
            }
        });
    }

    onFileSystemSelected(): void {
        if (!this.selectedFileSystemId) {
            this.selectedFileSystemEffectiveRight = 'None';
            this.selectedFileSystemPermissionsRaw = [];
            this.selectedFileSystemPermissionsRows = [];
            return;
        }

        const selectedFs = this.fileSystemOptionsInDrive.find((o) => o.id === this.selectedFileSystemId);
        if (selectedFs && Number.isFinite(selectedFs.accessRight) && selectedFs.accessRight >= 0) {
            this.selectedFileSystemEffectiveRight = this.mapAccessRightNumberToEnum(selectedFs.accessRight);
        }

        const accountId = this.localStorageService.getAccountDetails()?.Account_ID ?? 0;
        if (accountId <= 0) {
            this.selectedFileSystemEffectiveRight = 'None';
            this.selectedFileSystemPermissionsRaw = [];
            this.selectedFileSystemPermissionsRows = [];
            return;
        }

        this.permissionsLoading = true;
        this.fsPermissionsService.listAccountFsPermissions(accountId, this.selectedFileSystemId).subscribe({
            next: (result: any) => {
                this.permissionsLoading = false;
                this.selectedFileSystemEffectiveRight = result?.effectiveAccessRight ?? 'None';
                const raw = result?.raw;
                this.selectedFileSystemPermissionsRaw = Array.isArray(raw) ? raw : [];
                this.selectedFileSystemPermissionsRows = (this.selectedFileSystemPermissionsRaw || []).map((r: any) => ({
                    accessType: Number(r?.access_Right_Type ?? r?.access_right_type ?? -1),
                    accessRight: Number(r?.access_Right ?? r?.access_right ?? -1),
                    permissionId: Number(r?.permission_ID ?? r?.permission_id ?? 0),
                })).filter((x: any) => Number.isFinite(x.accessType) && x.accessType >= 0 && Number.isFinite(x.accessRight) && x.accessRight >= 0);
            },
            error: () => {
                this.permissionsLoading = false;
                this.selectedFileSystemEffectiveRight = 'None';
                this.selectedFileSystemPermissionsRaw = [];
                this.selectedFileSystemPermissionsRows = [];
            }
        });
    }

    mapAccessRightNumberToEnum(value: number): AccessRight {
        const map: Record<number, AccessRight> = {
            0: 'None',
            1: 'List',
            2: 'Read',
            3: 'Amend',
            4: 'Modify',
            5: 'Full'
        };
        return map[value] ?? 'None';
    }

    fileSystemOptionAccessRight(option: FileSystemOption | null | undefined): number {
        if (!option || !Number.isFinite(option.accessRight) || option.accessRight < 0) {
            return 0;
        }
        return option.accessRight;
    }

    getAccessRightSeverity(accessRight: number): 'secondary' | 'info' | 'success' | 'warning' | 'danger' {
        if (accessRight <= 0) {
            return 'secondary';
        }
        if (accessRight === 1) {
            return 'info';
        }
        if (accessRight === 2) {
            return 'success';
        }
        if (accessRight === 3) {
            return 'warning';
        }
        if (accessRight >= 4) {
            return 'danger';
        }
        return 'secondary';
    }

    selectedEffectiveAccessRightNumeric(): number {
        return this.accessRightEnumToNumber(this.selectedFileSystemEffectiveRight);
    }

    accessRightEnumToNumber(ar: AccessRight): number {
        switch (ar) {
            case 'None':
                return 0;
            case 'List':
                return 1;
            case 'Read':
                return 2;
            case 'Amend':
                return 3;
            case 'Modify':
                return 4;
            case 'Full':
                return 5;
            default:
                return 0;
        }
    }

    showPermissionsDialog(): void {
        if (!this.selectedFileSystemId) {
            return;
        }
        this.permissionsDialogVisible = true;
    }

    hidePermissionsDialog(): void {
        this.permissionsDialogVisible = false;
    }

    getAccessTypeLabel(accessType: number): string {
        switch (accessType) {
            case 0: return this.translate.getInstant('fileSystem.permissions.accessType.account');
            case 1: return this.translate.getInstant('fileSystem.permissions.accessType.group');
            case 2: return this.translate.getInstant('fileSystem.permissions.accessType.role');
            case 3: return this.translate.getInstant('fileSystem.permissions.accessType.entity');
            case 4: return this.translate.getInstant('fileSystem.permissions.accessType.organization');
            case 5: return this.translate.getInstant('fileSystem.permissions.accessType.all');
            case 6: return this.translate.getInstant('fileSystem.permissions.accessType.owner');
            case 7: return this.translate.getInstant('fileSystem.permissions.accessType.entityAdmin');
            default: return this.translate.getInstant('fileSystem.permissions.accessType.unknown');
        }
    }

    getAccessRightLabel(accessRight: number): string {
        switch (accessRight) {
            case 0: return this.translate.getInstant('fileSystem.permissions.accessRight.none');
            case 1: return this.translate.getInstant('fileSystem.permissions.accessRight.list');
            case 2: return this.translate.getInstant('fileSystem.permissions.accessRight.read');
            case 3: return this.translate.getInstant('fileSystem.permissions.accessRight.amend');
            case 4: return this.translate.getInstant('fileSystem.permissions.accessRight.modify');
            case 5: return this.translate.getInstant('fileSystem.permissions.accessRight.full');
            default: return this.translate.getInstant('fileSystem.permissions.accessRight.unknown');
        }
    }
}
