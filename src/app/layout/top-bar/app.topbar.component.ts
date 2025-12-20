import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ListboxChangeEvent } from 'primeng/listbox';
import { Subscription } from 'rxjs';
import { IAccountDetails, IAccountSettings, IEntityDetails, IUserDetails } from 'src/app/core/models/account-status.model';
import { EntityLogoService } from 'src/app/core/services/entity-logo.service';
import { ImageService } from 'src/app/core/services/image.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { ProfilePictureService } from 'src/app/core/services/profile-picture.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { LayoutService } from '../app-services/app.layout.service';
enum NotificationTypeEnum {
    SendCampaignNotification = 1,
    SendCampaignLessonNotification = 2,
}

export interface notificiationDto {
    transactionId?: string;
    notificationTypeId?: number;
    title?: string;
    notificationMessage?: string;
    redirectPageUrl?: string;
    notificationLogoUrl?: string;
    notificationIcon?: string;
    notificationParameter1?: string;
    notificationParameter2?: string;
    isRead?: boolean;
    readingTime?: string;
    isHide?: boolean;
    hiddenTime?: string;
    insertedTime?: string;
}

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html',
    styleUrl: './app.topbar.component.scss',
})
export class AppTopbarComponent implements OnInit, OnDestroy {
    @ViewChild('menuButton') menuButton!: ElementRef;
    @ViewChild('mobileMenuButton') mobileMenuButton!: ElementRef;
    @Input() ComapnyLogo = '../../assets/images/companyDefaultLogo.png';

    activeItem!: number;
    searchQuery: string = '';
    filteredResults: any[] = [];
    isSearching: boolean = false;

    get mobileTopbarActive(): boolean {
        return this.layoutService.state.topbarMenuActive;
    }

    unreadCount = 0;
    notifications: notificiationDto[] = [];
    notification: notificiationDto;
    subs: Subscription = new Subscription();
    notificationTypeEnum = NotificationTypeEnum;
    userTheme: string;
    userLanguageCode: string;
    userLanguageId: string;
    languages: any[] = [];
    isRtl: boolean = false;
    themeLoading: boolean = false;
    langLoading: boolean = false;
    isListboxVisible: boolean = true;
    entityLogo: string = '';
    user: IUserDetails;
    account: IAccountDetails;
    entityDetails: IEntityDetails;
    userName: string = '';
    accountSettings: IAccountSettings;
    entityName: string = '';
    gender: boolean = false;
    profilePictureUrl: string = '';

    constructor(
        public layoutService: LayoutService,
        public el: ElementRef,
        private localStorageServ: LocalStorageService,
        private ref: ChangeDetectorRef,
        private localStorage: LocalStorageService,
        private rtlService: LanguageDirService,
        private translate: TranslationService,
        private router: Router,
        private authService: AuthService,
        private imageService: ImageService,
        private entityLogoService: EntityLogoService,
        private profilePictureService: ProfilePictureService,
    ) {
    }

    ngOnInit(): void {
        this.fetchUserTheme();
        this.loadUserDetails();
        this.initializeStaticLanguages();
        this.subs.add(
            this.entityLogoService.logo$.subscribe((base64Logo: string | null) => {
                if (base64Logo) {
                    this.entityLogo = this.imageService.toImageDataUrl(base64Logo);
                    if (!this.entityLogo) {
                        this.entityLogo = 'assets/media/White-Logo.png';
                    }
                } else {
                    this.entityLogo = '';
                }
                this.ref.detectChanges();
            })
        );
        // Subscribe to profile picture changes
        this.subs.add(
            this.profilePictureService.profilePicture$.subscribe((pictureUrl: string | null) => {
                if (pictureUrl) {
                    // Convert base64 to data URL only if it's base64 (not an asset path or already a data URL)
                    this.profilePictureUrl = this.convertProfilePictureUrl(pictureUrl);
                } else {
                    // Fallback to default based on gender
                    this.gender = this.localStorage.getGender() || false;
                    if (this.gender) {
                        this.profilePictureUrl = 'assets/media/avatar.png';
                    } else {
                        this.profilePictureUrl = 'assets/media/female-avatar.png';
                    }
                }
                this.ref.detectChanges();
            })
        );
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }
    loadUserDetails() {
        this.user = this.localStorage.getUserDetails() as IUserDetails;
        this.account = this.localStorage.getAccountDetails() as IAccountDetails;
        this.entityDetails = this.localStorage.getEntityDetails() as IEntityDetails;
        this.accountSettings = this.localStorage.getAccountSettings() as IAccountSettings;


        this.entityLogo = this.imageService.toImageDataUrl(this.entityDetails?.Logo);
        const isRegional = this.accountSettings?.Language !== 'English';

        if (this.entityDetails) {
            if (isRegional) {
                const nameRegional = this.entityDetails.Name_Regional || '';
                if (nameRegional.trim()) {
                    this.entityName = nameRegional;
                } else {
                    this.entityName = this.entityDetails.Name || '';
                }
            } else {
                this.entityName = this.entityDetails.Name || '';
            }
        }

        if (this.user) {
            let regionalName = '';
            if (isRegional) {
                const firstNameRegional = this.user.First_Name_Regional || '';
                const lastNameRegional = this.user.Last_Name_Regional || '';
                regionalName = (firstNameRegional + ' ' + lastNameRegional).trim();
            }

            const firstNameEnglish = this.user.First_Name || '';
            const lastNameEnglish = this.user.Last_Name || '';
            const englishName = (firstNameEnglish + ' ' + lastNameEnglish).trim();

            if (isRegional && regionalName) {
                this.userName = regionalName;
            } else if (englishName) {
                this.userName = englishName;
            } else {
                this.userName = this.account?.Email || 'User';
            }
        }
        this.gender = this.localStorage.getGender() || false;

        if (this.gender) {
            this.profilePictureUrl = this.account?.Profile_Picture || 'assets/media/avatar.png';
        } else {
            this.profilePictureUrl = this.account?.Profile_Picture || 'assets/media/female-avatar.png';
        }

        // Convert base64 to data URL only if it's base64 (not an asset path or already a data URL)
        this.profilePictureUrl = this.convertProfilePictureUrl(this.profilePictureUrl);

        // Initialize the profile picture service with current value from localStorage
        // This ensures all components start with the same picture
        if (this.profilePictureUrl) {
            this.profilePictureService.updateProfilePicture(this.profilePictureUrl);
        }
    }

