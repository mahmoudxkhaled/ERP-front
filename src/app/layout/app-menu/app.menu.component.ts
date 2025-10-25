import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { TranslationService } from '../../core/Services/translation.service';
import { constants } from '../../core/constatnts/constatnts';

@Component({
    selector: 'app-menu',
    templateUrl: './app.menu.component.html',
})
export class AppMenuComponent implements OnInit {
    model: any[] = [];
    currentPages: any;
    iAwarePages = constants.pages;
    iAwareActions = constants.pageActions;

    constructor(private translate: TranslationService) {
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
                    },
                    {
                        label: this.translate.getInstant('menu.notifications'),
                        hasPermession: true,
                        icon: 'fa fa-bell',
                    },
                    {
                        label: this.translate.getInstant('menu.profile'),
                        hasPermession: true,
                        icon: 'fa fa-user',
                    },
                    {
                        label: this.translate.getInstant('menu.settings'),
                        hasPermession: true,
                        icon: 'fa fa-cog',
                    },
                    {
                        label: this.translate.getInstant('menu.logout'),
                        hasPermession: true,
                        icon: 'fa fa-sign-out-alt',
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
                    },
                    {
                        label: this.translate.getInstant('menu.usersDetails'),
                        hasPermession: true,
                        icon: 'fa fa-users',
                    },
                    {
                        label: this.translate.getInstant('menu.workflows'),
                        hasPermession: true,
                        icon: 'fa fa-sync-alt',
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
                    },
                ],
            },
            {
                label: this.translate.getInstant('menu.humanResources'),
                hasPermession: true,
                icon: 'fa fa-user-tie',
                items: [
                    {
                        label: this.translate.getInstant('menu.timesheets'),
                        hasPermession: true,
                        icon: 'fa fa-clock',
                    },
                    {
                        label: this.translate.getInstant('menu.contract'),
                        hasPermession: true,
                        icon: 'fa fa-file-contract',
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
                    },
                ],
            },
        ];
    }

    hassPermession(pageName: string): boolean {
        // return this.currentPages.includes(pageName);
        return true;
    }
}