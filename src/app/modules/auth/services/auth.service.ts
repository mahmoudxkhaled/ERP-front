import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, tap, throwError } from 'rxjs';
import { ApiResult as ApiResultDto } from 'src/app/core/Dtos/ApiResult';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';
import { ApiServices } from 'src/app/core/API_Interface/ApiServices';
import { ApiRequestTypes } from 'src/app/core/API_Interface/ApiRequestTypes';
import { DataService } from 'src/app/core/Services/data-service.service';
import { MockAuthService } from 'src/app/core/Services/mock-auth.service';
import { environment } from 'src/environments/environment';
import { TenantModel } from '../models/TenantModel';
import { ISendEmailRequest } from '../models/ISendEmailRequest';
import { IForceLogoutModel } from '../models/IForceLogoutModel';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

const API_USERS_URL = environment.apiUrl;

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);
    constructor(
        private httpClient: HttpClient,
        private dataService: DataService,
        private mockAuthService: MockAuthService,
        private apiServices: ApiServices,
        private localStorageService: LocalStorageService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    /**
     * Helper method to parse ApiResult.Body (JSON string) to object
     */
    parseApiResponse(apiResult: ApiResult): any {
        try {
            if (apiResult?.Body) {
                return JSON.parse(apiResult.Body);
            }
            return null;
        } catch (error) {
            console.error('Error parsing API response:', error);
            return null;
        }
    }

    /**
     * Helper method to parse JSON string (from ApiResult.Body) to object
     */
    parseApiBody(body: string): any {
        try {
            if (body) {
                return JSON.parse(body);
            }
            return null;
        } catch (error) {
            console.error('Error parsing API body:', error);
            return null;
        }
    }

    /**
     * Helper method to check if API response is successful
     * Handles both string 'True'/'False' and boolean true/false
     */
    isSuccessResponse(response: any): boolean {
        if (!response) return false;
        return response.success === true ||
            response.success === 'True' ||
            response.success === 'true';
    }

    login(email: string, password: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Login, '', [email, password]).pipe(
            map((apiResult: ApiResult) => {
                console.log('apiResult', apiResult);
                const parsed = this.parseApiResponse(apiResult);
                console.log('parsed', parsed);
                // Save token and userId if login successful
                if (parsed && parsed.success && parsed.token && parsed.userId) {
                    console.log('parsed.token', parsed.token);
                    console.log('parsed.userId', parsed.userId);
                    console.log('parsed.accessToken', parsed.accessToken);
                    this.setAuthFromLocalStorage({
                        token: parsed.token,
                        userId: parsed.userId,
                        accessToken: parsed.token
                    });
                    console.log('setAuthFromLocalStorage', this.localStorageService.getItem('userData'));
                }

                // Return parsed object instead of ApiResult
                return parsed || {};
            }),
            catchError((error: ApiResult) => {
                console.error('Login error:', error);
                // Parse error response and return as error object
                const parsedError = this.parseApiResponse(error);
                return throwError(() => parsedError || { success: false, message: 'Login failed' });
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }


    register(tenantModel: TenantModel): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        if (environment.isMockEnabled) {
            return this.mockAuthService.register(tenantModel).pipe(
                map((mockResult: ApiResultDto) => {
                    const apiResult: ApiResult = {
                        ReturnStatus: mockResult.isSuccess ? 200 : 400,
                        Body: JSON.stringify(mockResult)
                    };
                    return apiResult;
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
        }

        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient
            .post<ApiResultDto>(`${API_USERS_URL}/Tenant/RegisterTenant`, tenantModel, { headers: httpHeaders })
            .pipe(
                map((result: ApiResultDto) => {
                    const apiResult: ApiResult = {
                        ReturnStatus: result.isSuccess ? 200 : 400,
                        Body: JSON.stringify(result)
                    };
                    return apiResult;
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
    }

    /**
     * Confirm password reset (Operation 106)
     */
    resetPasswordConfirm(resetToken: string, newPassword: string): Observable<any> {
        this.isLoadingSubject.next(true);

        return this.apiServices.callAPI(ApiRequestTypes.Reset_Password_Confirm, '', [resetToken, newPassword]).pipe(
            map((apiResult: ApiResult) => {
                const parsed = this.parseApiResponse(apiResult);
                return parsed || {};
            }),
            catchError((error: ApiResult) => {
                console.error('Reset password confirm error:', error);
                const parsedError = this.parseApiResponse(error);
                return throwError(() => parsedError || { success: false, message: 'Password reset failed' });
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Legacy method - kept for backward compatibility
     * @deprecated Use resetPasswordConfirm instead
     */
    resetPassword(data: any): Observable<ApiResult> {
        if (data.resetToken && data.newPassword) {
            return this.resetPasswordConfirm(data.resetToken, data.newPassword);
        }
        // Fallback to old behavior if format doesn't match
        if (environment.isMockEnabled) {
            return this.mockAuthService.resetPassword(data).pipe(
                map((mockResult: ApiResultDto) => {
                    const apiResult: ApiResult = {
                        ReturnStatus: mockResult.isSuccess ? 200 : 400,
                        Body: JSON.stringify(mockResult)
                    };
                    return apiResult;
                })
            );
        }
        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient.post<ApiResultDto>(`${API_USERS_URL}/AppUser/ResetPassword`, data, {
            headers: httpHeaders,
        }).pipe(
            map((result: ApiResultDto) => {
                const apiResult: ApiResult = {
                    ReturnStatus: result.isSuccess ? 200 : 400,
                    Body: JSON.stringify(result)
                };
                return apiResult;
            })
        );
    }

    getAllRolesForThisSubscriptionPlanTenant(): Observable<ApiResult> {
        return this.dataService.getAllReguest<ApiResult>('/RoleManagement/GetAllWithSubscriptionTenantId');
    }

    getCompanyLogo(): Observable<ApiResult> {
        return this.dataService.getAllReguest<ApiResult>('/Tenant/GetTenantLogo');
    }

    addNewUser(userData: any): Observable<ApiResult> {
        return this.dataService.postReguest<ApiResult>('/AppUser/AddUserManually', userData);
    }

    /**
     * Verify Email using verification token (Operation 107)
     */
    verifyEmail(verificationToken: string): Observable<any> {
        this.isLoadingSubject.next(true);

        return this.apiServices.callAPI(ApiRequestTypes.Verify_Email, '', [verificationToken]).pipe(
            map((apiResult: ApiResult) => {
                const parsed = this.parseApiResponse(apiResult);
                return parsed || {};
            }),
            catchError((error: ApiResult) => {
                console.error('Email verification error:', error);
                const parsedError = this.parseApiResponse(error);
                return throwError(() => parsedError || { success: false, message: 'Email verification failed' });
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Legacy method - kept for backward compatibility
     * @deprecated Use verifyEmail instead
     */
    confirmEmail(email: string): Observable<boolean> {
        // For backward compatibility, treat email as token if format doesn't match
        return this.verifyEmail(email).pipe(
            map((apiResult: ApiResult) => {
                const parsed = this.parseApiResponse(apiResult);
                return parsed && parsed.success === true;
            })
        );
    }

    /**
     * Verify 2FA code (Operation 101)
     */
    verify2FA(userId: string, otp: string): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        if (environment.isMockEnabled) {
            return this.mockAuthService.verifyCode('', otp).pipe(
                map((mockResult) => {
                    const apiResult: ApiResult = {
                        ReturnStatus: mockResult.isSuccess ? 200 : 400,
                        Body: JSON.stringify(mockResult)
                    };
                    return apiResult;
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
        }

        // Real API call using ApiServices
        const payload = JSON.stringify({ userId, otp });

        return this.apiServices.callAPI(ApiRequestTypes.Verify_2FA, '', [payload]).pipe(
            map((apiResult: ApiResult) => {
                const parsed = this.parseApiResponse(apiResult);
                if (parsed && parsed.success && parsed.token && parsed.userId) {
                    // Save token and userId after successful 2FA verification
                    this.setAuthFromLocalStorage({
                        token: parsed.token,
                        userId: parsed.userId,
                        accessToken: parsed.token
                    });
                }
                return apiResult;
            }),
            catchError((error) => {
                console.error('2FA verification error:', error);
                return throwError(() => error);
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Legacy method - kept for backward compatibility
     * @deprecated Use verify2FA instead
     */
    verifyCode(email: string, code: string): Observable<ApiResult> {
        // For backward compatibility, try to get userId from localStorage
        const userData = this.localStorageService.getItem('userData');
        let userId = '';
        if (userData) {
            try {
                const parsed = typeof userData === 'string' ? JSON.parse(userData) : userData;
                userId = parsed.userId || parsed.data?.userId || '';
            } catch (e) {
                console.error('Error parsing userData:', e);
            }
        }
        return this.verify2FA(userId || email, code);
    }

    /**
     * Request password reset (Operation 105)
     */
    resetPasswordRequest(email: string): Observable<any> {
        this.isLoadingSubject.next(true);

        return this.apiServices.callAPI(ApiRequestTypes.Reset_Password_Request, '', [email]).pipe(
            map((apiResult: ApiResult) => {
                const parsed = this.parseApiResponse(apiResult);
                return parsed || {};
            }),
            catchError((error: ApiResult) => {
                console.error('Reset password request error:', error);
                const parsedError = this.parseApiResponse(error);
                return throwError(() => parsedError || { success: false, message: 'Failed to send reset link' });
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Legacy method - kept for backward compatibility
     * @deprecated Use resetPasswordRequest instead
     */
    forgetPassword(email: string): Observable<ApiResult> {
        return this.resetPasswordRequest(email);
    }

    /**
     * Change password (Operation 104)
     */
    changePassword(accessToken: string, oldPassword: string, newPassword: string): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        if (environment.isMockEnabled) {
            return new Observable<ApiResult>(observer => {
                setTimeout(() => {
                    const mockResult = { isSuccess: true, message: 'Password changed successfully' };
                    const apiResult: ApiResult = {
                        ReturnStatus: 200,
                        Body: JSON.stringify(mockResult)
                    };
                    observer.next(apiResult);
                    observer.complete();
                }, 500);
            }).pipe(finalize(() => this.isLoadingSubject.next(false)));
        }

        // Real API call using ApiServices
        const payload = JSON.stringify({ oldPassword, newPassword });

        return this.apiServices.callAPI(ApiRequestTypes.Change_Password, accessToken, [payload]).pipe(
            catchError((error) => {
                console.error('Change password error:', error);
                return throwError(() => error);
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Logout (Operation 102)
     */
    logout(accessToken?: string): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        // Get token from localStorage if not provided
        if (!accessToken) {
            const userData = this.localStorageService.getItem('userData');
            if (userData) {
                try {
                    const parsed = typeof userData === 'string' ? JSON.parse(userData) : userData;
                    accessToken = parsed.accessToken || parsed.token || '';
                } catch (e) {
                    console.error('Error parsing userData for logout:', e);
                }
            }
        }

        if (environment.isMockEnabled) {
            return new Observable<ApiResult>(observer => {
                setTimeout(() => {
                    const mockResult = { success: true, message: 'Logout successful' };
                    const apiResult: ApiResult = {
                        ReturnStatus: 200,
                        Body: JSON.stringify(mockResult)
                    };
                    observer.next(apiResult);
                    observer.complete();
                }, 500);
            }).pipe(
                tap(() => {
                    // Clear storage on logout
                    localStorage.removeItem('userData');
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
        }

        // Real API call using ApiServices
        // Logout doesn't need payload, just access token
        return this.apiServices.callAPI(ApiRequestTypes.Logout, accessToken || '', []).pipe(
            tap(() => {
                // Clear storage on logout
                localStorage.removeItem('userData');
            }),
            catchError((error) => {
                console.error('Logout error:', error);
                // Clear storage even on error
                localStorage.removeItem('userData');
                return throwError(() => error);
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Save authentication data to localStorage
     */
    setAuthFromLocalStorage(data: any): boolean {
        if (data) {
            try {
                // Ensure we save token, userId, and accessToken properly
                const authData = {
                    token: data.token || data.accessToken,
                    accessToken: data.accessToken || data.token,
                    userId: data.userId,
                    email: data.email,
                    ...data // Include any other data
                };
                localStorage.setItem('userData', JSON.stringify(authData));
                return true;
            } catch (error) {
                console.error('Error saving auth data:', error);
                return false;
            }
        }
        return false;
    }

    getAllLanguages(): Observable<ApiResult> {
        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/Language/GetAllLanguages`, { headers: httpHeaders });
    }

    getFreeSubscriptionPlan(): Observable<ApiResult> {
        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/SubscriptionPlan/GetFreeSubscriptionPlan`, {
            headers: httpHeaders,
        });
    }

    getAllsusbcriptions(): Observable<ApiResult> {
        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/SubscriptionPlan/GetAllSubscriptionPlans`);
    }

    getAllSubscriptionPlansForQuotes(): Observable<ApiResult> {
        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/SubscriptionPlan/getAllSubscriptionPlansForQuotes`, {
            headers: httpHeaders,
        });
    }

    getAllTimeZones(): Observable<ApiResult> {
        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/Language/GetAllTimeZones`, {
            headers: httpHeaders,
        });
    }

    createTenantSubscriptionInvoicePaymentRequest(request: FormData): Observable<ApiResult> {
        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient
            .post<ApiResult>(
                `${API_USERS_URL}/TenantSubscriptionInvoicePaymentRequest/CreateTenantSubscriptionInvoicePaymentRequest`,
                request,
                { headers: httpHeaders }
            )
            .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }

    getRemainingAmountOfSubscriptionTenantInvoiceById(id: string): Observable<ApiResult> {
        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient
            .get<ApiResult>(
                `${API_USERS_URL}/SubscriptionTenantInvoices/GetRemainingAmountOfSubscriptionTenantInvoiceById/${id}`,
                { headers: httpHeaders }
            )
            .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }

    forceLogout(userData: IForceLogoutModel): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        // Use mock service if enabled, otherwise use real API
        if (environment.isMockEnabled) {
            console.log('🔐 Using Mock Force Logout');
            return this.mockAuthService.forceLogout(userData).pipe(
                map((mockResult: ApiResultDto) => {
                    const apiResult: ApiResult = {
                        ReturnStatus: mockResult.isSuccess ? 200 : 400,
                        Body: JSON.stringify(mockResult)
                    };
                    return apiResult;
                }),
                tap((apiResult) => {
                    const parsed = this.parseApiResponse(apiResult);
                    if (parsed && parsed.isSuccess && parsed.data) {
                        this.setAuthFromLocalStorage(parsed.data);
                    }
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
        }

        // Real API call
        console.log('🔐 Using Real API Force Logout');
        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });

        return this.httpClient.post<ApiResultDto>(`${API_USERS_URL}/AppUser/ForceLogout`, userData, { headers: httpHeaders })
            .pipe(
                map((result: ApiResultDto) => {
                    const apiResult: ApiResult = {
                        ReturnStatus: result.isSuccess ? 200 : 400,
                        Body: JSON.stringify(result)
                    };
                    return apiResult;
                }),
                tap((apiResult) => {
                    const parsed = this.parseApiResponse(apiResult);
                    if (parsed && parsed.isSuccess && parsed.data) {
                        this.setAuthFromLocalStorage(parsed.data);
                    }
                }),
                catchError((error) => {
                    console.error('Force logout error:', error);
                    return throwError(() => error);
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
    }
}