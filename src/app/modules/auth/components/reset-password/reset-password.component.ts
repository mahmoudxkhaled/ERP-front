import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { passwordMatchValidator } from '../../../../core/Services/passwordMatchValidator';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

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
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
    private unsubscribe: Subscription[] = [];
    private countdownInterval: any = null;
    private email: string;
    resetPassForm!: FormGroup;
    tenantLogoUrl: string;
    resetSuccess: boolean = false;
    redirectCountdown: number = 5;
    hasError: boolean = false;
    errorMessage: string = '';
    type: string = '';
    pageLabel: string = '';
    constructor(
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService,
        private fb: FormBuilder
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        console.log('ngOnInit');

        // Read type from route params or route data
        const routeData = this.route.snapshot.data;
        if (routeData['type']) {
            // Override with route data type (for change-password route)
            this.type = routeData['type'];
        } else {
            // Read from route params (for :type/reset-password route)
            this.type = this.route.snapshot.params['type'] || '';
        }

        // Set pageLabel based on type
        this.setPageLabel();

        const queryParamsSub = this.route.queryParams.subscribe((queryParams) => {
            let resetToken = queryParams['reset-token'] || queryParams['token'] || '';
            console.log('resetToken from queryParams', resetToken);
            if (resetToken) {
                resetToken = decodeURIComponent(resetToken);
                resetToken = resetToken.replace(/ /g, '+');
                console.log('resetToken', resetToken);
                (this as any).resetToken = resetToken;
            }
        });
        this.unsubscribe.push(queryParamsSub);
    }

    private setPageLabel(): void {
        const labelMap: { [key: string]: string } = {
            'forgot-password': 'Reset your forgotten password',
            'unlock-account': 'Unlock your account',
            'new-account': 'Create your new account password',
            'change-password': 'Change your password'
        };

        this.pageLabel = labelMap[this.type] || 'Reset Your Password';
    }

    submit() {
        if (this.resetPassForm.invalid) {
            return;
        }

        const resetToken = (this as any).resetToken || '';
        const newPassword = this.resetPassForm.get('password')?.value;

        if (!resetToken) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Reset token is missing. Please use the link from your email.',
            });
            return;
        }
        console.log('resetToken from submit', resetToken);
        console.log('newPassword from submit', newPassword);

        const resetSub = this.authService.resetPasswordConfirm(resetToken, newPassword).subscribe({
            next: (response: any) => {
                if (response?.success === true) {
                    this.resetSuccess = true;
                    this.startRedirectCountdown();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: response?.message || 'Password reset failed.',
                    });
                }
                this.resetSuccess = true;
                this.startRedirectCountdown();
            },
            error: (error: any) => {
                this.hasError = true;
                this.errorMessage = 'Password reset failed. Please try again.';
            }
        });

        this.unsubscribe.push(resetSub);
    }

    initForm() {
        this.resetPassForm = this.fb.group(
            {
                password: [
                    'Kakuzu@123456',
                    Validators.compose([
                        Validators.required,
                        Validators.minLength(8),
                        Validators.maxLength(100),
                        passwordComplexityValidator(),
                    ]),
                ],
                cPassword: ['Kakuzu@123456', Validators.compose([Validators.required])],
            },
            {
                validator: passwordMatchValidator.MatchPassword,
            }
        );
    }

    private startRedirectCountdown(): void {
        this.redirectCountdown = 5;

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        this.countdownInterval = setInterval(() => {
            this.redirectCountdown--;

            if (this.redirectCountdown <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                this.router.navigate(['/auth']);
            }
        }, 1000);
    }

    ngOnDestroy(): void {
        this.unsubscribe.forEach((c) => {
            c.unsubscribe();
        });

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
}
