import { Injectable, effect, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiResult } from 'src/app/core/Dtos/ApiResult';
import { DataService } from 'src/app/core/Services/data-service.service';

export type MenuMode = 'static' | 'overlay' | 'horizontal' | 'slim' | 'slim-plus' | 'reveal' | 'drawer';

export type ColorScheme = 'light' | 'dark';

export interface AppConfig {
    inputStyle: string;
    colorScheme: ColorScheme;
    componentTheme: string;
    ripple: boolean;
    menuMode: MenuMode;
    scale: number;
    menuTheme: ColorScheme;
    topbarTheme: string;
    menuProfilePosition: string;
}

interface LayoutState {
    staticMenuMobileActive: boolean;
    overlayMenuActive: boolean;
    staticMenuDesktopInactive: boolean;
    configSidebarVisible: boolean;
    menuHoverActive: boolean;
    rightMenuActive: boolean;
    topbarMenuActive: boolean;
    menuProfileActive: boolean;
    sidebarActive: boolean;
    anchored: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class LayoutService {
    _config: AppConfig = {
        ripple: true,
        inputStyle: 'outlined',
        menuMode: 'static',
        colorScheme: 'light',
        componentTheme: 'purple',
        scale: 14,
        menuTheme: 'light',
        topbarTheme: 'purple',
        menuProfilePosition: 'start',
    };

    state: LayoutState = {
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false,
        rightMenuActive: false,
        topbarMenuActive: false,
        menuProfileActive: false,
        sidebarActive: false,
        anchored: false,
    };

    config = signal<AppConfig>(this._config);

    private configUpdate = new Subject<AppConfig>();
    private overlayOpen = new Subject<any>();
    private topbarMenuOpen = new Subject<any>();
    private menuProfileOpen = new Subject<any>();
    configUpdate$ = this.configUpdate.asObservable();
    overlayOpen$ = this.overlayOpen.asObservable();
    topbarMenuOpen$ = this.topbarMenuOpen.asObservable();
    menuProfileOpen$ = this.menuProfileOpen.asObservable();

    constructor(private dataService: DataService) {
        effect(() => {
            const config = this.config();
            if (this.updateStyle(config)) {
                this.changeTheme();
            }

            this.changeScale(config.scale);
            this.onConfigUpdate();
        });
    }

    updateStyle(config: AppConfig) {
        return config.componentTheme !== this._config.componentTheme || config.colorScheme !== this._config.colorScheme;
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.state.overlayMenuActive = !this.state.overlayMenuActive;

            if (this.state.overlayMenuActive) {
                this.overlayOpen.next(null);
            }
        }

        if (this.isDesktop()) {
            this.state.staticMenuDesktopInactive = !this.state.staticMenuDesktopInactive;
        } else {
            this.state.staticMenuMobileActive = !this.state.staticMenuMobileActive;

            if (this.state.staticMenuMobileActive) {
                this.overlayOpen.next(null);
            }
        }
    }

    onTopbarMenuToggle() {
        this.state.topbarMenuActive = !this.state.topbarMenuActive;
        if (this.state.topbarMenuActive) {
            this.topbarMenuOpen.next(null);
        }
    }

    onOverlaySubmenuOpen() {
        this.overlayOpen.next(null);
    }

    showConfigSidebar() {
        this.state.configSidebarVisible = true;
    }

