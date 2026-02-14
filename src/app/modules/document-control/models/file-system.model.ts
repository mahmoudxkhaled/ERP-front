/**
 * File system models for Storage (2B) APIs.
 * Aligned with Docs/storage-management-file-system-api.md.
 */

/**
 * File system type from List_File_System_Types (API #8).
 */
export interface FileSystemType {
  type_ID?: number;
  Type_ID?: number;
  name?: string;
  Name?: string;
}

/**
 * File system record from List_File_Systems / Get_File_System_Details (APIs #9, #11).
 */
export interface FileSystem {
  file_System_ID?: number;
  File_System_ID?: number;
  name?: string;
  Name?: string;
  type?: number;
  Type?: number;
  drive_ID?: number;
  Drive_ID?: number;
  owner_ID?: number;
  Owner_ID?: number;
  is_Entity?: boolean;
  Is_Entity?: boolean;
  is_Active?: boolean;
  Is_Active?: boolean;
  used_Capacity?: number;
  Used_Capacity?: number;
}

/**
 * Filters for List_File_Systems (API #9).
 * Entity_Filter: -1 = Account, 1 = Entity, 0 = Both.
 */
export interface FileSystemsFilters {
  entityFilter: number;
  driveId: number;
  activeOnly: boolean;
}

/**
 * Row type for file systems table. Used by both SSM and ESM (shared).
 */
export interface FileSystemTableRow {
  id: number;
  name: string;
  entityName: string;
  active: boolean;
  usedCapacity: string;
  typeId?: number;
  driveId?: number;
}
