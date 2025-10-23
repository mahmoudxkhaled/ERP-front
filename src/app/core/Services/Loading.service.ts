import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class LoadingService {
    private loadingSubject = new BehaviorSubject<boolean>(false); // Observable for loading state
    public isLoading$ = this.loadingSubject.asObservable(); // Expose it as observable

    showLoading() {
        this.loadingSubject.next(true); // Set loading state to true
    }

    hideLoading() {
        this.loadingSubject.next(false); // Set loading state to false
    }
}
