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
            }
        });

        this.subscriptions.push(sub);
    }


    private mapContactsData(data: any): void {
        console.log('data', data);
        this.contacts = {
            address: data?.Address || '',
            addressRegional: data?.Address_Regional || '',
            phoneNumbers: Array.isArray(data?.PhoneNumbers)
                ? data.PhoneNumbers
                : [],
            faxNumbers: Array.isArray(data?.FaxNumbers)
                ? data.FaxNumbers
                : [],
            emails: Array.isArray(data?.Emails)
                ? data.Emails
                : []
        };
    }


    openEditDialog(): void {
        if (!this.contacts) {
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


    initEditForm(): void {
        const address = this.isRegional && this.contacts?.addressRegional
            ? this.contacts.addressRegional
            : (this.contacts?.address || '');

        this.editForm = this.fb.group({
            address: [address, [Validators.required]],
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


    get f() {
        return this.editForm.controls;
    }


    get phoneNumbersFormArray(): FormArray {
        return this.editForm.get('phoneNumbers') as FormArray;
    }

    get phoneNumberControls(): FormControl[] {
        return this.phoneNumbersFormArray.controls as FormControl[];
    }


    get faxNumbersFormArray(): FormArray {
        return this.editForm.get('faxNumbers') as FormArray;
    }


    get faxNumberControls(): FormControl[] {
        return this.faxNumbersFormArray.controls as FormControl[];
    }


    get emailsFormArray(): FormArray {
        return this.editForm.get('emails') as FormArray;
    }


    get emailControls(): FormControl[] {
        return this.emailsFormArray.controls as FormControl[];
    }


    addPhoneNumber(value: string = ''): void {
        const phoneNumbersArray = this.phoneNumbersFormArray;
        // Phone numbers are optional, but if provided, must be valid format
        phoneNumbersArray.push(this.fb.control(value, [this.phoneNumberValidator]));
    }


    removePhoneNumber(index: number): void {
        this.phoneNumbersFormArray.removeAt(index);
    }


    addFaxNumber(value: string = ''): void {
        const faxNumbersArray = this.faxNumbersFormArray;
        // Fax numbers are optional, but if provided, must be valid format
        faxNumbersArray.push(this.fb.control(value, [this.phoneNumberValidator]));
    }


    removeFaxNumber(index: number): void {
        this.faxNumbersFormArray.removeAt(index);
    }


    addEmail(value: string = ''): void {
        const emailsArray = this.emailsFormArray;
        // Emails are optional, but if provided, must be valid email format
        emailsArray.push(this.fb.control(value, [this.emailValidator]));
    }


    removeEmail(index: number): void {
        this.emailsFormArray.removeAt(index);
    }


    private phoneNumberValidator(control: any): { [key: string]: any } | null {
        if (!control.value) {
            return null;
        }
        const value = control.value.toString();
        const digitsOnly = /^\d+$/.test(value);
        return digitsOnly ? null : { invalidFormat: true };
    }

    /**
     * Email validator - validates email format only if value exists
     */
    private emailValidator(control: any): { [key: string]: any } | null {
        if (!control.value) {
            return null; // Empty is valid (optional field)
        }
        // Use Angular's built-in email validator
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailPattern.test(control.value) ? null : { email: true };
    }


    onCancelEdit(): void {
        this.editDialog = false;
        this.editForm.reset();
        this.submitted = false;
    }


    submitUpdate(): void {
        this.submitted = true;

        // Check if address is filled (required field)
        const addressValue = this.editForm.get('address')?.value?.trim() || '';
        if (!addressValue) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Address is required. Please fill in the address field.'
            });
            return;
        }

        // Check if form has validation errors (format errors in phone/fax/email)
        if (this.editForm.invalid || this.loading) {
            if (this.editForm.invalid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please correct the errors in the form. Phone numbers, fax numbers, and emails must be in valid format if provided.'
                });
            }
            return;
        }

        const formValue = this.editForm.value;
        const address = formValue.address || '';
        const isRegional = formValue.isRegional || false;

        const phoneNumbers = this.phoneNumbersFormArray.controls
            .map(control => control.value)
            .filter(value => value && value.trim() !== '');

        const faxNumbers = this.faxNumbersFormArray.controls
            .map(control => control.value)
            .filter(value => value && value.trim() !== '');

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
            }
        });

        this.subscriptions.push(sub);
    }


    private handleUpdateError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getUpdateErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
    }

    private getUpdateErrorMessage(code: string): string | null {
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
        }
        return null;

    }

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

    getDisplayAddress(): string {
        if (!this.contacts) {
            return '';
        }
        return this.isRegional && this.contacts.addressRegional
            ? this.contacts.addressRegional
            : (this.contacts.address || '');
    }

    private sanitizeList(list?: string[]): string[] {
        if (!Array.isArray(list)) {
            return [];
        }
        return list
            .map(item => (item ?? '').toString().trim())
            .filter(item => item !== '');
    }

    formatPhoneDisplay(phone: string): string {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    }

    hasPhoneNumbers(): boolean {
        return this.getPhoneNumbersForDisplay().length > 0;
    }

    getPhoneNumbersForDisplay(): string[] {
        return this.sanitizeList(this.contacts?.phoneNumbers);
    }

    hasFaxNumbers(): boolean {
        return this.getFaxNumbersForDisplay().length > 0;
    }

    getFaxNumbersForDisplay(): string[] {
        return this.sanitizeList(this.contacts?.faxNumbers);
    }

    hasEmails(): boolean {
        return this.getEmailsForDisplay().length > 0;
    }

    getEmailsForDisplay(): string[] {
        return this.sanitizeList(this.contacts?.emails);
    }
}

