import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.scss'
})
export class ForgetPasswordComponent implements OnInit, OnDestroy {

  loginCreditials: FormGroup;
  validationMessage: string = '';
  successMessage: string = '';
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
      email: new FormControl<String>('mahmoudxkhaled@gmail.com', [Validators.required, Validators.email]),
    });
  }

  sendCode() {
    if (this.loginCreditials.invalid) {
      this.validationMessage = 'Please enter a valid email address';
      this.successMessage = '';
      return;
    }

    this.validationMessage = '';
    this.successMessage = '';
    const emailValue = (this.email?.value as string).trim();

    if (!emailValue) {
      this.validationMessage = 'Please enter your email address';
      return;
    }

    const requestSub = this.apiService.resetPasswordRequest(emailValue).subscribe({
      next: (response: any) => {
        // Response is already parsed by AuthService
        const isSuccess = this.apiService.isSuccessResponse(response);
        if (isSuccess) {
          this.successMessage = 'Please check your email for the reset link.';
          this.validationMessage = '';
        } else {
          this.validationMessage = response?.message || 'Failed to send reset link';
          this.successMessage = '';
        }
      },
      error: (error: any) => {
        // Error is already parsed by AuthService
        this.validationMessage = error?.message || 'Failed to send reset link. Please try again.';
        this.successMessage = '';
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