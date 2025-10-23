import { ChangeDetectorRef, Component, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { MenuService } from '../app-menu/app.menu.service';
import { AppSidebarComponent } from '../app-sidebar/app.sidebar.component';
import { AppTopbarComponent } from '../top-bar/app.topbar.component';
import { LayoutService } from '../app-services/app.layout.service';
import { constants } from 'src/app/core/constatnts/constatnts';
import { AwarenessCampaignScheduleUserQuoteService } from '../app-services/awareness-campaign-schedule-user-quote.service';
import { MessageService } from 'primeng/api';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { NetworkStatusService } from 'src/app/core/Services/network-status.service';

@Component({
    selector: 'app-layout',
    templateUrl: './app.layout.component.html',
})
export class AppLayoutComponent implements OnInit, OnDestroy {
    quoteDialog: boolean = false;
    visible: boolean = false;
    isInternetWork: boolean = true;
    companyLogo: string = '../../assets/images/companyDefaultLogo.png';

    currentQuoteIndex = 0;

    responsiveOptions: any[] | undefined;
    actions = constants.pageActions;
    overlayMenuOpenSubscription: Subscription;

    topbarMenuOpenSubscription: Subscription;

    menuProfileOpenSubscription: Subscription;

    menuOutsideClickListener: any;

    menuScrollListener: any;

    topbarMenuOutsideClickListener: any;

    menuProfileOutsideClickListener: any;

    @ViewChild(AppSidebarComponent) appSidebar!: AppSidebarComponent;

    @ViewChild(AppTopbarComponent) appTopbar!: AppTopbarComponent;

    constructor(
        private menuService: MenuService,
        public layoutService: LayoutService,
        public renderer: Renderer2,
        public router: Router,
        private userQuoteService: AwarenessCampaignScheduleUserQuoteService,
        private messageService: MessageService,
        private localStorage: LocalStorageService,
        private ref: ChangeDetectorRef,
        private networkStatusService: NetworkStatusService
    ) {

        this.networkStatusService.getNetworkStatus().subscribe((status) => {
            this.isInternetWork = status;
        });
        this.hideMenuProfile();

        this.overlayMenuOpenSubscription = this.layoutService.overlayOpen$.subscribe(() => {
            this.hideTopbarMenu();

            if (!this.menuOutsideClickListener) {
                this.menuOutsideClickListener = this.renderer.listen('document', 'click', (event) => {
                    const isOutsideClicked = !(
                        this.appSidebar.el.nativeElement.isSameNode(event.target) ||
                        this.appSidebar.el.nativeElement.contains(event.target) ||
                        this.appTopbar.menuButton.nativeElement.isSameNode(event.target) ||
                        this.appTopbar.menuButton.nativeElement.contains(event.target)
                    );
                    if (isOutsideClicked) {
                        this.hideMenu();
                    }
                });
            }

            if (
                (this.layoutService.isHorizontal() || this.layoutService.isSlim() || this.layoutService.isSlimPlus()) &&
                !this.menuScrollListener
            ) {
                this.menuScrollListener = this.renderer.listen(
                    this.appSidebar.menuContainer.nativeElement,
                    'scroll',
                    (event) => {
                        if (this.layoutService.isDesktop()) {
                            this.hideMenu();
                        }
                    }
                );
            }

            if (this.layoutService.state.staticMenuMobileActive) {
                this.blockBodyScroll();
            }
        });

        this.topbarMenuOpenSubscription = this.layoutService.topbarMenuOpen$.subscribe(() => {
            if (!this.topbarMenuOutsideClickListener) {
                this.topbarMenuOutsideClickListener = this.renderer.listen('document', 'click', (event) => {
                    const isOutsideClicked = !(
                        this.appTopbar.el.nativeElement.isSameNode(event.target) ||
                        this.appTopbar.el.nativeElement.contains(event.target) ||
                        this.appTopbar.mobileMenuButton.nativeElement.isSameNode(event.target) ||
                        this.appTopbar.mobileMenuButton.nativeElement.contains(event.target)
                    );
                    if (isOutsideClicked) {
                        this.hideTopbarMenu();
                    }
                });
            }

            if (this.layoutService.state.staticMenuMobileActive) {
                this.blockBodyScroll();
            }
        });

        this.menuProfileOpenSubscription = this.layoutService.menuProfileOpen$.subscribe(() => {
            this.hideMenu();

            if (!this.menuProfileOutsideClickListener) {
                this.menuProfileOutsideClickListener = this.renderer.listen('document', 'click', (event) => {
                    const isOutsideClicked = !(
                        this.appSidebar.menuProfile.el.nativeElement.isSameNode(event.target) ||
                        this.appSidebar.menuProfile.el.nativeElement.contains(event.target)
                    );
                    if (isOutsideClicked) {
                        this.hideMenuProfile();
                    }
                });
            }
        });

        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            this.hideMenu();
            this.hideTopbarMenu();
            this.hideMenuProfile();
        });
    }

    closeOtherTabs() {
        this.showSessionWarning = false;
    }

    showSessionWarning = false;
    sessionWarningMessage = '';

    ngOnInit(): void {
        this.fetchCompanyLogo();
        this.responsiveOptions = [
            {
                breakpoint: '1199px',
                numVisible: 1,
                numScroll: 1,
            },
            {
                breakpoint: '991px',
                numVisible: 2,
                numScroll: 1,
            },
            {
                breakpoint: '767px',
                numVisible: 1,
                numScroll: 1,
            },
        ];
        // Get theme from local storage and apply it
        const userData = this.localStorage.getCurrentUserData();
        const theme = userData?.theme || 'light'; // Fallback to 'light' if no theme found
        this.applyUserTheme(theme); // Apply the theme
    }

    applyUserTheme(theme: string) {
        // Call the method to apply the user theme using your LayoutService
        this.layoutService.applyUserTheme(theme);
        this.ref.detectChanges(); // Manually trigger change detection
    }







    blockBodyScroll(): void {
        if (document.body.classList) {
            document.body.classList.add('blocked-scroll');
        } else {
            document.body.className += ' blocked-scroll';
        }
    }

    unblockBodyScroll(): void {
        if (document.body.classList) {
            document.body.classList.remove('blocked-scroll');
        } else {
            document.body.className = document.body.className.replace(
                new RegExp('(^|\\b)' + 'blocked-scroll'.split(' ').join('|') + '(\\b|$)', 'gi'),
                ' '
            );
        }
    }

    hideMenu() {
        this.layoutService.state.overlayMenuActive = false;
        this.layoutService.state.staticMenuMobileActive = false;
        this.layoutService.state.menuHoverActive = false;
        this.menuService.reset();

        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
            this.menuOutsideClickListener = null;
        }

        if (this.menuScrollListener) {
            this.menuScrollListener();
            this.menuScrollListener = null;
        }
        this.unblockBodyScroll();
    }

    hideTopbarMenu() {
        this.layoutService.state.topbarMenuActive = false;

        if (this.topbarMenuOutsideClickListener) {
            this.topbarMenuOutsideClickListener();
            this.topbarMenuOutsideClickListener = null;
        }
    }

    hideMenuProfile() {
        this.layoutService.state.menuProfileActive = false;

        if (this.menuProfileOutsideClickListener) {
            this.menuProfileOutsideClickListener();
            this.menuProfileOutsideClickListener = null;
        }
    }

    get containerClass() {
        let styleClass: { [key: string]: any } = {
            'layout-overlay': this.layoutService.config().menuMode === 'overlay',
            'layout-static': this.layoutService.config().menuMode === 'static',
            'layout-slim': this.layoutService.config().menuMode === 'slim',
            'layout-slim-plus': this.layoutService.config().menuMode === 'slim-plus',
            'layout-horizontal': this.layoutService.config().menuMode === 'horizontal',
            'layout-reveal': this.layoutService.config().menuMode === 'reveal',
            'layout-drawer': this.layoutService.config().menuMode === 'drawer',
            'p-input-filled': this.layoutService.config().inputStyle === 'filled',
            'p-ripple-disabled': !this.layoutService.config().ripple,
            'layout-static-inactive':
                this.layoutService.state.staticMenuDesktopInactive && this.layoutService.config().menuMode === 'static',
            'layout-overlay-active': this.layoutService.state.overlayMenuActive,
            'layout-mobile-active': this.layoutService.state.staticMenuMobileActive,
            'layout-topbar-menu-active': this.layoutService.state.topbarMenuActive,
            'layout-menu-profile-active': this.layoutService.state.menuProfileActive,
            'layout-sidebar-active': this.layoutService.state.sidebarActive,
            'layout-sidebar-anchored': this.layoutService.state.anchored,
        };

        styleClass['layout-topbar-' + this.layoutService.config().topbarTheme] = true;
        styleClass['layout-menu-' + this.layoutService.config().menuTheme] = true;
        styleClass['layout-menu-profile-' + this.layoutService.config().menuProfilePosition] = true;
        return styleClass;
    }



    updateShowingTimeForQuote(awarenessCampaignScheduleUserQuoteId: string) {
        this.userQuoteService.updateShowingTimeForQuote(awarenessCampaignScheduleUserQuoteId).subscribe({
            next: () => { },
            error: (error) => {

            },
        });
    }

    updateHideTimeForQuote(awarenessCampaignScheduleUserQuoteId: string) {
        this.userQuoteService.updateHideTimeForQuote(awarenessCampaignScheduleUserQuoteId).subscribe({
            next: () => { },
            error: (error) => {

            },
        });
    }

    fetchCompanyLogo() {
        this.layoutService.getCompanyLogo().subscribe({
            next: (logo) => {
                this.companyLogo = logo.data ?? this.companyLogo;
            },
        });
    }

    ngOnDestroy() {
        if (this.overlayMenuOpenSubscription) {
            this.overlayMenuOpenSubscription.unsubscribe();
        }

        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
        }
    }
}
