import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuItem, MessageService, TreeNode } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { FolderService } from '../services/folder.service';
import { FolderStructureItem, Folder, FolderContents } from '../models/folder.model';
import { getFileSystemErrorDetail } from 'src/app/modules/document-control/shared/file-system-helpers';

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
  type: 'folder' | 'file';
  size?: string;
  modified?: string;
  isFolder: boolean;
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

  // Folder contents table
  folderContents: FolderContentRow[] = [];
  showDeletedFolders = false;

  // Dialog visibility flags
  createFolderDialogVisible = false;
  renameFolderDialogVisible = false;
  moveFolderDialogVisible = false;
  deleteFolderConfirmVisible = false;
  restoreDeletedFoldersDialogVisible = false;

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

  constructor(
    private translate: TranslationService,
    private messageService: MessageService,
    private folderService: FolderService
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
        const structureItems: FolderStructureItem[] = Array.isArray(raw)
          ? raw
          : (raw?.Folders ?? raw?.folders ?? []);

        // Build tree from flat structure
        this.folderTreeNodes = this.buildTreeFromStructure(structureItems);
      },
      error: () => {
        this.treeLoading = false;
      }
    });
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
  loadFolderContents(folderId: number): void {
    if (this.fileSystemId <= 0) {
      return;
    }

    this.tableLoadingSpinner = true;
    this.currentFolderId = folderId;

    this.folderService.getFolderContents(folderId, this.fileSystemId).subscribe({
      next: (response: any) => {
        this.tableLoadingSpinner = false;
        if (!response?.success) {
          this.handleBusinessError('getContents', response);
          return;
        }

        const raw = response.message;
        const contents: FolderContents = Array.isArray(raw)
          ? { folders: [], files: raw }
          : raw ?? { folders: [], files: [] };

        // Map folders and files to table rows
        const folderRows: FolderContentRow[] = (contents.folders ?? contents.Folders ?? []).map(
          (folder: any) => ({
            id: Number(folder?.folder_ID ?? folder?.Folder_ID ?? 0),
            name: String(folder?.folder_Name ?? folder?.Folder_Name ?? ''),
            type: 'folder' as const,
            isFolder: true
          })
        );

        const fileRows: FolderContentRow[] = (contents.files ?? contents.Files ?? []).map(
          (file: any) => ({
            id: Number(file?.file_ID ?? file?.File_ID ?? 0),
            name: String(file?.file_Name ?? file?.File_Name ?? ''),
            type: 'file' as const,
            size: file?.size ? this.formatBytes(file.size) : '',
            modified: file?.modified_At ?? file?.Modified_At ?? '',
            isFolder: false
          })
        );

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
  private formatBytes(bytes: number): string {
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
      this.selectedFolderNode = folderNode;
      this.loadFolderContents(folderNode.data.folderId);
    }
  }

  /**
   * Build menu items for the 3-dot row menu. Called when opening the menu.
   */
  buildFolderMenuItems(): void {
    const folder = this.selectedFolderForMenu;
    if (!folder) {
      this.folderMenuItems = [];
      return;
    }

    this.folderMenuItems = [
      {
        label: this.translate.getInstant('fileSystem.folderManagement.renameFolder'),
        icon: 'pi pi-pencil',
        command: () => {
          if (folder) this.showRenameFolderDialog(folder);
        }
      },
      {
        label: this.translate.getInstant('fileSystem.folderManagement.moveFolder'),
        icon: 'pi pi-arrows-h',
        command: () => {
          if (folder) this.showMoveFolderDialog(folder);
        }
      },
      {
        label: this.translate.getInstant('fileSystem.folderManagement.deleteFolder'),
        icon: 'pi pi-trash',
        command: () => {
          if (folder) this.showDeleteFolderConfirm(folder);
        }
      }
    ];
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
   * Show create folder dialog.
   */
  showCreateFolderDialog(): void {
    this.newFolderName = '';
    this.newFolderParentId = this.currentFolderId;
    this.createFolderDialogVisible = true;
  }

  hideCreateFolderDialog(): void {
    this.createFolderDialogVisible = false;
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
          // Refresh contents if renamed folder is currently selected
          if (
            this.selectedFolderForRename &&
            this.currentFolderId === this.selectedFolderForRename.data.folderId
          ) {
            this.loadFolderContents(this.currentFolderId);
          }
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

        // If deleted folder was selected, navigate to parent
        if (this.currentFolderId === folderId) {
          this.currentFolderId = parentFolderId;
          this.selectedFolderNode = null;
          this.loadFolderContents(parentFolderId);
        }

        this.loadFolderStructure();
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
        this.selectedFolderNode = folderNode;
        this.onFolderNodeSelect({ node: folderNode });
      }
    }
  }
}
