import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { Roles } from '../models/system-roles';

const PERMISSION_MATRIX = {
    // Credentials and Session related requests (100-110)
    Login: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Verify_2FA: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Logout: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Set_2FA: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Change_Password: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Reset_Password_Request: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Reset_Password_Confirm: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Verify_Email: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Get_Login_Data_Package: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],

    // Entity Management APIs (400-422)
    Add_Entity: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Activate_Entity: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Deactivate_Entity: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Details: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Update_Entity_Details: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Delete_Entity: [Roles.Developer],
    List_Entities: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Contacts: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Update_Entity_Contacts: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Assign_Entity_Admin: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Admins: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Delete_Entity_Admin: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Assign_Entity_Logo: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Logo: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Remove_Entity_Logo: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // Entity Accounts & Tree APIs (500-501)
    Get_Entity_Accounts_List: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Tree: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],

    // Account Management APIs (150-158)
    Create_Account: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Activate_Account: [Roles.Developer, Roles.SystemAdministrator],
    Deactivate_Account: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Delete_Account: [Roles.Developer, Roles.SystemAdministrator],
    Get_Account_Status: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Get_Account_Details: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Update_Account_Details: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Update_Account_Email: [Roles.Developer, Roles.SystemAdministrator],
    Update_Account_Entity: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // Entity Settings APIs (780-784)
    Set_Default_Entity_Settings: [Roles.Developer, Roles.SystemAdministrator],
    Get_Default_Entity_Settings: [Roles.Developer, Roles.SystemAdministrator],
    Set_Entity_Settings: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Settings: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Remove_Entity_Setting: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // System Settings APIs (730-732)
    Set_ERP_System_Settings: [Roles.Developer, Roles.SystemAdministrator],
    Get_ERP_System_Settings: [Roles.Developer, Roles.SystemAdministrator],
    Remove_ERP_System_Setting: [Roles.Developer, Roles.SystemAdministrator],
} as const;

export type PermissionAction = keyof typeof PERMISSION_MATRIX;

@Injectable({
    providedIn: 'root',
})
export class PermissionService {
    constructor(private localStorageService: LocalStorageService) { }

    /**
     * Returns the current user's role identifier.
     */
    getCurrentRoleId(): Roles | 0 {
        const accountDetails = this.localStorageService.getAccountDetails();
        return (accountDetails?.System_Role_ID as Roles) || 0;
    }

    /**
     * Checks if the current user matches the provided role.
     */
    hasRole(roleId: Roles | number): boolean {
        return this.getCurrentRoleId() === roleId;
    }

    /**
     * Checks if the current user matches any of the provided roles.
     */
    hasAnyRole(roles: ReadonlyArray<Roles | number>): boolean {
        if (!roles?.length) {
            return false;
        }
        const currentRole = this.getCurrentRoleId();
        return roles.some((role) => role === currentRole);
    }

    /**
     * Checks if the current user satisfies every role in the provided list.
     * (Useful for future scenarios with multiple role assignments.)
     */
    hasAllRoles(roles: ReadonlyArray<Roles | number>): boolean {
        if (!roles?.length) {
            return false;
        }
        return roles.every((role) => this.hasRole(role));
    }

    /**
     * Generic permission check that relies on the centralized matrix.
     */
    can(action: PermissionAction): boolean {
        const allowedRoles = PERMISSION_MATRIX[action];
        if (!allowedRoles) {
            return false;
        }
        return this.hasAnyRole(allowedRoles);
    }

    /**
     * Convenience helpers for frequently used permissions.
     */
    canCreateAccount(): boolean {
        return this.can('Create_Account');
    }

    canAssignAdmin(): boolean {
        return this.can('Assign_Entity_Admin');
    }

    canActivateAccount(): boolean {
        return this.can('Activate_Account');
    }

    canDeactivateAccount(): boolean {
        return this.can('Deactivate_Account');
    }

    canDeleteAccount(): boolean {
        return this.can('Delete_Account');
    }

    canRemoveEntityAdmin(): boolean {
        return this.can('Delete_Entity_Admin');
    }

    /**
     * Returns the allowed roles for a particular action.
     */
    getAllowedRoles(action: PermissionAction): ReadonlyArray<Roles> {
        return PERMISSION_MATRIX[action] || [];
    }

    /**
     * Returns the full permission matrix for debugging or diagnostics.
     */
    getPermissionMatrix(): Readonly<typeof PERMISSION_MATRIX> {
        return PERMISSION_MATRIX;
    }

    /**
     * Human-friendly role names for display.
     */
    getRoleName(systemRoleId: number): string {
        switch (systemRoleId) {
            case Roles.Developer:
                return 'Developer';
            case Roles.SystemAdministrator:
                return 'System Administrator';
            case Roles.EntityAdministrator:
                return 'Entity Administrator';
            case Roles.SystemUser:
                return 'System User';
            case Roles.Guest:
                return 'Guest';
            default:
                return 'Unknown';
        }
    }
}

