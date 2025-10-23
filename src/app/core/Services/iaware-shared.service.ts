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
        return this.dataService.postReguest('/AppUser/Logout', null) // Return the Observable
            .pipe(
                map(response => response as ApiResult), // Cast response to ApiResult,
                finalize(() => this.isLoadingSubject.next(false)) // Stop loading state after completion
            );
    }
}