    isOverlay() {
        return this.config().menuMode === 'overlay';
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isSlim() {
        return this.config().menuMode === 'slim';
    }

    isSlimPlus() {
        return this.config().menuMode === 'slim-plus';
    }

    isHorizontal() {
        return this.config().menuMode === 'horizontal';
    }

    isMobile() {
        return !this.isDesktop();
    }

    onConfigUpdate() {
        this._config = { ...this.config() };
        this.configUpdate.next(this.config());
    }

    isRightMenuActive(): boolean {
        return this.state.rightMenuActive;
    }

    openRightSidebar(): void {
        this.state.rightMenuActive = true;
    }

    onMenuProfileToggle() {
        this.state.menuProfileActive = !this.state.menuProfileActive;
        if (this.state.menuProfileActive && this.isHorizontal() && this.isDesktop()) {
            this.menuProfileOpen.next(null);
        }
    }
    
    ///////////////////////////////////////////////////////////////////////
    // changeTheme() {
    //     let { colorScheme, componentTheme } = this.config();
    //     console.log(colorScheme);
    //     console.log(componentTheme);
    //     const themeLink = <HTMLLinkElement>document.getElementById('theme-link');
    //     const themeLinkHref = themeLink.getAttribute('href')!;
    //     const newHref = themeLinkHref
    //         .split('/')
    //         .map((el) =>
    //             el == this._config.componentTheme
    //                 ? (el = componentTheme)
    //                 : el == `theme-${this._config.colorScheme}`
    //                 ? (el = `theme-${colorScheme}`)
    //                 : el
    //         )
    //         .join('/');
    //     this.replaceThemeLink(newHref);
    // }

    changeTheme() {
        // Destructure the current config values
        const { colorScheme, componentTheme } = this.config();

        // Debugging the current config values
        // console.log('colorScheme:', colorScheme); // Should log "light" or "dark"
        // console.log('componentTheme:', componentTheme); // Should log the correct component theme (e.g., "purple")

        const themeLink = <HTMLLinkElement>document.getElementById('theme-link');
        const themeLinkHref = themeLink.getAttribute('href')!;

        // Log the current theme link href for debugging
        // console.log('Current theme link href:', themeLinkHref);

        // Apply the transformation to update the color scheme and component theme in the URL
        const newHref = themeLinkHref
            .split('/')
            .map((el) => {
                if (el.startsWith('theme-')) {
                    return `theme-${colorScheme}`; // Directly replace the color scheme (e.g., "theme-light" or "theme-dark")
                } else if (el === this._config.componentTheme) {
                    return componentTheme; // Directly replace the component theme
                }
                return el; // Keep other parts of the URL unchanged
            })
            .join('/');

        // Log the updated theme link href for debugging
        // console.log('Updated theme link href:', newHref);

        // Replace the theme link in the document
        this.replaceThemeLink(newHref);
    }

    replaceThemeLink(href: string) {
        // console.log(href);
        const id = 'theme-link';
        let themeLink = <HTMLLinkElement>document.getElementById(id);
        const cloneLinkElement = <HTMLLinkElement>themeLink.cloneNode(true);

        cloneLinkElement.setAttribute('href', href);
        cloneLinkElement.setAttribute('id', id + '-clone');

        themeLink.parentNode!.insertBefore(cloneLinkElement, themeLink.nextSibling);
        cloneLinkElement.addEventListener('load', () => {
            themeLink.remove();
            cloneLinkElement.setAttribute('id', id);
        });
    }

    applyUserTheme(theme: string) {
        // Validate the theme and fallback to 'light' if invalid
        const validTheme: 'light' | 'dark' = theme === 'light' || theme === 'dark' ? theme : 'light';

        // Access the current layout configuration
        const config = this.config();
        config.colorScheme = validTheme; // Update the color scheme
        config.menuTheme = validTheme; // Update the menu theme

        // Set the updated configuration in the layout service
        this.config.set(config);

        // Call the method to change the theme, based on the updated color scheme
        this.changeTheme();
    }

    changeScale(value: number) {
        document.documentElement.style.fontSize = `${value}px`;
    }

    getCompanyLogo(): Observable<ApiResult> {
        return this.dataService.getAllReguest<ApiResult>('/Tenant/GetTenantLogo');
    }

    getCompanyLogoVI(): Observable<ApiResult> {
        return this.dataService.getAllReguest<ApiResult>('/Tenant/GetTenantLogoVI');
    }

    getUserPoints() {
        this.dataService.getAllReguest<ApiResult>('/PointingType/GetUserPoints');
    }
}