    /**
     * Convert profile picture URL to proper format
     * - If it's already a data URL (starts with 'data:image'), return as-is
     * - If it's an asset path (starts with 'assets/'), return as-is
     * - If it's base64, convert to data URL
     */
    private convertProfilePictureUrl(pictureUrl: string): string {
        if (!pictureUrl) {
            return pictureUrl;
        }
        // If it's already a data URL or an asset path, return as-is
        if (pictureUrl.startsWith('data:image') || pictureUrl.startsWith('assets/')) {
            return pictureUrl;
        }
        // Otherwise, it's base64 - convert to data URL
        return this.imageService.toImageDataUrl(pictureUrl);
    }

    fetchUserTheme() {
        const data = this.localStorageServ.getCurrentUserData();
        this.userTheme = data?.theme || this.layoutService.config().colorScheme || 'light';
    }


    initializeStaticLanguages() {
        this.languages = [
            { id: 'en', name: 'English', code: 'en' },
            { id: 'ar', name: 'العربية', code: 'ar' },
        ];
    }





    onMenuButtonClick() {
        this.layoutService.onMenuToggle();
    }

    onMobileTopbarMenuButtonClick() {
        this.layoutService.onTopbarMenuToggle();
    }

    changeUserTheme() {
        if (this.themeLoading) {
            return; // Prevent multiple clicks while loading
        }

        this.themeLoading = true; // Set loading to true

        this.userTheme = this.userTheme === 'light' ? 'dark' : 'light';
        this.applyUserTheme(this.userTheme as 'light' | 'dark');


        const data = this.localStorage.getCurrentUserData();
        data.theme = this.userTheme;
        this.localStorage.setItem('userData', data);
        this.ref.detectChanges();
        this.themeLoading = false; // Reset loading state after response



    }

    applyUserTheme(theme: string) {
        // Validate the theme and fallback to 'light' if invalid
        const validTheme: 'light' | 'dark' = theme === 'light' || theme === 'dark' ? theme : 'light';

        // Access the current layout configuration
        const config = this.layoutService.config();
        config.colorScheme = validTheme;
        config.menuTheme = validTheme;

        // Set the updated configuration in the layout service
        this.layoutService.config.set(config);

        // Call the method to change the theme, based on the updated color scheme
        this.layoutService.changeTheme();
        this.ref.detectChanges();
    }

    changeUserLanguage(event: ListboxChangeEvent) {
        if (!event.value || this.langLoading) {
            return; // Prevent unnecessary calls or multiple requests
        }
        this.userLanguageCode = event.value;
        console.log(event.value);

        this.langLoading = true; // Set loading to true
        this.isListboxVisible = false; // Hide the listbox after selection

        const data = this.localStorage.getCurrentUserData();
        console.log(data);
        data.languageId = this.userLanguageCode;
        data.language = this.userLanguageId;
        this.localStorage.setItem('userData', data);
        console.log('userLanguageCode', this.userLanguageCode);
        this.rtlService.setUserLanguageCode(this.userLanguageCode || 'en');
        this.isRtl = event.value === 'ar';
        console.log('isRtl', this.isRtl);
        this.rtlService.setRtl(this.isRtl);
        this.langLoading = false; // Reset loading state
        window.location.reload();
        this.ref.detectChanges();

    }

    toggleLanguageDropdown() {
        this.isListboxVisible = !this.isListboxVisible; // Toggle visibility
    }



}
