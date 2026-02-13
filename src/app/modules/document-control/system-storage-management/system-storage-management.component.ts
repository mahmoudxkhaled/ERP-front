import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface LicenseRow {
    productKey: string;
    count: number;
    expiry: string;
}


/** File system row for SSM list (scoped by drive). */
export interface FileSystemRow {
    id: number;
    nameKey: string;
    entityNameKey: string;
    active: boolean;
    usedCapacity: string;
}

@Component({
    selector: 'app-system-storage-management',
    templateUrl: './system-storage-management.component.html',
    styleUrls: ['./system-storage-management.component.scss']
})
export class AdminComponent implements OnInit {
    capacityUsedPercent = 65;
    capacityUsedLabel = '';

    licenses: LicenseRow[] = [
        { productKey: 'fileSystem.admin.productEnterprise', count: 100, expiry: '2024-12-31' },
        { productKey: 'fileSystem.admin.productStoragePack', count: 50, expiry: '2024-06-30' }
    ];

    // Placeholder for virtual drives count (will be updated from shared component later if needed)
    virtualDrivesCount = 0;

    // List File Systems (scoped by selected drive)
    selectedDriveIdForFileSystems: number | null = null;
    fileSystemsInSelectedDrive: FileSystemRow[] = [];
    /** Placeholder: true when a drive is selected. Role check (Entity Admin on drive) to be wired when backend supports it. */
    get canManageFileSystems(): boolean {
        return this.selectedDriveIdForFileSystems != null;
    }

    // Traffic monitoring (placeholder until API)
    totalUploads = '0';
    totalDownloads = '0';
    totalFilesTraffic = '0';

    // Placeholder drive options for file systems dropdown (will be populated from shared component later)
    driveOptionsForFileSystems: { id: number; name: string }[] = [
        { id: 1, name: 'Main Drive' },
        { id: 2, name: 'Archive Drive' }
    ];

    constructor(
        private translate: TranslationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.capacityUsedLabel = this.translate.getInstant('fileSystem.systemAdmin.capacityUsedLabel');
    }

    onDriveSelectedForFileSystems(): void {
        if (this.selectedDriveIdForFileSystems == null) {
            this.fileSystemsInSelectedDrive = [];
            return;
        }
        // Placeholder: load file systems for selected drive when API exists. Use mock for now.
        this.fileSystemsInSelectedDrive = [
            { id: 1, nameKey: 'fileSystem.admin.driveMain', entityNameKey: 'fileSystem.entityAdminEntities.mainCompany', active: true, usedCapacity: '125 GB' },
            { id: 2, nameKey: 'fileSystem.admin.driveArchive', entityNameKey: 'fileSystem.entityAdminEntities.mainCompany', active: true, usedCapacity: '48 GB' }
        ];
    }

    getFileSystemName(row: FileSystemRow): string {
        return this.translate.getInstant(row.nameKey);
    }

    getFileSystemEntityName(row: FileSystemRow): string {
        return this.translate.getInstant(row.entityNameKey);
    }

    getFileSystemStatusLabel(row: FileSystemRow): string {
        return row.active ? this.translate.getInstant('fileSystem.entityAdminStatus.active') : this.translate.getInstant('fileSystem.admin.inactive');
    }

    onEditFileSystem(_row: FileSystemRow): void {
        this.messageService.add({ severity: 'info', summary: this.translate.getInstant('fileSystem.entityAdmin.editFileSystem') });
    }

    get createFileSystemButtonTooltip(): string {
        if (!this.selectedDriveIdForFileSystems) {
            return this.translate.getInstant('fileSystem.admin.selectDriveToManageFileSystems');
        }
        return this.translate.getInstant('fileSystem.admin.createFileSystemRequiresEntityAdmin');
    }

    showCreateFileSystemDialog(): void {
        if (!this.canManageFileSystems) return;
        this.messageService.add({ severity: 'info', summary: this.translate.getInstant('fileSystem.entityAdmin.createFileSystem') });
    }

    getProductLabel(row: LicenseRow): string {
        return this.translate.getInstant(row.productKey);
    }
}
