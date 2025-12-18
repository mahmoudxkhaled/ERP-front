import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../../services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { EntityAccount } from '../../../models/entities.model';

@Component({
  selector: 'app-entity-account-details',
  templateUrl: './entity-account-details.component.html',
  styleUrl: './entity-account-details.component.scss'
})
export class EntityAccountDetailsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() visible: boolean = false;
  @Input() account?: EntityAccount;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  descriptionFormControl: FormControl = new FormControl('');

  // Account properties
  accountId: number = 0;
  email: string = '';
  userId: number = 0;
  entityId: number = 0;
  entityRoleId: number = 0;
  accountState: number = 0;
  description: string = '';
  descriptionRegional: string = '';
  originalDescription: string = '';

  loadingAccountDetails: boolean = false;
  savingAccountDetails: boolean = false;
  isRegional: boolean = false;
  accountSettings?: IAccountSettings;

  private subscriptions: Subscription[] = [];

  constructor(
    private entitiesService: EntitiesService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService
  ) {
    this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
    this.isRegional = this.accountSettings?.Language !== 'English';
  }

  ngOnInit(): void {
    if (this.visible && this.account) {
      this.loadAccountDetails(this.account.email);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue && changes['account']?.currentValue && this.account) {
      this.loadAccountDetails(this.account.email);
    }
  }

  /** Fetches account details from the API by email. */
  loadAccountDetails(email: string): void {
    this.loadingAccountDetails = true;
    const sub = this.entitiesService.getAccountDetails(email).subscribe({
      next: (response: any) => {
        this.loadingAccountDetails = false;
        if (!response?.success) {
          this.handleGetAccountDetailsError(response);
          return;
        }

        const accountData = response?.message || {};
        this.accountId = accountData.Account_ID || 0;
        this.email = accountData.Email || email;
        this.userId = accountData.User_ID || 0;
        this.entityId = accountData.Entity_ID || 0;
        this.entityRoleId = accountData.Entity_Role_ID || 0;
        this.accountState = accountData.Account_State ?? 1;
        this.description = accountData.Description || '';
        this.descriptionRegional = accountData.Description_Regional || '';

        const descriptionToShow = this.isRegional
          ? (this.descriptionRegional || this.description)
          : (this.description || this.descriptionRegional);

        this.descriptionFormControl.setValue(descriptionToShow, { emitEvent: false });
        this.originalDescription = descriptionToShow;
      },
      error: () => {
        this.loadingAccountDetails = false;
      }
    });

    this.subscriptions.push(sub);
  }

  get isDescriptionModified(): boolean {
    return this.descriptionFormControl.value !== this.originalDescription;
  }

  /** Saves the account description to the API. */
  saveAccountDetails(): void {
    if (!this.account || !this.isDescriptionModified) {
      return;
    }

    const description = this.descriptionFormControl.value || '';
    this.savingAccountDetails = true;

    const sub = this.entitiesService.updateAccountDetails(this.email, description, this.isRegional).subscribe({
      next: (response: any) => {
        this.savingAccountDetails = false;
        if (!response?.success) {
          this.handleUpdateAccountDetailsError(response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account description updated successfully.'
        });

        this.originalDescription = description;
        this.saved.emit();
      },
      error: () => {
        this.savingAccountDetails = false;
      }
    });

    this.subscriptions.push(sub);
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    if (this.isDescriptionModified) {
      this.descriptionFormControl.setValue(this.originalDescription, { emitEvent: false });
    }
  }

  getAccountStateText(): string {
    return this.accountState === 1 ? 'Active' : 'Inactive';
  }

  getAccountStateSeverity(): string {
    return this.accountState === 1 ? 'success' : 'danger';
  }

  onDialogHide(): void {
    this.closeDialog();
  }

  private handleGetAccountDetailsError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getGetAccountDetailsErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
  }

  private handleUpdateAccountDetailsError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getUpdateAccountDetailsErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
  }

  private getGetAccountDetailsErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP11150':
        return 'Invalid email address -> The Entity does not have an account with this email address';
      default:
        return null;
    }
  }

  private getUpdateAccountDetailsErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP11150':
        return 'Invalid email address -> The Entity does not have an account with this email address';
      case 'ERP11154':
        return 'Invalid \'Description\' format';
      default:
        return null;
    }
  }
}
