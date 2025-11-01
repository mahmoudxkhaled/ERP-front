import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { passwordMatchValidator } from '../../../../core/Services/passwordMatchValidator';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';

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
    private email: string;
    resetPassForm!: FormGroup;
    tenantLogoUrl: string;

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
            const resetToken = queryParams['resetToken'] || queryParams['token'] || '';
            
            if (resetToken) {
                // Store resetToken for use in submit()
                (this as any).resetToken = resetToken;
            } else {
                // Backward compatibility: try route params
                const paramsSub = this.route.params.subscribe((params) => {
                    this.email = params['email'];
                    // If email provided, we might need to handle it differently
                    // For now, just log that token is missing
                    if (!resetToken) {
                        console.warn('No resetToken found in query parameters');
                    }
                });
                this.unsubscribe.push(paramsSub);
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
            next: (apiResult) => {
                try {
                    const response = JSON.parse(apiResult.Body);
                    if (response.success === true) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Password reset successful!',
                        });
                        setTimeout(() => {
                            this.router.navigate(['/auth']);
                        }, 2000);
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: response.message || 'Password reset failed.',
                        });
                    }
                } catch (error) {
                    console.error('Error parsing reset password response:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'An error occurred. Please try again.',
                    });
                }
            },
            error: (error) => {
                try {
                    const response = JSON.parse(error.Body);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: response.message || 'Password reset failed.',
                    });
                } catch (e) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Password reset failed. Please try again.',
                    });
                }
            }
        });

        this.unsubscribe.push(resetSub);
    }

    initForm() {
        this.resetPassForm = this.fb.group(
            {
                password: [
                    '',
                    Validators.compose([
                        Validators.required,
                        Validators.minLength(12),
                        Validators.maxLength(100),
                        passwordComplexityValidator(),
                    ]),
                ],
                cPassword: ['', Validators.compose([Validators.required])],
            },
            {
                validator: passwordMatchValidator.MatchPassword,
            }
        );
    }

    ngOnDestroy(): void {
        this.unsubscribe.forEach((c) => {
            c.unsubscribe();
        });
    }
}
