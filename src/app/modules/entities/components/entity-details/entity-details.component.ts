import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';

interface EntityAdmin {
    accountId: string;
    userId: number;
    name: string;
    email: string;
    systemRoleId?: number;
    accountState: number; // 1 = Active, 0 = Inactive
    isActive?: boolean;
}

interface EntityAccount {
    accountId: string;
    userId: number;
    name: string;
    email: string;
    systemRoleId: number;
    roleName: string;
    accountState: number; // 1 = Active, 0 = Inactive
    isActive?: boolean;
}

interface EntityContact {
    address: string;
    phoneNumbers: string[];
    faxNumbers: string[];
    emails: string[];
}

@Component({
    selector: 'app-entity-details',
    templateUrl: './entity-details.component.html',
    styleUrls: ['./entity-details.component.scss']
})
export class EntityDetailsComponent implements OnInit, OnDestroy {
    entityId: string = '';
    loading: boolean = false;
    loadingDetails: boolean = false;
    loadingContacts: boolean = false;
    loadingAdmins: boolean = false;
    loadingLogo: boolean = false;

    // Entity Details
    entityDetails: any = null;
    entityContacts: EntityContact | null = null;
    entityAdmins: EntityAdmin[] = [];
    entityOtherAccounts: EntityAccount[] = [];
    entityLogo: string | null = null;
    hasLogo: boolean = false;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    // Role-based permissions
    systemRoleId: number = 0;
    isDeveloper: boolean = false;
    isSystemAdmin: boolean = false;
    isEntityAdmin: boolean = false;

    // Delete confirmation dialog
    deleteAccountDialog: boolean = false;
    accountToDelete?: EntityAdmin;

    // Menu items for admin actions
    menuItems: any[] = [];
    currentAdmin?: EntityAdmin;

    // Menu items for other accounts actions
    otherAccountsMenuItems: any[] = [];
    currentAccount?: EntityAccount;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';

