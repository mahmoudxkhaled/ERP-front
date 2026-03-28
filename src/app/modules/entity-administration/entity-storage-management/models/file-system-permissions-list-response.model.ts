import {
  getAccessRightKey,
  getAccessTypeKey,
} from 'src/app/modules/document-control/shared/file-system-access-helpers';

/**
 * List_File_System_Permissions (1170) — `message` payload shape.
 *
 * - `access_Rights`: raw explicit permission rows on the selected file system (not per-account effective rows).
 * - `accounts_Access_Rights`: computed effective access right **per account** for this file system (key = Account ID string, value = AccessRight enum numeric).
 *
 * Effective access is the **maximum** of all applicable `access_Right` values; `access_Right_Type` does not define priority over numeric level.
 * Deny-as-None for direct account rows is a possible backend special case only if implemented server-side.
 */
export interface ListFileSystemPermissionsMessage {
  access_Rights?: FileSystemAccessRightRow[];
  accounts_Access_Rights?: AccountsAccessRightsMap;
}

/**
 * One explicit permission record stored for this file system.
 *
 * `permission_ID` is the target entity id whose meaning depends on `access_Right_Type`
 * (Account ID, Group ID, Role ID, Entity ID, organization-scoped entity id, etc.).
 */
export interface FileSystemAccessRightRow {
  fS_Access_ID?: number;
  file_System_ID?: number;
  access_Right: FileSystemAccessRightEnum | number;
  access_Right_Type: FileSystemAccessRightTypeEnum | number;
  permission_ID: number;
}

/**
 * Map Account ID (string key) → effective `AccessRight` for that account on this file system.
 * This is **not** a raw assignment table; do not treat values as independent DB rows.
 */
export type AccountsAccessRightsMap = Record<string, number>;

export enum FileSystemAccessRightEnum {
  None = 0,
  List = 1,
  Read = 2,
  Amend = 3,
  Modify = 4,
  Full = 5,
}

export enum FileSystemAccessRightTypeEnum {
  Account = 0,
  Group = 1,
  Role = 2,
  Entity = 3,
  Organization = 4,
  All = 5,
  Owner = 6,
  EntityAdmin = 7,
}

export function isListFileSystemPermissionsMessage(value: unknown): value is ListFileSystemPermissionsMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as ListFileSystemPermissionsMessage;
  return Array.isArray(v.access_Rights) || v.accounts_Access_Rights != null;
}

export function parseAccountsAccessRights(map: AccountsAccessRightsMap | null | undefined): Map<number, FileSystemAccessRightEnum> {
  const out = new Map<number, FileSystemAccessRightEnum>();
  if (!map || typeof map !== 'object') {
    return out;
  }
  Object.entries(map).forEach(([accountIdStr, right]) => {
    const accountId = Number(accountIdStr);
    const r = Number(right);
    if (Number.isFinite(accountId) && accountId > 0 && Number.isFinite(r)) {
      out.set(accountId, r as FileSystemAccessRightEnum);
    }
  });
  return out;
}

export function getFileSystemAccessRightTranslationKey(accessRight: number): string {
  return getAccessRightKey(accessRight);
}

export function getFileSystemAccessRightTypeTranslationKey(accessRightType: number): string {
  return getAccessTypeKey(accessRightType);
}
