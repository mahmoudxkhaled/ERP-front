import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { UsersService } from '../../../services/users.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { nameFieldValidator, getNameFieldError, textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { User, UserBackend } from '../../../models/user.model';

type UserFormContext = 'create' | 'update' | 'details';

@Component({
    selector: 'app-user-form',
    templateUrl: './user-form.component.html',
    styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    userId: string = '';
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    genderOptions = [
        { label: 'Male', value: true },
        { label: 'Female', value: false }
    ];

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
        this.isEdit = !!this.userId;
        this.initForm();

        if (this.isEdit) {
            this.loadUser();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            firstName: ['', [Validators.required, nameFieldValidator()]],
            middleName: ['', [nameFieldValidator()]],
            lastName: ['', [Validators.required, nameFieldValidator()]],
            prefix: ['', [textFieldValidator()]],
            gender: [true, [Validators.required]]
        });
    }

    loadUser(): void {
        if (!this.userId) {
            return;
        }

        this.loading = true;
        const sub = this.usersService.getUserDetails(Number(this.userId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }

                const user = response?.message ?? {};
                this.form.patchValue({
                    firstName: this.isRegional ? (user?.First_Name_Regional || user?.First_Name || '') : (user?.First_Name || ''),
                    middleName: this.isRegional ? (user?.Middle_Name_Regional || user?.Middle_Name || '') : (user?.Middle_Name || ''),
                    lastName: this.isRegional ? (user?.Last_Name_Regional || user?.Last_Name || '') : (user?.Last_Name || ''),
                    prefix: this.isRegional ? (user?.Prefix_Regional || user?.Prefix || '') : (user?.Prefix || ''),
                    gender: user?.Gender !== undefined ? Boolean(user.Gender) : true
                });
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

        if (this.form.get('firstName')?.invalid || this.form.get('lastName')?.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please fill in all required fields.'
            });
            return;
        }

        this.loading = true;
        const { firstName, middleName, lastName, prefix, gender } = this.form.value;

        if (this.isEdit) {
            const sub = this.usersService.updateUserDetails(
                Number(this.userId),
                firstName.trim(),
                middleName?.trim() || '',
                lastName.trim(),
                prefix?.trim() || '',
                this.isRegional,
                gender || true
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('update', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'User updated successfully.'
                    });
                    this.router.navigate(['/entity-administration/user-accounts', this.userId]);
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

        // Create new user
        const sub = this.usersService.createUser(firstName.trim(), lastName.trim()).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('create', response);
                    return;
                }

                const newUserId = response?.message?.User_ID;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'User created successfully.'
                });
                if (newUserId) {
                    this.router.navigate(['/entity-administration/user-accounts', newUserId]);
                } else {
                    this.router.navigate(['/entity-administration/user-accounts/list']);
                }
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    cancel(): void {
        if (this.isEdit && this.userId) {
            this.router.navigate(['/entity-administration/user-accounts', this.userId]);
        } else {
            this.router.navigate(['/entity-administration/user-accounts/list']);
        }
    }

    get f() {
        return this.form.controls;
    }

    get firstNameError(): string {
        return getNameFieldError(this.f['firstName'], 'First name', this.submitted);
    }

    get middleNameError(): string {
        return getNameFieldError(this.f['middleName'], 'Middle name', this.submitted);
    }

    get lastNameError(): string {
        return getNameFieldError(this.f['lastName'], 'Last name', this.submitted);
    }

    get prefixError(): string {
        return getTextFieldError(this.f['prefix'], 'Prefix', this.submitted);
    }

    private handleBusinessError(context: UserFormContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'create':
                detail = this.getCreationErrorMessage(code) || '';
                break;
            case 'update':
                detail = this.getUpdateErrorMessage(code) || '';
                break;
            case 'details':
                detail = this.getDetailsErrorMessage(code) || '';
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

    private getCreationErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11180':
                return 'Invalid format for First Name';
            case 'ERP11181':
                return 'Invalid format for Last Name';
            default:
                return null;
        }
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11190':
                return 'Invalid User ID';
            case 'ERP11180':
                return 'Invalid format for First Name';
            case 'ERP11181':
                return 'Invalid format for Last Name';
            case 'ERP11182':
                return 'Invalid format for Middle Name';
            case 'ERP11183':
                return 'Invalid format for Prefix';
            default:
                return null;
        }
    }

    private getDetailsErrorMessage(code: string): string | null {
        if (code === 'ERP11190') {
            return 'Invalid User ID';
        }
        return null;
    }
}

