import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { FileSystemsService } from 'src/app/modules/document-control/services/file-systems.service';
import { VirtualDrivesService } from 'src/app/modules/document-control/services/virtual-drives.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { getFileSystemErrorDetail } from 'src/app/modules/document-control/shared/file-system-helpers';
import { FileSystemPermissionsAdminService, FileSystemAccessPermissionRow } from '../services/file-system-permissions-admin.service';
import { EntitiesService } from '../../entities/services/entities.service';
import { EntityGroupsService } from '../../entity-groups/services/entity-groups.service';
import { RolesService } from '../../roles/services/roles.service';

interface RelatedTargetOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-file-systems-permissions',
  templateUrl: './file-systems-permissions.component.html',
  styleUrls: ['./file-systems-permissions.component.scss'],
})
export class FileSystemsPermissionsComponent implements OnInit {
  loadingFileSystems = false;
  loadingPermissions = false;
  loadingPermissionTargets = false;

  fileSystems: { id: number; name: string }[] = [];
  selectedFileSystemId: number | null = null;

  permissions: FileSystemAccessPermissionRow[] = [];
  selectedPermissionForRemove: FileSystemAccessPermissionRow | null = null;

  addDialogVisible = false;
  removeConfirmVisible = false;
  clearAllConfirmVisible = false;

  addAccessType: number | null = null;
  addAccessRight: number | null = null;
  selectedRelatedTargetIds: number[] = [];
  relatedTargetOptions: RelatedTargetOption[] = [];
  relatedTargetsSearchText = '';
  loadingRelatedTargets = false;
  relatedTargetsTouched = false;

  accessTypeOptions: { label: string; value: number }[] = [];
  accessRightOptions: { label: string; value: number }[] = [];
  currentEntityId = 0;
  isRegional = false;

  constructor(
    private router: Router,
    private translate: TranslationService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService,
    private fileSystemsService: FileSystemsService,
    private virtualDrivesService: VirtualDrivesService,
    private permissionsAdminService: FileSystemPermissionsAdminService,
    private entitiesService: EntitiesService,
    private entityGroupsService: EntityGroupsService,
    private rolesService: RolesService
  ) { }

