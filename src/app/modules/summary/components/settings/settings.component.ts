import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

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
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    providers: [MessageService]
})
export class SettingsComponent implements OnInit {

    // Tab Index
    activeTabIndex: number = 0;

    // Password Form
    changePasswordForm!: FormGroup;
    showChangePasswordDialog: boolean = false;
    isChangingPassword: boolean = false;
    showOldPassword: boolean = false;
    showNewPassword: boolean = false;
    showConfirmPassword: boolean = false;

    // 2FA Settings
    twoFactorEnabled: boolean = false;
    show2FADialog: boolean = false;
    isToggling2FA: boolean = false;

    constructor(
        private fb: FormBuilder,
        public translate: TranslationService,
        private messageService: MessageService,
        private authService: AuthService,
        private localStorageService: LocalStorageService
    ) { }

    ngOnInit(): void {
        this.initPasswordForm();
        this.load2FAStatus();
    }

    initPasswordForm(): void {
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

    load2FAStatus(): void {
        this.twoFactorEnabled = this.localStorageService.get2FaStatus();
    }

    // Password Methods
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
        this.isChangingPassword = true;

        const oldPassword = this.changePasswordForm.get('oldPassword')?.value;
        const newPassword = this.changePasswordForm.get('newPassword')?.value;

        this.authService.changePassword(oldPassword, newPassword).subscribe({
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
                this.isChangingPassword = false;
            },
            error: (error: any) => {
                this.handlePasswordChangeError(error);
                this.isChangingPassword = false;
            }
        });
    }

    cancelChangePassword(): void {
        this.showChangePasswordDialog = false;
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
        const errorCode = String(error?.message || '');
        const errorInfo = this.getPasswordChangeErrorMessage(errorCode);

        // Set form control errors if needed
        if (errorInfo.controlName && errorInfo.errorKey) {
            const control = this.changePasswordForm.get(errorInfo.controlName);
            if (control) {
                const currentErrors = control.errors || {};
                control.setErrors({ ...currentErrors, [errorInfo.errorKey]: true });
                control.markAsTouched();
            }
        }

        // Show error message
        if (errorInfo.detail) {
            this.messageService.add({
                severity: 'error',
                summary: errorInfo.summary || 'Error',
                detail: errorInfo.detail
            });
        }
    }

    private getPasswordChangeErrorMessage(code: string): {
        detail: string | null;
        summary?: string;
        controlName?: string;
        errorKey?: string
    } {
        switch (code) {
            case 'ERP11104':
                // Old Password is Wrong
                return {
                    detail: 'The old password you entered is incorrect. Please try again.',
                    summary: 'Invalid Old Password',
                    controlName: 'oldPassword',
                    errorKey: 'oldPasswordWrong'
                };

            case 'ERP11125':
                // Same as Old Password
                return {
                    detail: 'New password cannot be the same as your old password.',
                    summary: 'Invalid Password',
                    controlName: 'newPassword',
                    errorKey: 'passwordSameAsOld'
                };

            case 'ERP11126':
                // Format is incompliant
                return {
                    detail: 'Password format is incompliant. Please check the password requirements.',
                    summary: 'Invalid Password Format',
                    controlName: 'newPassword',
                    errorKey: 'passwordFormatIncompliant'
                };

            default:
                return {
                    detail: 'Password change failed. Please try again.',
                    summary: 'Error'
                };
        }
    }

    // 2FA Methods
    toggle2FA(): void {
        // Show confirmation dialog before proceeding
        this.show2FADialog = true;
    }

    confirmToggle2FA(): void {
        this.isToggling2FA = true;

        if (!this.twoFactorEnabled) {
            // Enabling 2FA
            this.authService.set2FA(true).subscribe({
                next: (response: any) => {
                    if (response?.success === true) {
                        this.twoFactorEnabled = true;
                        // Update localStorage with new 2FA status
                        const accountDetails = this.localStorageService.getAccountDetails();
                        if (accountDetails) {
                            accountDetails.Two_FA = true;
                            this.localStorageService.setItem('Account_Details', accountDetails);
                        }
                        this.messageService.add({
                            severity: 'success',
                            summary: '2FA Enabled',
                            detail: 'Two-factor authentication has been enabled successfully. You will be required to verify with a code on your next login.'
                        });
                        this.show2FADialog = false;
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: response?.message || 'Failed to enable 2FA.'
                        });
                    }
                    this.isToggling2FA = false;
                },
                error: (error: any) => {
                    const errorMessage = error?.message || 'Failed to enable 2FA. Please try again.';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage
                    });
                    this.isToggling2FA = false;
                }
            });
        } else {
            // Disabling 2FA
            this.authService.set2FA(false).subscribe({
                next: (response: any) => {
                    if (response?.success === true) {
                        this.twoFactorEnabled = false;
                        // Update localStorage with new 2FA status
                        const accountDetails = this.localStorageService.getAccountDetails();
                        if (accountDetails) {
                            accountDetails.Two_FA = false;
                            this.localStorageService.setItem('Account_Details', accountDetails);
                        }
                        this.messageService.add({
                            severity: 'success',
                            summary: '2FA Disabled',
                            detail: 'Two-factor authentication has been disabled successfully.'
                        });
                        this.show2FADialog = false;
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: response?.message || 'Failed to disable 2FA.'
                        });
                    }
                    this.isToggling2FA = false;
                },
                error: (error: any) => {
                    const errorMessage = error?.message || 'Failed to disable 2FA. Please try again.';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMessage
                    });
                    this.isToggling2FA = false;
                }
            });
        }
    }

    cancelToggle2FA(): void {
        this.show2FADialog = false;
    }
}
