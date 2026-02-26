import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { AuthService } from '../../services/auth.service';

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
  yearNow = new Date().getFullYear();
  get email() {
    return this.loginCreditials.get('email');
  }

  constructor(
    private apiService: AuthService,
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

        if (!response?.success) {
          this.validationMessage = 'Invalid email address format';
          this.successMessage = '';
          return;
        }
        this.successMessage = 'If you have an ERP account, you would receive a reset link via an email shortly';
        this.validationMessage = '';

      },
    });
    this.unsubscribe.push(requestSub);
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((u) => {
      u.unsubscribe();
    });
  }
}
