import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ListboxChangeEvent } from 'primeng/listbox';
import { Subscription } from 'rxjs';
import { IAccountDetails, IAccountSettings, IEntityDetails, IUserDetails } from 'src/app/core/models/IAccountStatusResponse';
import { EntityLogoService } from 'src/app/core/Services/entity-logo.service';
import { ImageService } from 'src/app/core/Services/image.service';
import { LanguageDIRService } from 'src/app/core/Services/LanguageDIR.service';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { ILanguageModel } from 'src/app/modules/language/models/ILanguageModel';
import { LocalStorageService } from '../../core/Services/local-storage.service';
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
    languages: ILanguageModel[] = [];
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
        private rtlService: LanguageDIRService,
        private translate: TranslationService,
        private router: Router,
        private authService: AuthService,
        private imageService: ImageService,
        private entityLogoService: EntityLogoService,
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

    // changeUserTheme() {
    //     if (this.themeLoading) {
    //         return; // Prevent multiple clicks while loading
    //     }

    //     // Get current theme from layout service config if userTheme is not set
    //     if (!this.userTheme) {
    //         const currentConfig = this.layoutService.config();
    //         this.userTheme = currentConfig.colorScheme || 'light';
    //     }

    //     this.themeLoading = true; // Set loading to true
    //     // Toggle theme: if current is 'light', switch to 'dark', otherwise switch to 'light'
    //     this.userTheme = this.userTheme === 'light' ? 'dark' : 'light';
    //     this.applyUserTheme(this.userTheme as 'light' | 'dark');
    // }
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




    //#region search
    // search(event: any) {
    //     const query = event.query;

    //     if (query.trim()) {
    //         this.isSearching = true;

    //         this.searchService.searchByTag(query).subscribe(
    //             (response) => {
    //                 if (response.isSuccess && response.data) {
    //                     this.filteredResults = this.mapSearchResults(response.data);
    //                 } else {
    //                     this.filteredResults = [];
    //                 }
    //                 this.isSearching = false;
    //                 this.ref.detectChanges();
    //             },
    //             (error) => {
    //                 console.error('Search error:', error);
    //                 this.filteredResults = [];
    //                 this.isSearching = false;
    //             }
    //         );
    //     }
    // }

    mapSearchResults(data: any): any[] {
        const results: any[] = [];

        if (data.lessons && data.lessons.length) {
            results.push({ label: 'Lessons', value: null });
            data.lessons.forEach((lesson: string) => {
                results.push({ label: `- ${lesson}`, value: lesson });
            });
        }

        if (data.games && data.games.length) {
            results.push({ label: 'Games', value: null });
            data.games.forEach((game: string) => {
                results.push({ label: `- ${game}`, value: game });
            });
        }

        if (data.phishingTemplates && data.phishingTemplates.length) {
            results.push({ label: 'Phishing Templates', value: null });
            data.phishingTemplates.forEach((template: string) => {
                results.push({ label: `- ${template}`, value: template });
            });
        }

        if (data.wallpapers && data.wallpapers.length) {
            results.push({ label: 'Wallpapers', value: null });
            data.wallpapers.forEach((wallpaper: string) => {
                results.push({ label: `- ${wallpaper}`, value: wallpaper });
            });
        }

        return results;
    }

    onSearchItemSelected(event: any) {
        console.log('Selected item:', event);
        // Implement navigation or further logic based on the selected item
    }

    //#endregion
}