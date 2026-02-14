import { FileSystemTableRow } from '../models/file-system.model';

/**
 * Format bytes to human-readable string (e.g. "1.25 GB", "512.00 MB").
 * Shared by SSM, ESM, and file-systems-section.
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return gb.toFixed(2) + ' GB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? (mb.toFixed(2) + ' MB') : (bytes / 1024).toFixed(2) + ' KB';
}

/**
 * Map API response item to FileSystemTableRow. Single implementation for SSM and ESM.
 */
export function mapApiResponseToFileSystemRow(item: any): FileSystemTableRow {
  const id = Number(item?.file_System_ID ?? item?.File_System_ID ?? 0);
  const name = String(item?.name ?? item?.Name ?? '');
  const active = Boolean(item?.is_Active ?? item?.Is_Active ?? true);
  const used = Number(item?.used_Capacity ?? item?.Used_Capacity ?? 0);
  const typeId = Number(item?.type ?? item?.Type ?? 0);
  const driveId = Number(item?.drive_ID ?? item?.Drive_ID ?? 0);
  let entityName = item?.owner_Name ?? item?.Owner_Name ?? item?.entity_Name ?? item?.Entity_Name ?? '—';
  if (typeof entityName !== 'string') entityName = '—';
  return {
    id,
    name,
    entityName,
    active,
    usedCapacity: formatBytes(used),
    typeId,
    driveId
  };
}

/** ERP error codes for file system APIs (API doc §10 – Common + 2B). */
const FILE_SYSTEM_ERROR_KEYS: Record<string, string> = {
  // Common (All File Server Actions)
  ERP12000: 'fileSystem.admin.errorAccessDenied',
  ERP12001: 'fileSystem.admin.errorBlockedIpPermanent',
  ERP12002: 'fileSystem.admin.errorBlockedIpTemporary',
  ERP12005: 'fileSystem.admin.errorMissingStorageToken',
  ERP12006: 'fileSystem.admin.errorInvalidStorageToken',
  ERP12007: 'fileSystem.admin.errorAccessDeniedAction',
  ERP12008: 'fileSystem.admin.errorInvalidRequestRouting',
  ERP12009: 'fileSystem.admin.errorRequestUnderDevelopment',
  ERP12010: 'fileSystem.admin.errorResponseManagement',
  ERP12011: 'fileSystem.admin.errorApiCallExecution',
  ERP12012: 'fileSystem.admin.errorFileServerDatabase',
  // Common (2B Actions)
  ERP12240: 'fileSystem.admin.errorInvalidFileId',
  ERP12250: 'fileSystem.admin.errorInvalidFolderId',
  ERP12260: 'fileSystem.admin.errorInvalidFileSystemId',
  ERP12270: 'fileSystem.admin.errorInvalidFileSystemAccessToken',
  ERP12280: 'fileSystem.admin.errorInvalidFileAllocation',
  ERP12290: 'fileSystem.admin.errorInvalidDriveId',
  ERP12291: 'fileSystem.admin.errorDriveInactive',
  ERP12292: 'fileSystem.admin.errorAccessDeniedDriveOwner',
  // File Systems (Other APIs)
  ERP12248: 'fileSystem.admin.errorInvalidEntityFilter',
  ERP12251: 'fileSystem.admin.errorInvalidFileSystemName',
  ERP12252: 'fileSystem.admin.errorInvalidFileSystemType'
};

/**
 * Get user-facing error detail from API response. Use with TranslationService.getInstant.
 * @param response API response object (may have errorCode, message.code, or code)
 * @param getMessage function that returns translated message for a key (e.g. translate.getInstant)
 * @returns Translated error message or fallback from response
 */
export function getFileSystemErrorDetail(
  response: any,
  getMessage: (key: string) => string
): string {
  let code = (response?.errorCode ?? response?.message?.code ?? response?.code ?? '').toString();
  if (!code && typeof response?.message === 'string' && /^ERP\d+$/.test(response.message)) {
    code = response.message;
  }
  const key = code ? FILE_SYSTEM_ERROR_KEYS[code] : null;
  if (key) return getMessage(key);
  const msg = response?.message;
  if (msg != null && typeof msg === 'object' && msg.detail) return String(msg.detail);
  if (typeof msg === 'string' && !/^ERP\d+$/.test(msg)) return msg;
  return '';
}