        // Initialize role-based permissions
        // System_Role_ID is in AccountDetails, not AccountSettings
        const accountDetails = this.localStorageService.getAccountDetails();
        this.systemRoleId = accountDetails?.System_Role_ID || 0;
        this.isDeveloper = this.systemRoleId === 1; // Developer = 1
        this.isSystemAdmin = this.systemRoleId === 2; // SystemAdmin = 2
        this.isEntityAdmin = this.systemRoleId === 3; // EntityAdmin = 3
    }

    ngOnInit(): void {
        this.entityId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.entityId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid entity ID.'
            });
            this.router.navigate(['/company-administration/entities/list']);
            return;
        }

        this.loadAllData();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    /**
     * Load all required data in parallel
     */
    loadAllData(): void {
        this.loading = true;
        this.loadingDetails = true;
        this.loadingContacts = true;
        this.loadingAdmins = true;
        this.loadingLogo = true;

        // Load required APIs in parallel
        const requiredApis = forkJoin({
            details: this.entitiesService.getEntityDetails(this.entityId),
            contacts: this.entitiesService.getEntityContacts(this.entityId),
            admins: this.entitiesService.getEntityAdmins(this.entityId),
            accounts: this.entitiesService.getEntityAccountsList(this.entityId)
        });

        const sub = requiredApis.subscribe({
            next: (responses) => {
                // Handle Entity Details
                if (!responses.details?.success) {
                    this.handleBusinessError('details', responses.details);
                } else {
                    this.entityDetails = responses.details?.message || {};
                    console.log('entityDetails', this.entityDetails);
                }
                this.loadingDetails = false;

                // Handle Entity Contacts
                if (!responses.contacts?.success) {
                    this.handleBusinessError('contacts', responses.contacts);
                } else {
                    this.mapContactsData(responses.contacts?.message || {});
                    console.log('entityContacts', this.entityContacts);
                }
                this.loadingContacts = false;

                // Handle Entity Admins and Accounts
                if (!responses.admins?.success) {
                    this.handleBusinessError('admins', responses.admins);
                }
                console.log('responses.admins', responses.admins);

                // Process accounts list to separate admins and other accounts
                if (!responses.accounts?.success) {
                    this.handleBusinessError('accounts', responses.accounts);
                } else {
                    this.mapAccountsData(responses.accounts?.message || {}, responses.admins?.message || {});
                    console.log('entityAdmins', responses.accounts);
                }
                this.loadingAdmins = false;

                this.loading = false;
            },
            error: () => {
                this.handleUnexpectedError();
                this.loading = false;
                this.loadingDetails = false;
                this.loadingContacts = false;
                this.loadingAdmins = false;
            }
        });

        this.subscriptions.push(sub);

        // Load optional logo separately
        this.loadLogo();
    }

    /**
     * Load entity logo
     */
    loadLogo(): void {
        const sub = this.entitiesService.getEntityLogo(this.entityId).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message) {
                    // Logo is typically returned as base64 string or URL
                    this.entityLogo = response.message;
                    this.hasLogo = true;
                } else {
                    this.hasLogo = false;
                }
                this.loadingLogo = false;
            },
            error: () => {
                // Logo is optional, so we don't show error
                this.hasLogo = false;
                this.loadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    /**
     * Map contacts data from API response
     */
    private mapContactsData(data: any): void {
        this.entityContacts = {
            address: data?.Address || data?.address || '',
            phoneNumbers: Array.isArray(data?.Phone_Numbers || data?.phoneNumbers)
                ? (data.Phone_Numbers || data.phoneNumbers)
                : [],
            faxNumbers: Array.isArray(data?.Fax_Numbers || data?.faxNumbers)
                ? (data.Fax_Numbers || data.faxNumbers)
                : [],
            emails: Array.isArray(data?.Emails || data?.emails)
                ? (data.Emails || data.emails)
                : []
        };
    }

    /**
     * Map accounts data from API response and separate admins from other accounts
     */
    private mapAccountsData(accountsData: any, adminsData: any): void {
        // Get admin account IDs from admins API response
        const adminAccountIds: string[] = [];
        if (adminsData?.Account_IDs && Array.isArray(adminsData.Account_IDs)) {
            adminAccountIds.push(...adminsData.Account_IDs.map((id: any) => String(id)));
        }

        // Process accounts list
        const accounts = accountsData || {};
        const accountsArray = Array.isArray(accounts) ? accounts : Object.values(accounts);

        // Map all accounts
        const allAccounts = accountsArray.map((account: any) => {
            const accountId = String(account?.Account_ID || account?.accountId || account?.id || '');
            const userId = account?.User_ID || account?.user_ID || account?.userId || 0;
            const systemRoleId = account?.System_Role_ID || account?.system_Role_ID || account?.systemRoleId || 0;
            const accountState = account?.Account_State !== undefined
                ? account.Account_State
                : (account?.account_State !== undefined ? account.account_State : (account?.accountState !== undefined ? account.accountState : 1));
            // Account_State: 1 = Active, 0 = Inactive
            const isActive = accountState === 1;

            return {
                accountId,
                userId,
                name: `${account?.First_Name || account?.firstName || ''} ${account?.Last_Name || account?.lastName || ''}`.trim() || account?.Name || 'Unknown',
                email: account?.Email || account?.email || '',
                systemRoleId,
                roleName: this.getRoleName(systemRoleId),
                accountState,
                isActive
            };
        }).filter((account: EntityAccount) => account.accountId && account.accountId !== '');

        // Separate admins (System_Role_ID = 3) and other accounts
        this.entityAdmins = allAccounts
            .filter((account: EntityAccount) => account.systemRoleId === 3 || adminAccountIds.includes(account.accountId))
            .map((account: EntityAccount) => ({
                accountId: account.accountId,
                userId: account.userId,
                name: account.name,
                email: account.email,
                systemRoleId: account.systemRoleId,
                accountState: account.accountState,
                isActive: account.isActive
            }));

        this.entityOtherAccounts = allAccounts
            .filter((account: EntityAccount) => account.systemRoleId !== 3 && !adminAccountIds.includes(account.accountId));
    }

    /**
     * Get role name from System_Role_ID
     */
    private getRoleName(systemRoleId: number): string {
        switch (systemRoleId) {
            case 1:
                return 'Developer';
            case 2:
                return 'System Administrator';
            case 3:
                return 'Entity Administrator';
            case 4:
                return 'System User';
            case 5:
                return 'Guest';
            default:
                return 'Unknown';
        }
    }

    /**
     * Get entity name (with regional support)
     */
    getEntityName(): string {
        if (!this.entityDetails) return '';
        return this.isRegional
            ? (this.entityDetails.Name_Regional || this.entityDetails.name_Regional || this.entityDetails.name || this.entityDetails.Name || '')
            : (this.entityDetails.Name || this.entityDetails.name || '');
    }

    /**
     * Get entity description (with regional support)
     */
    getEntityDescription(): string {
        if (!this.entityDetails) return '';
        return this.isRegional
            ? (this.entityDetails.Description_Regional || this.entityDetails.description_Regional || this.entityDetails.description || this.entityDetails.Description || '')
            : (this.entityDetails.Description || this.entityDetails.description || '');
    }

    /**
     * Get entity status label
     */
    getStatusLabel(): string {
        if (!this.entityDetails) return 'Unknown';
        const isActive = this.entityDetails.Is_Active !== undefined
            ? this.entityDetails.Is_Active
            : (this.entityDetails.is_Active || this.entityDetails.active || false);
        return isActive ? 'Active' : 'Inactive';
    }

    /**
     * Get entity status severity
     */
    getStatusSeverity(): 'success' | 'danger' {
        if (!this.entityDetails) return 'danger';
        const isActive = this.entityDetails.Is_Active !== undefined
            ? this.entityDetails.Is_Active
            : (this.entityDetails.is_Active || this.entityDetails.active || false);
        return isActive ? 'success' : 'danger';
    }

    /**
     * Get entity type label
     */
    getTypeLabel(): string {
        if (!this.entityDetails) return 'Organization';
        const isPersonal = this.entityDetails.Is_Personal !== undefined
            ? this.entityDetails.Is_Personal
            : (this.entityDetails.is_Personal || this.entityDetails.isPersonal || false);
        return isPersonal ? 'Personal' : 'Organization';
    }

    /**
     * Get entity type severity
     */
    getTypeSeverity(): 'warning' | 'info' {
        if (!this.entityDetails) return 'info';
        const isPersonal = this.entityDetails.Is_Personal !== undefined
            ? this.entityDetails.Is_Personal
            : (this.entityDetails.is_Personal || this.entityDetails.isPersonal || false);
        return isPersonal ? 'warning' : 'info';
    }

    /**
     * Navigate to assign admin page
     */
    navigateToAssignAdmin(): void {
        this.router.navigate(['/company-administration/entities', this.entityId, 'assign-admin']);
    }

    /**
     * Assign a specific account as admin
     */
    assignAccountAsAdmin(account: EntityAccount): void {
        if (!account.accountId || !this.entityId) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.assignEntityAdmin(this.entityId, account.accountId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleAccountError('assign', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account assigned as administrator successfully.',
                    life: 3000
                });

                // Reload admins and accounts to reflect the change
                this.reloadAdmins();
            },
            error: () => {
                this.handleUnexpectedError();
                this.loadingAdmins = false;
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Navigate to add account page
     */
    navigateToAddAccount(): void {
        this.router.navigate(['/company-administration/entities', this.entityId, 'add-account']);
    }

    /**
     * Activate an account
     * Only available for SystemAdmin
     */
    activateAccount(accountId: string): void {
        if (!accountId) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.activateAccount(accountId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleAccountError('activate', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account activated successfully.',
                    life: 3000
                });

                // Reload admins and accounts
                this.reloadAdmins();
            },
            error: () => {
                this.handleUnexpectedError();
                this.loadingAdmins = false;
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Deactivate an account
     * Available for SystemAdmin and EntityAdmin
     */
    deactivateAccount(accountId: string): void {
        if (!accountId) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.deactivateAccount(accountId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleAccountError('deactivate', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account deactivated successfully.',
                    life: 3000
                });

                // Reload admins and accounts
                this.reloadAdmins();
            },
            error: () => {
                this.handleUnexpectedError();
                this.loadingAdmins = false;
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Show delete account confirmation dialog
     */
    confirmDeleteAccount(admin: EntityAdmin): void {
        this.accountToDelete = admin;
        this.deleteAccountDialog = true;
    }

    /**
     * Cancel delete account dialog
     */
    onCancelDeleteAccountDialog(): void {
        this.deleteAccountDialog = false;
        this.accountToDelete = undefined;
    }

    /**
     * Delete an account
     * Available for SystemAdmin and EntityAdmin
     */
    deleteAccount(): void {
        if (!this.accountToDelete || !this.accountToDelete.accountId) {
            return;
        }

        const accountId = this.accountToDelete.accountId;
        this.loadingAdmins = true;

        const sub = this.entitiesService.deleteAccount(accountId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleAccountError('delete', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account deleted successfully.',
                    life: 3000
                });

                this.deleteAccountDialog = false;
                this.accountToDelete = undefined;

                // Reload admins and accounts
                this.reloadAdmins();
            },
            error: () => {
                this.handleUnexpectedError();
                this.loadingAdmins = false;
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Delete entity admin (legacy method - keeping for backward compatibility)
     */
    deleteAdmin(admin: EntityAdmin): void {
        // Use the new deleteAccount method
        this.confirmDeleteAccount(admin);
    }

    /**
     * Show delete account confirmation dialog for Other Accounts
     */
    confirmDeleteOtherAccount(account: EntityAccount): void {
        // Convert EntityAccount to EntityAdmin format for the delete dialog
        const adminForDelete: EntityAdmin = {
            accountId: account.accountId,
            userId: account.userId,
            name: account.name,
            email: account.email,
            systemRoleId: account.systemRoleId,
            accountState: account.accountState,
            isActive: account.isActive
        };
        this.accountToDelete = adminForDelete;
        this.deleteAccountDialog = true;
    }

    /**
     * Open menu for a specific admin
     */
    openMenu(menuRef: any, admin: EntityAdmin, event: Event): void {
        this.currentAdmin = admin;
        this.configureMenuItems(admin);
        menuRef.toggle(event);
    }

    /**
     * Configure menu items based on user role and admin status
     * Activate: SystemAdmin, Developer
     * Deactivate: SystemAdmin, Developer, EntityAdmin
     * Delete: SystemAdmin, Developer, EntityAdmin
     */
    private configureMenuItems(admin: EntityAdmin): void {
        const menuItemsList: any[] = [];

        // Activate - For SystemAdmin and Developer when admin is inactive (Account_State = 0)
        if ((this.isSystemAdmin || this.isDeveloper) && admin.accountState === 0) {
            menuItemsList.push({
                label: 'Activate Account',
                icon: 'pi pi-check',
                command: () => this.currentAdmin && this.activateAccount(this.currentAdmin.accountId)
            });
        }

        // Deactivate - For SystemAdmin, Developer and EntityAdmin when admin is active (Account_State = 1)
        if ((this.isSystemAdmin || this.isDeveloper || this.isEntityAdmin) && admin.accountState === 1) {
            menuItemsList.push({
                label: 'Deactivate Account',
                icon: 'pi pi-times',
                command: () => this.currentAdmin && this.deactivateAccount(this.currentAdmin.accountId)
            });
        }

        // Delete - For SystemAdmin, Developer and EntityAdmin
        if (this.isSystemAdmin || this.isDeveloper || this.isEntityAdmin) {
            menuItemsList.push({
                label: 'Delete Account',
                icon: 'pi pi-trash',
                command: () => this.currentAdmin && this.confirmDeleteAccount(this.currentAdmin)
            });
        }

        this.menuItems = menuItemsList;
    }

    /**
     * Open menu for a specific account in Other Accounts table
     */
    openOtherAccountMenu(menuRef: any, account: EntityAccount, event: Event): void {
        this.currentAccount = account;
        this.configureOtherAccountMenuItems(account);
        menuRef.toggle(event);
    }

    /**
     * Configure menu items for Other Accounts table
     * Includes: Assign Admin, Activate, Deactivate, Delete
     * Assign Admin: SystemAdmin, Developer, EntityAdmin
     * Activate: SystemAdmin, Developer (when account is inactive)
     * Deactivate: SystemAdmin, Developer, EntityAdmin (when account is active)
     * Delete: SystemAdmin, Developer, EntityAdmin
     */
    private configureOtherAccountMenuItems(account: EntityAccount): void {
        const menuItemsList: any[] = [];

        // Assign Admin - For SystemAdmin, Developer and EntityAdmin
        if (this.isSystemAdmin || this.isDeveloper || this.isEntityAdmin) {
            menuItemsList.push({
                label: 'Assign Admin',
                icon: 'pi pi-user-plus',
                command: () => this.currentAccount && this.assignAccountAsAdmin(this.currentAccount)
            });
        }

        // Activate - For SystemAdmin and Developer when account is inactive (Account_State = 0)
        if ((this.isSystemAdmin || this.isDeveloper) && account.accountState === 0) {
            menuItemsList.push({
                label: 'Activate Account',
                icon: 'pi pi-check',
                command: () => this.currentAccount && this.activateAccount(this.currentAccount.accountId)
            });
        }

        // Deactivate - For SystemAdmin, Developer and EntityAdmin when account is active (Account_State = 1)
        if ((this.isSystemAdmin || this.isDeveloper || this.isEntityAdmin) && account.accountState === 1) {
            menuItemsList.push({
                label: 'Deactivate Account',
                icon: 'pi pi-times',
                command: () => this.currentAccount && this.deactivateAccount(this.currentAccount.accountId)
            });
        }

        // Delete - For SystemAdmin, Developer and EntityAdmin
        if (this.isSystemAdmin || this.isDeveloper || this.isEntityAdmin) {
            menuItemsList.push({
                label: 'Delete Account',
                icon: 'pi pi-trash',
                command: () => this.currentAccount && this.confirmDeleteOtherAccount(this.currentAccount)
            });
        }

        this.otherAccountsMenuItems = menuItemsList;
    }

    /**
     * Reload admins and accounts list
     */
    reloadAdmins(): void {
        this.loadingAdmins = true;

        // Load both admins and accounts in parallel
        const reloadApis = forkJoin({
            admins: this.entitiesService.getEntityAdmins(this.entityId),
            accounts: this.entitiesService.getEntityAccountsList(this.entityId)
        });

        const sub = reloadApis.subscribe({
            next: (responses) => {
                if (!responses.admins?.success) {
                    this.handleBusinessError('admins', responses.admins);
                }
                if (!responses.accounts?.success) {
                    this.handleBusinessError('accounts', responses.accounts);
                } else {
                    this.mapAccountsData(responses.accounts?.message || {}, responses.admins?.message || {});
                }
            },
            error: () => {
                this.handleUnexpectedError();
                this.loadingAdmins = false;
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Handle file upload for logo
     */
    onLogoUpload(event: any): void {
        const file = event.files?.[0];
        if (!file) {
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Please select an image file.'
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'File size must be less than 5MB.'
            });
            return;
        }

        // Read file as base64
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result as string;
            // Extract base64 data (remove data:image/...;base64, prefix)
            const base64Data = base64String.split(',')[1] || base64String;
            const imageFormat = file.type.split('/')[1] || 'png';

            this.uploadLogo(base64Data, imageFormat);
        };
        reader.onerror = () => {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to read file.'
            });
        };
        reader.readAsDataURL(file);
    }

    /**
     * Upload logo to server
     */
    uploadLogo(byteArray: string, imageFormat: string): void {
        this.loadingLogo = true;
        const sub = this.entitiesService.assignEntityLogo(this.entityId, imageFormat, byteArray).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('uploadLogo', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Logo uploaded successfully.',
                    life: 3000
                });

                // Reload logo
                this.loadLogo();
            },
            error: () => {
                this.handleUnexpectedError();
                this.loadingLogo = false;
            },
            complete: () => this.loadingLogo = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Remove entity logo
     */
    removeLogo(): void {
        this.loadingLogo = true;
        const sub = this.entitiesService.removeEntityLogo(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('removeLogo', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Logo removed successfully.',
                    life: 3000
                });

                this.entityLogo = null;
                this.hasLogo = false;
                this.loadingLogo = false;
            },
            error: () => {
                this.handleUnexpectedError();
                this.loadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    /**
     * Navigate back to entities list
     */
    navigateBack(): void {
        this.router.navigate(['/company-administration/entities/list']);
    }

    /**
     * Handle business errors from API responses
     */
    private handleBusinessError(context: string, response: any): void {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(context, code);

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
    }

    /**
     * Handle account operation errors
     */
    private handleAccountError(operation: string, response: any): void {
        const code = String(response?.message || '');
        const detail = this.getAccountErrorMessage(operation, code);

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
        this.loadingAdmins = false;
    }

    /**
     * Get user-friendly error message based on error code
     */
    private getErrorMessage(context: string, code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11277':
                return 'Invalid account selected.';
            case 'ERP11278':
                return 'Account does not belong to this entity.';
            // Update_Entity_Contacts error codes
            case 'ERP11271':
                return 'Invalid Address format.';
            case 'ERP11272':
                return 'Invalid Phone number format.';
            case 'ERP11273':
                return 'Invalid Fax number format.';
            case 'ERP11274':
                return 'Invalid Email format.';
            // Assign_Entity_Logo error codes
            case 'ERP11281':
                return 'Unknown image format.';
            case 'ERP11282':
                return 'Empty image contents.';
            // Delete_Entity_Admin error code
            case 'ERP11279':
                return 'Account ID is not an admin of this entity.';
            default:
                if (context === 'details' || context === 'contacts' || context === 'admins') {
                    return code || 'Failed to load entity information.';
                }
                return code || 'An error occurred. Please try again.';
        }
    }

    /**
     * Get error message for account operations
     */
    private getAccountErrorMessage(operation: string, code: string): string {
        // Common error codes for all account operations
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11277':
                return 'Invalid account selected.';
            case 'ERP11278':
                return 'Account does not belong to this entity.';
        }

        // Operation-specific error codes
        switch (operation) {
            case 'activate':
                switch (code) {
                    case 'ERP11150':
                        return 'Email not found in entity.';
                    case 'ERP11151':
                        return 'Account already active.';
                    default:
                        return code || 'Failed to activate account. Please try again.';
                }
            case 'deactivate':
                switch (code) {
                    case 'ERP11150':
                        return 'Email not found.';
                    case 'ERP11152':
                        return 'Account already deactivated.';
                    default:
                        return code || 'Failed to deactivate account. Please try again.';
                }
            case 'delete':
                switch (code) {
                    case 'ERP11150':
                        return 'Email not found.';
                    case 'ERP11153':
                        return 'Account exists; must deactivate instead.';
                    default:
                        return code || 'Failed to delete account. Please try again.';
                }
            default:
                return code || `Failed to ${operation} account. Please try again.`;
        }
    }

    /**
     * Handle unexpected errors
     */
    private handleUnexpectedError(): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An unexpected error occurred. Please try again.'
        });
    }
}

