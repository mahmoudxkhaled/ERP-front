import { Injectable } from '@angular/core';
import { DataService } from './data-service.service';
import { BehaviorSubject, Observable, finalize, map } from 'rxjs';
import { ApiResult } from '../Dtos/ApiResult';

@Injectable({
    providedIn: 'root',
})
export class IawareSharedService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(private dataService: DataService) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    logout(): Observable<ApiResult> {
        this.isLoadingSubject.next(true); // Start loading state

        // Static/mock implementation - no API call
        const mockResponse: ApiResult = {
            isSuccess: true,
            message: 'Logout successful (Static Mode)',
            data: null,
            code: 200,
            totalRecords: 0,
            errorList: null
        };

        // Simulate API delay with setTimeout
        return new Observable<ApiResult>(observer => {
            setTimeout(() => {
                observer.next(mockResponse);
                observer.complete();
                this.isLoadingSubject.next(false); // Stop loading state
            }, 1000); // 1 second delay to simulate API call
        });

        // Future API integration:
        // return this.dataService.postReguest('/AppUser/Logout', null)
        //     .pipe(
        //         map(response => response as ApiResult),
        //         finalize(() => this.isLoadingSubject.next(false))
        //     );
    }
}