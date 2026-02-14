import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { VirtualDrivesService } from '../../services/virtual-drives.service';
import { FileSystemsService } from '../../services/file-systems.service';
import { VirtualDrivesFilters } from '../../models/virtual-drive.model';
import { FileSystemTableRow, FileSystemType } from '../../models/file-system.model';
import {
  mapApiResponseToFileSystemRow,
  formatBytes,
  getFileSystemErrorDetail
} from '../file-system-helpers';

/** Result for Create_File_System: Owner_ID and Is_Entity_ID derived from scope and current user. */
export interface FileSystemOwnerContext {
  ownerId: number;
  isEntityId: boolean;
}

/**
 * Shared component for listing and managing File Systems.
 * Used by SSM (by drive) and ESM (by entity). Mode controls filters and actions.
 */
@Component({
  selector: 'app-file-systems-section',
  templateUrl: './file-systems-section.component.html',
  styleUrls: ['./file-systems-section.component.scss']
})
export class FileSystemsSectionComponent implements OnInit {
  @Input() mode: 'ssm' | 'esm' = 'ssm';
  /** Emits when the file systems list changes (e.g. so parent can show count in KPI). */
  @Output() fileSystemsCountChange = new EventEmitter<number>();

  fileSystems: FileSystemTableRow[] = [];
  loadingFileSystems = false;
  driveOptions: { id: number; name: string }[] = [];
  selectedDriveId: number | null = null;

  fileSystemTypes: { id: number; name: string }[] = [];
  loadingTypes = false;
  creatingFileSystem = false;
  savingFileSystem = false;
  deletingFileSystem = false;
  detailsLoading = false;
  loadingRecycleBin = false;
  restoringRecycleBin = false;
  clearingRecycleBin = false;

  createDialogVisible = false;
  editDialogVisible = false;
  detailsDialogVisible = false;
  deleteConfirmVisible = false;
  recycleBinDialogVisible = false;

  newFileSystemName = '';
  /** Scope for new file system: Personal (Account) or Entity (Company). Owner_ID is derived from this. */
  newFileSystemScope: 'personal' | 'entity' = 'entity';
  newFileSystemTypeId: number | null = null;
  newFileSystemDriveId: number | null = null;
  selectedForEdit: FileSystemTableRow | null = null;
  editFileSystemName = '';
  editFileSystemTypeId: number | null = null;
  selectedForDetails: FileSystemTableRow | null = null;
  detailsData: { name: string; typeName: string; driveName: string; active: boolean; usedCapacity: string } | null = null;
  selectedForDelete: FileSystemTableRow | null = null;
  recycleBinFileSystemId: number | null = null;
  recycleBinContents: { folders?: any[]; files?: any[] } | null = null;

  constructor(
    private translate: TranslationService,
    private messageService: MessageService,
    private localStorage: LocalStorageService,
    private virtualDrivesService: VirtualDrivesService,
    private fileSystemsService: FileSystemsService
  ) { }

  /**
   * True if current user can create an Entity file system (Entity Admin or System Admin).
   * When false, only Personal scope is allowed and the Entity option is hidden.
   */
  get canChooseEntityScope(): boolean {
    const functions = this.localStorage.getFunctionsDetails();
    return !!(functions?.EntAdm || functions?.SysAdm);
  }

  /** SSM: true when a drive is selected and user can manage file systems (e.g. Entity Admin on that drive). */
  get canManageFileSystems(): boolean {
    return this.selectedDriveId != null;
  }

  get createButtonTooltip(): string {
    return this.canManageFileSystems ? '' : this.translate.getInstant('fileSystem.admin.selectDriveToManageFileSystems');
  }

  ngOnInit(): void {
    this.loadDrives();
    if (this.mode === 'esm') {
      this.refreshList();
    }
  }

