import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { UsersService } from '../../../services/users.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { UserContactInfo, UserContactInfoBackend } from '../../../models/user.model';

type UserContactInfoContext = 'details' | 'update';

@Component({
    selector: 'app-user-contact-info',
    templateUrl: './user-contact-info.component.html',
    styleUrls: ['./user-contact-info.component.scss']
})
export class UserContactInfoComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    userId: string = '';
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private usersService: UsersService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.userId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.userId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid user ID.'
            });
            this.router.navigate(['/entity-administration/user-accounts/list']);
            return;
        }

        this.initForm();
        this.loadContactInfo();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            address: ['', [textFieldValidator()]],
            phoneNumbers: this.fb.array([]),
            linkedinPage: ['', [Validators.pattern(/^https?:\/\/.+/)]],
            facebookPage: ['', [Validators.pattern(/^https?:\/\/.+/)]],
            instagramPage: ['', [Validators.pattern(/^https?:\/\/.+/)]],
            twitterPage: ['', [Validators.pattern(/^https?:\/\/.+/)]]
        });
    }

    get phoneNumbersFormArray(): FormArray {
        return this.form.get('phoneNumbers') as FormArray;
    }

    addPhoneNumber(): void {
        const phoneGroup = this.fb.group({
            number: ['', [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]]
        });
        this.phoneNumbersFormArray.push(phoneGroup);
    }

    removePhoneNumber(index: number): void {
        this.phoneNumbersFormArray.removeAt(index);
    }

    loadContactInfo(): void {
        this.loading = true;
        const sub = this.usersService.getUserContactInfo(Number(this.userId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }

                const contactData = response?.message || {};
                const address = this.isRegional ? (contactData?.Address_Regional || contactData?.Address || '') : (contactData?.Address || '');
                const phoneNumbers = contactData?.Phone_Numbers || [];

                this.form.patchValue({
                    address: address,
                    linkedinPage: contactData?.Linkedin_Page || '',
                    facebookPage: contactData?.Facebook_Page || '',
                    instagramPage: contactData?.Instagram_Page || '',
                    twitterPage: contactData?.Twitter_Page || ''
                });

                // Clear existing phone numbers and add loaded ones
                while (this.phoneNumbersFormArray.length !== 0) {
                    this.phoneNumbersFormArray.removeAt(0);
                }
                phoneNumbers.forEach((phone: string) => {
                    const phoneGroup = this.fb.group({
                        number: [phone, [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)]]
                    });
                    this.phoneNumbersFormArray.push(phoneGroup);
                });

                // If no phone numbers, add one empty field
                if (this.phoneNumbersFormArray.length === 0) {
                    this.addPhoneNumber();
                }
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    submit(): void {
        this.submitted = true;

        if (this.loading) {
            return;
        }

        // Validate phone numbers
        const phoneNumbersValid = this.phoneNumbersFormArray.controls.every(control => control.valid);
        if (!phoneNumbersValid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please fill in all phone numbers correctly.'
            });
            return;
        }

        this.loading = true;
        const { address, phoneNumbers, linkedinPage, facebookPage, instagramPage, twitterPage } = this.form.value;

        // Extract phone numbers from form array
        const phoneNumbersArray = phoneNumbers.map((phoneGroup: any) => phoneGroup.number).filter((phone: string) => phone && phone.trim() !== '');

        const sub = this.usersService.updateUserContactInfo(
            Number(this.userId),
            address?.trim() || '',
            this.isRegional,
            phoneNumbersArray,
            linkedinPage?.trim() || '',
            facebookPage?.trim() || '',
            instagramPage?.trim() || '',
            twitterPage?.trim() || ''
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('update', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Contact information updated successfully.'
                });
                this.router.navigate(['/entity-administration/user-accounts', this.userId]);
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    cancel(): void {
        this.router.navigate(['/entity-administration/user-accounts', this.userId]);
    }

    get f() {
        return this.form.controls;
    }

    getPhoneNumberError(index: number): string {
        const phoneControl = this.phoneNumbersFormArray.at(index)?.get('number');
        if (phoneControl?.errors?.['required'] && this.submitted) {
            return 'Phone number is required.';
        }
        if (phoneControl?.errors?.['pattern'] && this.submitted) {
            return 'Please enter a valid phone number.';
        }
        return '';
    }

    getLinkedinError(): string {
        const control = this.f['linkedinPage'];
        if (control?.errors?.['pattern'] && this.submitted) {
            return 'Please enter a valid URL (must start with http:// or https://).';
        }
        return '';
    }

    getFacebookError(): string {
        const control = this.f['facebookPage'];
        if (control?.errors?.['pattern'] && this.submitted) {
            return 'Please enter a valid URL (must start with http:// or https://).';
        }
        return '';
    }

    getInstagramError(): string {
        const control = this.f['instagramPage'];
        if (control?.errors?.['pattern'] && this.submitted) {
            return 'Please enter a valid URL (must start with http:// or https://).';
        }
        return '';
    }

    getTwitterError(): string {
        const control = this.f['twitterPage'];
        if (control?.errors?.['pattern'] && this.submitted) {
            return 'Please enter a valid URL (must start with http:// or https://).';
        }
        return '';
    }

    private handleBusinessError(context: UserContactInfoContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'details':
                detail = this.getDetailsErrorMessage(code) || '';
                break;
            case 'update':
                detail = this.getUpdateErrorMessage(code) || '';
                break;
            default:
                return null;
        }
        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
        return null;
    }

    private getDetailsErrorMessage(code: string): string | null {
        if (code === 'ERP11190') {
            return 'Invalid User ID';
        }
        return null;
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11190':
                return 'Invalid User ID';
            case 'ERP11191':
                return 'Invalid format for one or more of the Phone Numbers';
            case 'ERP11192':
                return 'Invalid link for the Linkedin Page';
            case 'ERP11193':
                return 'Invalid link for the Facebook Page';
            case 'ERP11194':
                return 'Invalid link for the Instagram Page';
            case 'ERP11195':
                return 'Invalid link for the Twitter Page';
            default:
                return null;
        }
    }
}

