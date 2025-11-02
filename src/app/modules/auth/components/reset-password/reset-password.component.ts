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
        // Read resetToken from query parameters (primary method)
        const queryParamsSub = this.route.queryParams.subscribe((queryParams) => {
            let resetToken = queryParams['reset-token'] || queryParams['token'] || '';

            // Decode the token properly to handle special characters like +
            // Angular Router sometimes converts + to space, so we need to handle both
            if (resetToken) {
                // First decode URL encoding
                resetToken = decodeURIComponent(resetToken);
                // Replace spaces back to + (in case + was converted to space by URL parser)
                // This handles cases where the original token contained +
                resetToken = resetToken.replace(/ /g, '+');
                console.log('resetToken', resetToken);
                // Store resetToken for use in submit()
                (this as any).resetToken = resetToken;
            }
        });
        this.unsubscribe.push(queryParamsSub);
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

        const resetSub = this.authService.resetPasswordConfirm(resetToken, newPassword).subscribe({
            next: (response: any) => {
                // Response is already parsed by AuthService
                const isSuccess = this.authService.isSuccessResponse(response);
                if (isSuccess) {
                    this.resetSuccess = true;
                    this.startRedirectCountdown();
                } else {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: response?.message || 'Password reset failed.',
                    });
                }
            },
            error: (error: any) => {
                // Error is already parsed by AuthService
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error?.message || 'Password reset failed. Please try again.',
                });
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
                        Validators.minLength(12),
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

        // Clear any existing interval
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
        // Unsubscribe from all subscriptions
        this.unsubscribe.forEach((c) => {
            c.unsubscribe();
        });

        // Clear countdown interval if exists
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
}
