import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    currentUser: any = null;
    userRole: string = '';
    userName: string = '';

    constructor(
        private localStorageService: LocalStorageService,
        private router: Router
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
        const baseCategories = [
            {
                title: 'Summary',
                items: [
                    { icon: '⚡', label: 'Actions', route: '/actions' },
                    { icon: '🔔', label: 'Notifications', route: '/notifications' },
                    { icon: '👤', label: 'Profile', route: '/profile' },
                    { icon: '⚙️', label: 'Settings', route: '/settings' },
                    { icon: '🚪', label: 'Logout', route: '/logout' }
                ]
            }
        ];

        // Add role-specific categories
        if (this.userRole === 'system-admin' || this.userRole === 'company-admin') {
            baseCategories.push({
                title: 'Company Administration',
                items: [
                    { icon: '🏢', label: 'Company Details', route: '/company-details' },
                    { icon: '👥', label: 'Users Details', route: '/users' },
                    { icon: '🔄', label: 'Workflows', route: '/workflows' }
                ]
            });
        }

        if (this.userRole === 'system-admin' || this.userRole === 'company-admin' || this.userRole === 'supervisor') {
            baseCategories.push({
                title: 'Document Control',
                items: [
                    { icon: '📄', label: 'Shared Documents', route: '/documents' }
                ]
            });

            baseCategories.push({
                title: 'Human Resources',
                items: [
                    { icon: '🧑‍💼', label: 'Timesheets', route: '/timesheets' },
                    { icon: '📝', label: 'Contract', route: '/contracts' }
                ]
            });
        }

        if (this.userRole === 'system-admin' || this.userRole === 'company-admin') {
            baseCategories.push({
                title: 'Financials',
                items: [
                    { icon: '🧾', label: 'Invoices', route: '/invoices' }
                ]
            });
        }

        return baseCategories;
    }

    navigateToRoute(route: string): void {
        if (route === '/logout') {
            // Handle logout
            this.localStorageService.removeItem('userData');
            this.router.navigate(['/auth']);
        } else {
            this.router.navigate([route]);
        }
    }
}
