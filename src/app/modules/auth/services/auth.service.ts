import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, tap, throwError } from 'rxjs';
import { ApiResult } from 'src/app/core/Dtos/ApiResult';
import { DataService } from 'src/app/core/Services/data-service.service';
import { MockAuthService } from 'src/app/core/Services/mock-auth.service';
import { environment } from 'src/environments/environment';
import { TenantModel } from '../models/TenantModel';
import { ISendEmailRequest } from '../models/ISendEmailRequest';
import { IForceLogoutModel } from '../models/IForceLogoutModel';

const API_USERS_URL = environment.apiUrl;

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);
    constructor(
        private httpClient: HttpClient,
        private dataService: DataService,
        private mockAuthService: MockAuthService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    login(credentials: any): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        // Use mock service if enabled, otherwise use real API
        if (environment.useMockData) {
            console.log('🔐 Using Mock Authentication Service');
            return this.mockAuthService.login(credentials).pipe(
                tap((res) => {
                    if (res.isSuccess) {
                        this.setAuthFromLocalStorage(res.data);
                    }
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
        }

        // Real API call
        console.log('🔐 Using Real API Authentication');
        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });

        return this.httpClient
            .post<ApiResult>(`${API_USERS_URL}/AppUser/Login`, credentials, { headers: httpHeaders })
            .pipe(
                tap((res) => {
                    this.setAuthFromLocalStorage(res.data);
                }),
                catchError((error) => {
                    console.error('Login error:', error);
                    return throwError(() => error);
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
    }


    register(tenantModel: TenantModel): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        if (environment.useMockData) {
            return this.mockAuthService.register(tenantModel).pipe(
                finalize(() => this.isLoadingSubject.next(false))
            );
        }

        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient
            .post<ApiResult>(`${API_USERS_URL}/Tenant/RegisterTenant`, tenantModel, { headers: httpHeaders })
            .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }

    resetPassword(data: any): Observable<ApiResult> {
        if (environment.useMockData) {
            return this.mockAuthService.resetPassword(data);
        }

        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient.post<ApiResult>(`${API_USERS_URL}/AppUser/ResetPassword`, data, {
            headers: httpHeaders,
        });
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

    confirmEmail(email: string): Observable<boolean> {
        this.isLoadingSubject.next(true);

        if (environment.useMockData) {
            return this.mockAuthService.confirmEmail(email).pipe(
                finalize(() => this.isLoadingSubject.next(false))
            );
        }

        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient
            .post<ApiResult>(`${API_USERS_URL}/AppUser/ConfirmEmail/${email}`, null, { headers: httpHeaders })
            .pipe(
                map((res) => {
                    return res.isSuccess;
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
    }

    verifyCode(email: string, code: string): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        if (environment.useMockData) {
            return this.mockAuthService.verifyCode(email, code).pipe(
                finalize(() => this.isLoadingSubject.next(false))
            );
        }

        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        const formData = new FormData();
        formData.append('email', email);
        formData.append('code', code);
        return this.httpClient
            .post<ApiResult>(`${API_USERS_URL}/AppUser/VerifyCode`, formData, { headers: httpHeaders })
            .pipe(
                finalize(() => this.isLoadingSubject.next(false))
            );
    }

    forgetPassword(email: string): Observable<ApiResult> {
        this.isLoadingSubject.next(true);

        if (environment.useMockData) {
            return this.mockAuthService.forgetPassword(email).pipe(
                finalize(() => this.isLoadingSubject.next(false))
            );
        }

        const httpHeaders = new HttpHeaders({
            tenant: environment.defaultTenantId,
        });
        return this.httpClient
            .post<ApiResult>(`${API_USERS_URL}/AppUser/ForgetPassword/${email}`, null, { headers: httpHeaders })
            .pipe(finalize(() => this.isLoadingSubject.next(false)));
    }

    setAuthFromLocalStorage(data: ApiResult): boolean {
        if (data) {
            localStorage.setItem('userData', JSON.stringify(data));
            return true;
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
        if (environment.useMockData) {
            console.log('🔐 Using Mock Force Logout');
            return this.mockAuthService.forceLogout(userData).pipe(
                tap((res) => {
                    if (res.isSuccess) {
                        this.setAuthFromLocalStorage(res.data);
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

        return this.httpClient.post<ApiResult>(`${API_USERS_URL}/AppUser/ForceLogout`, userData, { headers: httpHeaders })
            .pipe(
                tap((res) => {
                    this.setAuthFromLocalStorage(res.data);
                }),
                catchError((error) => {
                    console.error('Force logout error:', error);
                    return throwError(() => error);
                }),
                finalize(() => this.isLoadingSubject.next(false))
            );
    }
}