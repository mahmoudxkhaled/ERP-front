import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, finalize, of, switchMap, tap } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { NotificationRefreshService } from 'src/app/core/services/notification-refresh.service';
import { IAccountStatusResponse } from 'src/app/core/models/account-status.model';
import { SettingsEngineService } from '../../summary/services/settings-engine.service';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);
    constructor(
        private apiServices: ApiService,
        private localStorageService: LocalStorageService,
        private router: Router,
        private notificationRefreshService: NotificationRefreshService,
        private injector: Injector
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    private getSettingsEngine(): SettingsEngineService {
        return this.injector.get(SettingsEngineService);
    }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }


    login(email: string, password: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(100, '', [email, password]).pipe(
            tap((response: any) => {
                console.log('response', response);
                if (response?.success) {
                    this.setAuthFromResponseToLocalStorage(response);
                }
            }),
            switchMap((response: any) => {
                if (response?.success) {
                    return this.getLoginDataPackage(email).pipe(
                        tap(() => {
                            this.getSettingsEngine().loadAllLayers(true).subscribe({
                                next: () => { },
                                error: () => { },
                            });
                            this.notificationRefreshService.requestRefresh();
                            this.router.navigate(['/']);
                        })
                    );
                }
                return of(response);
            }),
            finalize(() => {
                this.isLoadingSubject.next(false);
            })
        );
    }

    verify2FA(email: string, otp: string): Observable<any> {
        this.isLoadingSubject.next(true);
        console.log('verify2FA email', email);
        console.log('verify2FA otp', otp);
        return this.apiServices.callAPI(101, '', [email.toString(), otp.toString()]).pipe(
            tap((response: any) => {
                console.log('verify2FA response service', response);
                if (response?.success) {
                    this.setAuthFromResponseToLocalStorage(response);
                }
            }),
            switchMap((response: any) => {
                if (response?.success) {
                    return this.getLoginDataPackage(email).pipe(
                        tap(() => {
                            this.getSettingsEngine().loadAllLayers(true).subscribe({
                                next: () => { },
                                error: () => { },
                            });
                            this.notificationRefreshService.requestRefresh();
                            this.router.navigate(['/']);
                        })
                    );
                }
                return of(response);
            }),
            finalize(() => {
                this.isLoadingSubject.next(false);
            })
        );
    }

    logout(): Observable<any> {
        this.isLoadingSubject.next(true);

        return this.apiServices.callAPI(102, this.getAccessToken(), []).pipe(
            tap(() => {
                this.localStorageService.clearLoginDataPackage();
            }),
            finalize(() => {
                window.location.reload();
                this.isLoadingSubject.next(false);
            })
        );
    }

    set2FA(status: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(103, this.getAccessToken(), [status.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    changePassword(oldPassword: string, newPassword: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(104, this.getAccessToken(), [oldPassword, newPassword]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    resetPasswordRequest(email: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(105, '', [email]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    resetPasswordConfirm(resetToken: string, newPassword: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(106, '', [resetToken, newPassword]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    verifyEmail(verificationToken: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(107, '', [verificationToken]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    getLoginDataPackage(email: string) {
        return this.apiServices.callAPI(110, this.getAccessToken(), [email]).pipe(
            tap((response: any) => {
                const accountData: IAccountStatusResponse = response.message;
                console.log('accountData', accountData);
                this.localStorageService.setLoginDataPackage(accountData);
            })
        );
    }

    private setAuthFromResponseToLocalStorage(response: any) {
        const payload = response.message;
        const token = payload.Access_Token;
        this.localStorageService.setToken(token);
    }
}
