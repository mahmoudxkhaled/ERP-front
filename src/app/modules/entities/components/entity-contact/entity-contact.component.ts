import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';

interface EntityContact {
    address: string;
    addressRegional?: string;
    phoneNumbers: string[];
    faxNumbers: string[];
    emails: string[];
}

@Component({
    selector: 'app-entity-contact',
    templateUrl: './entity-contact.component.html',
    styleUrls: ['./entity-contact.component.scss']
})
export class EntityContactComponent implements OnInit, OnDestroy {
    @Input() entityId: string = '';
    @Input() entityName: string = '';

    loading: boolean = false;
    contacts: EntityContact | null = null;
    editDialog: boolean = false;
    editForm!: FormGroup;
    submitted: boolean = false;
    isRegional: boolean = false;
    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        const accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        if (this.entityId) {
            this.loadContacts();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    /**
     * Load entity contacts
     */
    loadContacts(): void {
        if (!this.entityId) {
            return;
        }

        this.loading = true;
        const sub = this.entitiesService.getEntityContacts(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                this.mapContactsData(response?.message || {});
                this.loading = false;
            },
            error: () => {
                this.handleUnexpectedError();
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
    }

    /**
     * Map contacts data from API response
     */
    private mapContactsData(data: any): void {
        this.contacts = {
            address: data?.Address || data?.address || '',
            addressRegional: data?.Address_Regional || data?.address_Regional || '',
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
     * Open edit dialog
     */
    openEditDialog(): void {
        if (!this.contacts) {
            // Initialize empty contacts if none exist
            this.contacts = {
                address: '',
                phoneNumbers: [],
                faxNumbers: [],
                emails: []
            };
        }

        this.initEditForm();
        this.editDialog = true;
    }

    /**
     * Initialize edit form
     */
    initEditForm(): void {
        const address = this.isRegional && this.contacts?.addressRegional
            ? this.contacts.addressRegional
            : (this.contacts?.address || '');

        this.editForm = this.fb.group({
            address: [address, []],
            isRegional: [this.isRegional, []],
            phoneNumbers: this.fb.array([]),
            faxNumbers: this.fb.array([]),
            emails: this.fb.array([])
        });

        // Add existing phone numbers
        if (this.contacts?.phoneNumbers && this.contacts.phoneNumbers.length > 0) {
            this.contacts.phoneNumbers.forEach(phone => {
                this.addPhoneNumber(phone);
            });
        }

        // Add existing fax numbers
        if (this.contacts?.faxNumbers && this.contacts.faxNumbers.length > 0) {
            this.contacts.faxNumbers.forEach(fax => {
                this.addFaxNumber(fax);
            });
        }

        // Add existing emails
        if (this.contacts?.emails && this.contacts.emails.length > 0) {
            this.contacts.emails.forEach(email => {
                this.addEmail(email);
            });
        }
    }

    /**
     * Get form controls
     */
    get f() {
        return this.editForm.controls;
    }

    /**
     * Get phone numbers form array
     */
    get phoneNumbersFormArray(): FormArray {
        return this.editForm.get('phoneNumbers') as FormArray;
    }

    /**
     * Get phone numbers controls as FormControl array
     */
    get phoneNumberControls(): FormControl[] {
        return this.phoneNumbersFormArray.controls as FormControl[];
    }

    /**
     * Get fax numbers form array
     */
    get faxNumbersFormArray(): FormArray {
        return this.editForm.get('faxNumbers') as FormArray;
    }

    /**
     * Get fax numbers controls as FormControl array
     */
    get faxNumberControls(): FormControl[] {
        return this.faxNumbersFormArray.controls as FormControl[];
    }

    /**
     * Get emails form array
     */
    get emailsFormArray(): FormArray {
        return this.editForm.get('emails') as FormArray;
    }

    /**
     * Get email controls as FormControl array
     */
    get emailControls(): FormControl[] {
        return this.emailsFormArray.controls as FormControl[];
    }

    /**
     * Add phone number field
     */
    addPhoneNumber(value: string = ''): void {
        const phoneNumbersArray = this.phoneNumbersFormArray;
        phoneNumbersArray.push(this.fb.control(value, [Validators.required, this.phoneNumberValidator]));
    }

    /**
     * Remove phone number field
     */
    removePhoneNumber(index: number): void {
        this.phoneNumbersFormArray.removeAt(index);
    }

    /**
     * Add fax number field
     */
    addFaxNumber(value: string = ''): void {
        const faxNumbersArray = this.faxNumbersFormArray;
        faxNumbersArray.push(this.fb.control(value, [Validators.required, this.phoneNumberValidator]));
    }

    /**
     * Remove fax number field
     */
    removeFaxNumber(index: number): void {
        this.faxNumbersFormArray.removeAt(index);
    }

    /**
     * Add email field
     */
    addEmail(value: string = ''): void {
        const emailsArray = this.emailsFormArray;
        emailsArray.push(this.fb.control(value, [Validators.required, Validators.email]));
    }

    /**
     * Remove email field
     */
    removeEmail(index: number): void {
        this.emailsFormArray.removeAt(index);
    }

    /**
     * Phone number validator - only digits allowed
     */
    private phoneNumberValidator(control: any): { [key: string]: any } | null {
        if (!control.value) {
            return null;
        }
        const value = control.value.toString();
        // Only digits allowed (no '+', '-', '/', spaces)
        const digitsOnly = /^\d+$/.test(value);
        return digitsOnly ? null : { invalidFormat: true };
    }

    /**
     * Cancel edit dialog
     */
    onCancelEdit(): void {
        this.editDialog = false;
        this.editForm.reset();
        this.submitted = false;
    }

    /**
     * Submit update
     */
    submitUpdate(): void {
        this.submitted = true;

        if (this.editForm.invalid || this.loading) {
            if (this.editForm.invalid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill in all fields correctly.'
                });
            }
            return;
        }

        const formValue = this.editForm.value;
        const address = formValue.address || '';
        const isRegional = formValue.isRegional || false;

        // Get phone numbers (filter empty values)
        const phoneNumbers = this.phoneNumbersFormArray.controls
            .map(control => control.value)
            .filter(value => value && value.trim() !== '');

        // Get fax numbers (filter empty values)
        const faxNumbers = this.faxNumbersFormArray.controls
            .map(control => control.value)
            .filter(value => value && value.trim() !== '');

        // Get emails (filter empty values)
        const emails = this.emailsFormArray.controls
            .map(control => control.value)
            .filter(value => value && value.trim() !== '');

        this.loading = true;

        const sub = this.entitiesService.updateEntityContacts(
            this.entityId,
            address,
            isRegional,
            phoneNumbers,
            faxNumbers,
            emails
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleUpdateError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Contact information updated successfully.',
                    life: 3000
                });

                this.editDialog = false;
                this.editForm.reset();
                this.submitted = false;

                // Reload contacts
                this.loadContacts();
                this.loading = false;
            },
            error: () => {
                this.handleUnexpectedError();
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
    }

    /**
     * Handle update errors
     */
    private handleUpdateError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getUpdateErrorMessage(code);

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
        this.loading = false;
    }

    /**
     * Get error message for update
     */
    private getUpdateErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID.';
            case 'ERP11271':
                return 'Invalid format for provided Address.';
            case 'ERP11272':
                return 'Invalid format for one or more Phone Number(s). Only digits are allowed (no "+", "-", "/" or spaces).';
            case 'ERP11273':
                return 'Invalid format for one or more Fax Number(s). Only digits are allowed (no "+", "-", "/" or spaces).';
            case 'ERP11274':
                return 'Invalid format for one or more Email(s).';
            default:
                return code || 'An error occurred while updating contact information. Please try again.';
        }
    }

    /**
     * Handle business errors
     */
    private handleBusinessError(response: any): void {
        const code = String(response?.message || '');
        if (code === 'ERP11260') {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid Entity ID.'
            });
        }
        this.loading = false;
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

    /**
     * Get display address (with regional support)
     */
    getDisplayAddress(): string {
        if (!this.contacts) {
            return '';
        }
        return this.isRegional && this.contacts.addressRegional
            ? this.contacts.addressRegional
            : (this.contacts.address || '');
    }
}

