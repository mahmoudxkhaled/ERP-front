import { Component, OnInit } from '@angular/core';
import { MenuItem, TreeNode } from 'primeng/api';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface MockFile {
    id: number;
    name: string;
    folderId: string;
    type: string;
    size: string;
    modified: string;
}

export interface BreadcrumbItem {
    labelKey?: string;
    customLabel?: string;
    folderId: string;
}

@Component({
    selector: 'app-company-storage',
    templateUrl: './company-storage.component.html',
    styleUrls: ['./company-storage.component.scss']
})
export class CompanyStorageComponent implements OnInit {
    uploadDialogVisible = false;
    newFolderDialogVisible = false;
    renameFolderDialogVisible = false;
    moveFolderDialogVisible = false;
    moveFileDialogVisible = false;
    fileDetailsDialogVisible = false;
    folderDetailsDialogVisible = false;
    editFileDialogVisible = false;
    recycleBinDialogVisible = false;
    allocateFileDialogVisible = false;
    downloadProgressDialogVisible = false;

    newFolderName = '';
    renameFolderName = '';
    nodeToRename: TreeNode | null = null;

    newFileName = '';
    newFileType: string = 'pdf';
    fileTypeOptions = [
        { label: 'PDF', value: 'pdf' },
        { label: 'Word', value: 'word' },
        { label: 'Excel', value: 'excel' }
    ];

    allocationTypeOptions = [
        { label: 'General', value: 1 },
        { label: 'Archival', value: 2 },
        { label: 'Temporary', value: 3 }
    ];

    nodeForMoveFolder: TreeNode | null = null;
    fileForMove: MockFile | null = null;
    fileForDetails: MockFile | null = null;
    fileForEdit: MockFile | null = null;
    folderNodeForDetails: TreeNode | null = null;
    editFileName = '';
    editFileType = 'pdf';
    allocateFileId = '';
    allocateFolderId = 'root';
    allocateType = 1;
    downloadProgressValue = 0;

    recycleBinItems: { name: string; isFolder: boolean }[] = [
        { name: 'Old-Report.pdf', isFolder: false },
        { name: 'Draft-Folder', isFolder: true }
    ];

    folderMenuItems: MenuItem[] = [];
    fileMenuItems: MenuItem[] = [];
    currentFolderNodeForMenu: TreeNode | null = null;
    currentFileForMenu: MockFile | null = null;

    nextFolderId = 1000;
    nextFileId = 9;

    selectedFolderId: string = 'root';
    breadcrumbItems: BreadcrumbItem[] = [{ labelKey: 'fileSystem.companyStorageView.title', folderId: 'root' }];

    // OSFS: Select drive then file system (owned by entity)
    selectedDriveId: number | null = null;
    selectedFileSystemId: number | null = null;
    entityDriveOptions: { id: number; name: string }[] = [
        { id: 1, name: 'Company Main' },
        { id: 2, name: 'Archive' }
    ];
    fileSystemOptionsInDrive: { id: number; name: string }[] = [];

    folderTree: TreeNode[] = [
        {
            label: '',
            data: { id: 'root', labelKey: 'fileSystem.folders.companyStorage' },
            key: 'root',
            expanded: true,
            children: [
                {
                    label: '',
                    data: { id: 'finance', labelKey: 'fileSystem.folders.finance' },
                    key: 'finance',
                    expanded: false,
                    children: [
                        { label: '', data: { id: 'finance-reports', labelKey: 'fileSystem.folders.reports' }, key: 'finance-reports', leaf: true },
                        { label: '', data: { id: 'finance-invoices', labelKey: 'fileSystem.folders.invoices' }, key: 'finance-invoices', leaf: true }
                    ]
                },
                {
                    label: '',
                    data: { id: 'hr', labelKey: 'fileSystem.folders.hr' },
                    key: 'hr',
                    expanded: false,
                    children: [
                        { label: '', data: { id: 'hr-policies', labelKey: 'fileSystem.folders.policies' }, key: 'hr-policies', leaf: true },
                        { label: '', data: { id: 'hr-templates', labelKey: 'fileSystem.folders.templates' }, key: 'hr-templates', leaf: true }
                    ]
                },
                {
                    label: '',
                    data: { id: 'projects', labelKey: 'fileSystem.folders.projects' },
                    key: 'projects',
                    expanded: false,
                    children: [
                        { label: '', data: { id: 'projects-alpha', labelKey: 'fileSystem.folders.alpha' }, key: 'projects-alpha', leaf: true },
                        { label: '', data: { id: 'projects-beta', labelKey: 'fileSystem.folders.beta' }, key: 'projects-beta', leaf: true }
                    ]
                }
            ]
        }
    ];

