import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';
import { EntityAccount } from '../../models/entities.model';
import { Roles } from 'src/app/core/models/system-roles';



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

  // Role-based permissions
  systemRoleId: number = 0;
  isDeveloper: boolean = false;
  isSystemAdmin: boolean = false;
  isEntityAdmin: boolean = false;
  readonly Roles = Roles;

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
  }

  ngOnInit(): void {
    // Initialize form on component init
    this.initForm();

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
      error: () => {
        this.handleUnexpectedError();
        this.loadingEntity = false;
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
      error: () => {
        this.handleUnexpectedError();
        this.loadingAccounts = false;
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
    }).filter((account: EntityAccount) => account.systemRoleId !== 3);
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
      error: () => {
        this.handleUnexpectedError();
        this.loadingAccounts = false;
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
      error: () => {
        this.handleUnexpectedError();
        this.loadingAccounts = false;
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
      error: () => {
        this.handleUnexpectedError();
        this.loadingAccounts = false;
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
      error: () => {
        this.handleUnexpectedError();
        this.loadingAccounts = false;
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
        command: () => this.currentAccount && this.confirmDeleteAccount(this.currentAccount)
      });
    }

    // Assign as Admin - available when account is not already admin
    if ((this.isSystemAdmin || this.isDeveloper || this.isEntityAdmin) && this.isEligibleForAdmin(account)) {
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
    this.loadingAccounts = false;
    this.loading = false;
  }

  /**
   * Handle assign admin operation errors
   */
  private handleAssignAdminError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getAssignAdminErrorMessage(code);

    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail
    });
    this.loadingAccounts = false;
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
        if (context === 'accounts') {
          return code || 'Failed to load account information.';
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
   * Get error message for assign admin operation
   */
  private getAssignAdminErrorMessage(code: string): string {
    switch (code) {
      case 'ERP11260':
        return 'Invalid Entity ID.';
      case 'ERP11277':
        return 'Invalid account. Make sure the account exists and belongs to this entity tree.';
      case 'ERP11278':
        return 'The account must belong directly to this entity before it can be promoted.';
      default:
        return code || 'Failed to assign this account as admin. Please try again.';
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
  private handleUnexpectedError(): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'An unexpected error occurred. Please try again.'
    });
  }
}
