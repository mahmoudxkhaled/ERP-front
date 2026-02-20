import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { MenuItem, MessageService, TreeNode } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { FolderService } from '../services/folder.service';
import { FileService } from '../services/file.service';
import { FolderStructureItem, Folder, FolderContents } from '../models/folder.model';
import { getFileSystemErrorDetail } from 'src/app/modules/document-control/shared/file-system-helpers';
import { FileUploadService } from 'src/app/core/file-system-lib/services/file-upload.service';
import { FileDownloadService } from 'src/app/core/file-system-lib/services/file-download.service';

/**
 * Represents a folder tree node with additional metadata.
 */
export interface FolderTreeNode extends TreeNode {
  data: {
    folderId: number;
    folderName: string;
    parentFolderId: number;
  };
}

/**
 * Represents a row in the folder contents table (can be folder or file).
 */
export interface FolderContentRow {
  id: number;
  name: string;
  type: 'folder' | 'file' | 'back';
  size?: string;
  modified?: string;
  isFolder: boolean;
  isBackButton?: boolean; // Special flag for back button row
}

/**
 * Folder management component for a selected File System.
 * Provides folder tree navigation, folder CRUD operations, and folder contents display.
 */
@Component({
  selector: 'app-folder-management',
  templateUrl: './folder-management.component.html',
  styleUrls: ['./folder-management.component.scss']
})
export class FolderManagementComponent implements OnInit, OnChanges {
  /** File System ID received from parent component. Must be > 0. */
  @Input() fileSystemId: number = 0;

  // Loading states
  isLoading$: Observable<boolean>;
  treeLoading = false;
  tableLoadingSpinner = false;

  // Folder tree
  folderTreeNodes: TreeNode[] = [];
  selectedFolderNode: TreeNode | null = null;
  currentFolderId: number = 0; // 0 = root folder
  parentFolderId: number = 0; // Track parent folder for back navigation

  // Folder contents table
  folderContents: FolderContentRow[] = [];
  showDeletedFolders = false;

  // Dialog visibility flags
  createFolderDialogVisible = false;
  uploadDialogVisible = false;
  renameFolderDialogVisible = false;
  moveFolderDialogVisible = false;
  deleteFolderConfirmVisible = false;
  restoreDeletedFoldersDialogVisible = false;

  // Upload state
  selectedFiles: File[] = [];
  uploadProgressPercent = 0;
  uploadInProgress = false;
  uploadError: string | null = null;
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;
  // Track upload status for each file: 'pending' | 'uploading' | 'completed' | 'error'
  fileUploadStatus = new Map<string, 'pending' | 'uploading' | 'completed' | 'error'>();
  currentUploadingFileName: string | null = null;
  isDragOver = false;

  // Form values for dialogs
  newFolderName = '';
  newFolderParentId: number = 0;
  renameFolderName = '';
  selectedFolderForRename: FolderTreeNode | null = null;
  selectedFolderForMove: FolderTreeNode | null = null;
  selectedFolderForDelete: FolderTreeNode | null = null;
  moveDestinationNode: TreeNode | null = null;
  selectedFolderForRestore: FolderTreeNode | null = null;

  // Restore deleted folders
  deletedFolders: Folder[] = [];
  selectedFoldersToRestore: number[] = [];

  // Row menu (3-dot)
  folderMenuItems: MenuItem[] = [];
  selectedFolderForMenu: FolderTreeNode | null = null;

  // File menu (3-dot)
  fileMenuItems: MenuItem[] = [];
  selectedFileForMenu: FolderContentRow | null = null;

  // File dialogs
  fileDetailsDialogVisible = false;
  renameFileDialogVisible = false;
  deleteFileConfirmVisible = false;

  // File operation state
  selectedFileForDetails: FolderContentRow | null = null;
  selectedFileForRename: FolderContentRow | null = null;
  selectedFileForDelete: FolderContentRow | null = null;
  fileDetails: any = null;
  fileDetailsLoading = false;
  renameFileName = '';
  renameFileType = '';
  downloadProgressPercent = 0;
  downloadInProgress = false;
  currentDownloadingFileName: string | null = null;
  downloadProgressVisible = false;
  downloadFileSizeBytes: number = 0;
  downloadRemainingBytes: number = 0;

  constructor(
    private translate: TranslationService,
    private messageService: MessageService,
    private folderService: FolderService,
    private fileService: FileService,
    private fileUploadService: FileUploadService,
    private fileDownloadService: FileDownloadService,
    private localStorageService: LocalStorageService
  ) {
    this.isLoading$ = this.folderService.isLoadingSubject.asObservable();
  }

