import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { LayoutService } from '../app-services/app.layout.service';
import { finalize, Subscription } from 'rxjs';
import { LocalStorageService } from '../../core/Services/local-storage.service';
import { ILanguageModel } from 'src/app/modules/language/models/ILanguageModel';
import { ListboxChangeEvent } from 'primeng/listbox';
import { LanguageDIRService } from 'src/app/core/Services/LanguageDIR.service';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
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
export class AppTopbarComponent implements OnInit {
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
    langLoading: boolean = false; // Track the loading state
    isListboxVisible: boolean = true; // Track visibility of the listbox
    showLogoutDialog: boolean = false; // Track logout dialog visibility

    mockSearchData = {
        lessons: ['Lesson 1', 'Lesson 2', 'Lesson 3'],
        games: ['Game A', 'Game B', 'Game C'],
        phishingTemplates: ['Template X', 'Template Y', 'Template Z'],
        wallpapers: ['Wallpaper 1', 'Wallpaper 2', 'Wallpaper 3'],
    };

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
    ) {
    }

    ngOnInit(): void {
        // const data = this.localStorage.getCurrentUserData();
        // this.userLanguageId = data.language;

        this.fetchUserTheme();
        // this.fetchNotifications();
        this.initializeStaticLanguages();
    }

    fetchUserTheme() {
        const data = this.localStorageServ.getCurrentUserData();
        // Get theme from localStorage, or fallback to layout service config, or default to 'light'
        this.userTheme = data?.theme || this.layoutService.config().colorScheme || 'light';
    }

    fetchNotifications() {
        const datas = this.localStorageServ.getCurrentUserData();
        // this.subs.add(
        //     this.notificationServ.getUserNotifications(datas.userId).subscribe((r) => {
        //         this.notifications = this.processNotifications(r.data);
        //         this.calculateUnreadCount();
        //     })
        // );
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

        // Get current theme from layout service config if userTheme is not set
        if (!this.userTheme) {
            const currentConfig = this.layoutService.config();
            this.userTheme = currentConfig.colorScheme || 'light';
        }

        this.themeLoading = true; // Set loading to true
        // Toggle theme: if current is 'light', switch to 'dark', otherwise switch to 'light'
        this.userTheme = this.userTheme === 'light' ? 'dark' : 'light';
        this.applyUserTheme(this.userTheme as 'light' | 'dark');
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

        // Reset loading state after theme change is complete
        this.themeLoading = false;
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

    logOut() {
        // Show logout confirmation dialog
        this.showLogoutDialog = true;
    }

    onLogoutConfirm() {
        // User confirmed logout, proceed with logout
        this.authService.logout().subscribe();
    }

    onLogoutCancel() {
        // User cancelled logout, dialog will close automatically
    }

    search(event: any) {
        const query = event.query.toLowerCase();

        if (query.trim()) {
            this.isSearching = true;

            // Filter the mock data based on the search query
            const filteredLessons = this.mockSearchData.lessons.filter((lesson) =>
                lesson.toLowerCase().includes(query)
            );
            const filteredGames = this.mockSearchData.games.filter((game) =>
                game.toLowerCase().includes(query)
            );
            const filteredTemplates = this.mockSearchData.phishingTemplates.filter((template) =>
                template.toLowerCase().includes(query)
            );
            const filteredWallpapers = this.mockSearchData.wallpapers.filter((wallpaper) =>
                wallpaper.toLowerCase().includes(query)
            );

            // Format the filtered results for autocomplete
            this.filteredResults = this.mapSearchResults({
                lessons: filteredLessons,
                games: filteredGames,
                phishingTemplates: filteredTemplates,
                wallpapers: filteredWallpapers,
            });

            this.isSearching = false;
        }
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