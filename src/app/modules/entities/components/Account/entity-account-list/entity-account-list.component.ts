import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EntitiesService } from '../../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';
import { EntityAccount } from '../../../models/entities.model';
import { PermissionService } from 'src/app/core/Services/permission.service';



@Component({
  selector: 'app-entity-account-list',
  templateUrl: './entity-account-list.component.html',
  styleUrl: './entity-account-list.component.scss'
})
export class EntityAccountListComponent implements OnInit, OnDestroy, OnChanges {
  @Input() entityId: string = '';
  @Output() accountCreated = new EventEmitter<string>();
  @Output() accountUpdated = new EventEmitter<void>();

  loadingAccounts: boolean = false;
  entityAccounts: EntityAccount[] = [];

  // Pagination state properties
  first: number = 0;
  rows: number = 10;
  totalRecords: number = 0;

  accountSettings: IAccountSettings;
  isRegional: boolean = false;

  // Delete confirmation dialog
  deleteAccountDialog: boolean = false;
  accountToDelete?: EntityAccount;

  // Activate account confirmation dialog
  activateAccountDialog: boolean = false;
  accountToActivate?: EntityAccount;

  // Deactivate account confirmation dialog
  deactivateAccountDialog: boolean = false;
  accountToDeactivate?: EntityAccount;

  // Assign admin confirmation dialog
  assignAdminDialog: boolean = false;
  accountToAssign?: EntityAccount;

  // Menu items for accounts actions
  otherAccountsMenuItems: any[] = [];
  currentAccount?: EntityAccount;

  // Filter options for accounts list
  includeSubentities: boolean = false;
  activeOnly: boolean = false;

  // Add account dialog
  addAccountDialog: boolean = false;

  // Form properties for creating account
  form!: FormGroup;
  loading: boolean = false;
  submitted: boolean = false;
  loadingEntity: boolean = false;
  entityName: string = '';

  // Account management dialog properties
  viewAccountDetailsDialog: boolean = false;
  updateAccountEmailDialog: boolean = false;
  updateAccountEntityDialog: boolean = false;
  selectedAccountForDetails?: EntityAccount;

  // Form groups for account management (only for email and entity updates)
  updateEmailForm!: FormGroup;
  updateEntityForm!: FormGroup;

  // Loading states for account management operations
  savingAccountEmail: boolean = false;
  savingAccountEntity: boolean = false;

