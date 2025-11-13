import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, finalize, map, throwError } from 'rxjs';
import { ApiRequestTypes } from 'src/app/core/API_Interface/ApiRequestTypes';
import { ApiResult } from 'src/app/core/API_Interface/ApiResult';
import { ApiServices } from 'src/app/core/API_Interface/ApiServices';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class EntitiesService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiServices: ApiServices,
        private localStorageService: LocalStorageService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    /**
     * Get access token from localStorage
     */
    private getAccessToken(): string {
        const userData = this.localStorageService.getItem('userData');
        if (userData) {
            return userData.accessToken || userData.token || '';
        }
        return '';
    }

    /**
     * Helper method to parse ApiResult.Body (JSON string) to object
     */
    private parseApiResponse(apiResult: ApiResult | any): any {
        try {
            // If apiResult is already an object (not ApiResult), return it
            if (apiResult && typeof apiResult === 'object' && !apiResult.Body && !apiResult.ReturnStatus) {
                return apiResult;
            }

            // If it's an ApiResult, parse the Body
            if (apiResult?.Body) {
                const bodyStr = apiResult.Body;
                // Check if Body is already a JSON string or needs parsing
                if (typeof bodyStr === 'string') {
                    try {
                        // Try to parse directly
                        return JSON.parse(bodyStr);
                    } catch (parseError) {
                        // If parsing fails, try to extract JSON from error message
                        // Look for JSON object in the string (handles cases like "Message format unrecognized ({...})")
                        const jsonMatch = bodyStr.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            try {
                                return JSON.parse(jsonMatch[0]);
                            } catch (e) {
                                // If extracted JSON also fails, return error object
                                return { success: false, message: bodyStr };
                            }
                        }
                        // If no JSON found, return error object
                        return { success: false, message: bodyStr };
                    }
                }
                // If Body is already an object, return it
                return bodyStr;
            }
            return null;
        } catch (error) {
            console.error('Error parsing API response:', error);
            return null;
        }
    }

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
     * List all entities
     */
    list(): Observable<any> {
        this.isLoadingSubject.next(true);
        const token = this.getAccessToken();
        console.log('token from list', token);
        return this.apiServices.callAPI(ApiRequestTypes.List_Entities, token, []).pipe(
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
     * Create a new entity
     */
    create(entity: any): Observable<any> {
        this.isLoadingSubject.next(true);
        const token = this.getAccessToken();
        const payload = JSON.stringify(entity);
        return this.apiServices.callAPI(ApiRequestTypes.Create_Entity, token, [payload]).pipe(
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
     * Update an existing entity
     */
    update(entity: any): Observable<any> {
        this.isLoadingSubject.next(true);
        const token = this.getAccessToken();
        const payload = JSON.stringify(entity);
        return this.apiServices.callAPI(ApiRequestTypes.Update_Entity, token, [payload]).pipe(
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
     * Get entity by ID
     */
    getById(id: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const token = this.getAccessToken();
        return this.apiServices.callAPI(ApiRequestTypes.Get_Entity, token, [id]).pipe(
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
     * Toggle entity active status
     */
    toggleActive(id: string, active: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        const token = this.getAccessToken();
        const payload = JSON.stringify({ id, active });
        const requestCode = active ? ApiRequestTypes.Activate_Entity : ApiRequestTypes.Deactivate_Entity;
        return this.apiServices.callAPI(requestCode, token, [payload]).pipe(
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
     * Assign admin to entity
     */
    assignAdmin(entityId: string, userId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const token = this.getAccessToken();
        const payload = JSON.stringify({ entityId, userId });
        return this.apiServices.callAPI(ApiRequestTypes.Assign_Entity_Admin, token, [payload]).pipe(
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
}

