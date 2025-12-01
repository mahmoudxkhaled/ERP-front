import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class EntityLogoService {
    private logoSubject = new BehaviorSubject<string | null>(null);
    public logo$: Observable<string | null> = this.logoSubject.asObservable();

    constructor() { }
    updateLogo(base64Logo: string | null): void {
        this.logoSubject.next(base64Logo);
    }

    getCurrentLogo(): string | null {
        return this.logoSubject.value;
    }
}

