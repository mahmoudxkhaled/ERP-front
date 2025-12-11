import { Component, OnInit, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { SettingsApiService } from '../../services/settings-api.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Roles } from 'src/app/core/models/system-roles';
import { Subscription } from 'rxjs';

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
export class SettingsComponent implements OnInit, OnDestroy {

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

    // Entity Settings
    loadingEntitySettings: boolean = false;
    savingEntitySettings: boolean = false;
    entitySettings: Record<string, string> = {};
    entityDefaultLanguage: string = 'en';
    entityLayoutPreference: string = 'spacious';
    entityAppearanceTheme: string = 'light';
    entityDateFormat: string = 'dd/MM/yyyy';
    entityTimeFormat: string = '24h';
    entityCurrency: string = 'USD';

    // System Settings
    loadingSystemSettings: boolean = false;
    savingSystemSettings: boolean = false;
    systemSettings: Record<string, string> = {};
    tokenExpiryMinutes: number = 60;
    otpExpiryMinutes: number = 5;
    sessionTimeoutMinutes: number = 30;
    maxLoginAttempts: number = 5;
    passwordMinLength: number = 8;
    passwordRequireUppercase: boolean = true;
    passwordRequireLowercase: boolean = true;
    passwordRequireNumbers: boolean = true;
    passwordRequireSpecialChars: boolean = true;

    // Options arrays
    entityLanguageOptions = [
        { label: 'English', value: 'en' },
        { label: 'العربية', value: 'ar' }
    ];

    entityLayoutOptions = [
        { label: 'Compact', value: 'compact' },
        { label: 'Spacious', value: 'spacious' },
        { label: 'Standard', value: 'standard' }
    ];

    entityAppearanceOptions = [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Auto', value: 'auto' }
    ];

    entityDateFormatOptions = [
        { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy' },
        { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy' },
        { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd' },
        { label: 'DD-MM-YYYY', value: 'dd-MM-yyyy' }
    ];

    entityTimeFormatOptions = [
        { label: '12 Hour', value: '12h' },
        { label: '24 Hour', value: '24h' }
    ];

    entityCurrencyOptions = [
        { label: 'USD - US Dollar', value: 'USD' },
        { label: 'EUR - Euro', value: 'EUR' },
        { label: 'SAR - Saudi Riyal', value: 'SAR' },
        { label: 'AED - UAE Dirham', value: 'AED' },
        { label: 'EGP - Egyptian Pound', value: 'EGP' }
    ];

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        public translate: TranslationService,
        private messageService: MessageService,
        private authService: AuthService,
        private localStorageService: LocalStorageService,
        private settingsApiService: SettingsApiService,
        private permissionService: PermissionService
    ) { }

    ngOnInit(): void {
        this.initPasswordForm();
        this.load2FAStatus();

        // Load Entity Settings if user has access
        if (this.canAccessEntitySettings()) {
            this.loadEntitySettings();
        }

        // Load System Settings if user is System Admin
        if (this.isSystemAdmin()) {
            this.loadSystemSettings();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
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

    // Permission Methods
    isSystemAdmin(): boolean {
        const roleId = this.permissionService.getCurrentRoleId();
        return roleId === Roles.Developer || roleId === Roles.SystemAdministrator;
    }

    canAccessEntitySettings(): boolean {
        const roleId = this.permissionService.getCurrentRoleId();
        return roleId === Roles.Developer || roleId === Roles.SystemAdministrator || roleId === Roles.EntityAdministrator;
    }

    // Entity Settings Methods
    loadEntitySettings(): void {
        const entityId = this.localStorageService.getEntityId();
        if (!entityId) {
            return;
        }

        this.loadingEntitySettings = true;
        const sub = this.settingsApiService.getEntitySettings(entityId).subscribe({
            next: (response: any) => {
                this.loadingEntitySettings = false;
                if (!response?.success) {
                    this.handleEntitySettingsError(response);
                    return;
                }

                // Parse Dictionary from API response
                const settingsDict = response?.message || {};
                this.entitySettings = settingsDict;

                // Map Dictionary values to form fields
                this.entityDefaultLanguage = settingsDict['Entity.DefaultLanguage'] || 'en';
                this.entityLayoutPreference = settingsDict['Entity.LayoutPreference'] || 'spacious';
                this.entityAppearanceTheme = settingsDict['Entity.AppearanceTheme'] || 'light';
                this.entityDateFormat = settingsDict['Entity.DateFormat'] || 'dd/MM/yyyy';
                this.entityTimeFormat = settingsDict['Entity.TimeFormat'] || '24h';
                this.entityCurrency = settingsDict['Entity.Currency'] || 'USD';
            },
            error: (error: any) => {
                this.loadingEntitySettings = false;
                this.handleEntitySettingsError(error);
            }
        });
        this.subscriptions.push(sub);
    }

    saveEntitySettings(): void {
        const entityId = this.localStorageService.getEntityId();
        if (!entityId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Entity ID not found.'
            });
            return;
        }

        // Build Dictionary from form fields
        const settingsDict: Record<string, string> = {
            'Entity.DefaultLanguage': this.entityDefaultLanguage,
            'Entity.LayoutPreference': this.entityLayoutPreference,
            'Entity.AppearanceTheme': this.entityAppearanceTheme,
            'Entity.DateFormat': this.entityDateFormat,
            'Entity.TimeFormat': this.entityTimeFormat,
            'Entity.Currency': this.entityCurrency
        };

        this.savingEntitySettings = true;
        const sub = this.settingsApiService.setEntitySettings(entityId, settingsDict).subscribe({
            next: (response: any) => {
                this.savingEntitySettings = false;
                if (!response?.success) {
                    this.handleEntitySettingsError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('shared.messages.success'),
                    detail: this.translate.getInstant('settings.entitySettings.saveSuccess'),
                    life: 3000
                });

                // Update local settings
                this.entitySettings = settingsDict;
            },
            error: (error: any) => {
                this.savingEntitySettings = false;
                this.handleEntitySettingsError(error);
            }
        });
        this.subscriptions.push(sub);
    }

    private handleEntitySettingsError(response: any): void {
        const errorCode = String(response?.message || '');
        let errorMessage = '';

        switch (errorCode) {
            case 'ERP11426':
                errorMessage = 'Invalid Entity ID';
                break;
            case 'ERP11420':
                errorMessage = 'Invalid Setting key → Empty';
                break;
            case 'ERP11421':
                errorMessage = 'Invalid Setting value → Empty';
                break;
            default:
                errorMessage = 'Failed to save entity settings. Please try again.';
        }

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
        });
    }

    // System Settings Methods
    loadSystemSettings(): void {
        this.loadingSystemSettings = true;
        const sub = this.settingsApiService.getERPSystemSettings().subscribe({
            next: (response: any) => {
                this.loadingSystemSettings = false;
                if (!response?.success) {
                    this.handleSystemSettingsError(response);
                    return;
                }

                // Parse Dictionary from API response
                const settingsDict = response?.message || {};
                this.systemSettings = settingsDict;

                // Map Dictionary values to form fields
                this.tokenExpiryMinutes = parseInt(settingsDict['System.TokenExpiryMinutes'] || '60', 10);
                this.otpExpiryMinutes = parseInt(settingsDict['System.OTPExpiryMinutes'] || '5', 10);
                this.sessionTimeoutMinutes = parseInt(settingsDict['System.SessionTimeoutMinutes'] || '30', 10);
                this.maxLoginAttempts = parseInt(settingsDict['System.MaxLoginAttempts'] || '5', 10);
                this.passwordMinLength = parseInt(settingsDict['System.PasswordMinLength'] || '8', 10);
                this.passwordRequireUppercase = settingsDict['System.PasswordRequireUppercase'] === 'true';
                this.passwordRequireLowercase = settingsDict['System.PasswordRequireLowercase'] === 'true';
                this.passwordRequireNumbers = settingsDict['System.PasswordRequireNumbers'] === 'true';
                this.passwordRequireSpecialChars = settingsDict['System.PasswordRequireSpecialChars'] === 'true';
            },
            error: (error: any) => {
                this.loadingSystemSettings = false;
                this.handleSystemSettingsError(error);
            }
        });
        this.subscriptions.push(sub);
    }

    saveSystemSettings(): void {
        // Build Dictionary from form fields
        const settingsDict: Record<string, string> = {
            'System.TokenExpiryMinutes': this.tokenExpiryMinutes.toString(),
            'System.OTPExpiryMinutes': this.otpExpiryMinutes.toString(),
            'System.SessionTimeoutMinutes': this.sessionTimeoutMinutes.toString(),
            'System.MaxLoginAttempts': this.maxLoginAttempts.toString(),
            'System.PasswordMinLength': this.passwordMinLength.toString(),
            'System.PasswordRequireUppercase': this.passwordRequireUppercase.toString(),
            'System.PasswordRequireLowercase': this.passwordRequireLowercase.toString(),
            'System.PasswordRequireNumbers': this.passwordRequireNumbers.toString(),
            'System.PasswordRequireSpecialChars': this.passwordRequireSpecialChars.toString()
        };

        this.savingSystemSettings = true;
        const sub = this.settingsApiService.setERPSystemSettings(settingsDict).subscribe({
            next: (response: any) => {
                this.savingSystemSettings = false;
                if (!response?.success) {
                    this.handleSystemSettingsError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('shared.messages.success'),
                    detail: this.translate.getInstant('settings.systemSettings.saveSuccess'),
                    life: 3000
                });

                // Update local settings
                this.systemSettings = settingsDict;
            },
            error: (error: any) => {
                this.savingSystemSettings = false;
                this.handleSystemSettingsError(error);
            }
        });
        this.subscriptions.push(sub);
    }

    private handleSystemSettingsError(response: any): void {
        const errorCode = String(response?.message || '');
        let errorMessage = '';

        switch (errorCode) {
            case 'ERP11420':
                errorMessage = 'Invalid Setting key → Empty';
                break;
            case 'ERP11421':
                errorMessage = 'Invalid Setting value → Empty';
                break;
            case 'ERP11422':
                errorMessage = 'Invalid Setting title → Not found';
                break;
            default:
                errorMessage = 'Failed to save system settings. Please try again.';
        }

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
        });
    }
}
