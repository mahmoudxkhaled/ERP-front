import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiResult } from 'src/app/core/Dtos/ApiResult';
import { DataService } from 'src/app/core/Services/data-service.service';
import { ILanguageModel } from '../models/ILanguageModel';
import { IPaginationModel } from 'src/app/core/Dtos/IPaginationModel';

@Injectable({
    providedIn: 'root',
})
export class LanguageService {
    constructor(private dataService: DataService) { }

    getAllLanguages(): Observable<ApiResult> {
        return this.dataService.getAllReguest<ApiResult>('/Language/GetAllLanguages');
    }
    getAllLanguagesPagination(paginationObject: IPaginationModel): Observable<ApiResult> {
        return this.dataService.postReguest<ApiResult>(`/Language/GetAllLanguagesPagination/`, paginationObject);
    }

    getLanguageById(id: string): Observable<ILanguageModel> {
        return this.dataService.getByReguest<ApiResult>('/Language/GetLanguageById', id).pipe(
            map((result) => {
                return result.data as ILanguageModel;
            })
        );
    }

    addLanguage(data: ILanguageModel): Observable<boolean> {
        return this.dataService.postReguest<ApiResult>('/Language/AddLanguage', data).pipe(
            map((result) => {
                return result.isSuccess;
            })
        );
    }

    editLanguage(data: ILanguageModel): Observable<boolean> {
        return this.dataService.postReguest<ApiResult>('/Language/EditLanguage', data).pipe(
            map((result) => {
                return result.isSuccess;
            })
        );
    }

    activateLanguage(id: string): Observable<boolean> {
        return this.dataService.postReguest<ApiResult>(`/Language/ActivateLanguage/${id}`, null).pipe(
            map((result) => {
                return result.isSuccess;
            })
        );
    }

    deActivateLanguage(id: string): Observable<boolean> {
        return this.dataService.postReguest<ApiResult>(`/Language/DeactivateLanguage/${id}`, null).pipe(
            map((result) => {
                return result.isSuccess;
            })
        );
    }

    deleteLanguage(id: string): Observable<ApiResult> {
        return this.dataService.postReguest<ApiResult>(`/Language/DeleteLanguage/${id}`, null);
    }

    getTenantDefaultLanguage(): Observable<ILanguageModel> {
        return this.dataService
            .getAllReguest<ApiResult>('/Language/GetDefaultTenantLanguage')

            .pipe(
                map((res) => {
                    console.log(res);
                    return res.data as ILanguageModel;
                })
            );
    }
}
