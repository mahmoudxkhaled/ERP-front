import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ListboxChangeEvent } from 'primeng/listbox';
import { OverlayPanel } from 'primeng/overlaypanel';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { IAccountDetails, IAccountSettings, IEntityDetails, IUserDetails } from 'src/app/core/models/account-status.model';
import { EntityLogoService } from 'src/app/core/services/entity-logo.service';
import { ImageService } from 'src/app/core/services/image.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { ProfilePictureService } from 'src/app/core/services/profile-picture.service';
import { UserNameService } from 'src/app/core/services/user-name.service';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { NotificationRefreshService } from '../../core/services/notification-refresh.service';
import { LayoutService } from '../app-services/app.layout.service';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';
import { AccountNotification, AccountNotificationBackend } from 'src/app/modules/summary/models/notifications.model';
import { PermissionService } from 'src/app/core/services/permission.service';

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html',
    styleUrl: './app.topbar.component.scss',
})
export class AppTopbarComponent implements OnInit, OnDestroy {
    @ViewChild('menuButton') menuButton!: ElementRef;
    @ViewChild('mobileMenuButton') mobileMenuButton!: ElementRef;
    @ViewChild('notificationPanel') notificationPanel!: ElementRef;
    @Input() ComapnyLogo = '../../assets/images/companyDefaultLogo.png';

    activeItem!: number;
    searchQuery: string = '';
    filteredResults: any[] = [];
    isSearching: boolean = false;

    get mobileTopbarActive(): boolean {
        return this.layoutService.state.topbarMenuActive;
    }

    // Notification properties
    notifications: AccountNotification[] = [];
    unreadCount: number = 0;
    loadingNotifications: boolean = false;
    currentAccountId: number = 0;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    subs: Subscription = new Subscription();
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
        private userNameService: UserNameService,
        private notificationsService: NotificationsService,
        private messageService: MessageService,
        private permissionService: PermissionService,
        private notificationRefreshService: NotificationRefreshService
    ) {
    }

    ngOnInit(): void {
        this.fetchUserTheme();
        this.loadUserDetails();
        this.initializeStaticLanguages();
        // Initialize currentAccountId for notifications (after loadUserDetails sets this.account)
        this.currentAccountId = this.account?.Account_ID || 0;
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
        // Subscribe to user name changes
        this.subs.add(
            this.userNameService.userName$.subscribe((userName: string) => {
                if (userName) {
                    this.userName = userName;
                    this.ref.detectChanges();
                }
            })
        );

        // Load when app init, login, or inbox changes (e.g. mark read in inbox → update top bar badge)
        this.subs.add(
            this.notificationRefreshService.onTopBarRefreshRequested().subscribe(() => {
                if (this.currentAccountId > 0) {
                    this.loadNotifications();
                }
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
        this.isRegional = isRegional;

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

        // Initialize the user name service with current value from localStorage
        // This ensures all components start with the same user name
        if (this.userName) {
            this.userNameService.updateUserName(this.userName);
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
        if (pictureUrl.startsWith('data:image') || pictureUrl.startsWith('assets/')) {
            return pictureUrl;
        }
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

    // ==================== Notification Methods ====================

    onNotificationPanelOpen(event: Event): void {
        this.loadNotifications();
    }

    loadNotifications(): void {
        if (!this.currentAccountId) {
            return;
        }

        this.loadingNotifications = true;

        const sub = this.notificationsService.listAccountNotifications(
            this.currentAccountId,
            [], // typeFilter
            [], // categoryFilter
            '', // textFilter
            false, // unreadOnly
            0, // lastNotificationId
            10 // filterCount - limit to 10 notifications
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleNotificationError('list', response);
                    return;
                }

                const responseData = response?.message || response;
                const notificationsData = responseData?.Notifications || responseData?.message || [];

                this.notifications = Array.isArray(notificationsData) ? notificationsData.map((item: any) => {
                    const notificationBackend = item as any;
                    return {
                        id: notificationBackend?.Notification_ID || 0,
                        moduleId: notificationBackend?.Module_ID || 0,
                        typeId: notificationBackend?.Type_ID || 0,
                        categoryId: notificationBackend?.Category_ID || 0,
                        entityId: notificationBackend?.Entity_ID || null,
                        title: this.isRegional ? (notificationBackend?.Title_Regional || notificationBackend?.Title || '') : (notificationBackend?.Title || ''),
                        message: this.isRegional ? (notificationBackend?.Message_Regional || notificationBackend?.Message || '') : (notificationBackend?.Message || ''),
                        titleRegional: notificationBackend?.Title_Regional,
                        messageRegional: notificationBackend?.Message_Regional,
                        referenceType: notificationBackend?.Reference_Type || null,
                        referenceId: notificationBackend?.Reference_ID || null,
                        isRead: !Boolean(notificationBackend?.Is_Unread), // Is_Unread: false means read
                        readAt: notificationBackend?.Read_At || null,
                        createdAt: notificationBackend?.Received_At || notificationBackend?.Created_At || null
                    };
                }) : [];

                this.updateUnreadCount();
                this.loadingNotifications = false;
                this.ref.detectChanges();
            },
            error: () => {
                this.loadingNotifications = false;
                this.ref.detectChanges();
            }
        });

        this.subs.add(sub);
    }

    onNotificationClick(notification: AccountNotification, event: Event): void {
        event.stopPropagation();

        if (!this.currentAccountId) {
            return;
        }

        this.closeNotificationPanel();

        // Mark as read
        if (!notification.isRead) {
            const sub = this.notificationsService.markNotificationsRead(this.currentAccountId, [notification.id]).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        notification.isRead = true;
                        this.updateUnreadCount();
                        this.ref.detectChanges();
                        this.notificationRefreshService.requestInboxRefresh();
                    }
                }
            });
            this.subs.add(sub);
        }

        // Navigate to inbox
        this.router.navigate(['/summary/notifications/inbox']);
    }

    /** Close the notifications dropdown panel. */
    closeNotificationPanel(): void {
        this.notificationPanel?.nativeElement?.classList?.add('ng-hidden');
    }

    markAllAsRead(): void {
        if (!this.currentAccountId || this.notifications.length === 0) {
            return;
        }

        const unreadNotifications = this.notifications.filter(n => !n.isRead);
        if (unreadNotifications.length === 0) {
            return;
        }

        const unreadIds = unreadNotifications.map(n => n.id);
        const sub = this.notificationsService.markNotificationsRead(this.currentAccountId, unreadIds).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        this.notifications.forEach(n => {
                            if (!n.isRead) {
                                n.isRead = true;
                            }
                        });
                    this.updateUnreadCount();
                    this.ref.detectChanges();
                    this.notificationRefreshService.requestInboxRefresh();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'All notifications marked as read.'
                    });
                }
            }
        });
        this.subs.add(sub);
    }

    navigateToInbox(): void {
        this.closeNotificationPanel();
        this.router.navigate(['/summary/notifications/inbox']);
    }

    updateUnreadCount(): void {
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
    }

    getUnreadCount(): number {
        return this.unreadCount;
    }

    getTimeAgo(dateString: string | undefined): string {
        if (!dateString) {
            return '';
        }

        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} ${days === 1 ? 'day' : 'days'} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    private handleNotificationError(context: string, response: any): void {
        // Do not show toast for notification errors on home screen - fails silently
        this.loadingNotifications = false;
        this.ref.detectChanges();
    }

}