  ngOnInit(): void {
    if (this.fileSystemId > 0) {
      this.loadFolderStructure();
      this.loadFolderContents(0);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fileSystemId'] && !changes['fileSystemId'].firstChange) {
      const newFileSystemId = changes['fileSystemId'].currentValue;
      if (newFileSystemId > 0) {
        this.currentFolderId = 0;
        this.parentFolderId = 0;
        this.selectedFolderNode = null;
        this.loadFolderStructure();
        this.loadFolderContents(0);
      } else {
        this.folderTreeNodes = [];
        this.folderContents = [];
      }
    }
  }

  /**
   * When loading and the contents list is empty, return placeholder rows
   * so the table can show skeleton cells.
   */
  get folderContentsTableValue(): FolderContentRow[] {
    if (this.tableLoadingSpinner && this.folderContents.length === 0) {
      return Array(5).fill(null).map(() => ({
        id: 0,
        name: '',
        type: 'folder',
        size: '',
        modified: '',
        isFolder: true
      }));
    }
    
    // Add back button row at the beginning if not in root folder
    if (this.currentFolderId !== 0 && !this.tableLoadingSpinner) {
      const backButtonRow: FolderContentRow = {
        id: -1, // Special ID for back button
        name: '',
        type: 'back',
        isFolder: false,
        isBackButton: true
      };
      return [backButtonRow, ...this.folderContents];
    }
    
    return this.folderContents;
  }

  /**
   * Load folder structure from Get_Folder_Structure API.
   * Builds the tree starting from root (Parent_Folder_ID = 0).
   */
  loadFolderStructure(): void {
    if (this.fileSystemId <= 0) {
      return;
    }

    this.treeLoading = true;
    this.folderService.getFolderStructure(this.fileSystemId, false).subscribe({
      next: (response: any) => {
        this.treeLoading = false;
        if (!response?.success) {
          this.handleBusinessError('getStructure', response);
          return;
        }

        const raw = response.message;
        // API returns array of [Folder_ID, Parent_Folder_ID, Folder_Name]
        const structureItems = this.normalizeFolderStructureResponse(raw);
        this.folderTreeNodes = this.buildTreeFromStructure(structureItems);
      },
      error: () => {
        this.treeLoading = false;
      }
    });
  }

  /**
   * Normalize Get_Folder_Structure response to FolderStructureItem[].
   * API may return array of arrays [[Folder_ID, Parent_Folder_ID, Folder_Name], ...]
   * or array of objects with folder_ID, parent_Folder_ID, folder_Name.
   */
  private normalizeFolderStructureResponse(raw: any): FolderStructureItem[] {
    if (!raw) return [];
    const list = Array.isArray(raw) ? raw : (raw?.Folders ?? raw?.folders ?? []);
    if (list.length === 0) return [];

    const first = list[0];
    // Array of arrays: [[id, parentId, name], ...]
    if (Array.isArray(first)) {
      return (list as any[][]).map((row) => ({
        folder_ID: Number(row[0] ?? 0),
        parent_Folder_ID: Number(row[1] ?? 0),
        folder_Name: String(row[2] ?? '')
      }));
    }
    // Array of objects
    return list.map((item: any) => ({
      folder_ID: Number(item?.folder_ID ?? item?.Folder_ID ?? 0),
      parent_Folder_ID: Number(item?.parent_Folder_ID ?? item?.Parent_Folder_ID ?? 0),
      folder_Name: String(item?.folder_Name ?? item?.Folder_Name ?? '')
    }));
  }

