import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { MessageService } from 'primeng/api';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

export function passwordComplexityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value;
        if (!value) return null;

        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecialChar = /[@#$%^&*()_+!~\-=<>?/|]/.test(value);

        const errors: ValidationErrors = {};
        if (!hasUppercase) errors['missingUppercase'] = true;
        if (!hasLowercase) errors['missingLowercase'] = true;
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

    showOldPassword: boolean = false;
    showNewPassword: boolean = false;
    showConfirmPassword: boolean = false;

    roleOptions = [
        { label: 'System Admin', value: 'System Admin' },
        { label: 'Company Admin', value: 'Company Admin' },
        { label: 'Supervisor', value: 'Supervisor' },
        { label: 'Employee', value: 'Employee' }
    ];

    constructor(
        private fb: FormBuilder,
        public translate: TranslationService,
        private messageService: MessageService,
        private authService: AuthService,
        private localStorageService: LocalStorageService
    ) { }

    ngOnInit(): void {
        this.initFormModels();
    }

    initFormModels() {
        this.profileForm = this.fb.group({
            firstName: ['John', [Validators.required]],
            lastName: ['Doe', [Validators.required]],
            email: ['john.doe@company.com', [Validators.required, Validators.email]],
            phone: ['(555) 123-4567'],
            role: ['System Admin', [Validators.required]],
            department: ['IT Administration']
        });

        this.changePasswordForm = this.fb.group({
            oldPassword: ['', [Validators.required]],
            newPassword: [
                '',
                Validators.compose([
                    Validators.required,
                    Validators.minLength(12),
                    Validators.maxLength(100),
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
        this.profileForm.reset({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com',
            phone: '(555) 123-4567',
            role: 'System Admin',
            department: 'IT Administration'
        });

        this.messageService.add({
            severity: 'info',
            summary: 'Form Reset',
            detail: 'Profile information has been reset to default values.'
        });
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
                        detail: 'Password changed successfully!'
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

    toggle2FA(): void {
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
