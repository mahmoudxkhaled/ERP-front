import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { passwordMatchValidator } from '../../../../core/Services/passwordMatchValidator';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { IResetPasswordModel } from '../../models/IResetPasswordModel';
import { EcncryptionService } from 'src/app/core/Services/ecncryption.service';

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
        private fb: FormBuilder,
        private EcncrypServ: EcncryptionService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        const x = this.route.params.subscribe((params) => {
            this.email = params['email'];
            this.confirmUserEmail();
        });
        this.unsubscribe.push(x);
    }

    confirmUserEmail() {
        const x = this.authService.confirmEmail(this.email).subscribe({});
        this.unsubscribe.push(x);
    }

    fetchCampanyLogo() {
        const x = this.authService.getCompanyLogo().subscribe({
            next: (r) => {
                this.tenantLogoUrl = r.data;
            },
            error: (e) => {},
        });
    }

    submit() {
        const data: IResetPasswordModel = {
            email: this.email,
            newPassword: this.resetPassForm.get('password')?.value,
            cNewPassword: this.resetPassForm.get('cPassword')?.value,
        };

        const x = this.authService.resetPassword(data).subscribe({
            next: (r) => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Password reset successful!',
                });
                this.router.navigate(['/auth']);
            },
            error: (e) => {},
        });
        this.unsubscribe.push(x);
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
