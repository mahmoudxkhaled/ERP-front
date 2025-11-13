import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.component.html',
  styleUrl: './verify-code.component.scss'
})
export class VerifyCodeComponent implements OnInit, OnDestroy {

  email: string = '';
  validationMessage: string = '';
  form: FormGroup;
  isLoading$: Observable<boolean>;
  unsubscribe: Subscription[] = [];

  constructor(
    private apiService: AuthService,
    private router: Router,
    private localStorageService: LocalStorageService,
    private route: ActivatedRoute
  ) {
    this.isLoading$ = this.apiService.isLoadingSubject;
  }

  ngOnInit(): void {
    this.email = this.route.snapshot.params['email'];

    this.form = new FormGroup({
      code1: new FormControl<string>('', Validators.required),
      code2: new FormControl<string>('', Validators.required),
      code3: new FormControl<string>('', Validators.required),
      code4: new FormControl<string>('', Validators.required),
      code5: new FormControl<string>('', Validators.required),
      code6: new FormControl<string>('', Validators.required),
    });
  }

  verifyCode() {
    this.validationMessage = '';

    if (this.form.invalid) {
      this.validationMessage = 'Please enter all digits';
      return;
    }

    const otp = [
      this.form.controls?.['code1'].value,
      this.form.controls?.['code2'].value,
      this.form.controls?.['code3'].value,
      this.form.controls?.['code4'].value,
      this.form.controls?.['code5'].value,
      this.form.controls?.['code6'].value,
    ].join('');

    if (otp && this.email) {
      console.log('otp', otp);
      console.log('email', this.email);
      const verifySubscription = this.apiService.verify2FA(this.email, otp).subscribe({
        next: (response: any) => {
          if (response?.success === true) {
            // AuthService already saves auth data if token and userId are present
            // But we can also save it here as a fallback
            if (response?.message) {
              this.setAuthFromResponseToLocalStorage(response);
            }
            this.router.navigate(['/']);
          } else {
            this.validationMessage = response?.message || 'Invalid verification code. Please try again.';
          }
        },
        error: (error: any) => {
          const errorMessage = error?.message || 'Invalid verification code. Please try again.';
          this.validationMessage = errorMessage;
        }
      });
      this.unsubscribe.push(verifySubscription);
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((u) => u.unsubscribe());
  }

  moveToNext(event: any, nextInputId: string): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length === 1 && /^[0-9]$/.test(input.value)) {
      const nextInput = document.getElementById(nextInputId) as HTMLInputElement;
      nextInput?.focus();
    }
  }

  moveToPrev(event: any, prevInputId: string): void {
    this.validationMessage = ''
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && input.value === '') {
      const prevInput = document.getElementById(prevInputId) as HTMLInputElement;
      prevInput?.focus();
    }
  }

  setAuthFromResponseToLocalStorage(response: any): boolean {
    if (!response?.success || !response?.message) {
      return false;
    }

    const payload = response.message;
    const token = payload.Access_Token ?? payload.accessToken ?? payload.token;
    const userId = payload.User_ID ?? payload.userId ?? payload.id;

    if (!token || !userId) {
      return false;
    }

    const authData = {
      token,
      userId,
    };

    console.log('authData from login component', authData);

    this.localStorageService.setItem('userData', authData);
    return true;
  }
}