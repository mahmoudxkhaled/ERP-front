import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';
import { EntityAccount } from '../../models/entities.model';

interface EntityAdmin {
    accountId: string;
    userId: number;
    name: string;
    email: string;
    systemRoleId?: number;
    accountState: number; // 1 = Active, 0 = Inactive
    isActive?: boolean;
}

@Component({
    selector: 'app-entity-account-admin-list',
    templateUrl: './entity-account-admin-list.component.html',
    styleUrl: './entity-account-admin-list.component.scss'
})
export class EntityAccountAdminListComponent implements OnInit, OnDestroy, OnChanges {
    @Input() entityId: string = '';
    @Output() adminCreated = new EventEmitter<string>();
    @Output() adminUpdated = new EventEmitter<void>();

    loadingAdmins: boolean = false;
    entityAdmins: EntityAccount[] = [];

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    // Role-based permissions
    systemRoleId: number = 0;
    isDeveloper: boolean = false;
    isSystemAdmin: boolean = false;
    isEntityAdmin: boolean = false;

    // Delete confirmation dialog
    deleteAccountDialog: boolean = false;
    accountToDelete?: EntityAccount;

    // Activate account confirmation dialog
    activateAccountDialog: boolean = false;
    accountToActivate?: EntityAccount;

    // Deactivate account confirmation dialog
    deactivateAccountDialog: boolean = false;
    accountToDeactivate?: EntityAccount;

    // Remove admin confirmation dialog
    removeAdminDialog: boolean = false;
    adminToRemove?: EntityAccount;

    // Menu items for admin actions
    menuItems: any[] = [];
    currentAdmin?: EntityAccount;

    // Add admin dialog
    addAdminDialog: boolean = false;

    // Form properties for creating admin
    form!: FormGroup;
    loading: boolean = false;
    submitted: boolean = false;
    loadingEntity: boolean = false;
    entityName: string = '';

    private subscriptions: Subscription[] = [];

    constructor(
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private fb: FormBuilder
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';

        // Initialize role-based permissions
        const accountDetails = this.localStorageService.getAccountDetails();
        this.systemRoleId = accountDetails?.System_Role_ID || 0;
        this.isDeveloper = this.systemRoleId === 1; // Developer = 1
        this.isSystemAdmin = this.systemRoleId === 2; // SystemAdmin = 2
        this.isEntityAdmin = this.systemRoleId === 3; // EntityAdmin = 3

        this.initForm();
    }

