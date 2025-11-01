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
    loginCreditials!: FormGroup;
    unsubscribe: Subscription[] = [];
    isLoading$: Observable<boolean>;
    isRtl: boolean = false;
    showPassword: boolean = false;


    messages = [
        "1 # Revolutionizing Ideas",
        "1 # Advancing Security",
        "1 # Building Confidence",
        "1 # Inspiring Trust",
        "1 # Leading Protection"
    ];
    currentIndex = 0;
    typingSpeed = 100;
    pauseTime = 3000;

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
        // check if User Loged In 
        const userData = this.localStorageService.getItem('userData');
        if (userData) {
            this.router.navigate(['/']);
        }

        this.initForm();
        this.typeMessage();
        const userLang = this.rtlService.getLanguageFromStorage();
        this.rtlService.setRtl(userLang === 'ar');
        this.isRtl = userLang === 'ar';
    }

    initForm() {
        this.loginCreditials = new FormGroup({
            email: new FormControl<string>('mahmoudxkhaled@gmail.com', [Validators.required, Validators.email]),
            password: new FormControl<string>('abc.123', [Validators.required]),
        });
    }

    submit() {
        if (this.loginCreditials.invalid) {
            this.hasError = true;
            return;
        }

        this.hasError = false;
        const email = this.email?.value as string;
        const password = this.password?.value as string;

        const loginSubscription = this.apiService.login(email, password).subscribe({
            next: (response: any) => {
                // Response is already parsed by AuthService
                if (response?.success === true) {
                    // Successful login - token and userId should already be saved by AuthService
                    console.log('response', response);
                    this.router.navigate(['/auth/verify-email']);

                    // this.handleSuccessfulLogin();
                } else {
                    // Handle different error cases
                    // Check if message is an object (with Access_Token) or a string
                    const messageObj = response?.message || {};
                    const accessToken = typeof messageObj === 'object' ? messageObj?.Access_Token : messageObj;
                    const userId = typeof messageObj === 'object' ? messageObj?.User_ID : (response?.userId || response?.User_ID || '');

                    if (accessToken === 'Inactive' || (typeof messageObj === 'string' && messageObj === 'Inactive')) {
                        // Account is inactive
                        this.router.navigate(['/auth/account-locked'], { queryParams: { status: 'Inactive' } });
                    } else if (accessToken === 'Verify' || (typeof messageObj === 'string' && messageObj === 'Verify')) {
                        // Email verification required - navigate without token to show notification
                        this.router.navigate(['/auth/verification-email']);
                    } else if (accessToken === 'Locked' || (typeof messageObj === 'string' && messageObj === 'Locked')) {
                        // Account locked after failed attempts
                        this.router.navigate(['/auth/account-locked'], { queryParams: { status: 'Locked' } });
                    } else if (accessToken === '2FA' || (typeof messageObj === 'string' && messageObj === '2FA')) {
                        // 2FA required - save userId for verification
                        if (userId) {
                            this.localStorageService.setItem('userId', userId);
                        }
                        this.router.navigate(['/auth/verify-code']);
                    } else {
                        // Generic error
                        this.hasError = true;
                        console.error('Login failed:', accessToken || messageObj || 'Unknown error');
                    }
                }
            },
            error: (error: any) => {
                // Error is already parsed by AuthService
                this.hasError = true;
                console.error('Login error:', error?.message || 'Unknown error');
            }
        });

        this.unsubscribe.push(loginSubscription);
    }


    handleSuccessfulLogin() {
        const userLang = this.rtlService.getLanguageFromStorage();
        this.rtlService.setUserLanguageCode(userLang);
        this.rtlService.setRtl(userLang === 'ar');
        this.router.navigate(['/']);
    }

    typeMessage() {
        const messageElement = document.querySelector('.message');
        let fullMessage = this.messages[this.currentIndex];
        let displayMessage = "";
        let charIndex = 0;

        const typeInterval = setInterval(() => {
            if (charIndex < fullMessage.length) {
                displayMessage += fullMessage[charIndex];
                if (messageElement) {
                    messageElement.textContent = displayMessage;
                }
                charIndex++;
            } else {
                clearInterval(typeInterval);
                setTimeout(() => {
                    this.currentIndex = (this.currentIndex + 1) % this.messages.length;
                    this.typeMessage();
                }, this.pauseTime);
            }
        }, this.typingSpeed);
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    ngOnDestroy(): void {
        this.unsubscribe.forEach((u) => u.unsubscribe());
    }
}