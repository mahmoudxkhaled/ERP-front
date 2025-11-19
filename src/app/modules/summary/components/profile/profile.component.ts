import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IUserDetails, IAccountDetails, IEntityDetails, IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';

export function passwordComplexityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        // Check if password starts with a letter (uppercase or lowercase)
        const startsWithLetter = /^[A-Za-z]/.test(value);
        // Check for at least one lowercase letter
        const hasLowercase = /[a-z]/.test(value);
        // Check for at least one uppercase letter
        const hasUppercase = /[A-Z]/.test(value);
        // Check for at least one digit
        const hasNumber = /[0-9]/.test(value);
        // Check for at least one special character (non-alphanumeric)
        const hasSpecialChar = /[^A-Za-z0-9]/.test(value);

        const errors: ValidationErrors = {};
        if (!startsWithLetter) errors['doesNotStartWithLetter'] = true;
        if (!hasLowercase) errors['missingLowercase'] = true;
        if (!hasUppercase) errors['missingUppercase'] = true;
        if (!hasNumber) errors['missingNumber'] = true;
        if (!hasSpecialChar) errors['missingSpecialChar'] = true;

        return Object.keys(errors).length ? errors : null;
    };
}

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    providers: [MessageService]
})
export class ProfileComponent implements OnInit {

    profileForm!: FormGroup;
    changePasswordForm!: FormGroup;

    twoFactorEnabled: boolean = false;
    show2FADialog: boolean = false;
    showChangePasswordDialog: boolean = false;

    showOldPassword: boolean = false;
    showNewPassword: boolean = false;
    showConfirmPassword: boolean = false;

    userDetails: IUserDetails | null = null;
    accountDetails: IAccountDetails | null = null;
    entityDetails: IEntityDetails | null = null;
    accountSettings: IAccountSettings | null = null;
    regionalLanguage: boolean = false;
    profilePictureUrl: string = '';

    roleOptions = [
        { label: 'System Admin', value: 'System Admin' },
        { label: 'Company Admin', value: 'Company Admin' },
        { label: 'Supervisor', value: 'Supervisor' },
        { label: 'Employee', value: 'Employee' }
    ];

    genderOptions = [
        { label: 'Male', value: true },
        { label: 'Female', value: false }
    ];

    constructor(
        private fb: FormBuilder,
        public translate: TranslationService,
        private messageService: MessageService,
        private authService: AuthService,
        private localStorageService: LocalStorageService
    ) { }

    ngOnInit(): void {
        this.loadUserData();
        this.initFormModels();
    }

    loadUserData(): void {
        this.userDetails = this.localStorageService.getUserDetails();
        this.accountDetails = this.localStorageService.getAccountDetails();
        this.entityDetails = this.localStorageService.getEntityDetails();
        this.accountSettings = this.localStorageService.getAccountSettings();

        const language = this.accountSettings?.Language;
        if (language === 'English') {
            this.regionalLanguage = false;
        } else {
            this.regionalLanguage = true;
        }

        this.profilePictureUrl = this.accountDetails?.Profile_Picture || '';
    }

    initFormModels() {
        const firstName = this.getFirstName();
        const lastName = this.getLastName();
        const middleName = this.getMiddleName();
        const prefix = this.getPrefix();
        const email = this.accountDetails?.Email || '';
        const description = this.accountDetails?.Description || '';
        const entityName = this.entityDetails?.Name || '';
        const entityCode = this.entityDetails?.Code || '';
        const entityDescription = this.entityDetails?.Description || '';
        const gender = this.userDetails?.Gender !== undefined ? this.userDetails.Gender : null;
        const accountId = this.accountDetails?.Account_ID || null;
        const userId = this.userDetails?.User_ID || null;
        const entityId = this.entityDetails?.Entity_ID || null;
        const accountState = this.accountDetails?.Account_State || null;

        this.profileForm = this.fb.group({
            First_Name: [firstName, [Validators.required]],
            Middle_Name: [middleName],
            Last_Name: [lastName, [Validators.required]],
            Prefix: [prefix],
            Email: [email, [Validators.required, Validators.email]],
            Description: [description],
            Gender: [gender],
            Account_ID: [accountId],
            User_ID: [userId],
            Entity_ID: [entityId],
            Account_State: [accountState],
            Entity_Name: [entityName],
            Entity_Code: [entityCode],
            Entity_Description: [entityDescription]
        });

        this.changePasswordForm = this.fb.group({
            oldPassword: ['', [Validators.required]],
            newPassword: [
                '',
                Validators.compose([
                    Validators.required,
                    Validators.minLength(8),
                    Validators.maxLength(15),
                    passwordComplexityValidator(),
                ])
            ],
            confirmPassword: ['', [Validators.required]]
        }, {
            validator: this.passwordMatchValidator
        });
    }

    private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
        const newPassword = control.get('newPassword')?.value;
        const confirmPassword = control.get('confirmPassword')?.value;

