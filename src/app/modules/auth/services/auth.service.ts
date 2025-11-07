import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, tap, throwError } from 'rxjs';
import { ApiRequestTypes } from 'src/app/core/API_Interface/ApiRequestTypes';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';
import { ApiServices } from 'src/app/core/API_Interface/ApiServices';
import { ApiResult as ApiResultDto } from 'src/app/core/Dtos/ApiResult';
import { DataService } from 'src/app/core/Services/data-service.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { environment } from 'src/environments/environment';
import { IForceLogoutModel } from '../models/IForceLogoutModel';
import { TenantModel } from '../models/TenantModel';

const API_USERS_URL = environment.apiUrl;

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);
    constructor(
        private httpClient: HttpClient,
        private dataService: DataService,
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
     * (Now backend returns strict boolean)
     */




    /**
     * Centralized processing of parsed API responses
     */
    private processApiResponse(parsed: any): any {
        if (!parsed) {
            throw { success: false, message: 'Empty API response' };
        }
        if (parsed?.success === true) {
            return parsed;
        }
        // Throw the parsed backend payload as-is (component will interpret)
        throw parsed;
    }

    /**
     * Extract best error message from any backend/front error shape
     */

    login(email: string, password: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Login, '', [email, password]).pipe(
            map((apiResult: ApiResult) => {
                console.log('apiResult from login', apiResult);
                const parsed = this.parseApiResponse(apiResult);
                console.log('parsed from login', parsed);
                const result: any = this.processApiResponse(parsed);
                console.log('result from login', result);
                // Save token and userId if login successful
                if (result?.token && (result?.userId || result?.User_ID)) {
                    const userId = result.userId ?? result.User_ID;
                    this.setAuthFromLocalStorage({ token: result.token, userId, accessToken: result.token });
                }
                return result;
            }),
            catchError((error: any) => {
                if (error && typeof error === 'object' && 'success' in error) {
                    return throwError(() => error);
                }
                const parsed = this.parseApiResponse(error);
                return throwError(() => parsed || { success: false, message: 'Unexpected error occurred.' });
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }


    register(tenantModel: TenantModel): Observable<ApiResult> {
        this.isLoadingSubject.next(true);


        return this.httpClient
            .post<ApiResultDto>(`${API_USERS_URL}/Tenant/RegisterTenant`, tenantModel)
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
                console.log('apiResult from resetPasswordConfirm', apiResult);
                const parsed = this.parseApiResponse(apiResult);
                return this.processApiResponse(parsed);
            }),
            catchError((error: any) => {
                if (error && typeof error === 'object' && 'success' in error) {
                    return throwError(() => error);
                }
                const parsed = this.parseApiResponse(error);
                return throwError(() => parsed || { success: false, message: 'Unexpected error occurred.' });
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
        // Fallback to old behavior if format doesn't match (real API only)

        return this.httpClient.post<ApiResultDto>(`${API_USERS_URL}/AppUser/ResetPassword`, data, {
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
                return this.processApiResponse(parsed);
            }),
            catchError((error: any) => {
                if (error && typeof error === 'object' && 'success' in error) {
                    return throwError(() => error);
                }
                const parsed = this.parseApiResponse(error);
                return throwError(() => parsed || { success: false, message: 'Unexpected error occurred.' });
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
            map((response: any) => response?.success === true)
        );
    }

    /**
     * Verify 2FA code (Operation 101)
     */
    verify2FA(userId: string, otp: string): Observable<any> {
        this.isLoadingSubject.next(true);

        // Real API call using ApiServices
        const payload = JSON.stringify({ userId, otp });

        return this.apiServices.callAPI(ApiRequestTypes.Verify_2FA, '', [payload]).pipe(
            map((apiResult: ApiResult) => {
                const parsed = this.parseApiResponse(apiResult);
                const result: any = this.processApiResponse(parsed);
                if (result?.token && result?.userId) {
                    this.setAuthFromLocalStorage({ token: result.token, userId: result.userId, accessToken: result.token });
                }
                return result;
            }),
            catchError((error: any) => {
                if (error && typeof error === 'object' && 'success' in error) {
                    return throwError(() => error);
                }
                const parsed = this.parseApiResponse(error);
                return throwError(() => parsed || { success: false, message: 'Unexpected error occurred.' });
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Legacy method - kept for backward compatibility
     * @deprecated Use verify2FA instead
     */
    verifyCode(email: string, code: string): Observable<any> {
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
                return this.processApiResponse(parsed);
            }),
            catchError((error: any) => {
                if (error && typeof error === 'object' && 'success' in error) {
                    return throwError(() => error);
                }
                const parsed = this.parseApiResponse(error);
                return throwError(() => parsed || { success: false, message: 'Unexpected error occurred.' });
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
    changePassword(accessToken: string, oldPassword: string, newPassword: string): Observable<any> {
        this.isLoadingSubject.next(true);

        // Real API call using ApiServices
        const payload = JSON.stringify({ oldPassword, newPassword });

        return this.apiServices.callAPI(ApiRequestTypes.Change_Password, accessToken, [payload]).pipe(
            map((apiResult: ApiResult) => {
                const parsed = this.parseApiResponse(apiResult);
                return this.processApiResponse(parsed);
            }),
            catchError((error: any) => {
                if (error && typeof error === 'object' && 'success' in error) {
                    return throwError(() => error);
                }
                return throwError(() => error || { success: false, message: 'Unexpected error occurred.' });
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Logout (Operation 102)
     */
    logout(accessToken?: string): Observable<any> {
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

        // Real API call using ApiServices
        // Logout doesn't need payload, just access token
        return this.apiServices.callAPI(ApiRequestTypes.Logout, accessToken || '', []).pipe(
            map((apiResult: ApiResult) => {
                const parsed = this.parseApiResponse(apiResult);
                return this.processApiResponse(parsed);
            }),
            tap(() => {
                // Clear storage on logout
                localStorage.removeItem('userData');
            }),
            catchError((error: any) => {
                if (error && typeof error === 'object' && 'success' in error) {
                    // Clear storage even on error
                    localStorage.removeItem('userData');
                    return throwError(() => error);
                }
                const parsed = this.parseApiResponse(error);
                // Clear storage even on error
                localStorage.removeItem('userData');
                return throwError(() => parsed || { success: false, message: 'Unexpected error occurred.' });
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

        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/Language/GetAllLanguages`);
    }

    getFreeSubscriptionPlan(): Observable<ApiResult> {

        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/SubscriptionPlan/GetFreeSubscriptionPlan`);
    }

    getAllsusbcriptions(): Observable<ApiResult> {
        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/SubscriptionPlan/GetAllSubscriptionPlans`);
    }

    getAllSubscriptionPlansForQuotes(): Observable<ApiResult> {

        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/SubscriptionPlan/getAllSubscriptionPlansForQuotes`, {
        });
    }

    getAllTimeZones(): Observable<ApiResult> {

        return this.httpClient.get<ApiResult>(`${API_USERS_URL}/Language/GetAllTimeZones`, {
        });
    }

    createTenantSubscriptionInvoicePaymentRequest(request: FormData): Observable<ApiResult> {

        return this.httpClient
            .post<ApiResult>(
                `${API_USERS_URL}/TenantSubscriptionInvoicePaymentRequest/CreateTenantSubscriptionInvoicePaymentRequest`,
                request,

            )
            .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }

    getRemainingAmountOfSubscriptionTenantInvoiceById(id: string): Observable<ApiResult> {
        return this.httpClient
            .get<ApiResult>(
                `${API_USERS_URL}/SubscriptionTenantInvoices/GetRemainingAmountOfSubscriptionTenantInvoiceById/${id}`
            )
            .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }

    forceLogout(userData: IForceLogoutModel): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        // Real API call
        return this.httpClient.post<ApiResultDto>(`${API_USERS_URL}/AppUser/ForceLogout`, userData)
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