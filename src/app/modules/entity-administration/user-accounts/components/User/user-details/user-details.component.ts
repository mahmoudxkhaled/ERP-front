import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { UsersService } from '../../../services/users.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { User, UserBackend, UserContactInfo, UserContactInfoBackend, UserPreferences } from '../../../models/user.model';

@Component({
    selector: 'app-user-details',
    templateUrl: './user-details.component.html',
    styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit, OnDestroy {
    userId: string = '';
    loading: boolean = false;
    loadingDetails: boolean = false;
    loadingContactInfo: boolean = false;
    loadingPreferences: boolean = false;
    activeTabIndex: number = 0;

    userDetails: User | null = null;
    userContactInfo: UserContactInfo | null = null;
    userPreferences: UserPreferences = {};
    profilePictureUrl: string = '';
    hasProfilePicture: boolean = false;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private usersService: UsersService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.userId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.userId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid user ID.'
            });
            this.router.navigate(['/entity-administration/user-accounts/list']);
            return;
        }

        this.loadAllData();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadAllData(): void {
        this.loading = true;
        this.loadUserDetails();
        this.loadContactInfo();
        this.loadPreferences();
        this.loadProfilePicture();
    }

    loadUserDetails(): void {
        this.loadingDetails = true;
        const sub = this.usersService.getUserDetails(Number(this.userId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }

                const userData = response?.message || {};
                this.userDetails = {
                    id: String(userData?.User_ID || ''),
                    firstName: this.isRegional ? (userData?.First_Name_Regional || userData?.First_Name || '') : (userData?.First_Name || ''),
                    middleName: this.isRegional ? (userData?.Middle_Name_Regional || userData?.Middle_Name || '') : (userData?.Middle_Name || ''),
                    lastName: this.isRegional ? (userData?.Last_Name_Regional || userData?.Last_Name || '') : (userData?.Last_Name || ''),
                    prefix: this.isRegional ? (userData?.Prefix_Regional || userData?.Prefix || '') : (userData?.Prefix || ''),
                    gender: Boolean(userData?.Gender),
                    isActive: Boolean(userData?.Is_Active)
                };
                this.loadingDetails = false;
                this.loading = false;
            },
            complete: () => {
                this.loadingDetails = false;
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadContactInfo(): void {
        this.loadingContactInfo = true;
        const sub = this.usersService.getUserContactInfo(Number(this.userId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.loadingContactInfo = false;
                    return;
                }

                const contactData = response?.message || {};
                this.userContactInfo = {
                    address: this.isRegional ? (contactData?.Address_Regional || contactData?.Address || '') : (contactData?.Address || ''),
                    phoneNumbers: contactData?.Phone_Numbers || [],
                    linkedinPage: contactData?.Linkedin_Page || '',
                    facebookPage: contactData?.Facebook_Page || '',
                    instagramPage: contactData?.Instagram_Page || '',
                    twitterPage: contactData?.Twitter_Page || ''
                };
                this.loadingContactInfo = false;
            },
            error: () => {
                this.loadingContactInfo = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadPreferences(): void {
        this.loadingPreferences = true;
        const sub = this.usersService.getUserPreferences(Number(this.userId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.loadingPreferences = false;
                    return;
                }

                this.userPreferences = response?.message?.User_Preferences || {};
                this.loadingPreferences = false;
            },
            error: () => {
                this.loadingPreferences = false;
            }
        });

        this.subscriptions.push(sub);
    }

    loadProfilePicture(): void {
        const sub = this.usersService.getProfilePicture(Number(this.userId)).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message) {
                    const pictureData = response.message;
                    if (pictureData?.Image && pictureData.Image.trim() !== '') {
                        const imageFormat = pictureData.Image_Format || 'png';
                        this.profilePictureUrl = `data:image/${imageFormat.toLowerCase()};base64,${pictureData.Image}`;
                        this.hasProfilePicture = true;
                    }
                }
            }
        });

        this.subscriptions.push(sub);
    }

    navigateToEdit(): void {
        this.router.navigate(['/entity-administration/user-accounts', this.userId, 'edit']);
    }

    navigateToContactInfo(): void {
        this.router.navigate(['/entity-administration/user-accounts', this.userId, 'contact']);
    }

    getUserDisplayName(): string {
        if (!this.userDetails) return '';
        const parts = [this.userDetails.prefix, this.userDetails.firstName, this.userDetails.middleName, this.userDetails.lastName].filter(p => p);
        return parts.join(' ') || `User #${this.userDetails.id}`;
    }

    getGenderLabel(): string {
        return this.userDetails?.gender ? 'Male' : 'Female';
    }

    getStatusSeverity(): string {
        return this.userDetails?.isActive ? 'success' : 'danger';
    }

    getStatusLabel(): string {
        return this.userDetails?.isActive ? 'Active' : 'Inactive';
    }

    getPreferenceKeys(): string[] {
        return Object.keys(this.userPreferences);
    }

    private handleBusinessError(context: 'details', response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11190':
                detail = 'Invalid User ID';
                break;
            default:
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
        this.loadingDetails = false;
        return null;
    }
}

