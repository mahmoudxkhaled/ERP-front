import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { Observable, Subscription } from 'rxjs';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';

@Component({
  selector: 'app-verify-code',
  templateUrl: './verify-code.component.html',
  styleUrl: './verify-code.component.scss'
})
export class VerifyCodeComponent implements OnInit, OnDestroy {

  userId: string = '';
  validationMessage: string = '';
  form: FormGroup;
  isLoading$: Observable<boolean>;
  unsubscribe: Subscription[] = [];

  constructor(
    private apiService: AuthService,
    private router: Router,
    private localStorageService: LocalStorageService
  ) {
    this.isLoading$ = this.apiService.isLoadingSubject;
  }

  ngOnInit(): void {
    // Get userId from localStorage (saved during Login)
    this.userId = this.localStorageService.getItem('userId') || '';

    // If userId not found, try to get it from userData
    if (!this.userId) {
      const userData = this.localStorageService.getItem('userData');
      if (userData) {
        try {
          const parsed = typeof userData === 'string' ? JSON.parse(userData) : userData;
          this.userId = parsed.userId || '';
        } catch (e) {
          console.error('Error parsing userData:', e);
        }
      }
    }

    // If still no userId, redirect to login
    // if (!this.userId) {
    //   this.router.navigate(['/auth']);
    //   return;
    // }

    this.form = new FormGroup({
      code1: new FormControl<string>('', Validators.required),
      code2: new FormControl<string>('', Validators.required),
      code3: new FormControl<string>('', Validators.required),
      code4: new FormControl<string>('', Validators.required),
      code5: new FormControl<string>('', Validators.required),
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
    ].join('');

    if (otp && this.userId) {
      const verifySubscription = this.apiService.verify2FA(this.userId, otp).subscribe({
        next: (apiResult: ApiResult) => {
          try {
            const response = JSON.parse(apiResult.Body);
            if (response.success === true) {
              // Token and userId should already be saved by AuthService
              // Navigate to home page
              this.router.navigate(['/']);
            } else {
              this.validationMessage = response.message || 'Invalid verification code';
            }
          } catch (error) {
            console.error('Error parsing 2FA response:', error);
            this.validationMessage = 'An error occurred. Please try again.';
          }
        },
        error: (error: ApiResult) => {
          try {
            const response = JSON.parse(error.Body);
            this.validationMessage = response.message || 'Verification failed';
          } catch (e) {
            this.validationMessage = 'Verification failed. Please try again.';
          }
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
}