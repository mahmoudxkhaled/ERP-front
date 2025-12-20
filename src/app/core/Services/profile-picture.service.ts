import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ProfilePictureService {
    // BehaviorSubject to hold the current profile picture URL
    private profilePictureSubject = new BehaviorSubject<string | null>(null);
    // Observable that components can subscribe to
    public profilePicture$: Observable<string | null> = this.profilePictureSubject.asObservable();

    constructor() { }

    /**
     * Update the profile picture and notify all subscribers
     * @param pictureUrl - The profile picture URL (can be base64 data URL or file path)
     */
    updateProfilePicture(pictureUrl: string | null): void {
        this.profilePictureSubject.next(pictureUrl);
    }

    /**
     * Get the current profile picture URL
     */
    getCurrentProfilePicture(): string | null {
        return this.profilePictureSubject.value;
    }
}

