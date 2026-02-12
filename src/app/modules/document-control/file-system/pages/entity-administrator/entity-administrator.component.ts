import { Component, OnInit } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface EntityFileSystemRow {
    id: number;
    entityNameKey: string;
    fileSystemNameKey: string;
    statusKey: string;
    usedCapacity: string;
    deleted?: boolean;
}

export interface PermissionRow {
    roleKey: string;
    folderPath: string;
    accessKey: string;
}

@Component({
    selector: 'app-entity-administrator',
    templateUrl: './entity-administrator.component.html',
    styleUrls: ['./entity-administrator.component.scss']
})
export class EntityAdministratorComponent implements OnInit {
    createFileSystemDialogVisible = false;
    fileSystemDetailsDialogVisible = false;
    editFileSystemDialogVisible = false;
    addPermissionDialogVisible = false;
    editPermissionDialogVisible = false;
    recycleBinDialogVisible = false;

    newFileSystemName = '';
    newFileSystemEntityKey = 'fileSystem.entityAdminEntities.mainCompany';
    newFileSystemTypeKey = 'fileSystem.entityAdminFileSystemNames.companyStorage';
    selectedFileSystemForDetails: EntityFileSystemRow | null = null;
    selectedFileSystemForEdit: EntityFileSystemRow | null = null;
    editFileSystemName = '';
    selectedPermissionForEdit: PermissionRow | null = null;
    newPermissionRoleKey = 'fileSystem.entityAdminRoles.financeTeam';
    newPermissionPath = '/Finance';
    newPermissionAccessKey = 'fileSystem.entityAdminAccess.readWrite';
    editPermissionRoleKey = '';
    editPermissionPath = '';
    editPermissionAccessKey = '';

    entityOptions: { labelKey: string; value: string; label: string }[] = [];
    fileSystemTypeOptions: { labelKey: string; value: string; label: string }[] = [];
    roleOptions: { labelKey: string; value: string; label: string }[] = [];
    accessOptions: { labelKey: string; value: string; label: string }[] = [];

    entityFileSystems: EntityFileSystemRow[] = [
        { id: 1, entityNameKey: 'fileSystem.entityAdminEntities.mainCompany', fileSystemNameKey: 'fileSystem.entityAdminFileSystemNames.companyStorage', statusKey: 'fileSystem.entityAdminStatus.active', usedCapacity: '125 GB' },
        { id: 2, entityNameKey: 'fileSystem.entityAdminEntities.branchOffice', fileSystemNameKey: 'fileSystem.entityAdminFileSystemNames.branchStorage', statusKey: 'fileSystem.entityAdminStatus.active', usedCapacity: '48 GB' },
        { id: 3, entityNameKey: 'fileSystem.entityAdminEntities.projectAlpha', fileSystemNameKey: 'fileSystem.entityAdminFileSystemNames.projectDrive', statusKey: 'fileSystem.entityAdminStatus.active', usedCapacity: '32 GB' }
    ];

    folderStructure: TreeNode[] = [
        {
            label: '',
            data: { path: '/', labelKey: 'fileSystem.entityAdminFolders.companyRoot' },
            expanded: true,
            children: [
                {
                    label: '',
                    data: { path: '/Finance', labelKey: 'fileSystem.entityAdminFolders.finance' },
                    expanded: false,
                    children: [
                        { label: '', data: { path: '/Finance/Reports', labelKey: 'fileSystem.entityAdminFolders.reports' }, leaf: true },
                        { label: '', data: { path: '/Finance/Invoices', labelKey: 'fileSystem.entityAdminFolders.invoices' }, leaf: true }
                    ]
                },
                {
                    label: '',
                    data: { path: '/HR', labelKey: 'fileSystem.entityAdminFolders.hr' },
                    expanded: false,
                    children: [
                        { label: '', data: { path: '/HR/Policies', labelKey: 'fileSystem.entityAdminFolders.policies' }, leaf: true },
                        { label: '', data: { path: '/HR/Templates', labelKey: 'fileSystem.entityAdminFolders.templates' }, leaf: true }
                    ]
                },
                {
                    label: '',
                    data: { path: '/Shared', labelKey: 'fileSystem.entityAdminFolders.shared' },
                    leaf: true
                }
            ]
        }
    ];

    permissions: PermissionRow[] = [
        { roleKey: 'fileSystem.entityAdminRoles.financeTeam', folderPath: '/Finance', accessKey: 'fileSystem.entityAdminAccess.readWrite' },
        { roleKey: 'fileSystem.entityAdminRoles.hrTeam', folderPath: '/HR', accessKey: 'fileSystem.entityAdminAccess.readWrite' },
        { roleKey: 'fileSystem.entityAdminRoles.allEmployees', folderPath: '/Shared', accessKey: 'fileSystem.entityAdminAccess.readDownload' }
    ];

