export const FILE_SYSTEM_ACCESS_TYPES: { value: number; key: string }[] = [
  { value: 0, key: 'fileSystem.permissions.accessType.account' },
  { value: 1, key: 'fileSystem.permissions.accessType.group' },
  { value: 2, key: 'fileSystem.permissions.accessType.role' },
  { value: 3, key: 'fileSystem.permissions.accessType.entity' },
  { value: 4, key: 'fileSystem.permissions.accessType.organization' },
  { value: 5, key: 'fileSystem.permissions.accessType.all' },
  { value: 6, key: 'fileSystem.permissions.accessType.owner' },
  { value: 7, key: 'fileSystem.permissions.accessType.entityAdmin' },
];

export const FILE_SYSTEM_ACCESS_RIGHTS: { value: number; key: string }[] = [
  { value: 0, key: 'fileSystem.permissions.accessRight.none' },
  { value: 1, key: 'fileSystem.permissions.accessRight.list' },
  { value: 2, key: 'fileSystem.permissions.accessRight.read' },
  { value: 3, key: 'fileSystem.permissions.accessRight.amend' },
  { value: 4, key: 'fileSystem.permissions.accessRight.modify' },
  { value: 5, key: 'fileSystem.permissions.accessRight.full' },
];

export function getAccessTypeKey(accessType: number): string {
  return FILE_SYSTEM_ACCESS_TYPES.find((t) => t.value === accessType)?.key ?? 'fileSystem.permissions.accessType.unknown';
}

export function getAccessRightKey(accessRight: number): string {
  return FILE_SYSTEM_ACCESS_RIGHTS.find((r) => r.value === accessRight)?.key ?? 'fileSystem.permissions.accessRight.unknown';
}

