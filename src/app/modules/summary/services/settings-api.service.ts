import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class SettingsApiService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiServices: ApiService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }

    /**
     * Set Entity Settings
     * API Code: 782
     * Input: Entity_ID (int), Settings_List (Dictionary<string, string>)
     * Error codes: ERP11426 (Invalid Entity ID), ERP11420 (Invalid Setting key), ERP11421 (Invalid Setting value)
     */
    setEntitySettings(entityId: number, settingsList: Record<string, string>): Observable<any> {
        this.isLoadingSubject.next(true);
        // Convert Record to JSON string for API
        const settingsJson = JSON.stringify(settingsList);
        const params = [entityId.toString(), settingsJson];
        return this.apiServices.callAPI(782, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get Entity Settings
     * API Code: 783
     * Input: Entity_ID (int)
     * Output: Dictionary<string, string> Settings_List
     * Error code: ERP11426 (Invalid Entity ID)
     */
    getEntitySettings(entityId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(783, this.getAccessToken(), [entityId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Set Default Entity Settings
     * API Code: 780
     * Input: Settings_List (Dictionary<string, string>)
     * Error codes: ERP11420 (Invalid Setting key), ERP11421 (Invalid Setting value)
     */
    setDefaultEntitySettings(settingsList: Record<string, string>): Observable<any> {
        this.isLoadingSubject.next(true);
        const settingsJson = JSON.stringify(settingsList);
        return this.apiServices.callAPI(780, this.getAccessToken(), [settingsJson]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get Default Entity Settings
     * API Code: 781
     * Input: None
     * Output: Dictionary<string, string> Settings_List
     */
    getDefaultEntitySettings(): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(781, this.getAccessToken(), []).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Remove Entity Setting
     * API Code: 784
     * Input: Entity_ID (int), Setting_Name (string)
     * Error codes: ERP11426 (Invalid Entity ID), ERP11422 (Invalid Setting title -> Not found)
     */
    removeEntitySetting(entityId: number, settingName: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [entityId.toString(), settingName];
        return this.apiServices.callAPI(784, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Set ERP System Settings
     * API Code: 730
     * Input: Settings_List (Dictionary<string, string>)
     * Error codes: ERP11420 (Invalid Setting key), ERP11421 (Invalid Setting value)
     */
    setERPSystemSettings(settingsList: Record<string, string>): Observable<any> {
        this.isLoadingSubject.next(true);
        const settingsJson = JSON.stringify(settingsList);
        return this.apiServices.callAPI(730, this.getAccessToken(), [settingsJson]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get ERP System Settings
     * API Code: 731
     * Input: None
     * Output: Dictionary<string, string> Settings_List
     */
    getERPSystemSettings(): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(731, this.getAccessToken(), []).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Remove ERP System Setting
     * API Code: 732
     * Input: Setting_Name (string)
     * Error code: ERP11422 (Invalid Setting title -> Not found)
     */
    removeERPSystemSetting(settingName: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(732, this.getAccessToken(), [settingName]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }
}

