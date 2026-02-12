import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface LicenseRow {
    productKey: string;
    count: number;
    expiry: string;
}

export interface VirtualDriveRow {
    id: number;
    nameKey: string;
    size: string;
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

    virtualDrives: VirtualDriveRow[] = [
        { id: 1, nameKey: 'fileSystem.admin.driveMain', size: '250 GB', active: true },
        { id: 2, nameKey: 'fileSystem.admin.driveArchive', size: '100 GB', active: true },
        { id: 3, nameKey: 'fileSystem.admin.driveProjects', size: '150 GB', active: false }
    ];

    constructor(
        private translate: TranslationService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.capacityUsedLabel = this.translate.getInstant('fileSystem.systemAdmin.capacityUsedLabel');
    }

    getProductLabel(row: LicenseRow): string {
        return this.translate.getInstant(row.productKey);
    }

    getDriveName(row: VirtualDriveRow): string {
        return this.translate.getInstant(row.nameKey);
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
}
