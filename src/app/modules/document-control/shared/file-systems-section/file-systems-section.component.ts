import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { VirtualDrivesService } from '../../services/virtual-drives.service';
import { FileSystemsService } from '../../services/file-systems.service';
import { VirtualDrivesFilters } from '../../models/virtual-drive.model';
import { FileSystemListItem } from '../../models/file-system.model';
import { formatBytes, getFileSystemErrorDetail } from '../file-system-helpers';

/** Result for Create_File_System: Owner_ID and Is_Entity_ID derived from scope and current user. */
export interface FileSystemOwnerContext {
  ownerId: number;
  isEntityId: boolean;
}

/**
 * File systems section for ESM and Storage & Content Management.
 * Lists entity file systems, create/edit/delete/details, recycle bin.
 */
@Component({
  selector: 'app-file-systems-section',
  templateUrl: './file-systems-section.component.html',
  styleUrls: ['./file-systems-section.component.scss']
})
export class FileSystemsSectionComponent implements OnInit {
  /** Emits when the file systems list changes (e.g. so parent can show count in KPI). */
  @Output() fileSystemsCountChange = new EventEmitter<number>();

  fileSystems: FileSystemListItem[] = [];
  loadingFileSystems = false;
  driveOptions: { id: number; name: string }[] = [];

  /** Entity_Filter: -1 = Account, 1 = Entity, 0 = Both. Used when calling List_File_Systems. */
  entityFilterFileSystems = 0;
  /** Stable reference so dropdown (onChange) does not re-fire when options are re-evaluated. */
  entityFilterOptions: { label: string; value: number }[] = [];
  /** Drive_ID for filter (0 = ignore / all drives). */
  driveFilterId = 0;
  /** Drive options for filter: "All" (0) + list from API. Stable reference to avoid loop. */
  driveOptionsWithAll: { id: number; name: string }[] = [];
  /** Active_Only: true = exclude deleted file systems. */
  activeOnlyFilter = false;

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
  selectedForEdit: FileSystemListItem | null = null;
  editFileSystemName = '';
  editFileSystemTypeId: number | null = null;
  selectedForDetails: FileSystemListItem | null = null;
  detailsData: { name: string; typeName: string; driveName: string; active: boolean; createdAt: string } | null = null;
  selectedForDelete: FileSystemListItem | null = null;
  recycleBinFileSystemId: number | null = null;
  recycleBinContents: { folders?: any[]; files?: any[] } | null = null;

  /** Row menu (3-dots): selected row and menu model. */
  fileSystemMenuItems: MenuItem[] = [];
  selectedFileSystemForMenu: FileSystemListItem | null = null;
  restoringDeletedFileSystem = false;

  /** Confirmation dialogs for critical actions. */
  clearRecycleBinConfirmVisible = false;
  restoreRecycleBinConfirmVisible = false;
  restoreDeletedConfirmVisible = false;

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

  /**
   * When loading and the list is empty, return placeholder rows so the table can show skeleton cells.
   */
  get fileSystemsTableValue(): FileSystemListItem[] {
    if (this.loadingFileSystems && this.fileSystems.length === 0) {
      return Array(5).fill(null).map(() => ({
        file_System_ID: 0,
        name: '',
        type: 0,
        guid: '',
        owner_ID: 0,
        is_Entity_FS: false,
        drive_ID: 0,
        created_At: '',
        created_By: 0,
        deleted_At: '',
        delete_Account_ID: 0
      }));
    }
    return this.fileSystems;
  }

  ngOnInit(): void {
    this.buildEntityFilterOptions();
    this.buildDriveOptionsWithAll();
    this.loadDrives();
    this.loadTypes();
    this.refreshList();
  }

  private buildEntityFilterOptions(): void {
    this.entityFilterOptions = [
      { label: this.translate.getInstant('fileSystem.admin.filterAccount'), value: -1 },
      { label: this.translate.getInstant('fileSystem.admin.filterEntity'), value: 1 },
      { label: this.translate.getInstant('fileSystem.admin.filterBoth'), value: 0 }
    ];
  }

