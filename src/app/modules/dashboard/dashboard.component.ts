import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { AuthService } from '../auth/services/auth.service';

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

    constructor(
        private localStorageService: LocalStorageService,
        private router: Router,
        public translate: TranslationService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.loadUserData();
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

    getDashboardCategories(): any[] {
        // Show all categories for now - role-based filtering will be implemented later
        return [
            {
                title: this.translate.getInstant('dashboard.summary'),
                items: [
                    { icon: '⚡', label: this.translate.getInstant('dashboard.actions'), route: '/summary/actions' },
                    { icon: '🔔', label: this.translate.getInstant('dashboard.notifications'), route: '/summary/notifications' },
                    { icon: '👤', label: this.translate.getInstant('dashboard.profile'), route: '/summary/profile' },
                    { icon: '⚙️', label: this.translate.getInstant('dashboard.settings'), route: '/summary/settings' },
                    { icon: '🚪', label: this.translate.getInstant('dashboard.logout'), route: '/summary/logout' }
                ]
            },
            {
                title: this.translate.getInstant('dashboard.companyAdministration'),
                items: [
                    { icon: '🏢', label: this.translate.getInstant('dashboard.companyDetails'), route: '/company-administration/entities/list' },
                    { icon: '👥', label: this.translate.getInstant('dashboard.usersDetails'), route: '/company-administration/users-details' },
                    { icon: '🔄', label: this.translate.getInstant('dashboard.workflows'), route: '/company-administration/workflows' }
                ]
            },
            {
                title: this.translate.getInstant('dashboard.documentControl'),
                items: [
                    { icon: '📄', label: this.translate.getInstant('dashboard.sharedDocuments'), route: '/document-control' }
                ]
            },
            {
                title: this.translate.getInstant('dashboard.humanResources'),
                items: [
                    { icon: '🧑‍💼', label: 'My Timesheets', route: '/human-resources/timesheets' },
                    { icon: '🧾', label: 'Approvals', route: '/human-resources/supervisor-timesheets' },
                    { icon: '📈', label: 'Reports', route: '/human-resources/admin-timesheets' },
                    { icon: '📝', label: this.translate.getInstant('dashboard.contract'), route: '/human-resources/contract' }
                ]
            },
            {
                title: this.translate.getInstant('dashboard.financials'),
                items: [
                    { icon: '🧾', label: this.translate.getInstant('dashboard.invoices'), route: '/financials' }
                ]
            }
        ];
    }

    navigateToRoute(route: string): void {
        if (route === '/summary/logout') {
            // Show logout confirmation dialog
            this.showLogoutDialog = true;
        } else {
            this.router.navigate([route]);
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

    onLogoutCancel() {
        // User cancelled logout, dialog will close automatically
    }
}
