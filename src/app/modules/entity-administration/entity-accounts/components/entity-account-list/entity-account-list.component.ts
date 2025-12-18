import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { PermissionService } from 'src/app/core/services/permission.service';
import { textFieldValidator, getTextFieldError, nameFieldValidator, getNameFieldError } from 'src/app/core/validators/text-field.validator';
import { EntityAccount } from '../../../entities/models/entities.model';
import { EntitiesService } from '../../../entities/services/entities.service';
import { RolesService } from '../../../roles/services/roles.service';



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

  // Pagination
  first: number = 0;
  rows: number = 10;
  totalRecords: number = 0;

  accountSettings: IAccountSettings;
  isRegional: boolean = false;

  // Entity roles map for lookup
  entityRolesMap: Map<number, string> = new Map();

  // Confirmation dialogs state
  deleteAccountDialog: boolean = false;
  accountToDelete?: EntityAccount;
  activateAccountDialog: boolean = false;
  accountToActivate?: EntityAccount;
  deactivateAccountDialog: boolean = false;
  accountToDeactivate?: EntityAccount;
  assignAdminDialog: boolean = false;
  accountToAssign?: EntityAccount;

  // Context menu
  otherAccountsMenuItems: any[] = [];
  currentAccount?: EntityAccount;

  // Filters
  includeSubentities: boolean = false;
  activeOnly: boolean = false;
  textFilter: string = '';

  // Account creation form
  addAccountDialog: boolean = false;
  form!: FormGroup;
  loading: boolean = false;
  submitted: boolean = false;
  loadingEntity: boolean = false;
  entityName: string = '';

  // Account management dialogs
  viewAccountDetailsDialog: boolean = false;
  updateAccountEmailDialog: boolean = false;
  updateAccountEntityDialogVisible: boolean = false;
  accountEmailForUpdate: string = '';
  selectedAccountForDetails?: EntityAccount;
  updateEmailForm!: FormGroup;
  savingAccountEmail: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private entitiesService: EntitiesService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService,
    private permissionService: PermissionService,
    private fb: FormBuilder,
    private rolesService: RolesService
  ) {
    this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
    this.isRegional = this.accountSettings?.Language !== 'English';
  }

  ngOnInit(): void {
    this.initForm();
    this.initAccountManagementForms();

    if (this.entityId) {
      this.loadAccounts();
      this.loadEntity();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entityId'] && !changes['entityId'].firstChange && this.entityId) {
      // Clear roles map when entity changes
      this.entityRolesMap.clear();
      this.loadAccounts();
      if (!this.entityName) {
        this.loadEntity();
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /** Fetches the entity name from the API. */
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
          ? (entity?.Name_Regional || entity?.Name || '')
          : (entity?.Name || '');
      },

      complete: () => this.loadingEntity = false
    });

    this.subscriptions.push(sub);
  }

  /** Fetches entity roles and creates a lookup map. */
  loadEntityRoles(): void {
    if (!this.entityId) {
      return;
    }

    const entityIdNum = parseInt(this.entityId, 10);
    if (isNaN(entityIdNum)) {
      return;
    }

    const sub = this.rolesService.listEntityRoles(entityIdNum, 0, 100).subscribe({
      next: (response: any) => {
        if (response?.success) {
          const rolesData = response?.message?.Entity_Roles || {};
          this.entityRolesMap.clear();

          // Create lookup map: Entity_Role_ID -> Role Name
          Object.values(rolesData).forEach((item: any) => {
            const roleId = item?.Entity_Role_ID || 0;
            const roleName = this.isRegional
              ? (item?.Title_Regional || item?.Title || '')
              : (item?.Title || '');
            if (roleId > 0) {
              this.entityRolesMap.set(roleId, roleName);
            }
          });
        }
      },
      error: () => {
        // If error occurs, clear the map
        this.entityRolesMap.clear();
      }
    });

    this.subscriptions.push(sub);
  }

  loadAccounts(): void {
    // Load entity roles first, then reload accounts
    this.loadEntityRoles();
    this.reloadAccounts();
  }


  /** Fetches paginated accounts from the API. */
  reloadAccounts(): void {
    if (!this.entityId) {
      return;
    }

    this.loadingAccounts = true;

    // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastAccountId = -currentPage;

    const sub = this.entitiesService.getEntityAccountsList(
      this.entityId,
      this.includeSubentities,
      this.activeOnly,
      lastAccountId,
      this.rows,
      this.textFilter
    ).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('accounts', response);
          return;
        }
        console.log('reloadAccounts response', response);
        this.totalRecords = response.message.Total_Count;
        const accountsData = response?.message?.Accounts || {};
        this.mapAccountsData(accountsData);
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  private mapAccountsData(accountsData: any): void {
    const accounts = accountsData || {};
    const accountsArray = Array.isArray(accounts) ? accounts : Object.values(accounts);

    this.entityAccounts = accountsArray.map((account: any) => {
      const accountId = String(account?.Account_ID || '');
      const userId = account?.User_ID || 0;
      const systemRoleId = account?.System_Role_ID || 0;
      const accountState = account?.Account_State || 0;
      const email = account?.Email || '';
      const roleName = this.permissionService.getRoleName(systemRoleId);
      const twoFA = account?.Two_FA || false;
      const lastLogin = account?.Last_Login || null;

      // Extract entity role ID and look up role name
      const entityRoleId = account?.Entity_Role_ID || 0;
      const entityRoleName = entityRoleId > 0 && this.entityRolesMap.has(entityRoleId)
        ? this.entityRolesMap.get(entityRoleId) || 'N/A'
        : 'N/A';

      return {
        accountId,
        userId,
        email,
        systemRoleId,
        roleName,
        entityRoleId,
        entityRoleName,
        accountState,
        Two_FA: twoFA,
        Last_Login: lastLogin
      };
    }).filter((account: EntityAccount) => account.systemRoleId !== 3);
  }

  onFilterChange(): void {
    this.first = 0;
    this.reloadAccounts();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchValue = target?.value || '';
    this.textFilter = searchValue;
    this.first = 0; // Reset to first page when filter changes
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
      firstName: ['', [Validators.required, nameFieldValidator()]],
      lastName: ['', [Validators.required, nameFieldValidator()]]
    });
  }

  initAccountManagementForms(): void {
    this.updateEmailForm = this.fb.group({
      accountId: [{ value: '', disabled: true }],
      currentEmail: [{ value: '', disabled: true }],
      newEmail: ['', [Validators.required, Validators.email]]
    });
  }


  get f() {
    return this.form.controls;
  }

  get firstNameError(): string {
    return getNameFieldError(this.f['firstName'], 'First name', this.submitted);
  }

  get lastNameError(): string {
    return getNameFieldError(this.f['lastName'], 'Last name', this.submitted);
  }

  navigateToAddAccount(): void {
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

  /** Creates a new account with role and assigns it to the entity. */
  submit(): void {
    this.submitted = true;

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

    const email = this.form.value.email;
    const firstName = this.form.value.firstName;
    const lastName = this.form.value.lastName;
    const entityIdNum = parseInt(this.entityId, 10);

    if (isNaN(entityIdNum)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid entity ID.'
      });
      return;
    }

    this.loading = true;

    // Generate random suffix to ensure unique role title
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

        const entityRoleId = roleResponse.message.Entity_Role_ID;
        return this.entitiesService.createAccount(email, firstName, lastName, entityIdNum, entityRoleId);
      })
    ).subscribe({
      next: (accountResponse: any) => {
        if (!accountResponse?.success) {
          this.handleCreateAccountError(accountResponse);
          return;
        }

        const accountId = String(accountResponse?.message?.User_ID || '');

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account created successfully.',
          life: 3000
        });

        this.form.reset();
        this.submitted = false;
        this.loading = false;
        this.addAccountDialog = false;
        this.accountCreated.emit(accountId);
        this.accountUpdated.emit();
        this.reloadAccounts();
      },
      error: () => this.loading = false
    });

    this.subscriptions.push(sub);
  }

  confirmActivateAccount(account: EntityAccount): void {
    this.accountToActivate = account;
    this.activateAccountDialog = true;
  }

  onCancelActivateAccountDialog(): void {
    this.activateAccountDialog = false;
    this.accountToActivate = undefined;
  }

  /** Activates an account. Requires SystemAdmin role. */
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
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  confirmDeactivateAccount(account: EntityAccount): void {
    this.accountToDeactivate = account;
    this.deactivateAccountDialog = true;
  }

  onCancelDeactivateAccountDialog(): void {
    this.deactivateAccountDialog = false;
    this.accountToDeactivate = undefined;
  }

  /** Deactivates an account. Allowed for SystemAdmin and EntityAdmin. */
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
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  confirmDeleteAccount(account: EntityAccount): void {
    this.accountToDelete = account;
    this.deleteAccountDialog = true;
  }

  onCancelDeleteAccountDialog(): void {
    this.deleteAccountDialog = false;
    this.accountToDelete = undefined;
  }

  /** Deletes an account. Allowed for SystemAdmin and EntityAdmin. */
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
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  confirmAssignAccountAsAdmin(account: EntityAccount): void {
    this.accountToAssign = account;
    this.assignAdminDialog = true;
  }

  onCancelAssignAdminDialog(): void {
    this.assignAdminDialog = false;
    this.accountToAssign = undefined;
  }

  /** Promotes an account to entity administrator. */
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
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  openOtherAccountMenu(menuRef: any, account: EntityAccount, event: Event): void {
    this.currentAccount = account;
    this.configureOtherAccountMenuItems(account);
    menuRef.toggle(event);
  }

  /**
   * Builds the context menu based on user permissions.
   * - Activate: SystemAdmin, Developer only (when inactive)
   * - Deactivate/Delete: SystemAdmin, Developer, EntityAdmin
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

    if (canGetAccountDetails || canUpdateAccountDetails) {
      menuItemsList.push({
        label: 'View/Edit Account Details',
        icon: 'pi pi-eye',
        command: () => this.currentAccount && this.openViewAccountDetails(this.currentAccount)
      });
    }

    if (canUpdateAccountEmail) {
      menuItemsList.push({
        label: 'Update Account Email',
        icon: 'pi pi-envelope',
        command: () => this.currentAccount && this.openUpdateAccountEmail(this.currentAccount)
      });
    }

    if (canUpdateAccountEntity) {
      menuItemsList.push({
        label: 'Update Account Entity',
        icon: 'pi pi-building',
        command: () => this.currentAccount && this.openUpdateAccountEntity(this.currentAccount)
      });
    }

    if (canActivateAccount && account.accountState === 0) {
      menuItemsList.push({
        label: 'Activate Account',
        icon: 'pi pi-check',
        command: () => this.currentAccount && this.confirmActivateAccount(this.currentAccount)
      });
    }

    if (canDeactivateAccount && account.accountState === 1) {
      menuItemsList.push({
        label: 'Deactivate Account',
        icon: 'pi pi-times',
        command: () => this.currentAccount && this.confirmDeactivateAccount(this.currentAccount)
      });
    }

    if (canDeleteAccount) {
      menuItemsList.push({
        label: 'Delete Account',
        icon: 'pi pi-trash',
        command: () => this.currentAccount && this.confirmDeleteAccount(this.currentAccount)
      });
    }

    if (canAssignAdmin && this.isEligibleForAdmin(account)) {
      menuItemsList.push({
        label: 'Assign as Admin',
        icon: 'pi pi-user-plus',
        command: () => this.currentAccount && this.confirmAssignAccountAsAdmin(this.currentAccount)
      });
    }

    this.otherAccountsMenuItems = menuItemsList;
  }

  private isEligibleForAdmin(account: EntityAccount): boolean {
    return account.systemRoleId !== 3;
  }

  getEntityName(): string {
    return this.entityName;
  }

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

  private getAccountErrorMessage(operation: string, code: string): string | null {
    switch (code) {
      case 'ERP11260':
        return 'Invalid Entity ID';
      case 'ERP11277':
        return 'Invalid account selected.';
      case 'ERP11278':
        return 'Account does not belong to this entity.';
    }

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

  openViewAccountDetails(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.viewAccountDetailsDialog = true;
  }

  onAccountDetailsSaved(): void {
    this.accountUpdated.emit();
    this.reloadAccounts();
  }

  openUpdateAccountEmail(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.updateEmailForm.patchValue({
      accountId: account.accountId,
      currentEmail: account.email,
      newEmail: ''
    });
    this.updateAccountEmailDialog = true;
  }

  openUpdateAccountEntity(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.accountEmailForUpdate = account.email;
    this.updateAccountEntityDialogVisible = true;
  }


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

  onAccountEntityUpdateSave(data: { email: string; entityId: number; entityRoleId: number }): void {
    const sub = this.entitiesService.updateAccountEntity(data.email, data.entityId, data.entityRoleId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleUpdateAccountEntityError(response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account entity updated successfully.'
        });

        this.updateAccountEntityDialogVisible = false;
        this.accountUpdated.emit();
        this.reloadAccounts();
      },
      error: () => {
        // Error handled by handleUpdateAccountEntityError
      }
    });

    this.subscriptions.push(sub);
  }

  onAccountEntityUpdateCancel(): void {
    this.updateAccountEntityDialogVisible = false;
  }

  onCloseUpdateAccountEmailDialog(): void {
    this.updateAccountEmailDialog = false;
    this.updateEmailForm.reset();
  }

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

  /** Returns true if the date is missing or before 2025 (used to display "Never"). */
  isDefaultDate(dateString: string | null | undefined): boolean {
    if (!dateString) {
      return true;
    }
    const date = new Date(dateString);
    return date.getFullYear() < 2025;
  }

}
