import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';
import { ApiRequestTypes } from 'src/app/core/API_Interface/ApiRequestTypes';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';
import { ApiServices } from 'src/app/core/API_Interface/ApiServices';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);
    constructor(
        private apiServices: ApiServices,
        private localStorageService: LocalStorageService,
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    login(email: string, password: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Login, '', [email, password]).pipe(
            tap((response: any) => {
                this.setAuthFromResponseToLocalStorage(response);
            }),
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    verify2FA(email: string, otp: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Verify_2FA, '', [email, otp]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    logout(): Observable<any> {
        this.isLoadingSubject.next(true);

        const accessToken = this.localStorageService.getAccessToken();
        return this.apiServices.callAPI(ApiRequestTypes.Logout, accessToken, []).pipe(
            tap(() => {
                this.localStorageService.removeItem('userData');
            }),
            finalize(() => {
                this.isLoadingSubject.next(false);
                window.location.reload();
            })
        );
    }

    set2FA(accessToken: string, status: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Set_2FA, accessToken, [status.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    changePassword(accessToken: string, oldPassword: string, newPassword: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Change_Password, accessToken, [oldPassword, newPassword]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    resetPasswordRequest(email: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Reset_Password_Request, '', [email]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    resetPasswordConfirm(resetToken: string, newPassword: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Reset_Password_Confirm, '', [resetToken, newPassword]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    verifyEmail(verificationToken: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(ApiRequestTypes.Verify_Email, '', [verificationToken]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    private setAuthFromResponseToLocalStorage(response: any) {
        const payload = response.message;
        const token = payload.Access_Token;
        const userId = payload.User_ID;
        const authData = {
            token,
            userId,
        };
        this.localStorageService.setItem('userData', authData);
    }
}