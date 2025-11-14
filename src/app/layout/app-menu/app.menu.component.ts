import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from '../../core/Services/translation.service';
import { AuthService } from '../../modules/auth/services/auth.service';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html',
})
export class AppMenuComponent implements OnInit {
    model: any[] = [];
    currentPages: any;
    showLogoutDialog: boolean = false; // Track logout dialog visibility

    constructor(
        private translate: TranslationService,
        private router: Router,
        private authService: AuthService
    ) {
    }

    ngOnInit(): void {
        this.buildMenu();
        this.translate.getCurrentLang().subscribe(() => {
            this.onLangChange();
        });
    }
    onLangChange(): void {
        this.buildMenu();
    }

    buildMenu() {
        this.model = [
            {
                label: this.translate.getInstant('menu.summary'),
                hasPermession: true,
                icon: 'fa fa-chart-pie',
                items: [
                    {
                        label: this.translate.getInstant('menu.actions'),
                        hasPermession: true,
                        icon: 'fa fa-bolt',
                        routerLink: ['/summary/actions']
                    },
                    {
                        label: this.translate.getInstant('menu.notifications'),
                        hasPermession: true,
                        icon: 'fa fa-bell',
                        routerLink: ['/summary/notifications']
                    },
                    {
                        label: this.translate.getInstant('menu.profile'),
                        hasPermession: true,
                        icon: 'fa fa-user',
                        routerLink: ['/summary/profile']
                    },
                    {
                        label: this.translate.getInstant('menu.settings'),
                        hasPermession: true,
                        icon: 'fa fa-cog',
                        routerLink: ['/summary/settings']
                    },
                    {
                        label: this.translate.getInstant('menu.logout'),
                        hasPermession: true,
                        icon: 'fa fa-sign-out-alt',
                        command: () => this.handleLogout()
                    },
                ],
            },
            {
                label: this.translate.getInstant('menu.companyAdministration'),
                hasPermession: true,
                icon: 'fa fa-building',
                items: [
                    {
                        label: this.translate.getInstant('menu.companyDetails'),
                        hasPermession: true,
                        icon: 'fa fa-building',
                        routerLink: ['/company-administration/entities/list']
                    },
                    {
                        label: this.translate.getInstant('menu.usersDetails'),
                        hasPermession: true,
                        icon: 'fa fa-users',
                        routerLink: ['/company-administration/users-details']
                    },
                    {
                        label: this.translate.getInstant('menu.workflows'),
                        hasPermession: true,
                        icon: 'fa fa-sync-alt',
                        routerLink: ['/company-administration/workflows']
                    },
                ],
            },
            {
                label: this.translate.getInstant('menu.documentControl'),
                hasPermession: true,
                icon: 'fa fa-file-alt',
                items: [
                    {
                        label: this.translate.getInstant('menu.sharedDocuments'),
                        hasPermession: true,
                        icon: 'fa fa-file-alt',
                        routerLink: ['/document-control']
                    },
                ],
            },
            {
                label: this.translate.getInstant('menu.humanResources'),
                hasPermession: true,
                icon: 'fa fa-user-tie',
                items: [
                    {
                        label: 'My Timesheets',
                        hasPermession: true,
                        icon: 'fa fa-clock',
                        routerLink: ['/human-resources/timesheets']
                    },
                    {
                        label: 'Approvals',
                        hasPermession: true,
                        icon: 'fa fa-check-circle',
                        routerLink: ['/human-resources/supervisor-timesheets']
                    },
                    {
                        label: 'Reports',
                        hasPermession: true,
                        icon: 'fa fa-chart-line',
                        routerLink: ['/human-resources/admin-timesheets']
                    },
                    {
                        label: this.translate.getInstant('menu.contract'),
                        hasPermession: true,
                        icon: 'fa fa-file-contract',
                        routerLink: ['/human-resources/contract']
                    },
                ],
            },
            {
                label: this.translate.getInstant('menu.financials'),
                hasPermession: true,
                icon: 'fa fa-receipt',
                items: [
                    {
                        label: this.translate.getInstant('menu.invoices'),
                        hasPermession: true,
                        icon: 'fa fa-receipt',
                        routerLink: ['/financials']
                    },
                ],
            },
        ];
    }

    hassPermession(pageName: string): boolean {
        // return this.currentPages.includes(pageName);
        return true;
    }

    handleLogout(): void {
        // Show logout confirmation dialog
        this.showLogoutDialog = true;
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