import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';
import { FileUpload } from 'primeng/fileupload';

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


@Component({
    selector: 'app-entity-details',
    templateUrl: './entity-details.component.html',
    styleUrls: ['./entity-details.component.scss']
})
export class EntityDetailsComponent implements OnInit, OnDestroy {
    @ViewChild('logoUploader') logoUploader?: FileUpload;

    entityId: string = '';
    loading: boolean = false;
    loadingDetails: boolean = false;
    loadingAdmins: boolean = false;
    loadingLogo: boolean = false;

    // Entity Details
    entityDetails: any = null;
    entityAdmins: EntityAdmin[] = [];
    entityOtherAccounts: EntityAccount[] = [];
    entityLogo: string = 'assets/media/upload-photo.jpg';
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

    // Assign admin confirmation dialog
    assignAdminDialog: boolean = false;
    accountToAssign?: EntityAccount;

    // Activate account confirmation dialog
    activateAccountDialog: boolean = false;
    accountToActivate?: EntityAdmin | EntityAccount;

    // Deactivate account confirmation dialog
    deactivateAccountDialog: boolean = false;
    accountToDeactivate?: EntityAdmin | EntityAccount;

    // Menu items for admin actions
    menuItems: any[] = [];
    currentAdmin?: EntityAdmin;

    // Menu items for other accounts actions
    otherAccountsMenuItems: any[] = [];
    currentAccount?: EntityAccount;

    // Filter options for accounts list
    includeSubentities: boolean = false;
    activeOnly: boolean = false;

    // Add account dialog
    addAccountDialog: boolean = false;
    // Flag to track if we're creating an admin (to auto-assign after account creation)
    isCreatingAdmin: boolean = false;
    // Edit entity dialog
    editEntityDialogVisible: boolean = false;

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
        this.loadingAdmins = true;
        this.loadingLogo = true;

