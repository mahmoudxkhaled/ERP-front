import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss'
})
export class ForgetPasswordComponent implements OnInit, OnDestroy {

  loginCreditials: FormGroup;
  validationMessage: string = '';
  isLoading$: Observable<boolean>;
  unsubscribe: Subscription[] = [];

  get email() {
    return this.loginCreditials.get('email');
  }

  constructor(
    private router: Router,
    private apiService: AuthService,
    private localStorageService: LocalStorageService
  ) {
    this.isLoading$ = this.apiService.isLoadingSubject;
  }

  ngOnInit(): void {
    this.initForm();
  }

  initForm() {
    this.loginCreditials = new FormGroup({
      email: new FormControl<String>('', [Validators.required, Validators.email]),
    });
  }

  sendCode() {
    if (this.loginCreditials.invalid) {
      this.validationMessage = 'Please enter a valid email address';
      return;
    }

    this.validationMessage = '';
    const emailValue = (this.email?.value as string).trim();

    if (!emailValue) {
      this.validationMessage = 'Please enter your email address';
      return;
    }

    const requestSub = this.apiService.resetPasswordRequest(emailValue).subscribe({
      next: (apiResult) => {
        try {
          const response = JSON.parse(apiResult.Body);
          if (response.success === true) {
            // Show success message (component template should handle this)
            this.validationMessage = 'success';
            // Optionally navigate or show success message
          } else {
            this.validationMessage = response.message || 'Failed to send reset link';
          }
        } catch (error) {
          console.error('Error parsing reset password request response:', error);
          this.validationMessage = 'An error occurred. Please try again.';
        }
      },
      error: (error) => {
        try {
          const response = JSON.parse(error.Body);
          this.validationMessage = response.message || 'Failed to send reset link';
        } catch (e) {
          this.validationMessage = 'Failed to send reset link. Please try again.';
        }
      }
    });

    this.unsubscribe.push(requestSub);
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((u) => {
      u.unsubscribe();
    });
  }
}