  private buildDriveOptionsWithAll(): void {
    const allLabel = this.translate.getInstant('fileSystem.admin.filterAllDrives');
    this.driveOptionsWithAll = [{ id: 0, name: allLabel }, ...this.driveOptions];
  }

  loadDrives(): void {
    const filters: VirtualDrivesFilters = {
      entityFilter: 1,
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
        this.buildDriveOptionsWithAll();
      },
      error: () => { }
    });
  }

  refreshList(): void {
    this.loadingFileSystems = true;
    this.fileSystemsService.listFileSystems({
      entityFilter: this.entityFilterFileSystems,
      driveId: this.driveFilterId,
      activeOnly: this.activeOnlyFilter
    }).subscribe({
      next: (response: any) => {
        this.loadingFileSystems = false;
        if (!response?.success) {
          this.handleError('list', response);
          return;
        }
        const raw = response.message;
        const list = Array.isArray(raw) ? raw : (raw?.File_Systems ?? raw?.file_Systems ?? []);
        this.fileSystems = (list || []).map((item: any) => this.mapItemToRow(item));
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

  /** Map API list item to FileSystemListItem (backend fields only). */
  private mapItemToRow(item: any): FileSystemListItem {
    return {
      file_System_ID: Number(item?.file_System_ID ?? item?.File_System_ID ?? 0),
      name: String(item?.name ?? item?.Name ?? ''),
      type: Number(item?.type ?? item?.Type ?? 0),
      guid: String(item?.guid ?? item?.Guid ?? ''),
      owner_ID: Number(item?.owner_ID ?? item?.Owner_ID ?? 0),
      is_Entity_FS: Boolean(item?.is_Entity_FS ?? item?.Is_Entity_FS),
      drive_ID: Number(item?.drive_ID ?? item?.Drive_ID ?? 0),
      created_At: String(item?.created_At ?? item?.Created_At ?? ''),
      created_By: Number(item?.created_By ?? item?.Created_By ?? 0),
      deleted_At: String(item?.deleted_At ?? item?.Deleted_At ?? ''),
      delete_Account_ID: Number(item?.delete_Account_ID ?? item?.Delete_Account_ID ?? 0)
    };
  }



  getFileSystemName(row: FileSystemListItem): string {
    return row?.name ?? '—';
  }

  getTypeName(row: FileSystemListItem): string {
    const type = this.fileSystemTypes.find((t) => t.id === (row?.type ?? 0));
    return type?.name ?? '—';
  }

  getDriveName(row: FileSystemListItem): string {
    const drive = this.driveOptions.find((d) => d.id === (row?.drive_ID ?? 0));
    return drive?.name ?? '—';
  }

  getStatusLabel(row: FileSystemListItem): string {
    const deletedAt = row?.deleted_At ?? '';
    const isDeleted = typeof deletedAt === 'string' && deletedAt !== '' && !deletedAt.startsWith('0001-01-01');
    return !isDeleted ? this.translate.getInstant('fileSystem.entityAdminStatus.active') : this.translate.getInstant('fileSystem.admin.inactive');
  }

  /** Used for Status column tag severity: active = success, inactive = secondary. */
  isFileSystemActive(row: FileSystemListItem): boolean {
    const deletedAt = row?.deleted_At ?? '';
    const isDeleted = typeof deletedAt === 'string' && deletedAt !== '' && !deletedAt.startsWith('0001-01-01');
    return !isDeleted;
  }

  /**
   * Build menu items for the 3-dot row menu. Uses selectedFileSystemForMenu.
   * Includes: View Details, Edit, Delete; Restore (if deleted); Recycle Bin, Restore contents, Clear.
   */
  buildFileSystemMenuItems(): void {
    const row = this.selectedFileSystemForMenu;
    const items: MenuItem[] = [
      {
        label: this.translate.getInstant('fileSystem.admin.viewDetails'),
        icon: 'pi pi-eye',
        command: () => { if (row) this.showDetailsDialog(row); }
      },
      {
        label: this.translate.getInstant('fileSystem.entityAdmin.editFileSystem'),
        icon: 'pi pi-pencil',
        command: () => { if (row) this.showEditDialog(row); }
      },
      {
        label: this.translate.getInstant('fileSystem.entityAdmin.deleteFileSystem'),
        icon: 'pi pi-trash',
        command: () => { if (row) this.showDeleteConfirm(row); }
      }
    ];
    if (row && !this.isFileSystemActive(row)) {
      items.push({
        label: this.translate.getInstant('fileSystem.entityAdmin.restoreFileSystem'),
        icon: 'pi pi-replay',
        command: () => this.showRestoreDeletedConfirm()
      });
    }
    items.push({ separator: true });
    items.push({
      label: this.translate.getInstant('fileSystem.companyStorage.openRecycleBin'),
      icon: 'pi pi-folder-open',
      command: () => { if (row) this.showRecycleBinDialogForFileSystem(row); }
    });
    items.push({
      label: this.translate.getInstant('fileSystem.companyStorage.restoreRecycleBinContents'),
      icon: 'pi pi-replay',
      command: () => this.showRestoreRecycleBinConfirm()
    });
    items.push({
      label: this.translate.getInstant('fileSystem.companyStorage.clearRecycleBin'),
      icon: 'pi pi-trash',
      command: () => this.showClearRecycleBinConfirm()
    });
    this.fileSystemMenuItems = items;
  }

  /** Open the 3-dot row menu for a file system. */
  openFileSystemMenu(menu: { toggle: (e: Event) => void }, row: FileSystemListItem, event: Event): void {
    this.selectedFileSystemForMenu = row;
    this.buildFileSystemMenuItems();
    menu.toggle(event);
  }

  /** Open recycle bin dialog with this file system pre-selected and load its contents. */
  showRecycleBinDialogForFileSystem(row: FileSystemListItem): void {
    this.recycleBinFileSystemId = row.file_System_ID;
    this.recycleBinContents = null;
    this.recycleBinDialogVisible = true;
    this.onRecycleBinFileSystemSelect();
  }

  /** Show confirmation before restoring a deleted file system. */
  showRestoreDeletedConfirm(): void {
    this.restoreDeletedConfirmVisible = true;
  }

  hideRestoreDeletedConfirm(): void {
    this.restoreDeletedConfirmVisible = false;
  }

  /** Show confirmation before restoring recycle bin contents (from row menu). */
  showRestoreRecycleBinConfirm(): void {
    this.restoreRecycleBinConfirmVisible = true;
  }

  hideRestoreRecycleBinConfirm(): void {
    this.restoreRecycleBinConfirmVisible = false;
  }

  /** Show warning confirmation before clearing recycle bin (critical – permanent). */
  showClearRecycleBinConfirm(): void {
    this.clearRecycleBinConfirmVisible = true;
  }

  hideClearRecycleBinConfirm(): void {
    this.clearRecycleBinConfirmVisible = false;
  }

  /** Restore a deleted file system (Restore_Deleted_File_System API). Called after confirm. */
  onRestoreDeletedFileSystem(): void {
    const row = this.selectedFileSystemForMenu;
    if (!row) return;
    this.restoringDeletedFileSystem = true;
    this.fileSystemsService.restoreDeletedFileSystem(row.file_System_ID).subscribe({
      next: (response: any) => {
        this.restoringDeletedFileSystem = false;
        if (!response?.success) {
          this.handleError('restoreDeleted', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('fileSystem.companyStorage.restore'),
          detail: this.translate.getInstant('fileSystem.entityAdmin.restoreFileSystemSuccess')
        });
        this.hideRestoreDeletedConfirm();
        this.refreshList();
      },
      error: () => this.restoringDeletedFileSystem = false
    });
  }

  /** Restore recycle bin contents for the file system selected in the row menu. Called after confirm. */
  onRestoreRecycleBinFromMenu(): void {
    const row = this.selectedFileSystemForMenu;
    if (!row) return;
    this.restoringRecycleBin = true;
    this.fileSystemsService.restoreFileSystemRecycleBinContents(row.file_System_ID).subscribe({
      next: (response: any) => {
        this.restoringRecycleBin = false;
        if (!response?.success) {
          this.handleError('restoreRecycleBin', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('fileSystem.companyStorage.restore'),
          detail: this.translate.getInstant('fileSystem.companyStorage.restoreSuccess')
        });
        this.hideRestoreRecycleBinConfirm();
        if (this.recycleBinDialogVisible && this.recycleBinFileSystemId === row.file_System_ID) {
          this.onRecycleBinFileSystemSelect();
        }
        this.refreshList();
      },
      error: () => this.restoringRecycleBin = false
    });
  }

  /** Clear recycle bin for the file system selected in the row menu. Called after confirm. */
  onClearRecycleBinFromMenu(): void {
    const row = this.selectedFileSystemForMenu;
    if (!row) return;
    this.clearingRecycleBin = true;
    this.fileSystemsService.clearFileSystemRecycleBin(row.file_System_ID).subscribe({
      next: (response: any) => {
        this.clearingRecycleBin = false;
        if (!response?.success) {
          this.handleError('clearRecycleBin', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('fileSystem.companyStorage.clearRecycleBin'),
          detail: this.translate.getInstant('fileSystem.companyStorage.recycleBinCleared')
        });
        this.hideClearRecycleBinConfirm();
        if (this.recycleBinDialogVisible && this.recycleBinFileSystemId === row.file_System_ID) {
          this.onRecycleBinFileSystemSelect();
        }
        this.refreshList();
      },
      error: () => this.clearingRecycleBin = false
    });
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
    this.newFileSystemDriveId = this.driveOptions.length > 0 ? this.driveOptions[0].id : null;
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
    const driveId = this.newFileSystemDriveId;
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

  showEditDialog(row: FileSystemListItem): void {
    this.selectedForEdit = row;
    this.editFileSystemName = row.name;
    this.editFileSystemTypeId = row.type ?? null;
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
    // Type can be 0 (e.g. "Regular"); only null/undefined means not selected.
    const typeId = this.editFileSystemTypeId ?? this.selectedForEdit.type;
    if (typeId === null || typeId === undefined) {
      this.messageService.add({ severity: 'warn', summary: this.translate.getInstant('fileSystem.admin.validation'), detail: this.translate.getInstant('fileSystem.admin.fileSystemTypeRequired') });
      return;
    }
    this.savingFileSystem = true;
    this.fileSystemsService.updateFileSystemDetails(this.selectedForEdit.file_System_ID, this.editFileSystemName.trim(), typeId).subscribe({
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

  showDetailsDialog(row: FileSystemListItem): void {
    this.selectedForDetails = row;
    this.detailsData = null;
    this.detailsDialogVisible = true;
    this.detailsLoading = true;
    this.fileSystemsService.getFileSystemDetails(row.file_System_ID).subscribe({
      next: (response: any) => {
        this.detailsLoading = false;
        if (!response?.success) {
          this.handleError('details', response);
          return;
        }
        const d = response?.message ?? response;
        const name = String(d?.name ?? d?.Name ?? row.name);
        const typeId = Number(d?.type ?? d?.Type ?? row?.type ?? 0);
        const typeName = String(d?.type_Name ?? d?.Type_Name ?? d?.typeName ?? (this.fileSystemTypes.find(t => t.id === typeId)?.name ?? '—'));
        const driveId = Number(d?.drive_ID ?? d?.Drive_ID ?? row?.drive_ID ?? 0);
        const drive = this.driveOptions.find(drv => drv.id === driveId);
        const driveName = drive?.name ?? '—';
        const deletedAt = String(d?.deleted_At ?? d?.Deleted_At ?? row?.deleted_At ?? '');
        const isDeleted = deletedAt !== '' && !deletedAt.startsWith('0001-01-01');
        const active = Boolean(d?.is_Active ?? d?.Is_Active ?? !isDeleted);
        const createdAt = String(d?.created_At ?? d?.Created_At ?? row?.created_At ?? '');
        this.detailsData = { name, typeName, driveName, active, createdAt };
      },
      error: () => this.detailsLoading = false
    });
  }

  hideDetailsDialog(): void {
    this.detailsDialogVisible = false;
    this.selectedForDetails = null;
    this.detailsData = null;
  }

  showDeleteConfirm(row: FileSystemListItem): void {
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
    this.fileSystemsService.deleteFileSystem(this.selectedForDelete.file_System_ID).subscribe({
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