    ngOnInit(): void {
        if (this.entityId) {
            this.loadAdmins();
            this.loadEntity();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Reload admins when entityId changes
        if (changes['entityId'] && !changes['entityId'].firstChange && this.entityId) {
            this.loadAdmins();
            if (!this.entityName) {
                this.loadEntity();
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    /**
     * Load entity details to get entity name
     */
    loadEntity(): void {
        if (!this.entityId) return;

        this.loadingEntity = true;
        const sub = this.entitiesService.getEntityDetails(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('entity', response);
                    return;
                }

                const entity = response?.message || {};
                this.entityName = this.isRegional
                    ? (entity?.Name_Regional || entity?.name_Regional || entity?.name || entity?.Name || '')
                    : (entity?.Name || entity?.name || '');
            },

            complete: () => this.loadingEntity = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Load admins using Get_Entity_Admins API
     */
    loadAdmins(): void {
        this.reloadAdmins();
    }

    /**
     * Reload admins using Get_Entity_Admins API
     */
    reloadAdmins(): void {
        if (!this.entityId) {
            return;
        }

        this.loadingAdmins = true;

        const sub = this.entitiesService.getEntityAdmins(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('admins', response);
                    return;
                }
                console.log('admins response', response);
                // Map admins data from API response
                this.mapAccountsData(response?.message || {});
            },

            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    private mapAccountsData(accountsData: any): void {
        const accounts = accountsData || {};
        const accountsArray = Array.isArray(accounts) ? accounts : Object.values(accounts);

        // Map all accounts
        this.entityAdmins = accountsArray.map((account: any) => {
            const accountId = String(account?.Account_ID || '');
            const userId = account?.User_ID || 0;
            const systemRoleId = account?.System_Role_ID || 0;
            const accountState = account?.Account_State || 1;
            const email = account?.Email || '';
            const roleName = this.getRoleName(systemRoleId);
            const twoFA = account?.Two_FA || false;
            const lastLogin = account?.Last_Login || null;
            return {
                accountId,
                userId,
                email,
                systemRoleId,
                roleName,
                accountState,
                Two_FA: twoFA,
                Last_Login: lastLogin
            };
        });
    }

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
     * Show activate account confirmation dialog
     */
    confirmActivateAccount(admin: EntityAccount): void {
        this.accountToActivate = admin;
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

                // Reload admins
                this.reloadAdmins();
                this.adminUpdated.emit();
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Show deactivate account confirmation dialog
     */
    confirmDeactivateAccount(admin: EntityAccount): void {
        this.accountToDeactivate = admin;
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

                // Reload admins
                this.reloadAdmins();
                this.adminUpdated.emit();
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Show delete account confirmation dialog
     */
    confirmDeleteAccount(admin: EntityAccount): void {
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

                // Reload admins
                this.reloadAdmins();
                this.adminUpdated.emit();
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Show remove admin confirmation dialog
     */
    confirmRemoveAdmin(admin: EntityAccount): void {
        this.adminToRemove = admin;
        this.removeAdminDialog = true;
    }

    /**
     * Cancel remove admin dialog
     */
    onCancelRemoveAdminDialog(): void {
        this.removeAdminDialog = false;
        this.adminToRemove = undefined;
    }

    /**
     * Remove admin rights (demote to system user)
     */
    removeAdmin(): void {
        if (!this.adminToRemove?.accountId || !this.entityId) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.deleteEntityAdmin(this.entityId, this.adminToRemove.accountId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleRemoveAdminError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Admin access removed. Account is now a system user.',
                    life: 3000
                });

                this.removeAdminDialog = false;
                this.adminToRemove = undefined;

                this.reloadAdmins();
                this.adminUpdated.emit();
            },

            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Open menu for a specific admin
     */
    openMenu(menuRef: any, admin: EntityAccount, event: Event): void {
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
    private configureMenuItems(admin: EntityAccount): void {
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

        // Remove admin access - demote to system user
        if (this.isSystemAdmin || this.isDeveloper) {
            menuItemsList.push({
                label: 'Remove Admin Access',
                icon: 'pi pi-user-minus',
                command: () => this.currentAdmin && this.confirmRemoveAdmin(this.currentAdmin)
            });
        }

        this.menuItems = menuItemsList;
    }

    /**
     * Get entity name for display
     */
    getEntityName(): string {
        return this.entityName;
    }

    /**
     * Initialize the form with validation rules
     */
    initForm(): void {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            firstName: ['', [Validators.required]],
            lastName: ['', [Validators.required]]
        });
    }

    /**
     * Get form controls for easy access in template
     */
    get f() {
        return this.form.controls;
    }

    /**
     * Open create admin dialog
     */
    navigateToCreateAdmin(): void {
        this.initForm();
        this.addAdminDialog = true;
    }

    /**
     * Handle cancel event
     */
    onAdminCancelled(): void {
        this.addAdminDialog = false;
        this.form.reset();
        this.submitted = false;
    }

    /**
     * Handle form submission - Create admin account
     */
    submit(): void {
        this.submitted = true;

        // Check if form is valid
        if (this.form.invalid || this.loading) {
            if (this.form.invalid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill in all required fields correctly.'
                });
            }
            return;
        }

        // Get form values
        const email = this.form.value.email;
        const firstName = this.form.value.firstName;
        const lastName = this.form.value.lastName;
        const entityIdNum = parseInt(this.entityId, 10);

        // Validate entity ID
        if (isNaN(entityIdNum)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid entity ID.'
            });
            return;
        }

        this.loading = true;

        // Step 1: Create Entity Role
        // Generate a random string (letters only) to ensure unique role title and avoid ERP11303 error
        const generateRandomString = (length: number): string => {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += letters.charAt(Math.floor(Math.random() * letters.length));
            }
            return result;
        };
        const uniqueSuffix = generateRandomString(8);
        const roleTitle = `${this.entityName} Entity Administrator ${uniqueSuffix}`;
        const roleDescription = `Default Entity Administrator role for ${this.entityName}`;

        const sub = this.entitiesService.createEntityRole(entityIdNum, roleTitle, roleDescription).pipe(
            switchMap((roleResponse: any) => {
                if (!roleResponse?.success) {
                    this.handleCreateEntityRoleError(roleResponse);
                    return throwError(() => roleResponse);
                }

                // Extract Entity_Role_ID from response
                const entityRoleId = roleResponse.message.Entity_Role_ID;

                // Step 2: Create Account
                return this.entitiesService.createAccount(email, firstName, lastName, entityIdNum, entityRoleId);
            }),
            switchMap((accountResponse: any) => {
                if (!accountResponse?.success) {
                    this.handleCreateAccountError(accountResponse);
                    return throwError(() => accountResponse);
                }

                // Extract Account_ID from response
                const accountId = String(accountResponse?.message?.User_ID || '');

                // Step 3: Assign as admin
                return this.entitiesService.assignEntityAdmin(this.entityId, accountId).pipe(
                    switchMap((assignResponse: any) => {
                        if (!assignResponse?.success) {
                            this.handleAccountError('assign', assignResponse);
                            return throwError(() => assignResponse);
                        }

                        // Success - show success message
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Admin account created and assigned successfully.',
                            life: 3000
                        });

                        // Reset form
                        this.form.reset();
                        this.submitted = false;
                        this.loading = false;
                        this.addAdminDialog = false;

                        // Emit event to parent component with account ID
                        this.adminCreated.emit(accountId);
                        this.adminUpdated.emit();

                        // Reload admins to show the newly created admin
                        this.reloadAdmins();

                        return [assignResponse];
                    })
                );
            })
        ).subscribe({
            error: (error: any) => {
                // Error already handled in switchMap
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
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
        this.loading = false;
    }

    /**
     * Handle remove admin errors
     */
    private handleRemoveAdminError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getRemoveAdminErrorMessage(code);

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
            default:
                if (context === 'admins') {
                    return code || 'Failed to load admin information.';
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
            case 'assign':
                switch (code) {
                    case 'ERP11279':
                        return 'Account ID is not an admin of this entity.';
                    default:
                        return code || 'Failed to assign admin. Please try again.';
                }
            default:
                return code || `Failed to ${operation} account. Please try again.`;
        }
    }

    /**
     * Get error message for remove admin action
     */
    private getRemoveAdminErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID.';
            case 'ERP11279':
                return 'Invalid Account ID. This admin does not belong to the selected entity.';
            default:
                return code || 'Failed to remove admin access. Please try again.';
        }
    }

    /**
     * Handle create entity role errors
     */
    private handleCreateEntityRoleError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getCreateEntityRoleErrorMessage(code);

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
        this.loading = false;
    }

    /**
     * Get error message for create entity role
     */
    private getCreateEntityRoleErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11300':
                return 'Invalid entity selected.';
            case 'ERP11301':
                return 'Invalid role title format.';
            case 'ERP11302':
                return 'Invalid role description format.';
            case 'ERP11303':
                return 'A role with this title already exists for this entity.';
            default:
                return code || 'An error occurred while creating the role. Please try again.';
        }
    }

    /**
     * Handle create account errors
     */
    private handleCreateAccountError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getCreateAccountErrorMessage(code);

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
        this.loading = false;
    }

    /**
     * Get error message for create account
     */
    private getCreateAccountErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11130':
                return 'Invalid email address format';
            case 'ERP11141':
                return 'An account with the same email already exists';
            case 'ERP11142':
                return 'Invalid First Name format -> Empty or contains special characters';
            case 'ERP11143':
                return 'Invalid Last Name format -> Empty or contains special characters';
            case 'ERP11144':
                return 'Invalid Entity ID -> The database does not have an Entity with this ID';
            case 'ERP11145':
                return 'Invalid Role ID -> The entity does not have a Role with this ID';
            default:
                return code || 'An error occurred while creating the account. Please try again.';
        }
    }

    /**
     * Handle unexpected errors
     */

}