    constructor(
        private translate: TranslationService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.applyTranslationsToTree(this.folderStructure);
        this.entityOptions = [
            { labelKey: 'fileSystem.entityAdminEntities.mainCompany', value: 'fileSystem.entityAdminEntities.mainCompany', label: '' },
            { labelKey: 'fileSystem.entityAdminEntities.branchOffice', value: 'fileSystem.entityAdminEntities.branchOffice', label: '' },
            { labelKey: 'fileSystem.entityAdminEntities.projectAlpha', value: 'fileSystem.entityAdminEntities.projectAlpha', label: '' }
        ].map(o => ({ ...o, label: this.translate.getInstant(o.labelKey) }));
        this.fileSystemTypeOptions = [
            { labelKey: 'fileSystem.entityAdminFileSystemNames.companyStorage', value: 'fileSystem.entityAdminFileSystemNames.companyStorage', label: '' },
            { labelKey: 'fileSystem.entityAdminFileSystemNames.branchStorage', value: 'fileSystem.entityAdminFileSystemNames.branchStorage', label: '' },
            { labelKey: 'fileSystem.entityAdminFileSystemNames.projectDrive', value: 'fileSystem.entityAdminFileSystemNames.projectDrive', label: '' }
        ].map(o => ({ ...o, label: this.translate.getInstant(o.labelKey) }));
        this.roleOptions = [
            { labelKey: 'fileSystem.entityAdminRoles.financeTeam', value: 'fileSystem.entityAdminRoles.financeTeam', label: '' },
            { labelKey: 'fileSystem.entityAdminRoles.hrTeam', value: 'fileSystem.entityAdminRoles.hrTeam', label: '' },
            { labelKey: 'fileSystem.entityAdminRoles.allEmployees', value: 'fileSystem.entityAdminRoles.allEmployees', label: '' }
        ].map(o => ({ ...o, label: this.translate.getInstant(o.labelKey) }));
        this.accessOptions = [
            { labelKey: 'fileSystem.entityAdminAccess.readWrite', value: 'fileSystem.entityAdminAccess.readWrite', label: '' },
            { labelKey: 'fileSystem.entityAdminAccess.readDownload', value: 'fileSystem.entityAdminAccess.readDownload', label: '' }
        ].map(o => ({ ...o, label: this.translate.getInstant(o.labelKey) }));
    }

    getEntityName(row: EntityFileSystemRow): string {
        return this.translate.getInstant(row.entityNameKey);
    }

    getFileSystemName(row: EntityFileSystemRow): string {
        return this.translate.getInstant(row.fileSystemNameKey);
    }

    getStatusLabel(row: EntityFileSystemRow): string {
        return this.translate.getInstant(row.statusKey);
    }

    getRoleLabel(row: PermissionRow): string {
        return this.translate.getInstant(row.roleKey);
    }

    getAccessLabel(row: PermissionRow): string {
        return this.translate.getInstant(row.accessKey);
    }

    private applyTranslationsToTree(nodes: TreeNode[]): void {
        nodes.forEach(n => {
            const key = n.data?.labelKey;
            if (key) {
                n.label = this.translate.getInstant(key);
            }
            if (n.children && n.children.length > 0) {
                this.applyTranslationsToTree(n.children);
            }
        });
    }

    showCreateFileSystemDialog(): void {
        this.newFileSystemName = '';
        this.newFileSystemEntityKey = 'fileSystem.entityAdminEntities.mainCompany';
        this.newFileSystemTypeKey = 'fileSystem.entityAdminFileSystemNames.companyStorage';
        this.createFileSystemDialogVisible = true;
    }

    hideCreateFileSystemDialog(): void {
        this.createFileSystemDialogVisible = false;
    }

    onCreateFileSystemConfirm(): void {
        this.hideCreateFileSystemDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.createFileSystemSuccess')
        });
    }

    showFileSystemDetailsDialog(row: EntityFileSystemRow): void {
        this.selectedFileSystemForDetails = row;
        this.fileSystemDetailsDialogVisible = true;
    }

    hideFileSystemDetailsDialog(): void {
        this.fileSystemDetailsDialogVisible = false;
        this.selectedFileSystemForDetails = null;
    }

    showEditFileSystemDialog(row: EntityFileSystemRow): void {
        this.selectedFileSystemForEdit = row;
        this.editFileSystemName = this.getFileSystemName(row);
        this.editFileSystemDialogVisible = true;
    }

    hideEditFileSystemDialog(): void {
        this.editFileSystemDialogVisible = false;
        this.selectedFileSystemForEdit = null;
    }

    onEditFileSystemSave(): void {
        this.hideEditFileSystemDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.updateFileSystemSuccess')
        });
    }

    onDeleteFileSystem(row: EntityFileSystemRow): void {
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.deleteFileSystemSuccess')
        });
    }

    onRestoreFileSystem(row: EntityFileSystemRow): void {
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.restoreFileSystemSuccess')
        });
    }

    showAddPermissionDialog(): void {
        this.newPermissionRoleKey = 'fileSystem.entityAdminRoles.financeTeam';
        this.newPermissionPath = '/Finance';
        this.newPermissionAccessKey = 'fileSystem.entityAdminAccess.readWrite';
        this.addPermissionDialogVisible = true;
    }

    hideAddPermissionDialog(): void {
        this.addPermissionDialogVisible = false;
    }

    onAddPermissionConfirm(): void {
        this.hideAddPermissionDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.addPermissionSuccess')
        });
    }

    showEditPermissionDialog(row: PermissionRow): void {
        this.selectedPermissionForEdit = row;
        this.editPermissionRoleKey = row.roleKey;
        this.editPermissionPath = row.folderPath;
        this.editPermissionAccessKey = row.accessKey;
        this.editPermissionDialogVisible = true;
    }

    hideEditPermissionDialog(): void {
        this.editPermissionDialogVisible = false;
        this.selectedPermissionForEdit = null;
    }

    onEditPermissionSave(): void {
        this.hideEditPermissionDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.updatePermissionSuccess')
        });
    }

    onDeletePermission(row: PermissionRow): void {
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.deletePermissionSuccess')
        });
    }

    showRecycleBinDialog(): void {
        this.recycleBinDialogVisible = true;
    }

    hideRecycleBinDialog(): void {
        this.recycleBinDialogVisible = false;
    }
}