  loadDrives(): void {
    const filters: VirtualDrivesFilters = {
      entityFilter: this.mode === 'ssm' ? 0 : 1,
      licenseId: 0,
      activeOnly: false
    };
    this.virtualDrivesService.listDrives(filters).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleError('loadDrives', response);
          return;
        }
        const raw = response.message;
        const list = Array.isArray(raw) ? raw : (raw?.Drives ?? raw?.message ?? []);
        this.driveOptions = (list || []).map((item: any) => ({
          id: Number(item?.Drive_ID ?? item?.drive_ID ?? 0),
          name: String(item?.Name ?? item?.name ?? '')
        })).filter((d: { id: number; name: string }) => d.id > 0);
        if (this.mode === 'ssm' && this.driveOptions.length > 0 && !this.selectedDriveId) {
          this.selectedDriveId = this.driveOptions[0].id;
          this.onDriveSelected();
        }
      },
      error: () => { }
    });
  }

  onDriveSelected(): void {
    this.refreshList();
  }

  refreshList(): void {
    if (this.mode === 'ssm') {
      if (this.selectedDriveId == null) {
        this.fileSystems = [];
        this.fileSystemsCountChange.emit(0);
        return;
      }
      this.loadingFileSystems = true;
      this.fileSystemsService.listFileSystems({
        entityFilter: 0,
        driveId: this.selectedDriveId,
        activeOnly: false
      }).subscribe({
        next: (response: any) => {
          console.log('response listFileSystemsSsm', response);
          this.loadingFileSystems = false;
          if (!response?.success) {
            this.handleError('list', response);
            return;
          }
          const raw = response.message;
          const list = Array.isArray(raw) ? raw : (raw?.File_Systems ?? raw?.file_Systems ?? []);
          this.fileSystems = (list || []).map((item: any) => mapApiResponseToFileSystemRow(item));
          this.fileSystemsCountChange.emit(this.fileSystems.length);
        },
        error: () => this.loadingFileSystems = false
      });
      return;
    }
    this.loadingFileSystems = true;
    this.fileSystemsService.listFileSystems({ entityFilter: 1, driveId: 0, activeOnly: false }).subscribe({
      next: (response: any) => {
        console.log('response listFileSystemsEsm', response);
        this.loadingFileSystems = false;
        if (!response?.success) {
          this.handleError('list', response);
          return;
        }
        const raw = response.message;
        const list = Array.isArray(raw) ? raw : (raw?.File_Systems ?? raw?.file_Systems ?? []);
        this.fileSystems = (list || []).map((item: any) => mapApiResponseToFileSystemRow(item));
        this.fileSystemsCountChange.emit(this.fileSystems.length);
      },
      error: () => this.loadingFileSystems = false
    });
  }

  loadTypes(): void {
    if (this.fileSystemTypes.length > 0) return;
    this.loadingTypes = true;
    this.fileSystemsService.listFileSystemTypes().subscribe({
      next: (response: any) => {
        this.loadingTypes = false;
        if (!response?.success) {
          this.handleError('loadTypes', response);
          return;
        }
        const raw = response.message;
        const list = Array.isArray(raw) ? raw : (raw ?? []);
        this.fileSystemTypes = (list || []).map((item: any) => {
          const id = Number(item?.['FS Type ID'] ?? item?.type_ID ?? item?.Type_ID ?? 0);
          const name = String(item?.Title ?? item?.name ?? item?.Name ?? '');
          return { id, name };
        }).filter((t: { id: number; name: string }) => t.name !== '');
      },
      error: () => this.loadingTypes = false
    });
  }

  getEntityName(row: FileSystemTableRow): string {
    return row?.entityName ?? '—';
  }

  getFileSystemName(row: FileSystemTableRow): string {
    return row?.name ?? '—';
  }

  getStatusLabel(row: FileSystemTableRow): string {
    return row?.active ? this.translate.getInstant('fileSystem.entityAdminStatus.active') : this.translate.getInstant('fileSystem.admin.inactive');
  }

  handleError(operation: string, response: any): void {
    const summary = this.translate.getInstant('fileSystem.admin.errorSummary');
    const fallback = this.translate.getInstant('fileSystem.admin.errorUnknown');
    const detail = getFileSystemErrorDetail(response, (key) => this.translate.getInstant(key));
    this.messageService.add({ severity: 'error', summary, detail: detail || fallback });
  }

  showCreateDialog(): void {
    this.newFileSystemName = '';
    this.newFileSystemTypeId = null;
    this.newFileSystemDriveId = this.mode === 'esm' && this.driveOptions.length > 0 ? this.driveOptions[0].id : null;
    this.newFileSystemScope = this.canChooseEntityScope ? 'entity' : 'personal';
    this.loadTypes();
    this.createDialogVisible = true;
  }

  hideCreateDialog(): void {
    this.createDialogVisible = false;
  }

  /**
   * Resolve Owner_ID and Is_Entity_ID for Create_File_System from the selected scope and logged-in user.
   * Owner_ID is never typed by the user; it is derived from session/JWT context.
   * - Personal: Owner_ID = current user Account_ID, Is_Entity_ID = false (file system belongs to the person/account).
   * - Entity: Owner_ID = current user Entity_ID, Is_Entity_ID = true (file system belongs to the company/entity).
   * When auth context is missing (e.g. dev), falls back to mock IDs so the create call can still be tested.
   */
  resolveOwner(): FileSystemOwnerContext {
    const account = this.localStorage.getAccountDetails();
    const entity = this.localStorage.getEntityDetails();
    let accountId = account?.Account_ID ?? 0;
    let entityId = entity?.Entity_ID ?? account?.Entity_ID ?? 0;
    if (accountId === 0 && entityId === 0) {
      accountId = 1;
      entityId = 1;
    }
    if (this.newFileSystemScope === 'entity') {
      return { ownerId: entityId, isEntityId: true };
    }
    return { ownerId: accountId, isEntityId: false };
  }

  onCreateConfirm(): void {
    if (!this.newFileSystemName.trim()) {
      this.messageService.add({ severity: 'warn', summary: this.translate.getInstant('fileSystem.admin.validation'), detail: this.translate.getInstant('fileSystem.admin.fileSystemNameRequired') });
      return;
    }
    const driveId = this.mode === 'ssm' ? this.selectedDriveId : this.newFileSystemDriveId;
    if (this.newFileSystemTypeId == null || driveId == null) {
      this.messageService.add({ severity: 'warn', summary: this.translate.getInstant('fileSystem.admin.validation'), detail: this.translate.getInstant('fileSystem.admin.fileSystemTypeRequired') });
      return;
    }
    const { ownerId, isEntityId } = this.resolveOwner();
    this.creatingFileSystem = true;
    this.fileSystemsService.createFileSystem(
      this.newFileSystemName.trim(),
      this.newFileSystemTypeId,
      ownerId,
      isEntityId ? 1 : 0,
      driveId
    ).subscribe({
      next: (response: any) => {
        this.creatingFileSystem = false;
        if (!response?.success) {
          this.handleError('create', response);
          return;
        }
        this.messageService.add({ severity: 'success', summary: this.translate.getInstant('fileSystem.companyStorage.create'), detail: this.translate.getInstant('fileSystem.admin.createFileSystemSuccess') });
        this.hideCreateDialog();
        this.refreshList();
      },
      error: () => this.creatingFileSystem = false
    });
  }

  showEditDialog(row: FileSystemTableRow): void {
    this.selectedForEdit = row;
    this.editFileSystemName = row.name;
    this.editFileSystemTypeId = row.typeId ?? null;
    if (this.fileSystemTypes.length === 0) this.loadTypes();
    this.editDialogVisible = true;
  }

  hideEditDialog(): void {
    this.editDialogVisible = false;
    this.selectedForEdit = null;
  }

  onEditSave(): void {
    if (!this.selectedForEdit) return;
    if (!this.editFileSystemName.trim()) {
      this.messageService.add({ severity: 'warn', summary: this.translate.getInstant('fileSystem.admin.validation'), detail: this.translate.getInstant('fileSystem.admin.fileSystemNameRequired') });
      return;
    }
    const typeId = this.editFileSystemTypeId ?? this.selectedForEdit.typeId ?? 0;
    if (typeId <= 0) {
      this.messageService.add({ severity: 'warn', summary: this.translate.getInstant('fileSystem.admin.validation'), detail: this.translate.getInstant('fileSystem.admin.fileSystemTypeRequired') });
      return;
    }
    this.savingFileSystem = true;
    this.fileSystemsService.updateFileSystemDetails(this.selectedForEdit.id, this.editFileSystemName.trim(), typeId).subscribe({
      next: (response: any) => {
        this.savingFileSystem = false;
        if (!response?.success) {
          this.handleError('update', response);
          return;
        }
        this.messageService.add({ severity: 'success', summary: this.translate.getInstant('fileSystem.companyStorage.save'), detail: this.translate.getInstant('fileSystem.admin.updateFileSystemSuccess') });
        this.hideEditDialog();
        this.refreshList();
      },
      error: () => this.savingFileSystem = false
    });
  }

  showDetailsDialog(row: FileSystemTableRow): void {
    this.selectedForDetails = row;
    this.detailsData = null;
    this.detailsDialogVisible = true;
    this.detailsLoading = true;
    this.fileSystemsService.getFileSystemDetails(row.id).subscribe({
      next: (response: any) => {
        this.detailsLoading = false;
        if (!response?.success) {
          this.handleError('details', response);
          return;
        }
        const d = response?.message ?? response;
        const name = String(d?.name ?? d?.Name ?? row.name);
        const typeName = String(d?.type_Name ?? d?.Type_Name ?? d?.typeName ?? '—');
        const driveName = String(d?.drive_Name ?? d?.Drive_Name ?? d?.driveName ?? '—');
        const active = Boolean(d?.is_Active ?? d?.Is_Active ?? row.active ?? true);
        const used = Number(d?.used_Capacity ?? d?.Used_Capacity ?? 0);
        this.detailsData = { name, typeName, driveName, active, usedCapacity: formatBytes(used) };
      },
      error: () => this.detailsLoading = false
    });
  }

  hideDetailsDialog(): void {
    this.detailsDialogVisible = false;
    this.selectedForDetails = null;
    this.detailsData = null;
  }

  showDeleteConfirm(row: FileSystemTableRow): void {
    this.selectedForDelete = row;
    this.deleteConfirmVisible = true;
  }

  hideDeleteConfirm(): void {
    this.deleteConfirmVisible = false;
    this.selectedForDelete = null;
  }

  onDeleteConfirm(): void {
    if (!this.selectedForDelete) return;
    this.deletingFileSystem = true;
    this.fileSystemsService.deleteFileSystem(this.selectedForDelete.id).subscribe({
      next: (response: any) => {
        this.deletingFileSystem = false;
        if (!response?.success) {
          this.handleError('delete', response);
          return;
        }
        this.messageService.add({ severity: 'success', summary: this.translate.getInstant('fileSystem.companyStorage.delete'), detail: this.translate.getInstant('fileSystem.admin.updateFileSystemSuccess') });
        this.hideDeleteConfirm();
        this.refreshList();
      },
      error: () => this.deletingFileSystem = false
    });
  }

  showRecycleBinDialog(): void {
    this.recycleBinFileSystemId = null;
    this.recycleBinContents = null;
    this.recycleBinDialogVisible = true;
  }

  hideRecycleBinDialog(): void {
    this.recycleBinDialogVisible = false;
    this.recycleBinFileSystemId = null;
    this.recycleBinContents = null;
  }

  onRecycleBinFileSystemSelect(): void {
    if (!this.recycleBinFileSystemId) {
      this.recycleBinContents = null;
      return;
    }
    this.loadingRecycleBin = true;
    this.fileSystemsService.getFileSystemRecycleBinContents(this.recycleBinFileSystemId).subscribe({
      next: (response: any) => {
        this.loadingRecycleBin = false;
        if (!response?.success) {
          this.handleError('recycleBin', response);
          return;
        }
        const msg = response?.message;
        this.recycleBinContents = Array.isArray(msg) ? { folders: [], files: msg } : (msg ?? { folders: [], files: [] });
      },
      error: () => this.loadingRecycleBin = false
    });
  }

  onRecycleBinRestoreAll(): void {
    if (!this.recycleBinFileSystemId) return;
    this.restoringRecycleBin = true;
    this.fileSystemsService.restoreFileSystemRecycleBinContents(this.recycleBinFileSystemId).subscribe({
      next: (response: any) => {
        this.restoringRecycleBin = false;
        if (!response?.success) {
          this.handleError('restoreRecycleBin', response);
          return;
        }
        this.messageService.add({ severity: 'success', summary: this.translate.getInstant('fileSystem.companyStorage.restore'), detail: '' });
        this.onRecycleBinFileSystemSelect();
      },
      error: () => this.restoringRecycleBin = false
    });
  }

  onRecycleBinClear(): void {
    if (!this.recycleBinFileSystemId) return;
    this.clearingRecycleBin = true;
    this.fileSystemsService.clearFileSystemRecycleBin(this.recycleBinFileSystemId).subscribe({
      next: (response: any) => {
        this.clearingRecycleBin = false;
        if (!response?.success) {
          this.handleError('clearRecycleBin', response);
          return;
        }
        this.messageService.add({ severity: 'success', summary: this.translate.getInstant('fileSystem.companyStorage.clearRecycleBin'), detail: '' });
        this.onRecycleBinFileSystemSelect();
      },
      error: () => this.clearingRecycleBin = false
    });
  }
}
