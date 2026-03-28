import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import type { AccountsAccessRightsMap, ListFileSystemPermissionsMessage } from '../models/file-system-permissions-list-response.model';

export type FileSystemAccessType =
  | 'Account'
  | 'Group'
  | 'Role'
  | 'Entity'
  | 'Organization'
  | 'All'
  | 'Owner'
  | 'EntityAdmin';

export type FileSystemAccessRight = 'None' | 'List' | 'Read' | 'Amend' | 'Modify' | 'Full';

export interface FileSystemAccessPermissionRow {
  accessType: number;
  relatedIds: number[];
  accessRight: number;
  permissionId?: number | null;
  raw?: any;
  relatedTargetDisplay?: string;
}

export interface FileSystemPermissionsAdminResult {
  permissions: FileSystemAccessPermissionRow[];
  accountsAccessRights: AccountsAccessRightsMap | null;
  raw: ListFileSystemPermissionsMessage | Record<string, unknown>;
}

/**
 * Service for File System permissions administration (ESM).
 *
 * APIs:
 * - List_File_System_Permissions (1170)
 * - Set_File_System_Access_Permission (1171)
 * - Remove_File_System_Access_Permission (1172)
 * - Clear_File_System_Permissions (1173)
 */
@Injectable({ providedIn: 'root' })
export class FileSystemPermissionsAdminService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) { }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }

  listFileSystemPermissions(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1170, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  setFileSystemAccessPermission(
    fileSystemId: number,
    accessType: number,
    relatedIds: number[],
    accessRight: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileSystemId.toString(),
      accessType.toString(),
      JSON.stringify(relatedIds ?? []),
      accessRight.toString(),
    ];
    return this.apiService
      .callAPI(1171, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  removeFileSystemAccessPermission(
    fileSystemId: number,
    accessType: number,
    relatedIds: number[]
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileSystemId.toString(),
      accessType.toString(),
      JSON.stringify(relatedIds ?? []),
    ];
    return this.apiService
      .callAPI(1172, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  clearFileSystemPermissions(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1173, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  mapPermissionsResponse(response: any): FileSystemPermissionsAdminResult {
    const raw = (response?.message ?? response) as ListFileSystemPermissionsMessage | Record<string, unknown>;

    const accessRightsList =
      (raw as any)?.Access_Rights ?? (raw as any)?.access_Rights ?? (raw as any)?.access_rights ?? (raw as any)?.AccessRights ?? (raw as any)?.accessRights ??
      (raw as any)?.Access_Details ?? (raw as any)?.access_Details ?? (raw as any)?.AccessDetails ?? (raw as any)?.accessDetails ??
      [];

    const list = Array.isArray(accessRightsList) ? accessRightsList : [];

    const permissions: FileSystemAccessPermissionRow[] = list.map((item: any) => {
      const accessType = Number(
        item?.access_Right_Type ??
        item?.Access_Right_Type ??
        item?.access_RightType ??
        item?.accessType ??
        item?.access_Type ??
        item?.Access_Type ??
        -1
      );
      const accessRight = Number(
        item?.access_Right ??
        item?.Access_Right ??
        item?.accessRight ??
        -1
      );
      const permissionIdRaw = item?.permission_ID ?? item?.Permission_ID ?? item?.permissionId ?? item?.PermissionId ?? null;
      const permissionId = permissionIdRaw == null ? null : Number(permissionIdRaw);
      const relatedIds = permissionId && permissionId > 0 ? [permissionId] : [];

      return {
        accessType,
        relatedIds,
        accessRight,
        permissionId,
        raw: item
      };
    }).filter(r => Number.isFinite(r.accessType) && r.accessType >= 0 && Number.isFinite(r.accessRight) && r.accessRight >= 0);

    const accountsAccessRightsRaw =
      (raw as any)?.Accounts_Access_Rights ?? (raw as any)?.accounts_Access_Rights ?? (raw as any)?.accounts_access_rights ?? (raw as any)?.AccountsAccessRights ?? (raw as any)?.accountsAccessRights ?? null;

    const accountsAccessRights: AccountsAccessRightsMap | null =
      accountsAccessRightsRaw && typeof accountsAccessRightsRaw === 'object' && !Array.isArray(accountsAccessRightsRaw)
        ? (accountsAccessRightsRaw as AccountsAccessRightsMap)
        : null;

    return { permissions, accountsAccessRights, raw };
  }
}

