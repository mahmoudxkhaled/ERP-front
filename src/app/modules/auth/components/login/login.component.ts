import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { LayoutService } from 'src/app/layout/app-services/app.layout.service';
import { AuthService } from '../../services/auth.service';
import { LanguageDIRService } from 'src/app/core/Services/LanguageDIR.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

@Component({
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
    hasError: boolean = false;
    errorMessage: string = '';
    loginCreditials!: FormGroup;
    unsubscribe: Subscription[] = [];
    isLoading$: Observable<boolean>;
    isRtl: boolean = false;
    showPassword: boolean = false;

    currentIndex = 0;
    typingSpeed = 100;
    pauseTime = 3000;
    yearNow = new Date().getFullYear();

    get dark(): boolean {
        return this.layoutService.config().colorScheme !== 'light';
    }

    get email() {
        return this.loginCreditials.get('email');
    }

    get password() {
        return this.loginCreditials.get('password');
    }

    constructor(
        private layoutService: LayoutService,
        private apiService: AuthService,
        private router: Router,
        private rtlService: LanguageDIRService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoading$ = this.apiService.isLoadingSubject;
    }

    ngOnInit(): void {
        const userData = this.localStorageService.getItem('userData');
        if (userData) {
            console.log('userData from login component', userData);
            this.router.navigate(['/']);
        }

        this.initForm();
        const userLang = this.rtlService.getLanguageFromStorage();
        this.rtlService.setRtl(userLang === 'ar');
        this.isRtl = userLang === 'ar';
    }

    initForm() {
        this.loginCreditials = new FormGroup({
            email: new FormControl<string>('mahmoudxkhaled@gmail.com', [Validators.required, Validators.email]),
            password: new FormControl<string>('Kakuzu@123456', [Validators.required]),
        });
    }

    submit() {
        if (this.loginCreditials.invalid) {
            this.hasError = true;
            this.errorMessage = 'Please enter a valid email and password.';
            return;
        }

        this.hasError = false;
        this.errorMessage = '';
        const email = this.email?.value as string;
        const password = this.password?.value as string;

        const loginSubscription = this.apiService.login(email, password).subscribe({
            next: (response: any) => {

                if (!response?.success) {
                    this.handleBusinessError(response, email);
                    return;
                }
                this.handleSuccessfulLogin();
            },
        });

        this.unsubscribe.push(loginSubscription);
    }

    private handleBusinessError(error: any, email: string) {
        this.hasError = true;
        const code = (error.message).toString();
        console.log('code from error', code);
        switch (code) {
            case 'ERP11104':
                this.errorMessage = 'Invalid login credentials. Please check your email or password.';
                return;
            case 'ERP11100':
                this.router.navigate(['/auth/account-locked'], { queryParams: { status: 'Inactive' } });
                return;
            case 'ERP11101':
                this.router.navigate(['/auth/email-verified'], { queryParams: { email: email } });
                return;
            case 'ERP11102':
                this.router.navigate(['/auth/account-locked'], { queryParams: { status: 'Locked' } });
                return;
            case 'ERP11140': {
                const queryParams: any = {};
                if (email) { queryParams['email'] = email; }
                this.router.navigate(['/auth/email-verified'], { queryParams });
                return;
            }
            case 'ERP11103':
                this.router.navigate(['/auth/verify-code', email]);
                return;
            default:
                this.errorMessage = code || 'Unexpected error occurred.';
                console.error('Login error:', this.errorMessage);
                return;
        }

    }



    handleSuccessfulLogin() {
        const userLang = this.rtlService.getLanguageFromStorage();
        this.rtlService.setUserLanguageCode(userLang);
        this.rtlService.setRtl(userLang === 'ar');
        this.router.navigate(['/']);
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }


    ngOnDestroy(): void {
        this.unsubscribe.forEach((u) => u.unsubscribe());
    }
}