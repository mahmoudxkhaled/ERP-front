import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, finalize, map, tap, throwError } from 'rxjs';
import { ApiRequestTypes } from 'src/app/core/API_Interface/ApiRequestTypes';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';
import { ApiServices } from 'src/app/core/API_Interface/ApiServices';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { environment } from 'src/environments/environment';

const API_USERS_URL = environment.apiUrl;

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);
    constructor(
        private apiServices: ApiServices,
        private localStorageService: LocalStorageService,
        private router: Router
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    login(email: string, password: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Login, '', [email, password]).pipe(
            map((apiResult: ApiResult) => {
                console.log('apiResult from login', apiResult);
                const parsed = this.parseApiResponse(apiResult);
                console.log('parsed from login', parsed);
                const result: any = this.processApiResponse(parsed);
                console.log('result from login', result);
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

    set2FA(accessToken: string, status: boolean): Observable<any> {
        this.isLoadingSubject.next(true);

        return this.apiServices.callAPI(ApiRequestTypes.Set_2FA, accessToken, [status.toString()]).pipe(
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

    verify2FA(email: string, otp: string): Observable<any> {
        this.isLoadingSubject.next(true);

        return this.apiServices.callAPI(ApiRequestTypes.Verify_2FA, '', [email, otp]).pipe(
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


    verifyCode(email: string, code: string): Observable<any> {
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


    forgetPassword(email: string): Observable<ApiResult> {
        return this.resetPasswordRequest(email);
    }


    changePassword(accessToken: string, oldPassword: string, newPassword: string): Observable<any> {
        this.isLoadingSubject.next(true);

        // Real API call using ApiServices

        return this.apiServices.callAPI(ApiRequestTypes.Change_Password, accessToken, [oldPassword, newPassword]).pipe(
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


    logout(accessToken?: string): Observable<any> {
        this.isLoadingSubject.next(true);

        if (!accessToken) {
            // this.localStorageService.removeItem('userData');
            // this.router.navigate(['/auth']);
            const userData = this.localStorageService.getItem('userData');
            console.log('userData from logout', userData);
            if (userData) {
                try {
                    const parsed = typeof userData === 'string' ? JSON.parse(userData) : userData;
                    console.log('parsed from logout', parsed);
                    accessToken = parsed.accessToken || parsed.token || '';
                    console.log('accessToken from logout', accessToken);
                } catch (e) {
                    console.error('Error parsing userData for logout:', e);
                }
            }
        }


        return this.apiServices.callAPI(ApiRequestTypes.Logout, accessToken?.toString() || '', []).pipe(
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
                    this.localStorageService.removeItem('userData');
                    return throwError(() => error);
                }
                const parsed = this.parseApiResponse(error);
                // Clear storage even on error
                this.localStorageService.removeItem('userData');
                return throwError(() => parsed || { success: false, message: 'Unexpected error occurred.' });
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }


    setAuthFromLocalStorage(data: any): boolean {
        if (data) {
            try {
                const authData = {
                    accessToken: data.accessToken,
                    userId: data.userId,
                    ...data
                };
                this.localStorageService.setItem('userData', authData);

                return true;
            } catch (error) {
                console.error('Error saving auth data:', error);
                return false;
            }
        }
        return false;
    }


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


    private parseApiResponse(apiResult: ApiResult): any {
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


    private parseApiBody(body: string): any {
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

}