  // Entity and role options for update entity dialog
  entityOptions: any[] = [];
  entityRoleOptions: any[] = [];
  loadingEntityOptions: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private entitiesService: EntitiesService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService,
    private permissionService: PermissionService,
    private fb: FormBuilder
  ) {
    this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
    this.isRegional = this.accountSettings?.Language !== 'English';
  }

  ngOnInit(): void {
    // Initialize form on component init
    this.initForm();
    this.initAccountManagementForms();

    if (this.entityId) {
      this.loadAccounts();
      this.loadEntity();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reload accounts when entityId changes
    if (changes['entityId'] && !changes['entityId'].firstChange && this.entityId) {
      this.loadAccounts();
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
        console.log('accounts entity response', response);
        const entity = response?.message || {};
        this.entityName = this.isRegional
          ? (entity?.Name_Regional || entity?.Name || '')
          : (entity?.Name || '');
      },

      complete: () => this.loadingEntity = false
    });

    this.subscriptions.push(sub);
  }


  loadAccounts(): void {
    this.reloadAccounts();
  }


  reloadAccounts(): void {
    if (!this.entityId) {
      return;
    }

    this.loadingAccounts = true;

    // Calculate page number from first and rows
    // Mapping: -1 = page 1, -2 = page 2, -3 = page 3, etc.
    // Examples:
    //   first = 0,  rows = 10 -> page = (0/10) + 1 = 1 -> lastAccountId = -1 (page 1)
    //   first = 10, rows = 10 -> page = (10/10) + 1 = 2 -> lastAccountId = -2 (page 2)
    //   first = 20, rows = 10 -> page = (20/10) + 1 = 3 -> lastAccountId = -3 (page 3)
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastAccountId = -currentPage; // Convert to negative: page 1 = -1, page 2 = -2, etc.

    const sub = this.entitiesService.getEntityAccountsList(
      this.entityId,
      this.includeSubentities,
      this.activeOnly,
      lastAccountId,
      this.rows
    ).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('accounts', response);
          return;
        }

        console.log('accounts response', response);
        this.totalRecords = response.message.Total_Count;
        const accountsData = response?.message?.Accounts || {};
        this.mapAccountsData(accountsData);
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  private mapAccountsData(accountsData: any): void {
    console.log('accountsData11111111111', accountsData);
    const accounts = accountsData || {};
    const accountsArray = Array.isArray(accounts) ? accounts : Object.values(accounts);

    // Map all accounts
    this.entityAccounts = accountsArray.map((account: any) => {
      const accountId = String(account?.Account_ID || '');
      const userId = account?.User_ID || 0;
      const systemRoleId = account?.System_Role_ID || 0;
      const accountState = account?.Account_State || 0;
      const email = account?.Email || '';
      const roleName = this.permissionService.getRoleName(systemRoleId);
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
    }).filter((account: EntityAccount) => account.systemRoleId !== 3);
  }

  onFilterChange(): void {
    // Reset to first page when filters change
    this.first = 0;
    this.reloadAccounts();
  }


  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
    this.reloadAccounts();
  }


  initForm(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]]
    });
  }

  /**
   * Initialize forms for account management operations
   */
  initAccountManagementForms(): void {
    // Form for updating account email
    this.updateEmailForm = this.fb.group({
      accountId: [{ value: '', disabled: true }],
      currentEmail: [{ value: '', disabled: true }],
      newEmail: ['', [Validators.required, Validators.email]]
    });

    // Form for updating account entity
    this.updateEntityForm = this.fb.group({
      email: [{ value: '', disabled: true }],
      entityId: [0, [Validators.required]],
      entityRoleId: [0, [Validators.required]]
    });
  }


  get f() {
    return this.form.controls;
  }

  navigateToAddAccount(): void {
    // Reset form and ensure it's initialized
    if (!this.form) {
      this.initForm();
    } else {
      this.form.reset();
      this.submitted = false;
    }
    this.addAccountDialog = true;
  }

  onAccountCancelled(): void {
    this.addAccountDialog = false;
    this.form.reset();
    this.submitted = false;
  }

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
    const roleTitle = `${this.entityName} System User ${uniqueSuffix}`;
    const roleDescription = `Default System User role for ${this.entityName}`;

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
      })
    ).subscribe({
      next: (accountResponse: any) => {
        if (!accountResponse?.success) {
          this.handleCreateAccountError(accountResponse);
          return;
        }

        // Extract Account_ID from response
        const accountId = String(accountResponse?.message?.User_ID || '');

        // Success - show success message
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account created successfully.',
          life: 3000
        });

        // Reset form
        this.form.reset();
        this.submitted = false;
        this.loading = false;
        this.addAccountDialog = false;

        // Emit event to parent component with account ID
        this.accountCreated.emit(accountId);
        this.accountUpdated.emit();

        // Reload accounts to show the newly created account
        this.reloadAccounts();
      },
      error: (error: any) => {
        // Error already handled in switchMap or handleCreateAccountError or handleCreateEntityRoleError
        this.loading = false;
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Show activate account confirmation dialog
   */
  confirmActivateAccount(account: EntityAccount): void {
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

    this.loadingAccounts = true;
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

        // Reload accounts
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  /**
   * Show deactivate account confirmation dialog
   */
  confirmDeactivateAccount(account: EntityAccount): void {
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

    this.loadingAccounts = true;
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

        // Reload accounts
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  /**
   * Show delete account confirmation dialog
   */
  confirmDeleteAccount(account: EntityAccount): void {
    this.accountToDelete = account;
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
    this.loadingAccounts = true;

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

        // Reload accounts
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
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
   * Assign selected account as entity admin
   */
  assignAccountAsAdmin(): void {
    if (!this.accountToAssign?.accountId || !this.entityId) {
      return;
    }

    this.loadingAccounts = true;
    const sub = this.entitiesService.assignEntityAdmin(this.entityId, this.accountToAssign.accountId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleAssignAdminError(response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account assigned as entity administrator successfully.',
          life: 3000
        });

        this.assignAdminDialog = false;
        this.accountToAssign = undefined;

        // Reload accounts to reflect new admin assignment
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  /**
   * Open menu for a specific account
   */
  openOtherAccountMenu(menuRef: any, account: EntityAccount, event: Event): void {
    this.currentAccount = account;
    this.configureOtherAccountMenuItems(account);
    menuRef.toggle(event);
  }

  /**
   * Configure menu items for accounts table
   * Activate: SystemAdmin, Developer (when account is inactive)
   * Deactivate: SystemAdmin, Developer, EntityAdmin (when account is active)
   * Delete: SystemAdmin, Developer, EntityAdmin
   */
  private configureOtherAccountMenuItems(account: EntityAccount): void {
    const menuItemsList: any[] = [];
    const canActivateAccount = this.permissionService.canActivateAccount();
    const canDeactivateAccount = this.permissionService.canDeactivateAccount();
    const canDeleteAccount = this.permissionService.canDeleteAccount();
    const canAssignAdmin = this.permissionService.canAssignAdmin();
    const canGetAccountDetails = this.permissionService.can('Get_Account_Details');
    const canUpdateAccountDetails = this.permissionService.can('Update_Account_Details');
    const canUpdateAccountEmail = this.permissionService.can('Update_Account_Email');
    const canUpdateAccountEntity = this.permissionService.can('Update_Account_Entity');

    // View/Edit Account Details - Visible if user can get or update account details
    if (canGetAccountDetails || canUpdateAccountDetails) {
      menuItemsList.push({
        label: 'View/Edit Account Details',
        icon: 'pi pi-eye',
        command: () => this.currentAccount && this.openViewAccountDetails(this.currentAccount)
      });
    }

    // Update Account Email
    if (canUpdateAccountEmail) {
      menuItemsList.push({
        label: 'Update Account Email',
        icon: 'pi pi-envelope',
        command: () => this.currentAccount && this.openUpdateAccountEmail(this.currentAccount)
      });
    }

    // Update Account Entity
    if (canUpdateAccountEntity) {
      menuItemsList.push({
        label: 'Update Account Entity',
        icon: 'pi pi-building',
        command: () => this.currentAccount && this.openUpdateAccountEntity(this.currentAccount)
      });
    }

    // Activate - For SystemAdmin and Developer when account is inactive (Account_State = 0)
    if (canActivateAccount && account.accountState === 0) {
      menuItemsList.push({
        label: 'Activate Account',
        icon: 'pi pi-check',
        command: () => this.currentAccount && this.confirmActivateAccount(this.currentAccount)
      });
    }

    // Deactivate - For SystemAdmin, Developer and EntityAdmin when account is active (Account_State = 1)
    if (canDeactivateAccount && account.accountState === 1) {
      menuItemsList.push({
        label: 'Deactivate Account',
        icon: 'pi pi-times',
        command: () => this.currentAccount && this.confirmDeactivateAccount(this.currentAccount)
      });
    }

    // Delete - For SystemAdmin, Developer and EntityAdmin
    if (canDeleteAccount) {
      menuItemsList.push({
        label: 'Delete Account',
        icon: 'pi pi-trash',
        command: () => this.currentAccount && this.confirmDeleteAccount(this.currentAccount)
      });
    }

    // Assign as Admin - available when account is not already admin
    if (canAssignAdmin && this.isEligibleForAdmin(account)) {
      menuItemsList.push({
        label: 'Assign as Admin',
        icon: 'pi pi-user-plus',
        command: () => this.currentAccount && this.confirmAssignAccountAsAdmin(this.currentAccount)
      });
    }

    this.otherAccountsMenuItems = menuItemsList;
  }

  /**
   * Check if account can be promoted to admin
   */
  private isEligibleForAdmin(account: EntityAccount): boolean {
    return account.systemRoleId !== 3;
  }

  /**
   * Get entity name for display
   */
  getEntityName(): string {
    return this.entityName;
  }

  /**
   * Handle business errors from API responses
   */
  private handleBusinessError(context: string, response: any): void {
    const code = String(response?.message || '');
    const detail = this.getErrorMessage(context, code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
  }

  /**
   * Handle account operation errors
   */
  private handleAccountError(operation: string, response: any): void {
    const code = String(response?.message || '');
    const detail = this.getAccountErrorMessage(operation, code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
    this.loadingAccounts = false;
    this.loading = false;
  }

  /**
   * Handle assign admin operation errors
   */
  private handleAssignAdminError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getAssignAdminErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
    this.loadingAccounts = false;
  }

  /**
   * Get user-friendly error message based on error code
   */
  private getErrorMessage(context: string, code: string): string | null {
    switch (code) {
      case 'ERP11260':
        return 'Invalid Entity ID';
      case 'ERP11255':
        return 'Invalid value for the Filter_Count parameter, should be a minimum of 5 records, and a maximum of 100 records';
      case 'ERP11277':
        return 'Invalid account selected.';
      case 'ERP11278':
        return 'Account does not belong to this entity.';
      default:
        if (context === 'accounts') {
          return null;
        }
        return null;
    }
  }

  /**
   * Get error message for account operations
   */
  private getAccountErrorMessage(operation: string, code: string): string | null {
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
            return 'Invalid email address → The Entity does not have an account with this email address';
          case 'ERP11151':
            return 'The account is already active';
          default:
            return null;
        }
      case 'deactivate':
        switch (code) {
          case 'ERP11150':
            return 'Invalid email address → The Entity does not have an account with this email address';
          case 'ERP11152':
            return 'The account was already deactivated';
          default:
            return null;
        }
      case 'delete':
        switch (code) {
          case 'ERP11150':
            return 'Invalid email address → The Entity does not have an account with this email address';
          case 'ERP11153':
            return 'Account was already created. Deactivate_Account to be used instead';
          default:
            return null;
        }
      default:
        return null;
    }
  }

  /**
   * Get error message for assign admin operation
   */
  private getAssignAdminErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP11260':
        return 'Invalid Entity ID.';
      case 'ERP11277':
        return 'Invalid account. Make sure the account exists and belongs to this entity tree.';
      case 'ERP11278':
        return 'The account must belong directly to this entity before it can be promoted.';
      default:
        return null;
    }
  }

  /**
   * Open view account details dialog
   */
  openViewAccountDetails(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.viewAccountDetailsDialog = true;
  }

  /**
   * Handle account details saved event
   */
  onAccountDetailsSaved(): void {
    this.accountUpdated.emit();
    this.reloadAccounts();
  }

  /**
   * Open update account email dialog
   */
  openUpdateAccountEmail(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.updateEmailForm.patchValue({
      accountId: account.accountId,
      currentEmail: account.email,
      newEmail: ''
    });
    this.updateAccountEmailDialog = true;
  }

  /**
   * Open update account entity dialog
   */
  openUpdateAccountEntity(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.loadEntityOptions();
    // Load account details first to get entityId and entityRoleId
    const sub = this.entitiesService.getAccountDetails(account.email).subscribe({
      next: (response: any) => {
        if (response?.success) {
          const accountData = response?.message || {};
          this.updateEntityForm.patchValue({
            email: account.email,
            entityId: accountData.Entity_ID || 0,
            entityRoleId: accountData.Entity_Role_ID || 0
          });
        } else {
          // If loading fails, use default values
          this.updateEntityForm.patchValue({
            email: account.email,
            entityId: 0,
            entityRoleId: 0
          });
        }
        this.updateAccountEntityDialog = true;
      },
      error: () => {
        this.updateEntityForm.patchValue({
          email: account.email,
          entityId: 0,
          entityRoleId: 0
        });
        this.updateAccountEntityDialog = true;
      }
    });
    this.subscriptions.push(sub);
  }


  /**
   * Save updated account email
   */
  saveAccountEmail(): void {
    if (this.updateEmailForm.invalid || !this.selectedAccountForDetails) {
      this.updateEmailForm.markAllAsTouched();
      return;
    }

    const { accountId, currentEmail, newEmail } = this.updateEmailForm.getRawValue();
    this.savingAccountEmail = true;

    const sub = this.entitiesService.updateAccountEmail(Number(accountId), currentEmail, newEmail).subscribe({
      next: (response: any) => {
        this.savingAccountEmail = false;
        if (!response?.success) {
          this.handleUpdateAccountEmailError(response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account email updated successfully.'
        });

        this.updateAccountEmailDialog = false;
        this.updateEmailForm.reset();
        this.accountUpdated.emit();
        this.reloadAccounts();
      },
      error: () => {
        this.savingAccountEmail = false;
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Save updated account entity
   */
  saveAccountEntity(): void {
    if (this.updateEntityForm.invalid || !this.selectedAccountForDetails) {
      this.updateEntityForm.markAllAsTouched();
      return;
    }

    const { email, entityId, entityRoleId } = this.updateEntityForm.value;
    this.savingAccountEntity = true;

    const sub = this.entitiesService.updateAccountEntity(email, Number(entityId), Number(entityRoleId)).subscribe({
      next: (response: any) => {
        this.savingAccountEntity = false;
        if (!response?.success) {
          this.handleUpdateAccountEntityError(response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account entity updated successfully.'
        });

        this.updateAccountEntityDialog = false;
        this.updateEntityForm.reset();
        this.accountUpdated.emit();
        this.reloadAccounts();
      },
      error: () => {
        this.savingAccountEntity = false;
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Load entity options for dropdown
   */
  loadEntityOptions(): void {
    console.log('loadEntityOptions');
    if (this.entityOptions.length > 0) {
      return; // Already loaded
    }

    this.loadingEntityOptions = true;
    const sub = this.entitiesService.listEntities(0, 100).subscribe({
      next: (response: any) => {
        this.loadingEntityOptions = false;
        if (response?.success) {
          console.log('entities response', response);
          const entities = response.message.Entities || {};


          this.entityOptions = Object.values(entities).map((item: any) => ({
            label: `${item?.Name || 'Entity'} (${item?.Code || 'N/A'})`,
            value: Number(item?.Entity_ID || item?.id || 0)
          })).filter((option: any) => !isNaN(option.value));

          // Load entity roles if entity is selected
          if (this.updateEntityForm.value.entityId) {
            this.loadEntityRoles(Number(this.updateEntityForm.value.entityId));
          }
        }
      },
      error: () => {
        this.loadingEntityOptions = false;
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Load entity roles for selected entity
   */
  loadEntityRoles(entityId: number): void {
    // TODO: Implement entity roles API when available
    // For now, use default roles
    this.entityRoleOptions = [
      { label: 'Role 1', value: 15 },
      { label: 'Role 2 ', value: 5 }
    ];
  }

  /**
   * Close dialogs
   */
  onCloseUpdateAccountEmailDialog(): void {
    this.updateAccountEmailDialog = false;
    this.updateEmailForm.reset();
  }

  onCloseUpdateAccountEntityDialog(): void {
    this.updateAccountEntityDialog = false;
    this.updateEntityForm.reset();
  }

  /**
   * Error handling methods
   */
  private handleUpdateAccountEmailError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getUpdateAccountEmailErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
  }

  private handleUpdateAccountEntityError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getUpdateAccountEntityErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
  }

  private getUpdateAccountEmailErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP11150':
        return 'Invalid email address -> The Entity does not have an account with this email address';
      case 'ERP11141':
        return 'An account with the same email already exists';
      case 'ERP11160':
        return '\'Account_ID\' not matching with \'Current Email\'';
      case 'ERP11161':
        return 'Invalid format for the \'New_Email\'';
      default:
        return null;
    }
  }

  private getUpdateAccountEntityErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP11150':
        return 'Invalid email address -> The Entity does not have an account with this email address';
      case 'ERP11144':
        return 'Invalid Entity ID -> The database does not have an Entity with this ID';
      case 'ERP11145':
        return 'Invalid Role ID -> The entity does not have a Role with this ID';
      default:
        return null;
    }
  }

  /**
   * Handle create entity role errors
   */
  private handleCreateEntityRoleError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getCreateEntityRoleErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
    this.loading = false;
  }

  /**
   * Get error message for create entity role
   */
  private getCreateEntityRoleErrorMessage(code: string): string | null {
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
        return null;
    }
  }

  /**
   * Handle create account errors
   */
  private handleCreateAccountError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getCreateAccountErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
    this.loading = false;
  }

  /**
   * Get error message for create account
   */
  private getCreateAccountErrorMessage(code: string): string | null {
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
        return null;
    }
  }

  /**
   * Check if date is before 2025 - if so, show "Never"
   */
  isDefaultDate(dateString: string | null | undefined): boolean {
    if (!dateString) {
      return true;
    }
    const date = new Date(dateString);
    return date.getFullYear() < 2025;
  }

}