    allFiles: MockFile[] = [
        { id: 1, name: 'Q4-Report.pdf', folderId: 'finance', type: 'pdf', size: '1.2 MB', modified: '2024-01-15' },
        { id: 2, name: 'Budget-2024.xlsx', folderId: 'finance', type: 'excel', size: '456 KB', modified: '2024-01-10' },
        { id: 3, name: 'Policy-Handbook.docx', folderId: 'hr', type: 'word', size: '890 KB', modified: '2024-01-08' },
        { id: 4, name: 'Leave-Form.docx', folderId: 'hr', type: 'word', size: '120 KB', modified: '2024-01-05' },
        { id: 5, name: 'Project-Plan.docx', folderId: 'projects', type: 'word', size: '234 KB', modified: '2024-01-12' },
        { id: 6, name: 'Meeting-Notes.pdf', folderId: 'projects', type: 'pdf', size: '78 KB', modified: '2024-01-14' },
        { id: 7, name: 'Summary.pdf', folderId: 'finance-reports', type: 'pdf', size: '2.1 MB', modified: '2024-01-03' },
        { id: 8, name: 'Template.docx', folderId: 'hr-templates', type: 'word', size: '45 KB', modified: '2024-01-01' }
    ];

    selectedNode: TreeNode | null = null;
    moveDestinationNode: TreeNode | null = null;

    constructor(
        private translate: TranslationService,
        private confirmationService: ConfirmationService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.applyTranslationsToTree(this.folderTree);
    }

    onDriveSelected(): void {
        this.selectedFileSystemId = null;
        if (this.selectedDriveId == null) {
            this.fileSystemOptionsInDrive = [];
            return;
        }
        // Placeholder: load file systems for selected drive when API exists.
        this.fileSystemOptionsInDrive = [
            { id: 1, name: this.translate.getInstant('fileSystem.folders.companyStorage') },
            { id: 2, name: this.translate.getInstant('fileSystem.admin.driveArchive') }
        ];
    }

    onFileSystemSelected(): void {
        // Explorer content is already bound to current state; when selectedFileSystemId is set, UI shows.
    }

    get currentFolderFiles(): MockFile[] {
        return this.allFiles.filter(f => f.folderId === this.selectedFolderId);
    }

    get breadcrumbModel(): MenuItem[] {
        return this.breadcrumbItems.map(item => ({
            label: item.customLabel ?? this.translate.getInstant(item.labelKey ?? 'fileSystem.folders.folder'),
            command: () => this.onBreadcrumbItemSelect(item)
        }));
    }

    private applyTranslationsToTree(nodes: TreeNode[]): void {
        nodes.forEach(n => {
            if (n.data?.customLabel != null) {
                n.label = n.data.customLabel;
            } else {
                const key = n.data?.labelKey;
                n.label = key ? this.translate.getInstant(key) : this.translate.getInstant('fileSystem.folders.folder');
            }
            if (n.children && n.children.length > 0) {
                this.applyTranslationsToTree(n.children);
            }
        });
    }

    onNodeSelect(event: { node: TreeNode }): void {
        const data = event.node.data;
        if (data && data.id) {
            this.selectedFolderId = data.id;
            this.buildBreadcrumbFromNode(event.node);
        }
    }

    onBreadcrumbItemSelect(item: BreadcrumbItem): void {
        this.selectedFolderId = item.folderId;
        const index = this.breadcrumbItems.findIndex(b => b.folderId === item.folderId);
        if (index >= 0) {
            this.breadcrumbItems = this.breadcrumbItems.slice(0, index + 1);
        }
        const node = this.findNodeById(this.folderTree, item.folderId);
        this.selectedNode = node ?? null;
    }

    showUploadDialog(): void {
        this.newFileName = '';
        this.newFileType = 'pdf';
        this.uploadDialogVisible = true;
    }

