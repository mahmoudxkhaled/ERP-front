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
                label: this.translate.getInstant('menu.iAwareTeam'),
                hasPermession: this.hassPermession(this.iAwarePages.iAwarePortal),
                icon: 'fa fa-home',
                items: [
                    {
                        label: this.translate.getInstant('menu.dashboard'),
                        hasPermession: true,
                        icon: 'fa fa-chart-pie',
                        routerLink: [''],
                    },
                    {
                        label: this.translate.getInstant('menu.awarenessCampaigns'),
                        hasPermession: this.hassPermession(this.iAwarePages.trainingCampaigns),
                        icon: 'fa fa-lightbulb',
                        routerLink: ['/training-campaign'],
                    },
                    {
                        label: this.translate.getInstant('menu.phishingAwarenessCampaigns'),
                        hasPermession: this.hassPermession(this.iAwarePages.phishingCampaigns),
                        icon: 'fa fa-shield-alt',
                        routerLink: ['/phishing-campaigns'],
                    },
                    {
                        label: this.translate.getInstant('menu.awarenessCampaign'),
                        hasPermession: this.hassPermession(this.iAwarePages.campaignManagement),
                        icon: 'fa fa-cogs',
                        routerLink: ['/campaign-management'],
                    },
                    {
                        label: this.translate.getInstant('menu.trainingCategory'),
                        hasPermession: this.hassPermession(this.iAwarePages.securityTraining),
                        icon: 'fa fa-table',
                        routerLink: ['/Security-Training/Training-Lesson-Category'],
                    },
                    {
                        label: this.translate.getInstant('menu.training'),
                        hasPermession: this.hassPermession(this.iAwarePages.trainingLessonCateogry),
                        icon: 'fa fa-book',
                        routerLink: ['/Security-Training/Security-Training-List'],
                    },
                    {
                        label: this.translate.getInstant('menu.trainingLibrary'),
                        hasPermession: true,
                        icon: 'fa fa-graduation-cap',
                        items: [
                            {
                                label: this.translate.getInstant('By Category'),
                                hasPermession: true,
                                icon: 'fa fa-folder-open',
                                routerLink: ['/multimedia/Categories'],
                            },
                            {
                                label: this.translate.getInstant('By Lessons'),
                                hasPermession: true,
                                icon: 'fa fa-book-open',
                                routerLink: ['/multimedia/Lessons'],
                            },
                        ]
                    },
                    {
                        label: this.translate.getInstant('menu.users'),
                        hasPermession: this.hassPermession(this.iAwarePages.users),
                        icon: 'fa fa-users',
                        routerLink: ['users'],
                    },
                    {
                        label: this.translate.getInstant('menu.roles'),
                        hasPermession: this.hassPermession(this.iAwarePages.role),
                        icon: 'fa fa-user-tag',
                        routerLink: ['roles'],
                    },
                    {
                        label: this.translate.getInstant('menu.leaderboard'),
                        hasPermession: this.hassPermession(this.iAwarePages.leaderboard),
                        icon: 'fa fa-chart-line',
                        routerLink: ['leaderboard'],
                    },
                    {
                        label: this.translate.getInstant('menu.badges'),
                        hasPermession: this.hassPermession(this.iAwarePages.badge),
                        icon: 'fa fa-award',
                        routerLink: ['badge'],
                    },
                    {
                        label: this.translate.getInstant('menu.gamification'),
                        hasPermession: this.hassPermession(this.iAwarePages.gamification),
                        icon: 'fa fa-gamepad',
                        routerLink: ['/gamification'],
                    },
                    {
                        label: this.translate.getInstant('menu.pointingSystem'),
                        hasPermession: true,
                        icon: 'fa fa-star',
                        routerLink: ['/pointing-system'],
                    },
                    {
                        label: this.translate.getInstant('menu.companyGroups'),
                        hasPermession: this.hassPermession(this.iAwarePages.tenantGroup),
                        icon: 'fa fa-building',
                        routerLink: ['tenant-group'],
                    },
                    {
                        label: this.translate.getInstant('menu.tenantUnit'),
                        hasPermession: this.hassPermession(this.iAwarePages.tenantGroup),
                        icon: 'fa fa-qrcode',
                        routerLink: ['tenantUnit'],
                    },
                    {
                        label: this.translate.getInstant('menu.subscription'),
                        hasPermession: this.hassPermession(this.iAwarePages.subscription),
                        icon: 'fa fa-box-open',
                        routerLink: ['/Subscription/SubscriptionList'],
                    },
                    {
                        label: this.translate.getInstant('menu.invoice'),
                        hasPermession: this.hassPermession(this.iAwarePages.invoice),
                        icon: 'fa fa-receipt',
                        routerLink: ['/invoice'],
                    },
                    {
                        label: this.translate.getInstant('menu.pages'),
                        hasPermession: this.hassPermession(this.iAwarePages.pageManagement),
                        icon: 'fa fa-desktop',
                        routerLink: ['pages-managment'],
                    },
                    {
                        label: this.translate.getInstant('menu.languages'),
                        hasPermession: this.hassPermession(this.iAwarePages.language),
                        icon: 'fa fa-language',
                        routerLink: ['language'],
                    },
                    {
                        label: this.translate.getInstant('menu.libraryWallpaperWizard'),
                        hasPermession: this.hassPermession(this.iAwarePages.libraryCharacter),
                        icon: 'fa fa-images',
                        routerLink: ['/wallpaper-wizard'],
                    },
                    {
                        label: this.translate.getInstant('menu.phishingCategory'),
                        hasPermession: this.hassPermession(this.iAwarePages.phishingCategory),
                        icon: 'fa fa-database',
                        routerLink: ['/phishing-category'],
                    },
                    {
                        label: this.translate.getInstant('menu.phishingTemplates'),
                        hasPermession: this.hassPermession(this.iAwarePages.phishingEmailTemplates),
                        icon: 'fa fa-file-alt',
                        routerLink: ['/phishing-templates'],
                    },
                    {
                        label: this.translate.getInstant('menu.phishingEmailDomains'),
                        hasPermession: this.hassPermession(this.iAwarePages.emailDomains),
                        icon: 'fa fa-exclamation-triangle',
                        routerLink: ['/phishing-email-domains'],
                    },
                    {
                        label: this.translate.getInstant('menu.systemEmailDomains'),
                        hasPermession: this.hassPermession(this.iAwarePages.emailDomains),
                        icon: 'fa fa-envelope',
                        routerLink: ['/system-email-domains'],
                    },
                    {
                        label: this.translate.getInstant('menu.systemEmailActivity'),
                        hasPermession: this.hassPermession(this.iAwarePages.emailDomains),
                        icon: 'fa fa-chart-line',
                        routerLink: ['/system-email-activity'],
                    },
                    {
                        label: this.translate.getInstant('menu.notifications'),
                        hasPermession: this.hassPermession(this.iAwarePages.notificationSettings),
                        icon: 'fa fa-bell',
                        routerLink: ['/notifications/NotificationList'],
                    },
                    {
                        label: this.translate.getInstant('menu.industry'),
                        hasPermession: true,
                        icon: 'fa fa-cogs',
                        routerLink: ['/industry'],
                    },
                    {
                        label: this.translate.getInstant('menu.tages'),
                        hasPermession: true,
                        icon: 'fa fa-hashtag',
                        routerLink: ['/tages'],
                    },
                    {
                        label: this.translate.getInstant('menu.marketing'),
                        hasPermession: true,
                        icon: 'fa fa-hashtag',
                        routerLink: ['/marketing'],
                        items: [
                            {
                                label: "Blogs",
                                hasPermession: true,
                                icon: 'fa fa-th-large',
                                routerLink: ['/marketing/blogs'],
                            },
                            {
                                label: "News",
                                hasPermession: true,
                                icon: 'fa fa-exclamation-triangle',
                                routerLink: ['/marketing/news'],
                            },
                        ],

                    },

                    {
                        label: this.translate.getInstant('menu.support'),
                        hasPermession: this.hassPermession(this.iAwarePages.supportCategory),
                        icon: 'fa fa-headset',
                        routerLink: ['/support'],
                        items: [
                            {
                                label: this.translate.getInstant('menu.supportCategory'),
                                hasPermession: this.hassPermession(this.iAwarePages.supportCategory),
                                icon: 'fa fa-th-large',
                                routerLink: ['/support/category'],
                            },
                            {
                                label: this.translate.getInstant('menu.supportSubjects'),
                                hasPermession: this.hassPermession(this.iAwarePages.supportSubject),
                                icon: 'fa fa-server',
                                routerLink: ['/support/subjects'],
                            },
                            {
                                label: this.translate.getInstant('menu.supportStatus'),
                                hasPermession: this.hassPermession(this.iAwarePages.supportStatus),
                                icon: 'fa fa-exclamation-triangle',
                                routerLink: ['/support/status'],
                            },
                        ],
                    },
                ],
            },
            {
                label: this.translate.getInstant('menu.adminAccount'),
                hasPermession: this.hassPermession(this.iAwarePages.tenantAdminPortal),
                icon: 'fa fa-house',
                items: [
                    // Dashboard and Reports
                    {
                        label: this.translate.getInstant('menu.dashboard'),
                        hasPermession: true,
                        icon: 'fa fa-chart-pie',
                        routerLink: [''],
                    },
                    {
                        label: this.translate.getInstant('menu.leaderboard'),
                        hasPermession: this.hassPermession(this.iAwarePages.leaderboard),
                        icon: 'fa fa-chart-line',
                        routerLink: ['leaderboard'],
                    },

                    // User Management
                    {
                        label: this.translate.getInstant('menu.users'),
                        hasPermession: this.hassPermession(this.iAwarePages.users),
                        icon: 'fa fa-users',
                        routerLink: ['users'],
                    },
                    {
                        label: this.translate.getInstant('menu.companyGroups'),
                        hasPermession: this.hassPermession(this.iAwarePages.tenantGroup),
                        icon: 'fa fa-building',
                        routerLink: ['tenant-group'],
                    },
                    {
                        label: this.translate.getInstant('menu.tenantUnit'),
                        hasPermession: this.hassPermession(this.iAwarePages.tenantGroup),
                        icon: 'fa fa-qrcode',
                        routerLink: ['tenantUnit'],
                    },

                    // Campaign Management
                    {
                        label: this.translate.getInstant('menu.awarenessCampaign'),
                        hasPermession: this.hassPermession(this.iAwarePages.campaignManagement),
                        icon: 'fa fa-cogs',
                        routerLink: ['/campaign-management'],
                    },
                    {
                        label: this.translate.getInstant('menu.awarenessCampaigns'),
                        hasPermession: this.hassPermession(this.iAwarePages.trainingCampaigns),
                        icon: 'fa fa-lightbulb',
                        routerLink: ['/training-campaign'],
                    },
                    {
                        label: this.translate.getInstant('menu.phishingAwarenessCampaigns'),
                        hasPermession: this.hassPermession(this.iAwarePages.phishingCampaigns),
                        icon: 'fa fa-shield-alt',
                        routerLink: ['/phishing-campaigns'],
                    },

                    // Phishing and Templates
                    {
                        label: this.translate.getInstant('menu.phishingCategory'),
                        hasPermession: this.hassPermession(this.iAwarePages.phishingCategory),
                        icon: 'fa fa-database',
                        routerLink: ['/phishing-category'],
                    },
                    {
                        label: this.translate.getInstant('menu.phishingTemplates'),
                        hasPermession: this.hassPermession(this.iAwarePages.phishingEmailTemplates),
                        icon: 'fa fa-file-alt',
                        routerLink: ['/phishing-templates'],
                    },

                    // Library and Gamification
                    {
                        label: this.translate.getInstant('menu.libraryWallpaperWizard'),
                        hasPermession: this.hassPermession(this.iAwarePages.libraryCharacter),
                        icon: 'fa fa-images',
                        routerLink: ['/wallpaper-wizard'],
                    },
                    {
                        label: this.translate.getInstant('menu.trainingLibrary'),
                        hasPermession: true,
                        icon: 'fa fa-graduation-cap',
                        items: [
                            {
                                label: this.translate.getInstant('By Category'),
                                hasPermession: true,
                                icon: 'fa fa-folder-open',
                                routerLink: ['/multimedia/Categories'],
                            },
                            {
                                label: this.translate.getInstant('By Lessons'),
                                hasPermession: true,
                                icon: 'fa fa-book-open',
                                routerLink: ['/multimedia/Lessons'],
                            },
                        ]
                    },
                    {
                        label: this.translate.getInstant('menu.gamification'),
                        hasPermession: this.hassPermession(this.iAwarePages.gamification),
                        icon: 'fa fa-gamepad',
                        routerLink: ['/gamification'],
                    },

                    // Invoices and Finance
                    {
                        label: this.translate.getInstant('menu.invoice'),
                        hasPermession: this.hassPermession(this.iAwarePages.invoice),
                        icon: 'fa fa-dollar-sign',
                        routerLink: ['/invoice'],
                    }
                ],
            },
            {
                label: this.translate.getInstant('menu.userAccount'),
                hasPermession: this.hassPermession(this.iAwarePages.tenantUserPortal),
                icon: 'fa fa-house',
                items: [
                    // Dashboard and Leaderboard
                    {
                        label: this.translate.getInstant('menu.dashboard'),
                        hasPermession: true,
                        icon: 'fa fa-chart-pie',
                        routerLink: ['/userDashboard'],
                    },
                    {
                        label: this.translate.getInstant('menu.leaderboard'),
                        hasPermession: true,
                        icon: 'fa fa-chart-line',
                        routerLink: ['leaderboard'],
                    },

                    // Campaigns and Training
                    {
                        label: this.translate.getInstant('menu.awarenessCampaigns'),
                        hasPermession: this.hassPermession(this.iAwarePages.campaign),
                        icon: 'fa fa-lightbulb',
                        routerLink: ['/training-campaign'],
                    },
                    {
                        label: this.translate.getInstant('menu.trainingLibrary'),
                        hasPermession: true,
                        icon: 'fa fa-graduation-cap',
                        items: [
                            {
                                label: this.translate.getInstant('By Category'),
                                hasPermession: true,
                                icon: 'fa fa-folder-open',
                                routerLink: ['/multimedia/Categories'],
                            },
                            {
                                label: this.translate.getInstant('By Lessons'),
                                hasPermession: true,
                                icon: 'fa fa-book-open',
                                routerLink: ['/multimedia/Lessons'],
                            },
                        ]
                    },

                    // Gamification
                    {
                        label: this.translate.getInstant('menu.gamification'),
                        hasPermession: true,
                        icon: 'fa fa-gamepad',
                        routerLink: ['/gamification'],
                    },
                ],
            },
        ];
    }

    hassPermession(pageName: string): boolean {
        return this.currentPages.includes(pageName);
    }
}