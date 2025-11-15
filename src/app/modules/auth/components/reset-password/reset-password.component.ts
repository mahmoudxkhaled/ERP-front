import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
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
    resetPassForm: FormGroup;
    resetToken: string = '';
    tenantLogoUrl: string;
    resetSuccess: boolean = false;
    redirectCountdown: number = 5;
    hasError: boolean = false;
    errorMessage: string = '';
    type: string = '';
    pageLabel: string = '';
    isLoading$: Observable<boolean>;


    constructor(
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private fb: FormBuilder
    ) {
        this.isLoading$ = this.authService.isLoadingSubject;
        this.initForm();
    }

    ngOnInit(): void {
        const routeData = this.route.snapshot.data;
        if (routeData['type']) {
            this.type = routeData['type'];
        } else {
            this.type = this.route.snapshot.params['type'] || '';
        }
        this.setPageLabel();

        const queryParamsSub = this.route.queryParams.subscribe((queryParams) => {
            let resetToken = queryParams['reset-token'] || '';
            this.resetToken = decodeURIComponent(resetToken);
            this.resetToken = this.resetToken.replace(/ /g, '+');
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

        if (this.authService.isLoadingSubject.value) return;
        if (this.resetPassForm.invalid) {
            this.hasError = true;
            this.errorMessage = 'Please enter a valid new password.';
            return;
        }

        const newPassword = this.resetPassForm.get('password')?.value;

        if (!this.resetToken) {
            this.hasError = true;
            this.errorMessage = 'Reset token is missing. Please use the link from your email.';
            return;
        }


        const resetSub = this.authService.resetPasswordConfirm(this.resetToken, newPassword).subscribe({
            next: (response: any) => {
                console.log('response', response);
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }
                this.resetSuccess = true;
                this.startRedirectCountdown();
            },

        });

        this.unsubscribe.push(resetSub);
    }

    private handleBusinessError(error: any) {
        this.hasError = true;
        const code = (error.message).toString();
        switch (code) {

            case 'ERP11135':
                this.errorMessage = 'Invalid Reset Token. Please use the link from your email.';
                return;
            case 'ERP11136':
                this.errorMessage = 'Invalid New Password. Please enter a valid password.';
                return;
            case 'ERP11137':
                this.errorMessage = 'New Password Format is incompliant. Please check the password requirements.';
                return;
            default:
                this.errorMessage = code || 'Unexpected error occurred.';
                return;
        }
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
