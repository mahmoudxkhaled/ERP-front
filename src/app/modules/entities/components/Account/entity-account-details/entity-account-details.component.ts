import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';
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

  accountDetailsForm!: FormGroup;
  loadingAccountDetails: boolean = false;
  savingAccountDetails: boolean = false;
  isRegional: boolean = false;
  accountSettings?: IAccountSettings;

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private entitiesService: EntitiesService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService
  ) {
    this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
    this.isRegional = this.accountSettings?.Language !== 'English';
  }

  ngOnInit(): void {
    this.initForm();
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

  private initForm(): void {
    this.accountDetailsForm = this.fb.group({
      email: [{ value: '', disabled: true }],
      description: ['']
    });
  }

  /**
   * Load account details by email
   */
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
        this.accountDetailsForm.patchValue({
          email: accountData.Email || email,
          description: accountData.Description || accountData.Description_Regional || ''
        });
      },
      error: () => {
        this.loadingAccountDetails = false;
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Save account details
   */
  saveAccountDetails(): void {
    if (this.accountDetailsForm.invalid || !this.account) {
      return;
    }

    const { email, description } = this.accountDetailsForm.getRawValue();
    this.savingAccountDetails = true;

    const sub = this.entitiesService.updateAccountDetails(email, description, this.isRegional).subscribe({
      next: (response: any) => {
        this.savingAccountDetails = false;
        if (!response?.success) {
          this.handleUpdateAccountDetailsError(response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account details updated successfully.'
        });

        this.closeDialog();
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
    this.accountDetailsForm.reset();
  }

  onDialogHide(): void {
    this.closeDialog();
  }

  /**
   * Error handling methods
   */
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