        // Load required APIs in parallel
        const requiredApis = forkJoin({
            details: this.entitiesService.getEntityDetails(this.entityId),
            admins: this.entitiesService.getEntityAdmins(this.entityId),
            accounts: this.entitiesService.getEntityAccountsList(this.entityId, this.includeSubentities, this.activeOnly)
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
                    const logoData = response.message;
                    console.log('logoData', logoData);
                    // Response structure: { Image_Format: string, Image: string (base64) }
                    if (logoData?.Image && logoData.Image.trim() !== '') {
                        // Convert base64 to byte array
                        const binaryString = atob(logoData.Image);
                        const byteArray = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            byteArray[i] = binaryString.charCodeAt(i);
                        }
                        console.log('Base64 to Byte Array:', Array.from(byteArray));
                        console.log('Byte Array Length:', byteArray.length);

                        // Extract image format (default to png if not provided)
                        const imageFormat = logoData.Image_Format || 'png';
                        // Build data URL with correct format
                        this.entityLogo = `data:image/${imageFormat.toLowerCase()};base64,${logoData.Image}`;
                        console.log('entityLogo', this.entityLogo);
                        this.hasLogo = true;
                    } else {
                        // No logo available, use placeholder
                        this.entityLogo = 'assets/media/upload-photo.jpg';
                        this.hasLogo = false;
                    }
                } else {
                    // No logo available, use placeholder
                    this.entityLogo = 'assets/media/upload-photo.jpg';
                    this.hasLogo = false;
                }
                this.loadingLogo = false;
            },
            error: () => {
                // Logo is optional, so we don't show error - use placeholder
                this.entityLogo = 'assets/media/upload-photo.jpg';
                this.hasLogo = false;
                this.loadingLogo = false;
            }
        });

        this.subscriptions.push(sub);
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
     * Get entity code with null safety
     */
    getEntityCode(): string {
        if (!this.entityDetails) return '';
        return this.entityDetails.Code || this.entityDetails.code || '';
    }

    /**
     * Determine if the entity has a parent entity
     */
    hasParentEntity(): boolean {
        const parentId = this.localStorageService.getParentEntityId();
        if (parentId === undefined || parentId === null) {
            return false;
        }

        const normalized = String(parentId).trim();
        return normalized !== '' && normalized !== '0';
    }

    /**
     * Get a display label for the parent entity
     */
    getParentEntityLabel(): string {
        const parentId = this.entityDetails.Parent_Entity_ID;
        return parentId ? ` ${parentId}` : 'Root Entity';
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
     * Open edit entity dialog
     */
    openEditEntityDialog(): void {
        this.editEntityDialogVisible = true;
    }

    /**
     * Reload entity details after dialog save
     */
    handleEntityUpdated(): void {
        this.loadAllData();
    }

    /**
     * Navigate to assign admin page
     */
    navigateToAssignAdmin(): void {
        this.router.navigate(['/company-administration/entities', this.entityId, 'assign-admin']);
    }

    /**
     * Show assign admin confirmation dialog
     */
    confirmAssignAccountAsAdmin(account: EntityAccount): void {
        this.accountToAssign = account;
        this.assignAdminDialog = true;
    }

    /**
     * Cancel assign admin dialog
     */
    onCancelAssignAdminDialog(): void {
        this.assignAdminDialog = false;
        this.accountToAssign = undefined;
    }

    /**
     * Assign a specific account as admin
     */
    assignAccountAsAdmin(): void {
        if (!this.accountToAssign || !this.accountToAssign.accountId || !this.entityId) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.assignEntityAdmin(this.entityId, this.accountToAssign.accountId).subscribe({
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

                this.assignAdminDialog = false;
                this.accountToAssign = undefined;

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
     * Open add account dialog
     */
    navigateToAddAccount(): void {
        this.isCreatingAdmin = false; // Regular account creation, not admin
        this.addAccountDialog = true;
    }

    /**
     * Open create admin dialog (creates account and auto-assigns as admin)
     */
    navigateToCreateAdmin(): void {
        this.isCreatingAdmin = true; // Set flag to auto-assign as admin after creation
        this.addAccountDialog = true;
    }

    /**
     * Handle account created event from create-entity-account component
     * @param accountId - The ID of the newly created account
     */
    onAccountCreated(accountId: string): void {
        this.addAccountDialog = false;

        // If we're creating an admin, auto-assign them as entity administrator
        if (this.isCreatingAdmin && accountId && this.entityId) {
            this.loadingAdmins = true;
            const sub = this.entitiesService.assignEntityAdmin(this.entityId, accountId).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleAccountError('assign', response);
                        this.isCreatingAdmin = false; // Reset flag even on error
                        return;
                    }

                    // Show success message for both account creation and admin assignment
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Account created and assigned as administrator successfully.',
                        life: 3000
                    });

                    this.isCreatingAdmin = false; // Reset flag after successful assignment
                    // Reload admins to show the newly assigned admin
                    this.reloadAdmins();
                },
                error: () => {
                    this.handleUnexpectedError();
                    this.isCreatingAdmin = false; // Reset flag on error
                    this.loadingAdmins = false;
                },
                complete: () => this.loadingAdmins = false
            });

            this.subscriptions.push(sub);
        } else {
            // Regular account creation, just reload admins and accounts
            this.reloadAdmins();
        }
    }

    /**
     * Handle cancel event from create-entity-account component
     */
    onAccountCancelled(): void {
        this.addAccountDialog = false;
    }

    /**
     * Show activate account confirmation dialog
     */
    confirmActivateAccount(account: EntityAdmin | EntityAccount): void {
        this.accountToActivate = account;
        this.activateAccountDialog = true;
    }

    /**
     * Cancel activate account dialog
     */
    onCancelActivateAccountDialog(): void {
        this.activateAccountDialog = false;
        this.accountToActivate = undefined;
    }

    /**
     * Activate an account
     * Only available for SystemAdmin
     */
    activateAccount(): void {
        if (!this.accountToActivate || !this.accountToActivate.email) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.activateAccount(this.accountToActivate.email).subscribe({
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

                this.activateAccountDialog = false;
                this.accountToActivate = undefined;

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
     * Show deactivate account confirmation dialog
     */
    confirmDeactivateAccount(account: EntityAdmin | EntityAccount): void {
        this.accountToDeactivate = account;
        this.deactivateAccountDialog = true;
    }

    /**
     * Cancel deactivate account dialog
     */
    onCancelDeactivateAccountDialog(): void {
        this.deactivateAccountDialog = false;
        this.accountToDeactivate = undefined;
    }

    /**
     * Deactivate an account
     * Available for SystemAdmin and EntityAdmin
     */
    deactivateAccount(): void {
        if (!this.accountToDeactivate || !this.accountToDeactivate.email) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.deactivateAccount(this.accountToDeactivate.email).subscribe({
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

                this.deactivateAccountDialog = false;
                this.accountToDeactivate = undefined;

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
                command: () => this.currentAdmin && this.confirmActivateAccount(this.currentAdmin)
            });
        }

        // Deactivate - For SystemAdmin, Developer and EntityAdmin when admin is active (Account_State = 1)
        if ((this.isSystemAdmin || this.isDeveloper || this.isEntityAdmin) && admin.accountState === 1) {
            menuItemsList.push({
                label: 'Deactivate Account',
                icon: 'pi pi-times',
                command: () => this.currentAdmin && this.confirmDeactivateAccount(this.currentAdmin)
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
                command: () => this.currentAccount && this.confirmAssignAccountAsAdmin(this.currentAccount)
            });
        }

        // Activate - For SystemAdmin and Developer when account is inactive (Account_State = 0)
        if ((this.isSystemAdmin || this.isDeveloper) && account.accountState === 0) {
            menuItemsList.push({
                label: 'Activate Account',
                icon: 'pi pi-check',
                command: () => this.currentAccount && this.confirmActivateAccount(this.currentAccount)
            });
        }

        // Deactivate - For SystemAdmin, Developer and EntityAdmin when account is active (Account_State = 1)
        if ((this.isSystemAdmin || this.isDeveloper || this.isEntityAdmin) && account.accountState === 1) {
            menuItemsList.push({
                label: 'Deactivate Account',
                icon: 'pi pi-times',
                command: () => this.currentAccount && this.confirmDeactivateAccount(this.currentAccount)
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
            accounts: this.entitiesService.getEntityAccountsList(this.entityId, this.includeSubentities, this.activeOnly)
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
                summary: 'Invalid File Type',
                detail: 'Please select an image file (JPG, PNG, JPEG, WEBP).',
                life: 5000
            });
            return;
        }

        // File size constants
        const RECOMMENDED_FILE_SIZE = 200 * 1024; // 200KB recommended
        const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const recommendedSizeInKB = (RECOMMENDED_FILE_SIZE / 1024).toFixed(0);

        // Warn if file is larger than recommended but still allow
        if (file.size > RECOMMENDED_FILE_SIZE) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Large File Size',
                detail: `File size (${fileSizeInMB}MB) is larger than recommended (${recommendedSizeInKB}KB). Upload may take longer.`,
                life: 5000
            });
            this.loadingLogo = false;
            this.logoUploader?.clear();
            return;

        }

        // Read file as ArrayBuffer to get actual bytes
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const byteArray = new Uint8Array(arrayBuffer);
            const imageFormat = file.type.split('/')[1] || 'png';

            // Send byte array directly - packRequest will handle it
            this.uploadLogo(byteArray, imageFormat);
        };
        reader.onerror = () => {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to read file. Please try again.',
                life: 5000
            });
        };
        reader.readAsArrayBuffer(file);
    }

    /**
     * Upload logo to server
     */
    uploadLogo(byteArray: Uint8Array, imageFormat: string): void {
        this.loadingLogo = true;

        // Convert byte array to base64 string
        const base64String = btoa(
            String.fromCharCode.apply(null, Array.from(byteArray))
        );

        const sub = this.entitiesService.assignEntityLogo(
            this.entityId,
            imageFormat,
            base64String
        ).subscribe({
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
     * Allow clicking the logo area to trigger the file picker
     * Works both when no logo exists and when logo exists (to upload another one)
     */
    onLogoAreaClick(): void {
        if (this.loadingLogo) {
            return;
        }

        // Trigger the file uploader
        this.logoUploader?.choose();
    }

    /**
     * Support keyboard users when focusing the logo area
     */
    onLogoAreaKeydown(event: KeyboardEvent | Event): void {
        event.preventDefault();
        this.onLogoAreaClick();
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

                // Use placeholder after removal
                this.entityLogo = 'assets/media/upload-photo.jpg';
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
     * Handle filter changes and reload accounts
     */
    onFilterChange(): void {
        this.reloadAdmins();
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

