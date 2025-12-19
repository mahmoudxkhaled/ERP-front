import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { AuthService } from '../auth/services/auth.service';
import { LogoutComponent } from '../auth/components/logout/logout.component';
import { DialogService } from 'primeng/dynamicdialog';
import { IMenuFunction, IMenuModule } from 'src/app/core/models/account-status.model';
import { ModuleNavigationService } from 'src/app/core/services/module-navigation.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
    currentUser: any = null;
    userRole: string = '';
    userName: string = '';
    showLogoutDialog: boolean = false; // Track logout dialog visibility
    dashboardCategories: IMenuFunction[] = [];
    highlightedModuleCode: string | null = null;

    constructor(
        private localStorageService: LocalStorageService,
        private router: Router,
        private route: ActivatedRoute,
        public translate: TranslationService,
        private dialogService: DialogService,
        private authService: AuthService,
        private moduleNavigationService: ModuleNavigationService
    ) { }

    ngOnInit(): void {
        this.loadUserData();
        this.loadDashboardCategories();

        // Check for module URL query parameter
        this.route.queryParams.subscribe(params => {
            if (params['moduleUrl']) {
                // Wait for view to initialize before scrolling
                setTimeout(() => {
                    this.scrollToModule(params['moduleUrl']);
                }, 100);
            }
        });
    }

    ngAfterViewInit(): void {
        // Check query params again after view init in case they were set before view loaded
        const moduleUrl = this.route.snapshot.queryParams['moduleUrl'];
        if (moduleUrl) {
            setTimeout(() => {
                this.scrollToModule(moduleUrl);
            }, 200);
        }
    }

    loadUserData(): void {
        this.currentUser = this.localStorageService.getCurrentUserData();
        if (this.currentUser && this.currentUser.data) {
            this.userRole = this.currentUser.data.role || 'employee';
            this.userName = `${this.currentUser.data.firstName} ${this.currentUser.data.lastName}`;
        }
    }

    getRoleDisplayName(role: string): string {
        return role.replace('-', ' ').toUpperCase();
    }

    loadDashboardCategories(): void {
        this.dashboardCategories = this.moduleNavigationService.getFunctionsWithModules();
    }

    getDashboardCategories(): IMenuFunction[] {
        return this.dashboardCategories;
    }

    /**
     * Get default icon for module (fallback when logo not available)
     */
    getModuleIcon(module: IMenuModule): string {
        if (module.icon) {
            return module.icon;
        }
        return this.getDefaultModuleIcon(module.code);
    }

    /**
     * Get default icon for module based on code
     */
    private getDefaultModuleIcon(moduleCode: string): string {
        const iconMap: Record<string, string> = {
            'ACT': '⚡',
            'NOT': '🔔',
            'PRF': '👤',
            'SET': '⚙️',
            'LGOT': '🚪',
            'SDB': '📊',
            'ERPF': '🧩',
            'ERPM': '📦',
            'ENTDT': '🏢',
            'USRACC': '👥',
            'WF': '🔄',
            'EACC': '💼',
            'SHDOC': '📄',
            'FCOA': '📚',
            'AP': '💰',
            'AR': '💵',
            'GL': '📖',
            'OC': '🏛️',
            'PRSN': '👔',
            'TS': '⏰',
            'CLNT': '🤝',
            'EST': '📊',
            'TND': '📋',
            'MC': '📝',
            'CINV': '🧾',
            'VND': '🚚',
            'PO': '🛒',
            'SC': '📄',
            'VINV': '🧾',
            'WBS': '📐',
            'CBS': '📊',
            'QS': '📏',
            'BUDG': '💵',
            'CRPT': '📈',
            'PRPT': '📊'
        };
        return iconMap[moduleCode] || '📁';
    }

    /**
     * Handle module click - navigate to module route
     */
    onModuleClick(module: IMenuModule): void {
        // Special handling for logout
        if (module.code === 'LGOT') {
            this.logOut();
            return;
        }

        // Navigate if module has a valid route and is implemented
        if (module.url && module.isImplemented) {
            this.router.navigateByUrl(module.url);
        }
    }

    onLogoutConfirm() {
        // User confirmed logout, proceed with logout
        this.authService.logout().subscribe((r) => {
            if (r.success) {
                this.router.navigate(['/auth']);
            }
        });
    }

    logOut() {
        this.dialogService.open(LogoutComponent, {
            showHeader: true,
            header: this.translate.getInstant('shared.headers.confirmLogout'),
            styleClass: 'custom-dialog',
            maskStyleClass: 'custom-backdrop',
            dismissableMask: true,
            width: '30vw',
            closable: true,
        });
    }

    /**
     * Find module by URL in dashboard categories
     */
    findModuleByUrl(url: string): IMenuModule | null {
        for (const category of this.dashboardCategories) {
            for (const module of category.modules) {
                if (module.url === url) {
                    return module;
                }
                // Handle partial matches
                if (module.url && url) {
                    const normalizedModuleUrl = module.url.trim().replace(/^\/+|\/+$/g, '');
                    const normalizedUrl = url.trim().replace(/^\/+|\/+$/g, '');
                    if (normalizedModuleUrl === normalizedUrl ||
                        normalizedModuleUrl.startsWith(normalizedUrl + '/') ||
                        normalizedUrl.startsWith(normalizedModuleUrl + '/')) {
                        return module;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Scroll to module card and highlight it
     */
    scrollToModule(moduleUrl: string): void {
        const module = this.findModuleByUrl(moduleUrl);
        if (!module) {
            return;
        }

        // Find the module card element by code
        const moduleElement = document.getElementById(`module-card-${module.code}`);
        if (moduleElement) {
            // Scroll to element with offset for header
            const offset = 100; // Adjust based on your header height
            const elementPosition = moduleElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            // Highlight the module
            this.highlightedModuleCode = module.code;

            // Remove highlight after animation
            setTimeout(() => {
                this.highlightedModuleCode = null;
            }, 3000);

            // Clear query parameter after scrolling
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: {},
                replaceUrl: true
            });
        }
    }

    /**
     * Check if module is currently highlighted
     */
    isModuleHighlighted(moduleCode: string): boolean {
        return this.highlightedModuleCode === moduleCode;
    }

}