  /**
   * Build PrimeNG TreeNode[] from flat folder structure array.
   * Root folders have Parent_Folder_ID = 0.
   */
  private buildTreeFromStructure(items: FolderStructureItem[]): TreeNode[] {
    const folderMap = new Map<number, TreeNode>();

    // First pass: create all nodes
    items.forEach((item) => {
      const folderId = Number(item?.folder_ID ?? item?.Folder_ID ?? 0);
      const folderName = String(item?.folder_Name ?? item?.Folder_Name ?? '');
      const parentId = Number(item?.parent_Folder_ID ?? item?.Parent_Folder_ID ?? 0);

      const node: FolderTreeNode = {
        label: folderName,
        data: {
          folderId,
          folderName,
          parentFolderId: parentId
        },
        key: folderId.toString(),
        expanded: false,
        children: []
      };

      folderMap.set(folderId, node);
    });

    // Second pass: build hierarchy
    const rootNodes: TreeNode[] = [];
    folderMap.forEach((node) => {
      const parentId = node.data.parentFolderId;
      if (parentId === 0) {
        // Root level folder
        rootNodes.push(node);
      } else {
        // Child folder
        const parent = folderMap.get(parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
        } else {
          // Parent not found, treat as root
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }

  /**
   * Load folder contents from Get_Folder_Contents API.
   * Shows subfolders and files in the selected folder.
   */
  loadFolderContents(folderId: number, updateParent: boolean = false): void {
    if (this.fileSystemId <= 0) {
      return;
    }

    this.tableLoadingSpinner = true;
    // Update parent folder ID if needed (when navigating to a new folder)
    if (updateParent && folderId !== this.currentFolderId) {
      this.parentFolderId = this.currentFolderId;
    }
    this.currentFolderId = folderId;

    this.folderService.getFolderContents(folderId, this.fileSystemId).subscribe({
      next: (response: any) => {
        console.log('response loadFolderContents', response);
        this.tableLoadingSpinner = false;
        if (!response?.success) {
          this.handleBusinessError('getContents', response);
          return;
        }

        // API returns message: { Folders: [...], Files: [] } with snake_case properties
        const raw = response.message;
        const contents: FolderContents = raw ?? { folders: [], files: [] };
        const foldersList = contents.folders ?? contents.Folders ?? [];
        const filesList = contents.files ?? contents.Files ?? [];

        const folderRows: FolderContentRow[] = foldersList.map((folder: any) => ({
          id: Number(folder?.folder_id ?? folder?.folder_ID ?? folder?.Folder_ID ?? 0),
          name: String(folder?.folder_name ?? folder?.folder_Name ?? folder?.Folder_Name ?? ''),
          type: 'folder' as const,
          isFolder: true
        }));

        const fileRows: FolderContentRow[] = filesList.map((file: any) => ({
          id: Number(file?.file_id ?? file?.file_ID ?? file?.File_ID ?? 0),
          name: String(file?.file_name ?? file?.file_Name ?? file?.File_Name ?? ''),
          type: 'file' as const,
          size: file?.size != null ? this.formatBytes(Number(file.size)) : '',
          modified: String(file?.last_modified ?? file?.modified_At ?? file?.Modified_At ?? ''),
          isFolder: false
        }));

        this.folderContents = [...folderRows, ...fileRows];
      },
      error: () => {
        this.tableLoadingSpinner = false;
      }
    });
  }

  /**
   * Format bytes to human-readable string (e.g. "1.25 GB", "512.00 MB").
   */
  formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return gb.toFixed(2) + ' GB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? (mb.toFixed(2) + ' MB') : (bytes / 1024).toFixed(2) + ' KB';
  }

  /**
   * Handle folder node selection in tree.
   */
  onFolderNodeSelect(event: { node: TreeNode }): void {
    const folderNode = event.node as FolderTreeNode;
    if (folderNode?.data?.folderId !== undefined) {
      // Update parent folder ID before changing current folder
      this.parentFolderId = this.currentFolderId;
      this.selectedFolderNode = folderNode;
      this.loadFolderContents(folderNode.data.folderId);
    }
  }

  /**
   * Build menu items for the 3-dot row menu. Called when opening the menu.
   * Every folder gets: Create folder, Upload, Rename, Move, Delete.
   */
  buildFolderMenuItems(): void {
    const folder = this.selectedFolderForMenu;
    if (!folder) {
      this.folderMenuItems = [];
      return;
    }

    this.folderMenuItems = [
      {
        label: this.translate.getInstant('fileSystem.folderManagement.createFolder'),
        icon: 'pi pi-plus',
        command: () => this.showCreateFolderDialogForFolder(folder)
      },
      {
        label: this.translate.getInstant('fileSystem.folderManagement.upload'),
        icon: 'pi pi-upload',
        command: () => this.showUploadDialogForFolder(folder)
      },
      { separator: true },
      {
        label: this.translate.getInstant('fileSystem.folderManagement.renameFolder'),
        icon: 'pi pi-pencil',
        command: () => this.showRenameFolderDialog(folder)
      },
      {
        label: this.translate.getInstant('fileSystem.folderManagement.moveFolder'),
        icon: 'pi pi-arrows-h',
        command: () => this.showMoveFolderDialog(folder)
      },
      {
        label: this.translate.getInstant('fileSystem.folderManagement.deleteFolder'),
        icon: 'pi pi-trash',
        command: () => this.showDeleteFolderConfirm(folder)
      }
    ];
  }

  /**
   * Open create folder dialog with the clicked folder as parent.
   */
  showCreateFolderDialogForFolder(folder: FolderTreeNode): void {
    const folderId = folder?.data?.folderId ?? 0;
    this.newFolderName = '';
    this.newFolderParentId = folderId;
    this.createFolderDialogVisible = true;
  }

  /**
   * Open upload dialog for the clicked folder (set as current folder and show upload).
   */
  showUploadDialogForFolder(folder: FolderTreeNode): void {
    const folderId = folder?.data?.folderId ?? 0;
    this.currentFolderId = folderId;
    this.selectedFolderNode = folder;
    this.loadFolderContents(folderId);
    this.showUploadDialog();
  }

  /**
   * Open the 3-dot row menu for a folder.
   */
  openFolderMenu(menu: { toggle: (e: Event) => void }, node: FolderTreeNode, event: Event): void {
    event.stopPropagation();
    this.selectedFolderForMenu = node;
    this.buildFolderMenuItems();
    menu.toggle(event);
  }

  /**
   * Show create folder dialog. Always creates a new root-level (parent) folder.
   */
  showCreateFolderDialog(): void {
    this.newFolderName = '';
    this.newFolderParentId = 0;
    this.createFolderDialogVisible = true;
  }

  hideCreateFolderDialog(): void {
    this.createFolderDialogVisible = false;
  }

  /**
   * Show upload files dialog.
   */
  showUploadDialog(): void {
    this.uploadDialogVisible = true;
    this.selectedFiles = [];
    this.uploadError = null;
    this.uploadProgressPercent = 0;
    this.fileUploadStatus.clear();
    this.currentUploadingFileName = null;
    this.isDragOver = false;
  }

  hideUploadDialog(): void {
    this.uploadDialogVisible = false;
    this.selectedFiles = [];
    this.uploadError = null;
    this.uploadProgressPercent = 0;
    this.fileUploadStatus.clear();
    this.currentUploadingFileName = null;
    this.isDragOver = false;
    // Reset file input so user can select same files again
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  /**
   * Trigger file input click programmatically.
   */
  triggerFileInput(): void {
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.click();
    }
  }

  /**
   * Handle file input change; add selected files to existing list.
   */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newFiles = Array.from(input.files ?? []);
    this.uploadError = null;

    // Add new files to existing list (avoid duplicates by name and size)
    newFiles.forEach(newFile => {
      const isDuplicate = this.selectedFiles.some(
        existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size
      );
      if (!isDuplicate) {
        this.selectedFiles.push(newFile);
        this.fileUploadStatus.set(newFile.name, 'pending');
      }
    });

    // Reset input so user can select same files again
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  /**
   * Format file size in bytes to human-readable format (KB, MB, GB).
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get upload status for a file.
   */
  getFileUploadStatus(fileName: string): 'pending' | 'uploading' | 'completed' | 'error' {
    return this.fileUploadStatus.get(fileName) || 'pending';
  }

  /**
   * Handle drag over event - prevent default and show visual feedback.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.uploadInProgress) {
      this.isDragOver = true;
    }
  }

  /**
   * Handle drag leave event - remove visual feedback.
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handle drop event - add dropped files to existing list.
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (this.uploadInProgress) {
      return;
    }

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      this.uploadError = null;

      // Add new files to existing list (avoid duplicates by name and size)
      newFiles.forEach(newFile => {
        const isDuplicate = this.selectedFiles.some(
          existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size
        );
        if (!isDuplicate) {
          this.selectedFiles.push(newFile);
          this.fileUploadStatus.set(newFile.name, 'pending');
        }
      });
    }
  }

  /**
   * Remove a file from the selected files list.
   */
  removeFile(fileToRemove: File): void {
    if (this.uploadInProgress) {
      return;
    }

    // Remove file from list
    this.selectedFiles = this.selectedFiles.filter(file => file !== fileToRemove);
    // Remove from status map
    this.fileUploadStatus.delete(fileToRemove.name);
  }

  /**
   * Build menu items for the 3-dot file menu. Called when opening the menu.
   * Every file gets: Download, View Details, Rename, Delete.
   */
  buildFileMenuItems(): void {
    const file = this.selectedFileForMenu;
    if (!file) {
      this.fileMenuItems = [];
      return;
    }

    this.fileMenuItems = [
      {
        label: this.translate.getInstant('fileSystem.folderManagement.downloadFile'),
        icon: 'pi pi-download',
        command: () => this.downloadFile(file)
      },
      {
        label: this.translate.getInstant('fileSystem.folderManagement.viewFileDetails'),
        icon: 'pi pi-info-circle',
        command: () => this.showFileDetailsDialog(file)
      },
      {
        label: this.translate.getInstant('fileSystem.folderManagement.renameFile'),
        icon: 'pi pi-pencil',
        command: () => this.showRenameFileDialog(file)
      },
      { separator: true },
      {
        label: this.translate.getInstant('fileSystem.folderManagement.deleteFile'),
        icon: 'pi pi-trash',
        command: () => this.showDeleteFileConfirm(file)
      }
    ];
  }

  /**
   * Show file menu at click position.
   */
  openFileMenu(menu: { toggle: (e: Event) => void }, file: FolderContentRow, event: Event): void {
    event.stopPropagation();
    this.selectedFileForMenu = file;
    this.buildFileMenuItems();
    menu.toggle(event);
  }

  /**
   * Download file using FileDownloadService.
   */
  async downloadFile(file: FolderContentRow): Promise<void> {
    if (this.downloadInProgress || this.fileSystemId <= 0) {
      return;
    }

    const accessToken = this.localStorageService.getAccessToken();
    this.downloadInProgress = true;
    this.downloadProgressPercent = 0;
    this.currentDownloadingFileName = file.name;
    this.downloadFileSizeBytes = 0;
    this.downloadRemainingBytes = 0;
    this.downloadProgressVisible = true;

    // Get file details to get file size
    try {
      const fileDetailsResponse = await firstValueFrom(
        this.fileService.getFileDetails(file.id, this.currentFolderId, this.fileSystemId)
      );

      if (fileDetailsResponse?.success && fileDetailsResponse?.message) {
        const fileSize = fileDetailsResponse.message.size || fileDetailsResponse.message.file_size || 0;
        this.downloadFileSizeBytes = Number(fileSize) || 0;
        this.downloadRemainingBytes = this.downloadFileSizeBytes;
      }
    } catch (err) {
      // If we can't get file size, continue without it
      console.warn('Could not get file size for download progress', err);
    }

    try {
      const blob = await this.fileDownloadService.downloadFile(
        accessToken,
        BigInt(file.id),
        BigInt(this.currentFolderId),
        this.fileSystemId,
        (percent) => {
          const progress = Math.round(percent);
          this.downloadProgressPercent = progress;

          // Calculate remaining bytes if we have file size
          if (this.downloadFileSizeBytes > 0) {
            const downloadedBytes = (this.downloadFileSizeBytes * progress) / 100;
            this.downloadRemainingBytes = Math.max(0, this.downloadFileSizeBytes - downloadedBytes);
          }
        }
      );

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Hide progress component and show success message
      this.downloadProgressVisible = false;
      this.messageService.add({
        severity: 'success',
        summary: this.translate.getInstant('fileSystem.folderManagement.success'),
        detail: this.translate.getInstant('fileSystem.folderManagement.downloadFileSuccess')
      });
    } catch (err: unknown) {
      const response = this.normalizeUploadError(err);
      const detail = getFileSystemErrorDetail(response, (key) =>
        this.translate.getInstant(key)
      );
      this.downloadProgressVisible = false;
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('fileSystem.folderManagement.error'),
        detail: detail || this.translate.getInstant('fileSystem.folderManagement.errorUnknown')
      });
    } finally {
      this.downloadInProgress = false;
      this.downloadProgressPercent = 0;
      this.currentDownloadingFileName = null;
      this.downloadFileSizeBytes = 0;
      this.downloadRemainingBytes = 0;
    }
  }

  /**
   * Hide download progress component.
   */
  hideDownloadProgress(): void {
    this.downloadProgressVisible = false;
  }

  /**
   * Show file details dialog and load file details.
   */
  showFileDetailsDialog(file: FolderContentRow): void {
    this.selectedFileForDetails = file;
    this.fileDetails = null;
    this.fileDetailsLoading = true;
    this.fileDetailsDialogVisible = true;

    this.fileService
      .getFileDetails(file.id, this.currentFolderId, this.fileSystemId)
      .subscribe({
        next: (response: any) => {
          this.fileDetailsLoading = false;
          if (!response?.success) {
            this.handleFileError('getDetails', response);
            return;
          }
          this.fileDetails = response.message || response;
        },
        error: (err) => {
          this.fileDetailsLoading = false;
          this.handleFileError('getDetails', err);
        }
      });
  }

  /**
   * Hide file details dialog.
   */
  hideFileDetailsDialog(): void {
    this.fileDetailsDialogVisible = false;
    this.selectedFileForDetails = null;
    this.fileDetails = null;
  }

  /**
   * Show rename file dialog.
   */
  showRenameFileDialog(file: FolderContentRow): void {
    this.selectedFileForRename = file;
    this.renameFileName = file.name;
    // Extract file type from name if possible, or use default
    const nameParts = file.name.split('.');
    this.renameFileType = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    this.renameFileDialogVisible = true;
  }

  /**
   * Hide rename file dialog.
   */
  hideRenameFileDialog(): void {
    this.renameFileDialogVisible = false;
    this.selectedFileForRename = null;
    this.renameFileName = '';
    this.renameFileType = '';
  }

  /**
   * Save renamed file.
   */
  onRenameFileSave(): void {
    if (!this.selectedFileForRename) {
      return;
    }

    const fileName = (this.renameFileName || '').trim();
    const fileType = (this.renameFileType || '').trim();

    if (!fileName) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
        detail: this.translate.getInstant('fileSystem.folderManagement.fileNameRequired')
      });
      return;
    }

    this.fileService
      .updateFileDetails(
        this.selectedFileForRename.id,
        this.currentFolderId,
        this.fileSystemId,
        fileName,
        fileType
      )
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleFileError('update', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.renameFileSuccess')
          });
          this.hideRenameFileDialog();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Show delete file confirmation dialog.
   */
  showDeleteFileConfirm(file: FolderContentRow): void {
    this.selectedFileForDelete = file;
    this.deleteFileConfirmVisible = true;
  }

  /**
   * Hide delete file confirmation dialog.
   */
  hideDeleteFileConfirm(): void {
    this.deleteFileConfirmVisible = false;
    this.selectedFileForDelete = null;
  }

  /**
   * Confirm delete file operation.
   */
  onDeleteFileConfirm(): void {
    if (!this.selectedFileForDelete) {
      return;
    }

    const fileId = this.selectedFileForDelete.id;
    this.fileService
      .deleteFileAllocation(fileId, this.currentFolderId, this.fileSystemId)
      .subscribe({
        next: (response: any) => {
          console.log('response delete file allocation', response);
          if (!response?.success) {
            this.handleFileError('delete', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.deleteFileSuccess')
          });
          this.hideDeleteFileConfirm();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Handle file operation errors.
   */
  private handleFileError(operation: string, response: any): void {
    const detail = getFileSystemErrorDetail(response, (key) =>
      this.translate.getInstant(key)
    );
    this.messageService.add({
      severity: 'error',
      summary: this.translate.getInstant('fileSystem.folderManagement.error'),
      detail: detail || this.translate.getInstant('fileSystem.folderManagement.errorUnknown')
    });
  }

  /**
   * Upload selected files to the current folder.
   */
  async onUploadConfirm(): Promise<void> {
    if (this.selectedFiles.length === 0 || this.fileSystemId <= 0) {
      return;
    }

    const accessToken = this.localStorageService.getAccessToken();
    this.uploadInProgress = true;
    this.uploadError = null;
    const totalFiles = this.selectedFiles.length;

    try {
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const file = this.selectedFiles[i];
        this.currentUploadingFileName = file.name;
        this.fileUploadStatus.set(file.name, 'uploading');

        await this.fileUploadService.uploadFile(
          file,
          accessToken,
          this.fileSystemId,
          BigInt(this.currentFolderId),
          (percent) => {
            // Calculate overall progress: completed files + current file progress
            const completedFiles = Array.from(this.fileUploadStatus.values()).filter(s => s === 'completed').length;
            const currentFileProgress = percent / 100;
            const overallProgress = ((completedFiles + currentFileProgress) / totalFiles) * 100;
            this.uploadProgressPercent = Math.round(overallProgress);
          }
        );

        // Mark file as completed after successful upload
        this.fileUploadStatus.set(file.name, 'completed');
        this.currentUploadingFileName = null;
      }

      this.messageService.add({
        severity: 'success',
        summary: this.translate.getInstant('fileSystem.folderManagement.success'),
        detail: this.translate.getInstant('fileSystem.folderManagement.fileUploadedSuccess')
      });
      this.hideUploadDialog();
      this.loadFolderContents(this.currentFolderId);
    } catch (err: unknown) {
      // Mark current file as error if upload failed
      if (this.currentUploadingFileName) {
        this.fileUploadStatus.set(this.currentUploadingFileName, 'error');
        this.currentUploadingFileName = null;
      }
      const response = this.normalizeUploadError(err);
      const detail = getFileSystemErrorDetail(response, (key) =>
        this.translate.getInstant(key)
      );
      this.uploadError = detail || this.translate.getInstant('fileSystem.folderManagement.errorUnknown');
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('fileSystem.folderManagement.error'),
        detail: this.uploadError
      });
    } finally {
      this.uploadInProgress = false;
    }
  }

  /**
   * Build a response-like object for getFileSystemErrorDetail from a thrown error.
   */
  private normalizeUploadError(err: unknown): Record<string, unknown> {
    if (!err || typeof err !== 'object') {
      return {};
    }
    const e = err as Record<string, unknown>;
    if (typeof e['Body'] === 'string') {
      try {
        return JSON.parse(e['Body'] as string) as Record<string, unknown>;
      } catch {
        return { message: e['Body'] };
      }
    }
    if (e['error'] && typeof e['error'] === 'object') {
      return e['error'] as Record<string, unknown>;
    }
    if (typeof e['error'] === 'string') {
      return { message: e['error'] };
    }
    return e;
  }

  /**
   * Create new folder.
   */
  onCreateFolderConfirm(): void {
    const folderName = (this.newFolderName || '').trim();
    if (!folderName) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
        detail: this.translate.getInstant('fileSystem.folderManagement.folderNameRequired')
      });
      return;
    }

    this.folderService
      .createFolder(this.fileSystemId, folderName, this.newFolderParentId)
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('create', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.createFolderSuccess')
          });
          this.hideCreateFolderDialog();
          this.loadFolderStructure();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Show rename folder dialog.
   */
  showRenameFolderDialog(folder: FolderTreeNode): void {
    this.selectedFolderForRename = folder;
    this.renameFolderName = folder.data.folderName;
    this.renameFolderDialogVisible = true;
  }

  hideRenameFolderDialog(): void {
    this.renameFolderDialogVisible = false;
    this.selectedFolderForRename = null;
  }

  /**
   * Save renamed folder.
   */
  onRenameFolderSave(): void {
    if (!this.selectedFolderForRename) {
      return;
    }

    const folderName = (this.renameFolderName || '').trim();
    if (!folderName) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
        detail: this.translate.getInstant('fileSystem.folderManagement.folderNameRequired')
      });
      return;
    }

    this.folderService
      .updateFolderDetails(
        this.selectedFolderForRename.data.folderId,
        this.fileSystemId,
        folderName
      )
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('update', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.renameFolderSuccess')
          });
          this.hideRenameFolderDialog();
          this.loadFolderStructure();
          // Always refresh contents so the new name appears (e.g. when renamed folder is a child in current view)
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Show move folder dialog.
   */
  showMoveFolderDialog(folder: FolderTreeNode): void {
    this.selectedFolderForMove = folder;
    this.moveDestinationNode = null;
    this.moveFolderDialogVisible = true;
  }

  hideMoveFolderDialog(): void {
    this.moveFolderDialogVisible = false;
    this.selectedFolderForMove = null;
    this.moveDestinationNode = null;
  }

  /**
   * Confirm move folder operation.
   */
  onMoveFolderConfirm(): void {
    if (!this.selectedFolderForMove || !this.moveDestinationNode) {
      return;
    }

    const destinationNode = this.moveDestinationNode as FolderTreeNode;
    const newParentId = destinationNode?.data?.folderId ?? 0;

    // Validation: cannot move to itself or its children
    if (this.isDescendantOf(this.selectedFolderForMove.data.folderId, newParentId)) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('fileSystem.folderManagement.error'),
        detail: this.translate.getInstant('fileSystem.folderManagement.cannotMoveToSelfOrChild')
      });
      return;
    }

    this.folderService
      .moveFolder(
        this.selectedFolderForMove.data.folderId,
        this.fileSystemId,
        newParentId
      )
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('move', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.moveFolderSuccess')
          });
          this.hideMoveFolderDialog();
          this.loadFolderStructure();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Check if folderId is a descendant of ancestorId in the tree.
   */
  private isDescendantOf(folderId: number, ancestorId: number): boolean {
    if (folderId === ancestorId) {
      return true;
    }

    const findNodeById = (nodes: TreeNode[], id: number): TreeNode | null => {
      for (const node of nodes) {
        const nodeId = (node as FolderTreeNode).data?.folderId;
        if (nodeId === id) {
          return node;
        }
        if (node.children && node.children.length > 0) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const ancestorNode = findNodeById(this.folderTreeNodes, ancestorId);
    if (!ancestorNode) {
      return false;
    }

    const checkDescendants = (node: TreeNode, targetId: number): boolean => {
      if ((node as FolderTreeNode).data?.folderId === targetId) {
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (checkDescendants(child, targetId)) {
            return true;
          }
        }
      }
      return false;
    };

    return checkDescendants(ancestorNode, folderId);
  }

  /**
   * Show delete folder confirmation dialog.
   */
  showDeleteFolderConfirm(folder: FolderTreeNode): void {
    this.selectedFolderForDelete = folder;
    this.deleteFolderConfirmVisible = true;
  }

  hideDeleteFolderConfirm(): void {
    this.deleteFolderConfirmVisible = false;
    this.selectedFolderForDelete = null;
  }

  /**
   * Confirm delete folder operation.
   */
  onDeleteFolderConfirm(): void {
    if (!this.selectedFolderForDelete) {
      return;
    }

    const folderId = this.selectedFolderForDelete.data.folderId;
    const parentFolderId = this.selectedFolderForDelete.data.parentFolderId;
    this.folderService.deleteFolder(folderId, this.fileSystemId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('delete', response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('fileSystem.folderManagement.success'),
          detail: this.translate.getInstant('fileSystem.folderManagement.deleteFolderSuccess')
        });
        this.hideDeleteFolderConfirm();

        // If deleted folder was selected, switch view to parent
        if (this.currentFolderId === folderId) {
          this.currentFolderId = parentFolderId;
          this.selectedFolderNode = null;
        }

        this.loadFolderStructure();
        // Refresh contents so table reflects the change (e.g. deleted folder disappears from list)
        this.loadFolderContents(this.currentFolderId);
      }
    });
  }

  /**
   * Show restore deleted folders dialog.
   */
  showRestoreDeletedFoldersDialog(): void {
    this.restoreDeletedFoldersDialogVisible = true;
    this.selectedFoldersToRestore = [];
    this.loadDeletedFolders();
  }

  hideRestoreDeletedFoldersDialog(): void {
    this.restoreDeletedFoldersDialogVisible = false;
    this.selectedFoldersToRestore = [];
    this.deletedFolders = [];
  }

  /**
   * Load deleted folders (placeholder - API may need to be called differently).
   */
  private loadDeletedFolders(): void {
    // This would typically call an API to get deleted folders
    // For now, we'll leave it empty as the API spec doesn't explicitly mention
    // a "List_Deleted_Folders" endpoint - restore uses folder IDs directly
    this.deletedFolders = [];
  }

  /**
   * Restore selected deleted folders.
   */
  onRestoreDeletedFoldersConfirm(): void {
    if (this.selectedFoldersToRestore.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.folderManagement.validation'),
        detail: this.translate.getInstant('fileSystem.folderManagement.selectFoldersToRestore')
      });
      return;
    }

    this.folderService
      .restoreDeletedFolders(this.selectedFoldersToRestore, this.fileSystemId)
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('restore', response);
            return;
          }

          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.folderManagement.success'),
            detail: this.translate.getInstant('fileSystem.folderManagement.restoreFoldersSuccess')
          });
          this.hideRestoreDeletedFoldersDialog();
          this.loadFolderStructure();
          this.loadFolderContents(this.currentFolderId);
        }
      });
  }

  /**
   * Handle business error codes returned from Folder APIs.
   */
  private handleBusinessError(
    context:
      | 'getStructure'
      | 'getContents'
      | 'create'
      | 'update'
      | 'delete'
      | 'move'
      | 'restore',
    response: any
  ): void {
    const summary = this.translate.getInstant('fileSystem.folderManagement.error');
    const fallback = this.translate.getInstant('fileSystem.folderManagement.errorUnknown');
    const detail = getFileSystemErrorDetail(response, (key) =>
      this.translate.getInstant(key)
    );

    this.messageService.add({
      severity: 'error',
      summary,
      detail: detail || fallback
    });

    if (context === 'getStructure') {
      this.treeLoading = false;
    }
    if (context === 'getContents') {
      this.tableLoadingSpinner = false;
    }
  }

  /**
   * Check if a node is the root node (folderId = 0 or parentFolderId = 0).
   */
  isRootNode(node: TreeNode): boolean {
    const folderNode = node as FolderTreeNode;
    return (
      folderNode?.data?.folderId === 0 ||
      folderNode?.data?.parentFolderId === 0
    );
  }

  /**
   * Get display name for folder content row.
   */
  getContentRowName(row: FolderContentRow): string {
    return row?.name ?? '—';
  }

  /**
   * Get display type for folder content row.
   */
  getContentRowType(row: FolderContentRow): string {
    return row.isFolder
      ? this.translate.getInstant('fileSystem.folderManagement.typeFolder')
      : this.translate.getInstant('fileSystem.folderManagement.typeFile');
  }

  /**
   * Handle double-click on folder content row (navigate into folder).
   */
  onContentRowDoubleClick(row: FolderContentRow): void {
    if (row.isFolder) {
      // Find and select the folder node in tree, then load its contents
      const findNodeById = (nodes: TreeNode[], id: number): TreeNode | null => {
        for (const node of nodes) {
          const nodeId = (node as FolderTreeNode).data?.folderId;
          if (nodeId === id) {
            return node;
          }
          if (node.children && node.children.length > 0) {
            const found = findNodeById(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const folderNode = findNodeById(this.folderTreeNodes, row.id);
      if (folderNode) {
        // Update parent folder ID before navigating
        this.parentFolderId = this.currentFolderId;
        this.selectedFolderNode = folderNode;
        this.onFolderNodeSelect({ node: folderNode });
      }
    }
  }

  /**
   * Navigate back to parent folder (like WinRAR back button).
   */
  goBack(): void {
    if (this.parentFolderId === 0) {
      // Go to root
      this.selectedFolderNode = null;
      this.loadFolderContents(0, false);
      this.parentFolderId = 0;
      return;
    }

    // Find parent folder node in tree
    const findNodeById = (nodes: TreeNode[], id: number): TreeNode | null => {
      for (const node of nodes) {
        const nodeId = (node as FolderTreeNode).data?.folderId;
        if (nodeId === id) {
          return node;
        }
        if (node.children && node.children.length > 0) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const parentNode = findNodeById(this.folderTreeNodes, this.parentFolderId);
    if (parentNode) {
      const parentFolderNode = parentNode as FolderTreeNode;
      // Get the parent's parent folder ID for next back navigation
      const grandParentId = parentFolderNode.data?.parentFolderId ?? 0;
      const newParentId = grandParentId;
      this.parentFolderId = newParentId;
      this.selectedFolderNode = parentNode;
      this.loadFolderContents(parentFolderNode.data.folderId, false);
    } else {
      // Parent not found in tree, go to root
      this.selectedFolderNode = null;
      this.loadFolderContents(0, false);
      this.parentFolderId = 0;
    }
  }
}
