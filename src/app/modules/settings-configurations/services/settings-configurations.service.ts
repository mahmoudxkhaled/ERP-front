import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
    FunctionsListResponse,
    ModulesListResponse,
    FunctionBackend,
    ModuleBackend,
    Function,
    Module
} from '../models/settings-configurations.model';

@Injectable({
    providedIn: 'root',
})
export class SettingsConfigurationsService {
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
     * Retrieve the list of all available functions
     * API Code: 705
     * @returns Observable containing FunctionsListResponse
     */
    getFunctionsList(): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(705, this.getAccessToken(), []).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Retrieve the list of all available modules
     * API Code: 715
     * @returns Observable containing ModulesListResponse
     */
    getModulesList(): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(715, this.getAccessToken(), []).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Parses the backend FunctionsListResponse into an array of Function objects
     * @param response - The API response containing functions list
     * @param isRegional - Whether to use regional names
     * @returns Array of normalized Function objects
     */
    parseFunctionsList(response: any, isRegional: boolean = false): Function[] {
        if (!response?.success || !response?.message) {
            return [];
        }

        // API returns message.Functions_List OR message directly as the object
        // Structure: { "1": { Function_ID: 1, ... }, "2": { Function_ID: 2, ... } }
        const functionsData = response.message.Functions_List || response.message;

        if (!functionsData || typeof functionsData !== 'object') {
            return [];
        }

        return (Object.values(functionsData) as any[])
            .filter((item: any) => item && item.Function_ID !== undefined)
            .map((item: any) => ({
                id: item.Function_ID,
                code: item.Code || '',
                name: isRegional ? (item.Name_Regional || item.Name || '') : (item.Name || ''),
                nameRegional: item.Name_Regional || '',
                defaultOrder: item.Default_Order,
                url: item.URL,
                isActive: item.Is_Active ?? true
            }));
    }

    /**
     * Parses the backend ModulesListResponse into an array of Module objects
     * @param response - The API response containing modules list
     * @param isRegional - Whether to use regional names
     * @returns Array of normalized Module objects
     */
    parseModulesList(response: any, isRegional: boolean = false): Module[] {
        if (!response?.success || !response?.message) {
            return [];
        }

        // API returns message.Modules_List OR message directly as the object
        // Structure: { "1": { Module_ID: 1, ... }, "2": { Module_ID: 2, ... } }
        const modulesData = response.message.Modules_List || response.message;

        if (!modulesData || typeof modulesData !== 'object') {
            return [];
        }

        return (Object.values(modulesData) as any[])
            .filter((item: any) => item && item.Module_ID !== undefined)
            .map((item: any) => ({
                id: item.Module_ID,
                functionId: item.Function_ID,
                code: item.Code || '',
                name: isRegional ? (item.Name_Regional || item.Name || '') : (item.Name || ''),
                nameRegional: item.Name_Regional || '',
                defaultOrder: item.Default_Order,
                url: item.URL,
                isActive: item.Is_Active ?? true
            }));
    }
}
