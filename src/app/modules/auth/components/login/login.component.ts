import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { LayoutService } from 'src/app/layout/app-services/app.layout.service';
import { AuthService } from '../../services/auth.service';
import { LanguageDIRService } from 'src/app/core/Services/LanguageDIR.service';
import { IForceLogoutModel } from '../../models/IForceLogoutModel';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

@Component({
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    providers: [MessageService],
})
export class LoginComponent implements OnInit, OnDestroy {
    rememberMe: boolean = false;
    hasError: boolean = false;
    loginCreditials!: FormGroup;
    unsubscribe: Subscription[] = [];
    isLoading$: Observable<boolean>;
    isRtl: boolean = false;
    userId: string = '';
    showDialog: boolean = false;
    showPassword: boolean = false;

    dialogMessage: string = 'We noticed that your account is currently active in another session. Would you like to log out from the previous session and continue here?';

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
            email: new FormControl<string>('', [Validators.required, Validators.email]),
            password: new FormControl<string>('', [Validators.required]),
        });
    }

    submit() {
        const subscription = this.apiService
            .login(this.loginCreditials.value)
            .subscribe({
                next: (res: any) => {
                    if (res.issuccess === false) {
                        this.hasError = true;
                    } else if (res.code === 800) {
                        // Active sessions detected
                        this.showDialog = true;
                        this.userId = res.data.userId;
                        this.dialogMessage = res.message;
                    } else if (res.message === "Email Not Confirmed") {
                        // Email not confirmed
                        this.hasError = true;
                    } else {
                        // Successful login
                        this.handleSuccessfulLogin();
                    }
                },
                error: (error) => {
                    console.error('Login error:', error);
                    this.hasError = true;
                },
            });
        this.unsubscribe.push(subscription);
    }

    forceLogout(userId: string) {
        this.showDialog = false;
        const userData: IForceLogoutModel = {
            userId: userId,
            userEmail: this.loginCreditials.value.email,
            userPassword: this.loginCreditials.value.password
        }
        const forceLogoutSubscription = this.apiService
            .forceLogout(userData)
            .subscribe({
                next: (res) => {
                    console.log('Active sessions logged out. Retrying login...');
                    // this.submit();
                    if (res.isSuccess === false) {
                        this.hasError = true;
                    } else if (res.code === 800) {
                        // Active sessions detected
                        this.showDialog = true;
                        this.userId = res.data.userId;
                        this.dialogMessage = res.message;
                    } else if (res.message === "Email Not Confirmed") {
                        // Email not confirmed
                        this.hasError = true;
                    } else {
                        // Successful login
                        this.handleSuccessfulLogin();
                    }
                },
                error: (error) => {
                    console.error('Force logout error:', error);
                },
            });
        this.unsubscribe.push(forceLogoutSubscription);
    }

    cancelLogin() {
        this.showDialog = false;
        console.log('User chose not to login.');
    }

    handleSuccessfulLogin() {
        const userLang = this.rtlService.getLanguageFromStorage();
        this.rtlService.setUserLanguageCode(userLang);
        this.rtlService.setRtl(userLang === 'ar');
        this.router.navigate(['/']);
    }

    onYesClick(): void {
        this.forceLogout(this.userId);
    }

    onNoClick(): void {
        this.cancelLogin();
    }

    onDialogClose(): void {
        this.showDialog = false;
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