import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class UsersService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiService: ApiService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }

    // Users related actions (API 200-207)

    /**
     * Create a new user
     * API Code: 200
     * @param firstName - User's first name
     * @param lastName - User's last name
     */
    createUser(firstName: string, lastName: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [firstName, lastName];
        return this.apiService.callAPI(200, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get user details
     * API Code: 201
     * @param userId - User ID
     */
    getUserDetails(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(201, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update user details
     * API Code: 202
     * @param userId - User ID
     * @param firstName - First name
     * @param middleName - Middle name
     * @param lastName - Last name
     * @param prefix - Prefix (varchar 10)
     * @param isRegional - Whether to use regional fields
     * @param gender - Gender (true: Male, false: Female)
     */
    updateUserDetails(
        userId: number,
        firstName: string,
        middleName: string,
        lastName: string,
        prefix: string,
        isRegional: boolean,
        gender: boolean
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            userId.toString(),
            firstName,
            middleName,
            lastName,
            prefix,
            isRegional.toString(),
            gender.toString()
        ];
        return this.apiService.callAPI(202, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Delete a user
     * API Code: 203
     * @param userId - User ID
     */
    deleteUser(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(203, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get user contact information
     * API Code: 204
     * @param userId - User ID
     */
    getUserContactInfo(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(204, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update user contact information
     * API Code: 205
     * @param userId - User ID
     * @param address - Address
     * @param isRegional - Whether to use regional address
     * @param phoneNumbers - Array of phone numbers
     * @param linkedinPage - LinkedIn page URL
     * @param facebookPage - Facebook page URL
     * @param instagramPage - Instagram page URL
     * @param twitterPage - Twitter page URL
     */
    updateUserContactInfo(
        userId: number,
        address: string,
        isRegional: boolean,
        phoneNumbers: string[],
        linkedinPage: string,
        facebookPage: string,
        instagramPage: string,
        twitterPage: string
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            userId.toString(),
            address,
            isRegional.toString(),
            JSON.stringify(phoneNumbers),
            linkedinPage,
            facebookPage,
            instagramPage,
            twitterPage
        ];
        return this.apiService.callAPI(205, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Request account merge
     * API Code: 206
     * @param userId - Current user ID
     * @param email - Email of account to merge with
     */
    mergeAccountRequest(userId: number, email: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [userId.toString(), email];
        return this.apiService.callAPI(206, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Confirm account merge
     * API Code: 207
     * @param mergeOTP - OTP received for merge
     * @param dominantUserId - ID of the user account to keep
     * @param mergeData - Whether to merge data from both accounts
     */
    mergeAccountConfirm(mergeOTP: string, dominantUserId: number, mergeData: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [mergeOTP, dominantUserId.toString(), mergeData.toString()];
        return this.apiService.callAPI(207, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    // Profiles related actions (API 300-305)

    /**
     * Set user preferences
     * API Code: 300
     * @param userId - User ID
     * @param preferences - Dictionary of preference key-value pairs
     */
    setUserPreferences(userId: number, preferences: Record<string, string>): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [userId.toString(), JSON.stringify(preferences)];
        return this.apiService.callAPI(300, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get user preferences
     * API Code: 301
     * @param userId - User ID
     */
    getUserPreferences(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(301, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Remove a user preference
     * API Code: 302
     * @param accountId - Account ID
     * @param settingName - Name of the setting to remove
     */
    removeUserPreference(accountId: number, settingName: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [accountId.toString(), settingName];
        return this.apiService.callAPI(302, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Assign/update profile picture
     * API Code: 303
     * @param userId - User ID
     * @param imageFormat - Image format (png, jpg, jpeg, gif, bmp, tiff, pict)
     * @param base64Image - Base64 encoded image string
     */
    assignProfilePicture(userId: number, imageFormat: string, base64Image: string): Observable<any> {
        this.isLoadingSubject.next(true);
        const quotedBase64String = `"${base64Image}"`;
        const params = [userId.toString(), imageFormat, quotedBase64String];
        return this.apiService.callAPI(303, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get profile picture
     * API Code: 304
     * @param userId - User ID
     */
    getProfilePicture(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(304, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Remove profile picture
     * API Code: 305
     * @param userId - User ID
     */
    removeProfilePicture(userId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiService.callAPI(305, this.getAccessToken(), [userId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }
}

