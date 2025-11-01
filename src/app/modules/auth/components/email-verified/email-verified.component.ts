import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';

@Component({
    selector: 'app-email-verified',
    templateUrl: './email-verified.component.html',
    styleUrls: ['./email-verified.component.scss'],
})
export class EmailVerifiedComponent implements OnInit, OnDestroy {
    private unsubscribe: Subscription = new Subscription();
    verificationToken: string = '';

    constructor(
        private authService: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        // Try to read token from query params first (primary method)
        this.unsubscribe = this.route.queryParams.subscribe((queryParams) => {
            this.verificationToken = queryParams['token'] || '';
            
            // If no token in query params, try route params (backward compatibility)
            if (!this.verificationToken) {
                this.route.params.subscribe((params) => {
                    const email = params['email'];
                    if (email) {
                        // For backward compatibility, treat email as token
                        this.verificationToken = email;
                        this.verifyEmail();
                    }
                });
            } else {
                this.verifyEmail();
            }
        });
    }

    verifyEmail(): void {
        if (!this.verificationToken) {
            return;
        }

        const verifySub = this.authService.verifyEmail(this.verificationToken).subscribe({
            next: (apiResult: ApiResult) => {
                try {
                    const response = JSON.parse(apiResult.Body);
                    if (response.success === true) {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Email confirmed',
                            detail: 'Your email has been successfully confirmed. You can now log in.',
                        });
                        setTimeout(() => {
                            this.router.navigate(['/auth']);
                        }, 3000);
                    } else {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Verification failed',
                            detail: response.message || 'Email verification failed.',
                        });
                    }
                } catch (error) {
                    console.error('Error parsing verification response:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'An error occurred during email verification.',
                    });
                }
            },
            error: (error: ApiResult) => {
                try {
                    const response = JSON.parse(error.Body);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Verification failed',
                        detail: response.message || 'Email verification failed.',
                    });
                } catch (e) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Email verification failed. Please try again.',
                    });
                }
            }
        });

        this.unsubscribe.add(verifySub);
    }

    ngOnDestroy(): void {
        this.unsubscribe.unsubscribe();
    }
}