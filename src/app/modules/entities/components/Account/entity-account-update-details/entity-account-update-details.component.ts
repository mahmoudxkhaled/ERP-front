import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../../services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { EntityAccount } from '../../../models/entities.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';

@Component({
  selector: 'app-entity-account-update-details',
  templateUrl: './entity-account-update-details.component.html',
  styleUrl: './entity-account-update-details.component.scss'
})
export class EntityAccountUpdateDetailsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() visible: boolean = false;
  @Input() account?: EntityAccount;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  updateDetailsForm!: FormGroup;
  loadingAccountDetails: boolean = false;
  savingAccountDetails: boolean = false;
  isRegional: boolean = false;
  accountSettings?: IAccountSettings;
  submitted: boolean = false;

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
      this.loadAccountDetailsForUpdate(this.account.email);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue && changes['account']?.currentValue && this.account) {
      this.loadAccountDetailsForUpdate(this.account.email);
    }
  }

  private initForm(): void {
    this.updateDetailsForm = this.fb.group({
      email: [{ value: '', disabled: true }],
      description: ['', [textFieldValidator()]]
    });
  }

  /** Fetches account details from the API to populate the form. */
  loadAccountDetailsForUpdate(email: string): void {
    this.loadingAccountDetails = true;
    const sub = this.entitiesService.getAccountDetails(email).subscribe({
      next: (response: any) => {
        this.loadingAccountDetails = false;
        if (response?.success) {
          const accountData = response?.message || {};
          this.updateDetailsForm.patchValue({
            email: email,
            description: accountData.Description || accountData.Description_Regional || ''
          });
        } else {
          this.updateDetailsForm.patchValue({
            email: email,
            description: ''
          });
        }
      },
      error: () => {
        this.loadingAccountDetails = false;
        this.updateDetailsForm.patchValue({
          email: email,
          description: ''
        });
      }
    });
    this.subscriptions.push(sub);
  }

  /** Saves the updated account details to the API. */
  saveUpdatedAccountDetails(): void {
    this.submitted = true;
    if (this.updateDetailsForm.invalid || !this.account) {
      return;
    }

    const { email, description } = this.updateDetailsForm.getRawValue();
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
    this.updateDetailsForm.reset();
    this.submitted = false;
  }

  get descriptionError(): string {
    const control = this.updateDetailsForm.get('description');
    return getTextFieldError(control, 'Description', this.submitted);
  }

  onDialogHide(): void {
    this.closeDialog();
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
