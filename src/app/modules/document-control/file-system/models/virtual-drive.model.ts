/**
 * Represents a Virtual Drive record returned from the Storage (2B) APIs.
 * This is kept simple on purpose so it is easy for juniors to understand.
 */
export interface VirtualDrive {
  /**
   * Drive unique identifier (Drive_ID in the backend APIs).
   */
  id: number;

  /**
   * Display name of the drive.
   */
  name: string;

  /**
   * License identifier this drive belongs to (License_ID in the APIs).
   */
  licenseId: number;

  /**
   * Drive capacity in the backend units (for now we treat it as a simple number).
   */
  capacity: number;

  /**
   * Whether the drive is currently active or not.
   */
  active: boolean;
}

/**
 * Simple filters used when listing virtual drives.
 * These map directly to the List_Drives API parameters.
 */
export interface VirtualDrivesFilters {
  /**
   * Entity_Filter: -1 = Account, 1 = Entity, 0 = Both.
   */
  entityFilter: number;

  /**
   * License_ID used to filter drives (0 means \"ignore filter\").
   */
  licenseId: number;

  /**
   * When true, only active drives should be returned.
   */
  activeOnly: boolean;
}

