import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { VirtualDrivesService } from 'src/app/modules/system-administration/system-storage-management/services/virtual-drives.service';
import { VirtualDrivesFilters } from 'src/app/modules/system-administration/system-storage-management/models/virtual-drive.model';
import { AccessRight, FsPermissionsService } from '../../storage/folder-management/services/fs-permissions.service';

export interface FileSystemOption {
    id: number;
    name: string;
    /** From List_Account_File_Systems (1174); -1 if unknown or not listed for account. */
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
            licenseId: 3,
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
        this.clearPermissionsState();
        if (this.selectedDriveId == null) {
            this.fileSystemOptionsInDrive = [];
            return;
        }
        this.loadFileSystemsInDrive();
    }

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
            this.selectedFileSystemId = null;
            this.clearPermissionsState();
            return;
        }

        this.fsPermissionsService
            .listAccountFileSystems(accountId, true)
            .subscribe({
                next: (response: any) => {
                    console.log('response listAccountFileSystems: ', response);
                    this.loadingFileSystemsInDrive = false;
                    if (!response?.success) {
                        this.fileSystemOptionsInDrive = [];
                        this.selectedFileSystemId = null;
                        this.clearPermissionsState();
                        return;
                    }

                    if (this.selectedDriveId !== driveId) {
                        return;
                    }

                    const msg = response?.message;
                    const list = Array.isArray(msg) ? msg : msg && typeof msg === 'object' ? Object.values(msg as object) : [];
                    this.fileSystemOptionsInDrive = (list || [])
                        .map((item: any) => ({
                            id: Number(item?.file_system_id ?? item?.file_System_ID ?? item?.File_System_ID ?? 0),
                            name: String(item?.file_system_name ?? item?.name ?? item?.Name ?? ''),
                            accessRight: Number(
                                item?.access_right ?? item?.access_Right ?? item?.Access_Right ?? item?.effective_access_right ?? -1
                            ),
                            driveId: Number(item?.drive_ID ?? item?.Drive_ID ?? item?.driveId ?? 0),
                        }))
                        .filter(
                            (fs: any) =>
                                fs.id > 0 &&
                                fs.name.trim() !== '' &&
                                (fs.driveId <= 0 || fs.driveId === driveId)
                        )
                        .map((fs: any) => ({
                            id: fs.id,
                            name: fs.name,
                            accessRight: fs.accessRight,
                        }));

                    if (this.fileSystemOptionsInDrive.length === 0) {
                        this.loadingFileSystemsInDrive = false;
                        this.selectedFileSystemId = null;
                        this.clearPermissionsState();
                        return;
                    }

                    this.applyDefaultFileSystemSelection(driveId);
                },
                error: () => {
                    this.loadingFileSystemsInDrive = false;
                    this.fileSystemOptionsInDrive = [];
                    this.selectedFileSystemId = null;
                    this.clearPermissionsState();
                },
            });
    }

    private applyDefaultFileSystemSelection(driveId: number): void {
        if (this.selectedDriveId !== driveId) {
            return;
        }
        if (this.fileSystemOptionsInDrive.length === 0) {
            this.selectedFileSystemId = null;
            this.clearPermissionsState();
            return;
        }
        this.selectedFileSystemId = this.fileSystemOptionsInDrive[0].id;
        this.onFileSystemSelected();
    }

    fileSystemOptionAccessRight(option: FileSystemOption | null | undefined): number {
        if (!option) {
            return -1;
        }
        return Number.isFinite(option.accessRight) ? option.accessRight : -1;
    }

    private clearPermissionsState(): void {
        this.selectedFileSystemEffectiveRight = 'None';
        this.selectedFileSystemPermissionsRaw = [];
        this.selectedFileSystemPermissionsRows = [];
    }

    onFileSystemSelected(): void {
        if (!this.selectedFileSystemId) {
            this.clearPermissionsState();
            return;
        }

        const accountId = this.localStorageService.getAccountDetails()?.Account_ID ?? 0;
        if (accountId <= 0) {
            this.clearPermissionsState();
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
                this.clearPermissionsState();
            }
        });
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
