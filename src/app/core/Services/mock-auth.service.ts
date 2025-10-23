import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { ApiResult } from '../Dtos/ApiResult';
import { MockDataService, MockUser } from './mock-data.service';
import { IForceLogoutModel } from '../../modules/auth/models/IForceLogoutModel';

@Injectable({
    providedIn: 'root'
})
export class MockAuthService {

    constructor(private mockDataService: MockDataService) { }

    /**
     * Mock login method
     */
    login(credentials: { email: string; password: string }): Observable<ApiResult> {
        return new Observable<ApiResult>(subscriber => {
            setTimeout(() => {
                console.log('🔐 Mock Auth: Attempting login for', credentials.email);

                const user = this.mockDataService.findUserByCredentials(credentials.email, credentials.password);

                if (!user) {
                    console.log('❌ Mock Auth: Invalid credentials');
                    subscriber.next(this.mockDataService.createInvalidCredentialsResponse());
                    subscriber.complete();
                    return;
                }

                if (!user.isEmailConfirmed) {
                    console.log('❌ Mock Auth: Email not confirmed');
                    subscriber.next(this.mockDataService.createEmailNotConfirmedResponse());
                    subscriber.complete();
                    return;
                }

                // Check for active sessions (force logout scenario)
                if (this.mockDataService.hasActiveSessions(credentials.email)) {
                    console.log('⚠️ Mock Auth: Active sessions detected');
                    subscriber.next(this.mockDataService.createForceLogoutResponse(user));
                    subscriber.complete();
                    return;
                }

                // Successful login
                console.log('✅ Mock Auth: Login successful');
                const response = this.mockDataService.createLoginResponse(user);
                this.mockDataService.addActiveSession(credentials.email, `session-${Date.now()}`);
                subscriber.next(response);
                subscriber.complete();
            }, 1000); // 1 second delay to simulate API call
        });
    }

    /**
     * Mock force logout method
     */
    forceLogout(userData: IForceLogoutModel): Observable<ApiResult> {
        return new Observable<ApiResult>(subscriber => {
            setTimeout(() => {
                console.log('🔐 Mock Auth: Force logout for', userData.userEmail);

                const user = this.mockDataService.findUserByEmail(userData.userEmail);

                if (!user) {
                    subscriber.next(this.mockDataService.createInvalidCredentialsResponse());
                    subscriber.complete();
                    return;
                }

                // Clear all active sessions
                this.mockDataService.clearAllSessions(userData.userEmail);

                // Create successful login response
                const response = this.mockDataService.createLoginResponse(user);
                this.mockDataService.addActiveSession(userData.userEmail, `session-${Date.now()}`);

                subscriber.next(response);
                subscriber.complete();
            }, 1000);
        });
    }

    /**
     * Mock logout method
     */
    logout(): Observable<ApiResult> {
        return new Observable<ApiResult>(subscriber => {
            setTimeout(() => {
                console.log('🔐 Mock Auth: Logout');

                // Get current user from localStorage
                const userData = localStorage.getItem('userData');
                if (userData) {
                    const parsed = JSON.parse(userData);
                    if (parsed.data && parsed.data.email) {
                        this.mockDataService.clearAllSessions(parsed.data.email);
                    }
                }

                subscriber.next({
                    message: 'Logout successful',
                    isSuccess: true,
                    data: null,
                    code: 200,
                    totalRecords: 0,
                    errorList: null
                });
                subscriber.complete();
            }, 500);
        });
    }

    /**
     * Mock email confirmation
     */
    confirmEmail(email: string): Observable<boolean> {
        return new Observable<boolean>(subscriber => {
            setTimeout(() => {
                console.log('🔐 Mock Auth: Confirm email for', email);

                const user = this.mockDataService.findUserByEmail(email);
                if (user) {
                    // In real scenario, this would update the user's email confirmation status
                    console.log('✅ Mock Auth: Email confirmed');
                    subscriber.next(true);
                } else {
                    console.log('❌ Mock Auth: User not found');
                    subscriber.next(false);
                }
                subscriber.complete();
            }, 1000);
        });
    }

    /**
     * Mock verify code
     */
    verifyCode(email: string, code: string): Observable<ApiResult> {
        return new Observable<ApiResult>(subscriber => {
            setTimeout(() => {
                console.log('🔐 Mock Auth: Verify code for', email, 'with code', code);

                // Mock verification - accept any 6-digit code
                if (code && code.length === 6) {
                    subscriber.next({
                        message: 'Code verified successfully',
                        isSuccess: true,
                        data: { verified: true },
                        code: 200,
                        totalRecords: 0,
                        errorList: null
                    });
                } else {
                    subscriber.next({
                        message: 'Invalid verification code',
                        isSuccess: false,
                        data: null,
                        code: 400,
                        totalRecords: 0,
                        errorList: null
                    });
                }
                subscriber.complete();
            }, 1000);
        });
    }

    /**
     * Mock forget password
     */
    forgetPassword(email: string): Observable<ApiResult> {
        return new Observable<ApiResult>(subscriber => {
            setTimeout(() => {
                console.log('🔐 Mock Auth: Forget password for', email);

                const user = this.mockDataService.findUserByEmail(email);
                if (user) {
                    subscriber.next({
                        message: 'Password reset email sent successfully',
                        isSuccess: true,
                        data: { emailSent: true },
                        code: 200,
                        totalRecords: 0,
                        errorList: null
                    });
                } else {
                    subscriber.next({
                        message: 'Email not found',
                        isSuccess: false,
                        data: null,
                        code: 404,
                        totalRecords: 0,
                        errorList: null
                    });
                }
                subscriber.complete();
            }, 1000);
        });
    }

    /**
     * Mock reset password
     */
    resetPassword(data: any): Observable<ApiResult> {
        return new Observable<ApiResult>(subscriber => {
            setTimeout(() => {
                console.log('🔐 Mock Auth: Reset password');

                subscriber.next({
                    message: 'Password reset successfully',
                    isSuccess: true,
                    data: null,
                    code: 200,
                    totalRecords: 0,
                    errorList: null
                });
                subscriber.complete();
            }, 1000);
        });
    }

    /**
     * Mock register
     */
    register(tenantModel: any): Observable<ApiResult> {
        return new Observable<ApiResult>(subscriber => {
            setTimeout(() => {
                console.log('🔐 Mock Auth: Register tenant');

                subscriber.next({
                    message: 'Registration successful',
                    isSuccess: true,
                    data: {
                        tenantId: 'new-tenant-' + Date.now(),
                        email: tenantModel.email
                    },
                    code: 200,
                    totalRecords: 0,
                    errorList: null
                });
                subscriber.complete();
            }, 2000);
        });
    }

    /**
     * Get mock credentials for testing
     */
    getMockCredentials(): { email: string; password: string; role: string; department?: string; jobTitle?: string }[] {
        return this.mockDataService.getMockCredentials();
    }
}
