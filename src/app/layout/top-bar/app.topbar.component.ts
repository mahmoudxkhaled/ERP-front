import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ListboxChangeEvent } from 'primeng/listbox';
import { OverlayPanel } from 'primeng/overlaypanel';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { filter, skip, take } from 'rxjs/operators';
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
import { EntityDetailsRefreshService } from '../../core/services/entity-details-refresh.service';
import { LayoutService } from '../app-services/app.layout.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';
import { AccountNotification, AccountNotificationBackend } from 'src/app/modules/summary/models/notifications.model';
import { PermissionService } from 'src/app/core/services/permission.service';
import { TopbarHeaderCacheService } from 'src/app/core/services/topbar-header-cache.service';

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
    parentEntityCode: string = '';
    parentEntityLogo: string = '';
    headerLogoLoading = true;
    headerTitleLoading = false;
    topbarTitleCache = '';
    topbarLogoCache = '';
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
        private notificationRefreshService: NotificationRefreshService,
        private entityDetailsRefreshService: EntityDetailsRefreshService,
        private entitiesService: EntitiesService,
        private topbarHeaderCacheService: TopbarHeaderCacheService
    ) {
    }

    get isRootEntity(): boolean {
        const pid = this.entityDetails?.Parent_Entity_ID;
        if (pid == null || pid === undefined || pid === 0) {
            return true;
        }
        const s = String(pid).trim();
        return s === '' || s === '0';
    }

    get headerDisplayLogo(): string {
        if (!this.isRootEntity && this.headerLogoLoading) {
            return this.topbarLogoCache || this.buildLiveHeaderLogo();
        }
        const live = this.buildLiveHeaderLogo();
        return live || this.topbarLogoCache;
    }

    get headerDisplayTitle(): string {
        if (!this.isRootEntity && this.headerTitleLoading) {
            return this.topbarTitleCache || this.buildLiveHeaderTitle();
        }
        const live = this.buildLiveHeaderTitle();
        return live || this.topbarTitleCache;
    }

    private buildLiveHeaderLogo(): string {
        if (this.isRootEntity) {
            return this.entityLogo || '';
        }
        return this.entityLogo || this.parentEntityLogo || '';
    }

    private buildLiveHeaderTitle(): string {
        if (this.isRootEntity) {
            return this.entityName || '';
        }
        const parent = (this.parentEntityCode || '').trim();
        const sub = (this.entityName || '').trim();
        if (!parent) {
            return sub;
        }
        return sub ? `${parent} – ${sub}` : parent;
    }

    private persistTopbarHeaderCacheIfReady(): void {
        if (this.headerTitleLoading || this.headerLogoLoading) {
            return;
        }
        const id = this.entityDetails?.Entity_ID;
        if (id == null || id === undefined) {
            return;
        }
        const title = this.buildLiveHeaderTitle();
        const logo = this.buildLiveHeaderLogo();
        this.topbarHeaderCacheService.write(String(id), this.userLanguageCode, title, logo);
        this.topbarTitleCache = title;
        this.topbarLogoCache = logo;
    }

    ngOnInit(): void {
        this.fetchUserTheme();
        this.loadUserDetails();
        this.initializeStaticLanguages();
        // Initialize currentAccountId for notifications (after loadUserDetails sets this.account)
        this.currentAccountId = this.account?.Account_ID || 0;
        this.subs.add(
            this.entityLogoService.logo$.pipe(skip(1)).subscribe((base64Logo: string | null) => {
                if (base64Logo) {
                    this.entityLogo = this.imageService.toImageDataUrl(base64Logo);
                    if (!this.entityLogo) {
                        this.entityLogo = 'assets/media/White-Logo.png';
                    }
                    if (!this.isRootEntity) {
                        this.headerLogoLoading = false;
                    }
                } else {
                    this.entityLogo = '';
                }
                this.ref.detectChanges();
                this.persistTopbarHeaderCacheIfReady();
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
        // Refresh entity name/logo in top bar when entity is updated (e.g. from entity form)
        this.subs.add(
            this.entityDetailsRefreshService.onRefreshRequested().subscribe(() => {
                this.loadUserDetails();
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

        const langCode = this.accountSettings?.Language === 'English' ? 'en' : 'ar';
        this.userLanguageCode = langCode;
        this.userLanguageId = langCode;

        this.parentEntityCode = '';
        this.parentEntityLogo = '';
        this.headerLogoLoading = true;

        const cachedHeader = this.topbarHeaderCacheService.read(this.entityDetails?.Entity_ID, langCode);
        if (cachedHeader) {
            this.topbarTitleCache = cachedHeader.title;
            this.topbarLogoCache = cachedHeader.logoDataUrl;
        } else {
            this.topbarTitleCache = '';
            this.topbarLogoCache = '';
        }

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

            const raw = this.entityDetails.Parent_Entity_ID;
            const parentIdStr = raw == null ? '' : String(raw).trim();
            const isSubEntity = parentIdStr !== '' && parentIdStr !== '0';
            if (!isSubEntity) {
                this.headerLogoLoading = false;
                this.persistTopbarHeaderCacheIfReady();
            } else {
                this.headerTitleLoading = true;
                const sub = this.entitiesService.getEntityDetails(parentIdStr).subscribe({
                    next: (response: any) => {
                        if (!response?.success) {
                            this.handleBusinessError('parentEntityDetails', response);
                        } else if (response?.message) {
                            this.parentEntityCode = response.message.Code || '';
                        }
                        this.headerTitleLoading = false;
                        this.ref.detectChanges();
                        this.resolveSubEntityHeaderLogo(parentIdStr);
                    },
                    error: () => {
                        this.showTopBarHeaderNetworkError();
                        this.headerTitleLoading = false;
                        this.headerLogoLoading = false;
                        this.ref.detectChanges();
                        this.persistTopbarHeaderCacheIfReady();
                    }
                });
                this.subs.add(sub);
            }
        } else {
            this.headerLogoLoading = false;
            this.persistTopbarHeaderCacheIfReady();
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

    private resolveSubEntityHeaderLogo(parentIdStr: string): void {
        if (this.entityLogo) {
            this.headerLogoLoading = false;
            this.ref.detectChanges();
            this.persistTopbarHeaderCacheIfReady();
            return;
        }
        if (!this.account?.Email) {
            this.loadParentEntityLogoAfterSubLogoKnown(parentIdStr);
            return;
        }
        if (this.entityLogoService.isCurrentEntityLogoResolved()) {
            this.loadParentEntityLogoAfterSubLogoKnown(parentIdStr);
            return;
        }
        const sub = this.entityLogoService.currentEntityLogoResolved$
            .pipe(
                filter((resolved) => resolved === true),
                take(1)
            )
            .subscribe(() => {
                this.loadParentEntityLogoAfterSubLogoKnown(parentIdStr);
            });
        this.subs.add(sub);
    }

    private loadParentEntityLogoAfterSubLogoKnown(parentIdStr: string): void {
        if (this.entityLogo) {
            this.headerLogoLoading = false;
            this.ref.detectChanges();
            this.persistTopbarHeaderCacheIfReady();
            return;
        }
        const sub = this.entitiesService.getEntityLogo(parentIdStr).subscribe({
            next: (logoRes: any) => {
                if (!logoRes?.success) {
                    this.handleBusinessError('parentEntityLogo', logoRes);
                } else if (logoRes?.message?.Image) {
                    const fmt = logoRes.message.Image_Format || 'png';
                    this.parentEntityLogo = `data:image/${fmt.toLowerCase()};base64,${logoRes.message.Image}`;
                }
                this.headerLogoLoading = false;
                this.ref.detectChanges();
                this.persistTopbarHeaderCacheIfReady();
            },
            error: () => {
                this.showTopBarHeaderNetworkError();
                this.headerLogoLoading = false;
                this.ref.detectChanges();
                this.persistTopbarHeaderCacheIfReady();
            }
        });
        this.subs.add(sub);
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
            return;
        }
        this.userLanguageCode = event.value;
        this.userLanguageId = event.value;
        this.isListboxVisible = false;

        const selectedLanguage = this.languages.find((l: { code: string }) => l.code === event.value);
        const newLanguageName = selectedLanguage?.name ?? event.value;

        const data = this.localStorage.getCurrentUserData();
        if (data) {
            data.languageId = this.userLanguageCode;
            data.language = newLanguageName;
            data.userLanguageCode = event.value;
            this.localStorage.setItem('userData', data);
        }

        const accountSettings = this.localStorage.getAccountSettings();
        if (accountSettings) {
            accountSettings.Language = event.value === 'en' ? 'English' : 'Arabic';
            this.localStorage.setItem('Account_Settings', accountSettings);
        }

        const newRtl = event.value === 'ar';
        localStorage.setItem('isRtl', JSON.stringify(newRtl));

        window.location.reload();
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
                    this.handleBusinessError('notificationsList', response);
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
                this.showTopBarNotificationsLoadNetworkError();
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
                    if (!response?.success) {
                        this.handleBusinessError('notificationsMarkRead', response);
                        return;
                    }
                    notification.isRead = true;
                    this.updateUnreadCount();
                    this.ref.detectChanges();
                    this.notificationRefreshService.requestInboxRefresh();
                },
                error: () => {
                    this.showTopBarNotificationsActionNetworkError();
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
                if (!response?.success) {
                    this.handleBusinessError('notificationsMarkRead', response);
                    return;
                }
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
                    summary: this.translate.getInstant('common.success'),
                    detail: this.translate.getInstant('layout.top-bar.notifications.messages.allMarkedRead'),
                });
            },
            error: () => {
                this.showTopBarNotificationsActionNetworkError();
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

    private handleBusinessError(
        context: 'notificationsList' | 'notificationsMarkRead' | 'parentEntityDetails' | 'parentEntityLogo',
        response: any
    ): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'notificationsList':
                detail = this.getTopBarNotificationsListErrorMessage(code) || '';
                break;
            case 'notificationsMarkRead':
                detail = this.getTopBarNotificationsMarkReadErrorMessage(code) || '';
                break;
            case 'parentEntityDetails':
            case 'parentEntityLogo':
                detail = this.getParentEntityHeaderErrorMessage(code) || '';
                break;
            default:
                detail = '';
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.getInstant('common.error'),
                detail,
            });
        }

        if (context === 'notificationsList') {
            this.loadingNotifications = false;
            this.ref.detectChanges();
        }
    }

    private getTopBarNotificationsListErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11470':
                return this.translate.getInstant('layout.top-bar.notifications.errors.invalidAccountId');
            case 'ERP11456':
                return this.translate.getInstant('layout.top-bar.notifications.errors.invalidTypeIds');
            case 'ERP11457':
                return this.translate.getInstant('layout.top-bar.notifications.errors.invalidCategoryIds');
            case 'ERP11458':
                return this.translate.getInstant('layout.top-bar.notifications.errors.invalidFilterCount');
            default:
                return null;
        }
    }

    private getTopBarNotificationsMarkReadErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11470':
                return this.translate.getInstant('layout.top-bar.notifications.errors.invalidAccountId');
            case 'ERP11465':
                return this.translate.getInstant('layout.top-bar.notifications.errors.invalidNotificationId');
            default:
                return null;
        }
    }

    private getParentEntityHeaderErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return this.translate.getInstant('entities.contact.errors.invalidEntityId');
            default:
                return null;
        }
    }

    private showTopBarNotificationsLoadNetworkError(): void {
        this.messageService.add({
            severity: 'error',
            summary: this.translate.getInstant('common.error'),
            detail: this.translate.getInstant('layout.top-bar.notifications.errors.loadFailedNetwork'),
        });
    }

    private showTopBarNotificationsActionNetworkError(): void {
        this.messageService.add({
            severity: 'error',
            summary: this.translate.getInstant('common.error'),
            detail: this.translate.getInstant('layout.top-bar.notifications.errors.actionFailedNetwork'),
        });
    }

    private showTopBarHeaderNetworkError(): void {
        this.messageService.add({
            severity: 'error',
            summary: this.translate.getInstant('common.error'),
            detail: this.translate.getInstant('layout.top-bar.header.errors.network'),
        });
    }

}
