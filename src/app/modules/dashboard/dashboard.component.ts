import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
export class DashboardComponent implements OnInit {
    currentUser: any = null;
    userRole: string = '';
    userName: string = '';
    showLogoutDialog: boolean = false; // Track logout dialog visibility
    dashboardCategories: IMenuFunction[] = [];

    constructor(
        private localStorageService: LocalStorageService,
        private router: Router,
        public translate: TranslationService,
        private dialogService: DialogService,
        private authService: AuthService,
        private moduleNavigationService: ModuleNavigationService
    ) { }

    ngOnInit(): void {
        this.loadUserData();
        this.loadDashboardCategories();
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

}