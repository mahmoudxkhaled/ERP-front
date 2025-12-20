import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from 'src/app/core/services/translation.service';
import { MessageService } from 'primeng/api';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IUserDetails, IAccountDetails, IEntityDetails, IAccountSettings } from 'src/app/core/models/account-status.model';
import { ProfileApiService } from '../../../services/profile-api.service';
import { ProfileContactInfo, ProfilePreferences } from '../../../models/profile.model';
import { Observable, Subscription } from 'rxjs';

@Component({
    selector: 'app-profile-overview',
    templateUrl: './profile-overview.component.html',
    styleUrls: ['./profile-overview.component.scss'],
    providers: [MessageService]
})
export class ProfileOverviewComponent implements OnInit, OnDestroy {
    currentUserId: number | null = null;
    userDetails: IUserDetails | null = null;
    accountDetails: IAccountDetails | null = null;
    entityDetails: IEntityDetails | null = null;
    accountSettings: IAccountSettings | null = null;
    isRegional: boolean = false;
    profilePictureUrl: string = '';
    hasProfilePicture: boolean = false;

    userContactInfo: ProfileContactInfo | null = null;
    userPreferences: ProfilePreferences = {};
    isLoading$: Observable<boolean>;
    loadingDetails: boolean = false;
    loadingContactInfo: boolean = false;
    loadingPreferences: boolean = false;
    loadingProfilePicture: boolean = false;

    gender: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        public translate: TranslationService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private profileApiService: ProfileApiService,
        private router: Router
    ) {
        this.isLoading$ = this.profileApiService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.loadUserData();
        this.gender = this.localStorageService.getGender() || false;

        // Get current user ID and load data from API
        this.currentUserId = this.userDetails?.User_ID || null;
        if (this.currentUserId) {
            this.loadAllData();
        } else {
            // Fallback to localStorage profile picture
            if (this.gender) {
                this.profilePictureUrl = this.accountDetails?.Profile_Picture || 'assets/media/avatar.png';
            } else {
                this.profilePictureUrl = this.accountDetails?.Profile_Picture || 'assets/media/female-avatar.png';
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadUserData(): void {
        this.userDetails = this.localStorageService.getUserDetails();
        this.accountDetails = this.localStorageService.getAccountDetails();
        this.entityDetails = this.localStorageService.getEntityDetails();
        this.accountSettings = this.localStorageService.getAccountSettings();

        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    loadAllData(): void {
        this.loadUserDetails();
        this.loadContactInfo();
        this.loadPreferences();
        this.loadProfilePicture();
    }

    loadUserDetails(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingDetails = true;
        const sub = this.profileApiService.getUserDetails(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingDetails = false;
                if (!response?.success) {
                    return;
                }

                const userData = response?.message || {};
                // Update userDetails in memory
                if (this.userDetails) {
                    this.userDetails.First_Name = userData?.First_Name || '';
                    this.userDetails.Middle_Name = userData?.Middle_Name || '';
                    this.userDetails.Last_Name = userData?.Last_Name || '';
                    this.userDetails.Prefix = userData?.Prefix || '';
                    this.userDetails.Gender = userData?.Gender !== undefined ? Boolean(userData.Gender) : (this.userDetails.Gender || false);
                }
            },
            error: () => {
                this.loadingDetails = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadContactInfo(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingContactInfo = true;
        const sub = this.profileApiService.getUserContactInfo(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingContactInfo = false;
                if (!response?.success) {
                    return;
                }
                console.log('loadContactInfo', response);

                const contactData = response?.message || {};
                const address = this.isRegional ? (contactData?.Address_Regional || contactData?.Address || '') : (contactData?.Address || '');
                const phoneNumbers = contactData?.Phone_Numbers || [];

                this.userContactInfo = {
                    address: address,
                    phoneNumbers: phoneNumbers,
                    linkedinPage: contactData?.Linkedin_Page || '',
                    facebookPage: contactData?.Facebook_Page || '',
                    instagramPage: contactData?.Instagram_Page || '',
                    twitterPage: contactData?.Twitter_Page || ''
                };
            },
            error: () => {
                this.loadingContactInfo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadPreferences(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingPreferences = true;
        const sub = this.profileApiService.getUserPreferences(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingPreferences = false;
                if (!response?.success) {
                    return;
                }

                this.userPreferences = response?.message?.User_Preferences || {};
            },
            error: () => {
                this.loadingPreferences = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadProfilePicture(): void {
        if (!this.currentUserId) {
            return;
        }

        this.loadingProfilePicture = true;
        const sub = this.profileApiService.getProfilePicture(this.currentUserId).subscribe({
            next: (response: any) => {
                this.loadingProfilePicture = false;
                if (response?.success && response?.message) {
                    const pictureData = response.message;
                    if (pictureData?.Image && pictureData.Image.trim() !== '') {
                        const imageFormat = pictureData.Image_Format || 'png';
                        this.profilePictureUrl = `data:image/${imageFormat.toLowerCase()};base64,${pictureData.Image}`;
                        this.hasProfilePicture = true;
                    } else {
                        this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                        this.hasProfilePicture = false;
                    }
                } else {
                    this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                    this.hasProfilePicture = false;
                }
            },
            error: () => {
                this.loadingProfilePicture = false;
                this.profilePictureUrl = this.gender ? 'assets/media/avatar.png' : 'assets/media/female-avatar.png';
                this.hasProfilePicture = false;
            }
        });

        this.subscriptions.push(sub);
    }

    navigateToEdit(): void {
        this.router.navigate(['/summary/profile/edit']);
    }

    getUserDisplayName(): string {
        if (!this.userDetails) return '';
        const parts = [
            this.getPrefix(),
            this.getFirstName(),
            this.getMiddleName(),
            this.getLastName()
        ].filter(p => p && p.trim() !== '');
        return parts.join(' ') || `User #${this.userDetails.User_ID}`;
    }

    getFirstName(): string {
        if (!this.userDetails) return '';
        if (this.isRegional) {
            const firstNameRegional = this.userDetails.First_Name_Regional || '';
            if (firstNameRegional.trim()) {
                return firstNameRegional;
            }
        }
        return this.userDetails.First_Name || '';
    }

    getMiddleName(): string {
        if (!this.userDetails) return '';
        if (this.isRegional) {
            const middleNameRegional = this.userDetails.Middle_Name_Regional || '';
            if (middleNameRegional.trim()) {
                return middleNameRegional;
            }
        }
        return this.userDetails.Middle_Name || '';
    }

    getLastName(): string {
        if (!this.userDetails) return '';
        if (this.isRegional) {
            const lastNameRegional = this.userDetails.Last_Name_Regional || '';
            if (lastNameRegional.trim()) {
                return lastNameRegional;
            }
        }
        return this.userDetails.Last_Name || '';
    }

    getPrefix(): string {
        if (!this.userDetails) return '';
        if (this.isRegional) {
            const prefixRegional = this.userDetails.Prefix_Regional || '';
            if (prefixRegional.trim()) {
                return prefixRegional;
            }
        }
        return this.userDetails.Prefix || '';
    }

    getGenderLabel(): string {
        return this.userDetails?.Gender ? 'Male' : 'Female';
    }

    getStatusLabel(): string {
        return this.userDetails?.Is_Active ? 'Active' : 'Inactive';
    }

    getStatusSeverity(): string {
        return this.userDetails?.Is_Active ? 'success' : 'danger';
    }

    getPreferenceKeys(): string[] {
        return Object.keys(this.userPreferences);
    }

    openSocialLink(url: string): void {
        if (url) {
            window.open(url, '_blank');
        }
    }
}