        if (newPassword && confirmPassword && newPassword !== confirmPassword) {
            control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
            return { passwordMismatch: true };
        }
        return null;
    }

    saveProfileInfo(): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Profile information saved successfully!'
        });
    }

    resetForm(): void {
        const firstName = this.getFirstName();
        const lastName = this.getLastName();
        const middleName = this.getMiddleName();
        const prefix = this.getPrefix();
        const email = this.accountDetails?.Email || '';
        const description = this.accountDetails?.Description || '';
        const entityName = this.entityDetails?.Name || '';
        const entityCode = this.entityDetails?.Code || '';
        const entityDescription = this.entityDetails?.Description || '';
        const gender = this.userDetails?.Gender !== undefined ? this.userDetails.Gender : null;
        const accountId = this.accountDetails?.Account_ID || null;
        const userId = this.userDetails?.User_ID || null;
        const entityId = this.entityDetails?.Entity_ID || null;
        const accountState = this.accountDetails?.Account_State || null;

        this.profileForm.reset({
            First_Name: firstName,
            Middle_Name: middleName,
            Last_Name: lastName,
            Prefix: prefix,
            Email: email,
            Description: description,
            Gender: gender,
            Account_ID: accountId,
            User_ID: userId,
            Entity_ID: entityId,
            Account_State: accountState,
            Entity_Name: entityName,
            Entity_Code: entityCode,
            Entity_Description: entityDescription
        });

        this.messageService.add({
            severity: 'info',
            summary: 'Form Reset',
            detail: 'Profile information has been reset to original values.'
        });
    }

    getFirstName(): string {
        if (!this.userDetails) return '';

        if (this.regionalLanguage) {
            const firstNameRegional = this.userDetails.First_Name_Regional || '';
            if (firstNameRegional.trim()) {
                return firstNameRegional;
            }
        }
        return this.userDetails.First_Name || '';
    }

    getLastName(): string {
        if (!this.userDetails) return '';

        if (this.regionalLanguage) {
            const lastNameRegional = this.userDetails.Last_Name_Regional || '';
            if (lastNameRegional.trim()) {
                return lastNameRegional;
            }
        }
        return this.userDetails.Last_Name || '';
    }

    getMiddleName(): string {
        if (!this.userDetails) return '';

        if (this.regionalLanguage) {
            const middleNameRegional = this.userDetails.Middle_Name_Regional || '';
            if (middleNameRegional.trim()) {
                return middleNameRegional;
            }
        }
        return this.userDetails.Middle_Name || '';
    }

    getPrefix(): string {
        if (!this.userDetails) return '';

        if (this.regionalLanguage) {
            const prefixRegional = this.userDetails.Prefix_Regional || '';
            if (prefixRegional.trim()) {
                return prefixRegional;
            }
        }
        return this.userDetails.Prefix || '';
    }

    cancelEdit(): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Cancelled',
            detail: 'Changes have been cancelled.'
        });
    }

    getAccessToken(): string {
        const userData = this.localStorageService.getItem('userData');
        if (userData) {
            return userData.accessToken || userData.token || '';
        }
        return '';
    }

    getUserId(): string {
        const userData = this.localStorageService.getItem('userData');
        if (userData) {
            return userData.userId || userData.id || '';
        }
        return '';
    }

    onChangePassword(): void {
        if (this.changePasswordForm.invalid) {
            this.messageService.add({
                severity: 'error',
                summary: 'Validation Error',
                detail: 'Please fill all fields correctly.'
            });
            return;
        }

        // Show confirmation dialog before proceeding
        this.showChangePasswordDialog = true;
    }

    confirmChangePassword(): void {
        this.showChangePasswordDialog = false;

        const oldPassword = this.changePasswordForm.get('oldPassword')?.value;
        const newPassword = this.changePasswordForm.get('newPassword')?.value;
        const accessToken = this.getAccessToken();

        if (!accessToken) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Access token not found. Please login again.'
            });
            return;
        }

        this.authService.changePassword(accessToken, oldPassword, newPassword).subscribe({
            next: (response: any) => {
                if (response?.success === true) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Password changed successfully! This change will take effect on your next login.'
                    });
                    this.changePasswordForm.reset();
                } else {
                    this.handlePasswordChangeError(response);
                }
            },
            error: (error: any) => {
                this.handlePasswordChangeError(error);
            }
        });
    }

    cancelChangePassword(): void {
        this.showChangePasswordDialog = false;
    }

    toggle2FA(): void {
        // Show confirmation dialog before proceeding
        this.show2FADialog = true;
    }

    confirmToggle2FA(): void {
        this.show2FADialog = false;

        const accessToken = this.getAccessToken();
        if (!accessToken) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Access token not found. Please login again.'
            });
            return;
        }

        if (!this.twoFactorEnabled) {
            // Enabling 2FA
            this.authService.set2FA(accessToken, true).subscribe({
                next: (response: any) => {
                    if (response?.success === true) {
                        this.twoFactorEnabled = true;
                        this.messageService.add({
                            severity: 'success',
                            summary: '2FA Enabled',
                            detail: 'Two-factor authentication has been enabled successfully. You will be required to verify with a code on your next login.'
                        });
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: response?.message || 'Failed to enable 2FA.'
                        });
                    }
                },
                error: (error: any) => {
                    const errorMessage = error?.message || 'Failed to enable 2FA. Please try again.';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage
                    });
                }
            });
        } else {
            // Disabling 2FA
            this.authService.set2FA(accessToken, false).subscribe({
                next: (response: any) => {
                    if (response?.success === true) {
                        this.twoFactorEnabled = false;
                        this.messageService.add({
                            severity: 'success',
                            summary: '2FA Disabled',
                            detail: 'Two-factor authentication has been disabled successfully.'
                        });
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: response?.message || 'Failed to disable 2FA.'
                        });
                    }
                },
                error: (error: any) => {
                    const errorMessage = error?.message || 'Failed to disable 2FA. Please try again.';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage
                    });
                }
            });
        }
    }

    cancelToggle2FA(): void {
        this.show2FADialog = false;
    }

    togglePasswordVisibility(field: 'old' | 'new' | 'confirm'): void {
        if (field === 'old') {
            this.showOldPassword = !this.showOldPassword;
        } else if (field === 'new') {
            this.showNewPassword = !this.showNewPassword;
        } else if (field === 'confirm') {
            this.showConfirmPassword = !this.showConfirmPassword;
        }
    }

    validateAllPasswordFields(): void {
        const oldPasswordControl = this.changePasswordForm.get('oldPassword');
        const newPasswordControl = this.changePasswordForm.get('newPassword');
        const confirmPasswordControl = this.changePasswordForm.get('confirmPassword');

        // Mark all fields as touched to show errors
        oldPasswordControl?.markAsTouched();
        newPasswordControl?.markAsTouched();
        confirmPasswordControl?.markAsTouched();

        // Update validity for all fields
        oldPasswordControl?.updateValueAndValidity();
        newPasswordControl?.updateValueAndValidity();
        confirmPasswordControl?.updateValueAndValidity();
    }

    getPasswordLength(): number {
        const password = this.changePasswordForm.get('newPassword')?.value || '';
        return password.length;
    }

    checkPasswordLength(): boolean {
        const password = this.changePasswordForm.get('newPassword')?.value || '';
        return password.length >= 8 && password.length <= 15;
    }

    checkStartsWithLetter(): boolean {
        const password = this.changePasswordForm.get('newPassword')?.value || '';
        return /^[A-Za-z]/.test(password);
    }

    checkHasUppercaseAndLowercase(): boolean {
        const password = this.changePasswordForm.get('newPassword')?.value || '';
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        return hasLowercase && hasUppercase;
    }

    checkHasNumber(): boolean {
        const password = this.changePasswordForm.get('newPassword')?.value || '';
        return /[0-9]/.test(password);
    }

    checkHasSpecialChar(): boolean {
        const password = this.changePasswordForm.get('newPassword')?.value || '';
        return /[^A-Za-z0-9]/.test(password);
    }

    private handlePasswordChangeError(error: any): void {
        const errorCode = error?.message;
        const errorMessage = 'Password change failed. Please try again.';
        const oldPasswordControl = this.changePasswordForm.get('oldPassword');
        const newPasswordControl = this.changePasswordForm.get('newPassword');

        // Handle specific error codes
        if (errorCode === 'ERP11104') {
            // Old Password is Wrong
            if (oldPasswordControl) {
                const currentErrors = oldPasswordControl.errors || {};
                oldPasswordControl.setErrors({ ...currentErrors, oldPasswordWrong: true });
                oldPasswordControl.markAsTouched();
            }
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid Old Password',
                detail: 'The old password you entered is incorrect. Please try again.'
            });
        } else if (errorCode === 'ERP11125') {
            // Same as Old Password
            if (newPasswordControl) {
                const currentErrors = newPasswordControl.errors || {};
                newPasswordControl.setErrors({ ...currentErrors, passwordSameAsOld: true });
                newPasswordControl.markAsTouched();
            }
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid Password',
                detail: 'New password cannot be the same as your old password.'
            });
        } else if (errorCode === 'ERP11126') {
            // Format is incompliant
            if (newPasswordControl) {
                const currentErrors = newPasswordControl.errors || {};
                newPasswordControl.setErrors({ ...currentErrors, passwordFormatIncompliant: true });
                newPasswordControl.markAsTouched();
            }
            this.messageService.add({
                severity: 'error',
                summary: 'Invalid Password Format',
                detail: 'Password format is incompliant. Please check the password requirements.'
            });
        } else {
            // Generic error
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage
            });
        }
    }

}
