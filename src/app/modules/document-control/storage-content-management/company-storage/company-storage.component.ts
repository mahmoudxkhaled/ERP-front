import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VirtualDrivesService } from '../../services/virtual-drives.service';
import { FileSystemsService } from '../../services/file-systems.service';
import { VirtualDrivesFilters } from '../../models/virtual-drive.model';
import { FileSystemsFilters } from '../../models/file-system.model';

@Component({
    selector: 'app-company-storage',
    templateUrl: './company-storage.component.html',
    styleUrls: ['./company-storage.component.scss']
})
export class CompanyStorageComponent implements OnInit {
    // Select drive then file system (owned by entity). Loaded from List_Drives and List_File_Systems APIs.
    selectedDriveId: number | null = null;
    selectedFileSystemId: number | null = null;
    entityDriveOptions: { id: number; name: string }[] = [];
    fileSystemOptionsInDrive: { id: number; name: string }[] = [];
    loadingDrives = false;
    loadingFileSystemsInDrive = false;

    constructor(
        private translate: TranslationService,
        private virtualDrivesService: VirtualDrivesService,
        private fileSystemsService: FileSystemsService
    ) {}

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
                // Select first drive so user always has a selection
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
        if (this.selectedDriveId == null) {
            this.fileSystemOptionsInDrive = [];
            return;
        }
        this.loadFileSystemsInDrive();
    }

    /**
     * Load file systems for the selected drive from List_File_Systems API.
     */
    loadFileSystemsInDrive(): void {
        const driveId = this.selectedDriveId;
        if (driveId == null) {
            this.fileSystemOptionsInDrive = [];
            return;
        }
        this.loadingFileSystemsInDrive = true;
        const filters: FileSystemsFilters = {
            entityFilter: 1,
            driveId,
            activeOnly: false
        };
        this.fileSystemsService.listFileSystems(filters).subscribe({
            next: (response: any) => {
                this.loadingFileSystemsInDrive = false;
                if (!response?.success) {
                    this.fileSystemOptionsInDrive = [];
                    return;
                }
                const raw = response.message;
                const list = Array.isArray(raw) ? raw : (raw?.File_Systems ?? raw?.file_Systems ?? []);
                this.fileSystemOptionsInDrive = (list || []).map((item: any) => ({
                    id: Number(item?.file_System_ID ?? item?.File_System_ID ?? 0),
                    name: String(item?.name ?? item?.Name ?? '')
                })).filter((fs: { id: number; name: string }) => fs.id > 0);
                // Select first file system when still on the same drive
                if (this.selectedDriveId === driveId && this.fileSystemOptionsInDrive.length > 0) {
                    this.selectedFileSystemId = this.fileSystemOptionsInDrive[0].id;
                }
            },
            error: () => this.loadingFileSystemsInDrive = false
        });
    }

    onFileSystemSelected(): void {
        // When selectedFileSystemId is set, app-folder-management shows for that file system.
    }
}