  ngOnInit(): void {
    if (!this.canOpenPage()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.notAuthorizedTitle'),
        detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.notAuthorizedMessage'),
      });
      this.router.navigate(['/entity-administration']);
      return;
    }

    this.currentEntityId = Number(this.localStorageService.getEntityId() || 0);
    this.isRegional = this.localStorageService.getAccountSettings()?.Language !== 'English';
    this.buildStaticOptions();
    this.loadFileSystems();
  }

  private canOpenPage(): boolean {
    const functions = this.localStorageService.getFunctionsDetails();
    return !!(functions?.EntAdm || functions?.SysAdm);
  }

  private buildStaticOptions(): void {
    // Note: Owner and EntityAdmin are derived; we do not allow setting them manually.
    this.accessTypeOptions = [
      { label: this.translate.getInstant('fileSystem.permissions.accessType.account'), value: 0 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.group'), value: 1 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.role'), value: 2 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.entity'), value: 3 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.organization'), value: 4 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.all'), value: 5 },
    ];

    this.accessRightOptions = [
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.none'), value: 0 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.list'), value: 1 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.read'), value: 2 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.amend'), value: 3 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.modify'), value: 4 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.full'), value: 5 },
    ];
  }

  loadFileSystems(): void {
    this.loadingFileSystems = true;
    this.fileSystems = [];
    this.selectedFileSystemId = null;

    this.virtualDrivesService.listDrives({
      entityFilter: 1,
      licenseId: 0,
      activeOnly: true,
    }).subscribe({
      next: (drivesResponse: any) => {
        if (!drivesResponse?.success) {
          this.loadingFileSystems = false;
          this.showErrorToast(drivesResponse);
          return;
        }

        const rawDrives = drivesResponse.message;
        const drivesList = Array.isArray(rawDrives) ? rawDrives : (rawDrives?.Drives ?? rawDrives?.message ?? []);
        const drives = (drivesList || []).map((item: any) => ({
          id: Number(item?.Drive_ID ?? item?.drive_ID ?? 0),
          name: String(item?.Name ?? item?.name ?? ''),
        })).filter((x: any) => x.id > 0 && x.name.trim() !== '');

        if (drives.length === 0) {
          this.loadingFileSystems = false;
          this.fileSystems = [];
          return;
        }

        const driveId = drives[0].id;

        this.fileSystemsService.listFileSystems({
          entityFilter: 1,
          driveId,
          activeOnly: true,
        }).subscribe({
          next: (response: any) => {
            this.loadingFileSystems = false;
            if (!response?.success) {
              this.showErrorToast(response);
              return;
            }
            const raw = response?.message;
            const list = Array.isArray(raw) ? raw : (raw?.File_Systems ?? raw?.file_Systems ?? []);
            const fsList = (list || []).map((item: any) => ({
              id: Number(item?.file_System_ID ?? item?.File_System_ID ?? 0),
              name: String(item?.name ?? item?.Name ?? ''),
            })).filter((x: any) => x.id > 0 && x.name.trim() !== '');

            this.fileSystems = fsList;
          },
          error: (err) => {
            this.loadingFileSystems = false;
            this.showErrorToast(err);
          },
        });
      },
      error: (err) => {
        this.loadingFileSystems = false;
        this.showErrorToast(err);
      },
    });
  }

  onFileSystemChange(): void {
    this.permissions = [];
    if (!this.selectedFileSystemId) {
      return;
    }
    this.refreshPermissions();
  }

  refreshPermissions(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    this.loadingPermissions = true;
    this.permissions = [];

    this.permissionsAdminService.listFileSystemPermissions(this.selectedFileSystemId).subscribe({
      next: (response: any) => {
        this.loadingPermissions = false;
        if (!response?.success) {
          this.showErrorToast(response);
          return;
        }
        const mapped = this.permissionsAdminService.mapPermissionsResponse(response);
        this.permissions = mapped.permissions;
        void this.resolveRelatedTargetDisplays();
      },
      error: (err) => {
        this.loadingPermissions = false;
        this.showErrorToast(err);
      },
    });
  }

  showAddDialog(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    this.addAccessType = null;
    this.addAccessRight = null;
    this.selectedRelatedTargetIds = [];
    this.relatedTargetOptions = [];
    this.relatedTargetsSearchText = '';
    this.relatedTargetsTouched = false;
    this.addDialogVisible = true;
  }

  hideAddDialog(): void {
    this.addDialogVisible = false;
  }

  onAddConfirm(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    const accessType = this.addAccessType;
    const accessRight = this.addAccessRight;
    const requiresRelatedTargets = this.requiresRelatedTargets();
    const relatedIds = requiresRelatedTargets ? [...this.selectedRelatedTargetIds] : [];

    if (accessType == null) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.validationTitle'),
        detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.accessTypeRequired'),
      });
      return;
    }
    if (accessRight == null) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.validationTitle'),
        detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.accessRightRequired'),
      });
      return;
    }
    if (requiresRelatedTargets && relatedIds.length === 0) {
      this.relatedTargetsTouched = true;
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.validationTitle'),
        detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedIdsRequired'),
      });
      return;
    }

    this.loadingPermissions = true;
    this.permissionsAdminService.setFileSystemAccessPermission(this.selectedFileSystemId, accessType, relatedIds, accessRight).subscribe({
      next: (response: any) => {
        this.loadingPermissions = false;
        if (!response?.success) {
          this.showErrorToast(response);
          return;
        }
        this.hideAddDialog();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.addSuccess'),
        });
        this.refreshPermissions();
      },
      error: (err) => {
        this.loadingPermissions = false;
        this.showErrorToast(err);
      },
    });
  }

  showRemoveConfirm(row: FileSystemAccessPermissionRow): void {
    this.selectedPermissionForRemove = row;
    this.removeConfirmVisible = true;
  }

  hideRemoveConfirm(): void {
    this.removeConfirmVisible = false;
    this.selectedPermissionForRemove = null;
  }

  onRemoveConfirm(): void {
    if (!this.selectedFileSystemId || !this.selectedPermissionForRemove) {
      return;
    }
    const row = this.selectedPermissionForRemove;
    this.loadingPermissions = true;
    this.permissionsAdminService.removeFileSystemAccessPermission(this.selectedFileSystemId, row.accessType, row.relatedIds).subscribe({
      next: (response: any) => {
        this.loadingPermissions = false;
        if (!response?.success) {
          this.showErrorToast(response);
          return;
        }
        this.hideRemoveConfirm();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.removeSuccess'),
        });
        this.refreshPermissions();
      },
      error: (err) => {
        this.loadingPermissions = false;
        this.showErrorToast(err);
      },
    });
  }

  showClearAllConfirm(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    this.clearAllConfirmVisible = true;
  }

  hideClearAllConfirm(): void {
    this.clearAllConfirmVisible = false;
  }

  onClearAllConfirm(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    this.loadingPermissions = true;
    this.permissionsAdminService.clearFileSystemPermissions(this.selectedFileSystemId).subscribe({
      next: (response: any) => {
        this.loadingPermissions = false;
        if (!response?.success) {
          this.showErrorToast(response);
          return;
        }
        this.hideClearAllConfirm();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.clearAllSuccess'),
        });
        this.refreshPermissions();
      },
      error: (err) => {
        this.loadingPermissions = false;
        this.showErrorToast(err);
      },
    });
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
      default: return String(accessType);
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
      default: return String(accessRight);
    }
  }

  getAccessRightSeverity(accessRight: number): 'secondary' | 'info' | 'success' | 'warning' | 'danger' {
    // Simple visual mapping
    if (accessRight <= 0) return 'secondary';
    if (accessRight === 1) return 'info';
    if (accessRight === 2) return 'success';
    if (accessRight === 3) return 'warning';
    if (accessRight >= 4) return 'danger';
    return 'secondary';
  }

  getPermissionsTableValue(): FileSystemAccessPermissionRow[] {
    if (this.loadingPermissions && this.permissions.length === 0) {
      return Array(5).fill(null).map(() => ({
        accessType: 0,
        relatedIds: [],
        accessRight: 0,
        permissionId: null,
      }));
    }
    return this.permissions;
  }

  getRelatedTargetCellText(row: FileSystemAccessPermissionRow): string {
    if (row.relatedTargetDisplay) {
      return row.relatedTargetDisplay;
    }
    const id = Number(row.permissionId ?? row.relatedIds[0] ?? 0);
    if (id > 0) {
      return `#${id}`;
    }
    return '';
  }

  goBack(): void {
    this.router.navigate(['/entity-administration/entity-storage-management']);
  }

  onAccessTypeChange(): void {
    this.selectedRelatedTargetIds = [];
    this.relatedTargetOptions = [];
    this.relatedTargetsSearchText = '';
    this.relatedTargetsTouched = false;
    this.loadRelatedTargets();
  }

  requiresRelatedTargets(): boolean {
    return this.addAccessType != null && this.addAccessType !== 5;
  }

  canSubmitAddPermission(): boolean {
    if (this.addAccessType == null || this.addAccessRight == null) {
      return false;
    }
    if (!this.requiresRelatedTargets()) {
      return true;
    }
    return this.selectedRelatedTargetIds.length > 0;
  }

  get filteredRelatedTargetOptions(): RelatedTargetOption[] {
    const text = String(this.relatedTargetsSearchText || '').trim().toLowerCase();
    if (!text) {
      return this.relatedTargetOptions;
    }
    return this.relatedTargetOptions.filter((item) =>
      item.name.toLowerCase().includes(text) || String(item.id).includes(text)
    );
  }

  get selectedRelatedTargets(): RelatedTargetOption[] {
    if (!this.selectedRelatedTargetIds?.length) {
      return [];
    }
    const selectedSet = new Set(this.selectedRelatedTargetIds);
    return this.relatedTargetOptions.filter((item) => selectedSet.has(item.id));
  }

  isRelatedTargetSelected(targetId: number): boolean {
    return this.selectedRelatedTargetIds.includes(targetId);
  }

  toggleRelatedTargetSelection(targetId: number): void {
    this.relatedTargetsTouched = true;
    if (this.isRelatedTargetSelected(targetId)) {
      this.selectedRelatedTargetIds = this.selectedRelatedTargetIds.filter((id) => id !== targetId);
      return;
    }
    this.selectedRelatedTargetIds = [...this.selectedRelatedTargetIds, targetId];
  }

  private loadRelatedTargets(): void {
    if (!this.requiresRelatedTargets()) {
      return;
    }
    if (this.currentEntityId <= 0) {
      return;
    }

    if (this.addAccessType === 0) {
      this.loadAccountTargets();
      return;
    }
    if (this.addAccessType === 1) {
      this.loadGroupTargets();
      return;
    }
    if (this.addAccessType === 2) {
      this.loadRoleTargets();
      return;
    }
    if (this.addAccessType === 3) {
      this.loadEntityTargets(false);
      return;
    }
    if (this.addAccessType === 4) {
      this.loadEntityTargets(true);
    }
  }

  private loadAccountTargets(): void {
    this.loadingRelatedTargets = true;
    this.entitiesService.getEntityAccountsList(
      this.currentEntityId.toString(),
      true,
      true,
      0,
      100,
      ''
    ).subscribe({
      next: (response: any) => {
        this.loadingRelatedTargets = false;
        if (!response?.success) {
          this.showErrorToast(response);
          return;
        }

        const accountsData = response?.message?.Accounts || {};
        const list = Array.isArray(accountsData) ? accountsData : Object.values(accountsData);
        this.relatedTargetOptions = list.map((item: any) => {
          const id = Number(item?.Account_ID || 0);
          const email = String(item?.Email || '').trim();
          const name = email || `#${id}`;
          return { id, name };
        }).filter((x: RelatedTargetOption) => x.id > 0);
      },
      error: (err) => {
        this.loadingRelatedTargets = false;
        this.showErrorToast(err);
      }
    });
  }

  private loadGroupTargets(): void {
    this.loadingRelatedTargets = true;
    this.entityGroupsService.listEntityGroups(this.currentEntityId, true).subscribe({
      next: (response: any) => {
        this.loadingRelatedTargets = false;
        if (!response?.success) {
          this.showErrorToast(response);
          return;
        }

        const groupsData = response?.message?.Account_Groups || response?.message || [];
        const list = Array.isArray(groupsData) ? groupsData : Object.values(groupsData);
        this.relatedTargetOptions = list.map((item: any) => {
          const id = Number(item?.groupID || item?.Group_ID || item?.ID || 0);
          const titleDefault = String(item?.title || item?.Title || '').trim();
          const titleRegional = String(item?.title_Regional || item?.Title_Regional || '').trim();
          const name = this.isRegional ? (titleRegional || titleDefault) : (titleDefault || titleRegional);
          return { id, name: name || `#${id}` };
        }).filter((x: RelatedTargetOption) => x.id > 0);
      },
      error: (err) => {
        this.loadingRelatedTargets = false;
        this.showErrorToast(err);
      }
    });
  }

  private loadRoleTargets(): void {
    this.loadingRelatedTargets = true;
    this.rolesService.listEntityRoles(this.currentEntityId, 0, 100).subscribe({
      next: (response: any) => {
        this.loadingRelatedTargets = false;
        if (!response?.success) {
          this.showErrorToast(response);
          return;
        }

        const rolesData = response?.message?.Entity_Roles || {};
        const list = Array.isArray(rolesData) ? rolesData : Object.values(rolesData);
        this.relatedTargetOptions = list.map((item: any) => {
          const id = Number(item?.Entity_Role_ID || item?.entity_Role_ID || 0);
          const titleDefault = String(item?.Title || '').trim();
          const titleRegional = String(item?.Title_Regional || '').trim();
          const name = this.isRegional ? (titleRegional || titleDefault) : (titleDefault || titleRegional);
          return { id, name: name || `#${id}` };
        }).filter((x: RelatedTargetOption) => x.id > 0);
      },
      error: (err) => {
        this.loadingRelatedTargets = false;
        this.showErrorToast(err);
      }
    });
  }

  // #region Related target display (list API)
  private async resolveRelatedTargetDisplays(): Promise<void> {
    if (!this.permissions.length) {
      return;
    }
    this.permissions = this.permissions.map((r) =>
      r.accessType === 5
        ? { ...r, relatedTargetDisplay: this.translate.getInstant('fileSystem.permissions.accessType.all') }
        : { ...r }
    );
    this.loadingPermissionTargets = true;
    try {
      const accountIds = new Set<number>();
      this.permissions.forEach((r) => {
        if (r.accessType === 0) {
          const id = Number(r.permissionId ?? r.relatedIds[0] ?? 0);
          if (id > 0) {
            accountIds.add(id);
          }
        }
      });
      const accountMap = await this.loadAccountEmailMap(accountIds);

      const groupIds = [
        ...new Set(
          this.permissions
            .filter((r) => r.accessType === 1)
            .map((r) => Number(r.permissionId ?? r.relatedIds[0] ?? 0))
            .filter((id) => id > 0)
        ),
      ];
      const groupMap = new Map<number, string>();
      await Promise.all(
        groupIds.map(async (id) => {
          groupMap.set(id, await this.fetchGroupDisplayName(id));
        })
      );

      const roleIds = [
        ...new Set(
          this.permissions
            .filter((r) => r.accessType === 2)
            .map((r) => Number(r.permissionId ?? r.relatedIds[0] ?? 0))
            .filter((id) => id > 0)
        ),
      ];
      const roleMap = new Map<number, string>();
      await Promise.all(
        roleIds.map(async (id) => {
          roleMap.set(id, await this.fetchRoleDisplayName(id));
        })
      );

      const entityIds = [
        ...new Set(
          this.permissions
            .filter((r) => r.accessType === 3 || r.accessType === 4)
            .map((r) => Number(r.permissionId ?? r.relatedIds[0] ?? 0))
            .filter((id) => id > 0)
        ),
      ];
      const entityMap = new Map<number, string>();
      await Promise.all(
        entityIds.map(async (id) => {
          entityMap.set(id, await this.fetchEntityDisplayName(id));
        })
      );

      this.permissions = this.permissions.map((row) => {
        if (row.accessType === 5) {
          return row;
        }
        const id = Number(row.permissionId ?? row.relatedIds[0] ?? 0);
        let relatedTargetDisplay = row.relatedTargetDisplay ?? '';
        switch (row.accessType) {
          case 0:
            relatedTargetDisplay = id > 0 ? (accountMap.get(id) ?? `#${id}`) : '';
            break;
          case 1:
            relatedTargetDisplay = id > 0 ? (groupMap.get(id) ?? `#${id}`) : '';
            break;
          case 2:
            relatedTargetDisplay = id > 0 ? (roleMap.get(id) ?? `#${id}`) : '';
            break;
          case 3:
          case 4:
            relatedTargetDisplay = id > 0 ? (entityMap.get(id) ?? `#${id}`) : '';
            break;
          case 6:
          case 7:
            relatedTargetDisplay =
              id > 0
                ? `${this.getAccessTypeLabel(row.accessType)} (#${id})`
                : this.getAccessTypeLabel(row.accessType);
            break;
          default:
            relatedTargetDisplay = id > 0 ? `#${id}` : '';
        }
        return { ...row, relatedTargetDisplay };
      });
    } finally {
      this.loadingPermissionTargets = false;
    }
  }

  private async loadAccountEmailMap(neededIds: Set<number>): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (neededIds.size === 0 || this.currentEntityId <= 0) {
      return map;
    }
    let page = 1;
    const pageSize = 100;
    let safety = 0;
    while (safety < 80 && [...neededIds].some((id) => !map.has(id))) {
      const lastAccountId = -page;
      try {
        const res = await firstValueFrom(
          this.entitiesService.getEntityAccountsList(
            this.currentEntityId.toString(),
            true,
            true,
            lastAccountId,
            pageSize,
            ''
          )
        );
        if (!res?.success) {
          break;
        }
        const accountsData = res?.message?.Accounts || {};
        const list = Array.isArray(accountsData) ? accountsData : Object.values(accountsData);
        if (list.length === 0) {
          break;
        }
        list.forEach((a: any) => {
          const id = Number(a?.Account_ID);
          const email = String(a?.Email || '').trim();
          if (neededIds.has(id) && email) {
            map.set(id, email);
          }
        });
        page++;
        safety++;
        if (list.length < pageSize) {
          break;
        }
      } catch {
        break;
      }
    }
    return map;
  }

  private async fetchGroupDisplayName(groupId: number): Promise<string> {
    try {
      const res = await firstValueFrom(this.entityGroupsService.getEntityGroup(groupId));
      if (!res?.success) {
        return `#${groupId}`;
      }
      const m = res.message || {};
      const titleDefault = String(m.Title || m.title || '').trim();
      const titleRegional = String(m.Title_Regional || m.title_Regional || '').trim();
      const name = this.isRegional ? titleRegional || titleDefault : titleDefault || titleRegional;
      return name || `#${groupId}`;
    } catch {
      return `#${groupId}`;
    }
  }

  private async fetchRoleDisplayName(roleId: number): Promise<string> {
    try {
      const res = await firstValueFrom(this.rolesService.getEntityRoleDetails(roleId));
      if (!res?.success) {
        return `#${roleId}`;
      }
      const role = res.message || {};
      const titleDefault = String(role.Title || '').trim();
      const titleRegional = String(role.Title_Regional || '').trim();
      const name = this.isRegional ? titleRegional || titleDefault : titleDefault || titleRegional;
      return name || `#${roleId}`;
    } catch {
      return `#${roleId}`;
    }
  }

  private async fetchEntityDisplayName(entityId: number): Promise<string> {
    try {
      const res = await firstValueFrom(this.entitiesService.getEntityDetails(String(entityId)));
      if (!res?.success) {
        return `#${entityId}`;
      }
      const e = res.message || {};
      const nameDefault = String(e.Name || e.name || '').trim();
      const nameRegional = String(e.Name_Regional || e.name_Regional || '').trim();
      const name = this.isRegional ? nameRegional || nameDefault : nameDefault || nameRegional;
      const code = String(e.Code || e.code || '').trim();
      if (name && code) {
        return `${name} (${code})`;
      }
      return name || `#${entityId}`;
    } catch {
      return `#${entityId}`;
    }
  }

  // #endregion

  private loadEntityTargets(rootsOnly: boolean): void {
    this.loadingRelatedTargets = true;
    this.entitiesService.listEntities(0, 100, '').subscribe({
      next: (response: any) => {
        this.loadingRelatedTargets = false;
        if (!response?.success) {
          this.showErrorToast(response);
          return;
        }

        const entitiesData = response?.message?.Entities_List || response?.message?.Entities || {};
        const list = Array.isArray(entitiesData) ? entitiesData : Object.values(entitiesData);
        const mapped = list.map((item: any) => {
          const id = Number(item?.Entity_ID || 0);
          const parentEntityId = Number(item?.Parent_Entity_ID || 0);
          const nameDefault = String(item?.Name || '').trim();
          const nameRegional = String(item?.Name_Regional || '').trim();
          const name = this.isRegional ? (nameRegional || nameDefault) : (nameDefault || nameRegional);
          return { id, parentEntityId, name: name || `#${id}` };
        }).filter((x: any) => x.id > 0);

        const filtered = rootsOnly ? mapped.filter((x: any) => x.parentEntityId <= 0) : mapped;
        this.relatedTargetOptions = filtered.map((x: any) => ({ id: x.id, name: x.name }));
      },
      error: (err) => {
        this.loadingRelatedTargets = false;
        this.showErrorToast(err);
      }
    });
  }

  private showErrorToast(response: any): void {
    const detail = getFileSystemErrorDetail(response, (k) => this.translate.getInstant(k));
    this.messageService.add({
      severity: 'error',
      summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.errorTitle'),
      detail: detail || this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.genericError'),
    });
  }
}

