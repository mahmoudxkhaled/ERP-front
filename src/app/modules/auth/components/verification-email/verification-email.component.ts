import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiServices } from 'src/app/core/API_Interface/ApiServices';
import { ApiRequestTypes } from 'src/app/core/API_Interface/ApiRequestTypes';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-verification-email',
  templateUrl: './verification-email.component.html',
  styleUrl: './verification-email.component.scss'
})
export class VerificationEmailComponent implements OnInit, OnDestroy {
  private unsubscribe: Subscription[] = [];
  private countdownInterval: any = null;
  verificationToken: string = '';
  isVerifying: boolean = false;
  verificationSuccess: boolean = false;
  errorMessage: string = '';
  redirectCountdown: number = 3;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiServices: ApiServices
  ) { }

  ngOnInit(): void {
    // Read verification token from query parameters
    const queryParamsSub = this.route.queryParams.subscribe(params => {
      this.verificationToken = params['token'] || params['verification-token'] || '';

      console.log('verification-token', this.verificationToken);
      if (this.verificationToken) {
        // Auto-verify on page load if token exists
        this.verifyEmail();
      } else {
        this.errorMessage = 'Verification link is invalid or has expired.';
      }
      // If no token, component will show manual verification button or info message
    });

    this.unsubscribe.push(queryParamsSub);
  }

  verifyEmail(): void {
    if (!this.verificationToken) {
      this.errorMessage = 'Verification token is missing';
      return;
    }

    this.isVerifying = true;
    this.errorMessage = '';
    this.verificationSuccess = false;

    // Prepare payload: JSON string with verificationToken

    // Call API directly using ApiServices with operation 107 (Verify_Email)
    const verifySub = this.apiServices.callAPI(ApiRequestTypes.Verify_Email, '', [this.verificationToken]).subscribe({
      next: (apiResult: ApiResult) => {
        try {
          console.log('apiResult', apiResult);
          // Parse the response body (JSON string)
          const response = JSON.parse(apiResult.Body);
          console.log('response', response);
          if (response.success === true) {
            this.verificationSuccess = true;
            this.startRedirectCountdown();
          } else {
            this.errorMessage = response.message || 'Verification link is invalid or has expired.';
            this.isVerifying = false;
          }
        } catch (error) {
          console.error('Error parsing verification response:', error);
          this.errorMessage = 'An error occurred during verification';
          this.isVerifying = false;
        }
      },
      error: (error: ApiResult) => {
        try {
          const response = JSON.parse(error.Body);
          this.errorMessage = response.message || 'Verification link is invalid or has expired.';
        } catch (e) {
          this.errorMessage = 'Verification link is invalid or has expired.';
        } finally {
          this.isVerifying = false;
        }
      }
    });

    this.unsubscribe.push(verifySub);
  }

  private startRedirectCountdown(): void {
    this.isVerifying = false;
    this.redirectCountdown = 5;

    // Clear any existing interval
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
    // Unsubscribe from all subscriptions
    this.unsubscribe.forEach((u) => u.unsubscribe());

    // Clear countdown interval if exists
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}