    hideUploadDialog(): void {
        this.uploadDialogVisible = false;
    }

    showNewFolderDialog(): void {
        this.newFolderName = '';
        this.newFolderDialogVisible = true;
    }

    hideNewFolderDialog(): void {
        this.newFolderDialogVisible = false;
    }

    createFolder(): void {
        const name = (this.newFolderName || '').trim();
        if (!name) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.getInstant('fileSystem.companyStorage.validationRequired'),
                detail: this.translate.getInstant('fileSystem.companyStorage.newFolderNameRequired')
            });
            return;
        }
        const parent = this.findNodeById(this.folderTree, this.selectedFolderId);
        if (!parent) return;
        if (!parent.children) parent.children = [];
        const newId = 'gen-' + this.nextFolderId++;
        const newNode: TreeNode = {
            label: name,
            data: { id: newId, customLabel: name },
            key: newId,
            leaf: true
        };
        parent.children = [...parent.children, newNode];
        this.hideNewFolderDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.companyStorage.folderCreatedSuccess')
        });
    }

    showRenameDialog(node: TreeNode): void {
        if (node.data?.id === 'root') return;
        this.nodeToRename = node;
        this.renameFolderName = node.label ?? (node.data?.customLabel ?? '');
        this.renameFolderDialogVisible = true;
    }

    hideRenameDialog(): void {
        this.renameFolderDialogVisible = false;
        this.nodeToRename = null;
    }

    saveRenameFolder(): void {
        const name = (this.renameFolderName || '').trim();
        if (!name || !this.nodeToRename) return;
        this.nodeToRename.label = name;
        if (this.nodeToRename.data) this.nodeToRename.data.customLabel = name;
        this.updateBreadcrumbItemsLabel(this.nodeToRename.data?.id, name);
        this.hideRenameDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.companyStorage.folderRenamedSuccess')
        });
    }

    private updateBreadcrumbItemsLabel(folderId: string | undefined, customLabel: string): void {
        if (!folderId) return;
        this.breadcrumbItems = this.breadcrumbItems.map(b =>
            b.folderId === folderId ? { ...b, customLabel } : b
        );
    }

    confirmDeleteFolder(node: TreeNode): void {
        if (node.data?.id === 'root') return;
        this.confirmationService.confirm({
            message: this.translate.getInstant('fileSystem.companyStorage.confirmDeleteFolder'),
            header: this.translate.getInstant('fileSystem.companyStorage.deleteFolder'),
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.deleteFolder(node)
        });
    }

    private deleteFolder(node: TreeNode): void {
        const idsToRemove = this.getDescendantFolderIds(node);
        const parent = this.findParentNode(this.folderTree, node.data?.id);
        if (parent && parent.children) {
            parent.children = parent.children.filter(c => c.data?.id !== node.data?.id);
        }
        this.allFiles = this.allFiles.filter(f => !idsToRemove.includes(f.folderId));
        if (idsToRemove.includes(this.selectedFolderId)) {
            this.selectedFolderId = parent?.data?.id ?? 'root';
            this.selectedNode = parent ? this.findNodeById(this.folderTree, parent.data?.id) ?? null : null;
            this.buildBreadcrumbFromNode(this.selectedNode || this.folderTree[0]);
        }
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.companyStorage.deletedSuccess')
        });
    }

    private getDescendantFolderIds(node: TreeNode): string[] {
        const id = node.data?.id;
        if (!id) return [];
        let ids: string[] = [id];
        if (node.children) {
            node.children.forEach(child => {
                ids = ids.concat(this.getDescendantFolderIds(child));
            });
        }
        return ids;
    }

    private findParentNode(nodes: TreeNode[], targetId: string): TreeNode | null {
        for (const n of nodes) {
            if (n.children) {
                for (const c of n.children) {
                    if (c.data?.id === targetId) return n;
                }
                const found = this.findParentNode(n.children, targetId);
                if (found) return found;
            }
        }
        return null;
    }

    uploadFile(): void {
        const name = (this.newFileName || '').trim();
        if (!name) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.getInstant('fileSystem.companyStorage.validationRequired'),
                detail: this.translate.getInstant('fileSystem.companyStorage.fileNameRequired')
            });
            return;
        }
        const today = new Date().toISOString().slice(0, 10);
        this.allFiles = [
            ...this.allFiles,
            {
                id: this.nextFileId++,
                name,
                folderId: this.selectedFolderId,
                type: this.newFileType,
                size: '0 KB',
                modified: today
            }
        ];
        this.hideUploadDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.companyStorage.fileUploadedSuccess')
        });
    }

    confirmDeleteFile(file: MockFile): void {
        this.confirmationService.confirm({
            message: this.translate.getInstant('fileSystem.companyStorage.confirmDeleteFile'),
            header: this.translate.getInstant('fileSystem.companyStorage.deleteFile'),
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.deleteFile(file)
        });
    }

    private deleteFile(file: MockFile): void {
        this.allFiles = this.allFiles.filter(f => f.id !== file.id);
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.companyStorage.deletedSuccess')
        });
    }

    getFileIcon(type: string): string {
        if (type === 'pdf') return 'pi pi-file-pdf';
        if (type === 'word') return 'pi pi-file';
        if (type === 'excel') return 'pi pi-file';
        return 'pi pi-file';
    }

    private buildBreadcrumbFromNode(node: TreeNode | null): void {
        if (!node) {
            this.breadcrumbItems = [{ labelKey: 'fileSystem.companyStorageView.title', folderId: 'root' }];
            return;
        }
        const path = this.findPathToNode(this.folderTree, node.data?.id);
        this.breadcrumbItems = path.length > 0 ? path : [{ labelKey: 'fileSystem.companyStorageView.title', folderId: 'root' }];
    }

    private findPathToNode(nodes: TreeNode[], targetId: string | undefined, acc: BreadcrumbItem[] = []): BreadcrumbItem[] {
        if (!targetId) return [];
        for (const n of nodes) {
            const id = n.data?.id ?? 'root';
            const item: BreadcrumbItem = n.data?.customLabel != null
                ? { folderId: id, customLabel: n.data.customLabel }
                : { labelKey: n.data?.labelKey ?? 'fileSystem.folders.folder', folderId: id };
            if (id === targetId) return [...acc, item];
            if (n.children && n.children.length > 0) {
                const found = this.findPathToNode(n.children, targetId, [...acc, item]);
                if (found.length > 0) return found;
            }
        }
        return [];
    }

    private findNodeById(nodes: TreeNode[], targetId: string): TreeNode | null {
        for (const n of nodes) {
            const id = n.data?.id ?? 'root';
            if (id === targetId) return n;
            if (n.children && n.children.length > 0) {
                const found = this.findNodeById(n.children, targetId);
                if (found) return found;
            }
        }
        return null;
    }

    isRootNode(node: TreeNode): boolean {
        return node.data?.id === 'root';
    }

    openFolderMenu(menuRef: { toggle: (e: Event) => void }, node: TreeNode, event: Event): void {
        event.stopPropagation();
        this.currentFolderNodeForMenu = node;
        this.folderMenuItems = this.getFolderMenuItems();
        menuRef.toggle(event);
    }

    private getFolderMenuItems(): MenuItem[] {
        const node = this.currentFolderNodeForMenu;
        if (!node) return [];
        return [
            {
                label: this.translate.getInstant('fileSystem.companyStorage.folderDetails'),
                icon: 'pi pi-info-circle',
                command: () => this.showFolderDetailsDialog(node)
            },
            {
                label: this.translate.getInstant('fileSystem.companyStorage.moveFolder'),
                icon: 'pi pi-arrows-h',
                command: () => this.showMoveFolderDialog(node)
            },
            {
                label: this.translate.getInstant('fileSystem.companyStorage.renameFolder'),
                icon: 'pi pi-pencil',
                command: () => this.showRenameDialog(node)
            },
            {
                label: this.translate.getInstant('fileSystem.companyStorage.deleteFolder'),
                icon: 'pi pi-trash',
                command: () => this.confirmDeleteFolder(node)
            }
        ];
    }

    openFileMenu(menuRef: { toggle: (e: Event) => void }, file: MockFile, event: Event): void {
        this.currentFileForMenu = file;
        this.fileMenuItems = this.getFileMenuItems();
        menuRef.toggle(event);
    }

    private getFileMenuItems(): MenuItem[] {
        const file = this.currentFileForMenu;
        if (!file) return [];
        return [
            {
                label: this.translate.getInstant('fileSystem.companyStorage.fileDetails'),
                icon: 'pi pi-info-circle',
                command: () => this.showFileDetailsDialog(file)
            },
            {
                label: this.translate.getInstant('fileSystem.companyStorage.editFile'),
                icon: 'pi pi-pencil',
                command: () => this.showEditFileDialog(file)
            },
            {
                label: this.translate.getInstant('fileSystem.companyStorage.moveFile'),
                icon: 'pi pi-arrows-h',
                command: () => this.showMoveFileDialog(file)
            },
            {
                label: this.translate.getInstant('fileSystem.companyStorage.deleteFile'),
                icon: 'pi pi-trash',
                command: () => this.confirmDeleteFile(file)
            }
        ];
    }

    showMoveFolderDialog(node: TreeNode): void {
        if (this.isRootNode(node)) return;
        this.nodeForMoveFolder = node;
        this.moveFolderDialogVisible = true;
    }

    hideMoveFolderDialog(): void {
        this.moveFolderDialogVisible = false;
        this.nodeForMoveFolder = null;
        this.moveDestinationNode = null;
    }

    onMoveFolderConfirm(): void {
        this.hideMoveFolderDialog();
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('fileSystem.companyStorage.moveFolderSuccess')
        });
    }

    showMoveFileDialog(file: MockFile): void {
        this.fileForMove = file;
        this.moveFileDialogVisible = true;
    }

    hideMoveFileDialog(): void {
        this.moveFileDialogVisible = false;
        this.fileForMove = null;
        this.moveDestinationNode = null;
    }

    onMoveFileConfirm(): void {
        this.hideMoveFileDialog();
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('fileSystem.companyStorage.moveFileSuccess')
        });
    }

    showFileDetailsDialog(file: MockFile): void {
        this.fileForDetails = file;
        this.fileDetailsDialogVisible = true;
    }

    hideFileDetailsDialog(): void {
        this.fileDetailsDialogVisible = false;
        this.fileForDetails = null;
    }

    showFolderDetailsDialog(node: TreeNode): void {
        this.folderNodeForDetails = node;
        this.folderDetailsDialogVisible = true;
    }

    hideFolderDetailsDialog(): void {
        this.folderDetailsDialogVisible = false;
        this.folderNodeForDetails = null;
    }

    showEditFileDialog(file: MockFile): void {
        this.fileForEdit = file;
        this.editFileName = file.name;
        this.editFileType = file.type;
        this.editFileDialogVisible = true;
    }

    hideEditFileDialog(): void {
        this.editFileDialogVisible = false;
        this.fileForEdit = null;
    }

    onEditFileSave(): void {
        this.hideEditFileDialog();
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('fileSystem.companyStorage.fileDetailsUpdated')
        });
    }

    showRecycleBinDialog(): void {
        this.recycleBinDialogVisible = true;
    }

    hideRecycleBinDialog(): void {
        this.recycleBinDialogVisible = false;
    }

    onRecycleBinRestore(): void {
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('fileSystem.companyStorage.restoreSuccess')
        });
    }

    onRecycleBinClear(): void {
        this.hideRecycleBinDialog();
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('fileSystem.companyStorage.recycleBinCleared')
        });
    }

    showAllocateFileDialog(): void {
        this.allocateFileId = '';
        this.allocateFolderId = this.selectedFolderId;
        this.allocateType = 1;
        this.allocateFileDialogVisible = true;
    }

    hideAllocateFileDialog(): void {
        this.allocateFileDialogVisible = false;
    }

    onAllocateFileConfirm(): void {
        this.hideAllocateFileDialog();
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('fileSystem.companyStorage.allocateFileSuccess')
        });
    }

    showDownloadProgressDialog(): void {
        this.downloadProgressValue = 0;
        this.downloadProgressDialogVisible = true;
    }

    hideDownloadProgressDialog(): void {
        this.downloadProgressDialogVisible = false;
    }

    onDownloadProgressComplete(): void {
        this.hideDownloadProgressDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.companyStorage.downloadSuccess')
        });
    }
}
