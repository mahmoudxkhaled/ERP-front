import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout/app.layout.component';
import { AuthGuard } from './core/Guards/auth.guard';

const routerOptions: ExtraOptions = {
    anchorScrolling: 'enabled',
    useHash: false,
};

const routes: Routes = [
    {
        path: '',
        component: AppLayoutComponent,
        children: [
            {
                path: '',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'iAwareDashboard' },
                loadChildren: () => import('./modules/dashboard/dashboard.module').then((m) => m.DashboardModule),
            },
            {
                path: 'summary',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'summary' },
                loadChildren: () => import('./modules/summary/summary.module').then((m) => m.SummaryModule),
            },
            {
                path: 'company-administration',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'companyAdministration' },
                loadChildren: () => import('./modules/company-administration/company-administration.module').then((m) => m.CompanyAdministrationModule),
            },
            {
                path: 'document-control',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'documentControl' },
                loadChildren: () => import('./modules/document-control/document-control.module').then((m) => m.DocumentControlModule),
            },
            {
                path: 'human-resources',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'humanResources' },
                loadChildren: () => import('./modules/human-resources/human-resources.module').then((m) => m.HumanResourcesModule),
            },
            {
                path: 'financials',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'financials' },
                loadChildren: () => import('./modules/financials/financials.module').then((m) => m.FinancialsModule),
            },
            // {
            //     path: 'users',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'users' },
            //     loadChildren: () => import('./modules/user/user.module').then((m) => m.UserModule),
            // },
            // {
            //     path: 'account-setting',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'account-setting' },
            //     loadChildren: () => import('./modules/account/account.module').then((m) => m.AccountModule),
            // },
            // {
            //     path: 'tenant-group',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'tenant-group' },
            //     loadChildren: () => import('./modules/tenantgroup/tenantgroup.module').then((m) => m.TenantgroupModule),
            // },
            // {
            //     path: 'campaign-management',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'campaign-management' },
            //     loadChildren: () =>
            //         import('../app/modules/campaign-management/campaign-management.module').then(
            //             (m) => m.CampaignManagementModule
            //         ),
            // },
            // {
            //     path: 'training-campaign',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'campaign' },
            //     loadChildren: () => import('../app/modules/training-campaigns/campaign.module').then((m) => m.CampaignModule),
            // },
            // {
            //     path: 'phishing-campaigns',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'phishing-campaigns' },
            //     loadChildren: () => import('../app/modules/phishing-campaigns/phishing-campaigns.module').then((m) => m.PhishingCampaignsModule),
            // },
            // {
            //     path: 'phishing-email-domains',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'phishing-email-domains' },
            //     loadChildren: () =>
            //         import('../app/modules/phishing-email-domains/email-domains.module').then((m) => m.EmailDomainsModule),
            // },
            // {
            //     path: 'system-email-domains',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'system-email-domains' },
            //     loadChildren: () =>
            //         import('./modules/system-email-domains/system-email.module').then((m) => m.SystemEmailModule),
            // },
            // {
            //     path: 'system-email-activity',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'system-email-activity' },
            //     loadChildren: () =>
            //         import('./modules/system-email-activity/system-email-activity.module').then((m) => m.SystemEmailActivityModule),
            // },
            // {
            //     path: 'phishing-category',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'phishing-category' },
            //     loadChildren: () =>
            //         import('../app/modules/phishing-category/phishing-category.module').then(
            //             (m) => m.PhishingCategoryModule
            //         ),
            // },
            // {
            //     path: 'phishing-templates',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'phishing-templates' },
            //     loadChildren: () =>
            //         import('../app/modules/phishing-email-template/phishing-email-template.module').then(
            //             (m) => m.PhishingEmailTemplateModule
            //         ),
            // },
            // {
            //     path: 'wallpaper-libraries',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'wallpaper-libraries' },
            //     loadChildren: () =>
            //         import('../app/modules/wallpaper-libraries/wallpaper-libraries.module').then(
            //             (m) => m.WallpaperLibrariesModule
            //         ),
            // },
            // {
            //     path: 'wallpaper-wizard',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'wallpaper-wizard' },
            //     loadChildren: () =>
            //         import('../app/modules/wallpaper-wizard/wallpaper-wizard.module').then(
            //             (m) => m.WallpaperWizardModule
            //         ),
            // },
            // {
            //     path: 'invoice',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'invoice' },
            //     loadChildren: () => import('../app/modules/invoice/invoice.module').then((m) => m.InvoiceModule),
            // },
            // {
            //     path: 'support',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'support' },
            //     loadChildren: () => import('../app/modules/support/support.module').then((m) => m.SupportModule),
            // },
            // {
            //     path: 'multimedia',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'multimedia' },
            //     loadChildren: () =>
            //         import('../app/modules/multimedia-library/multimedia-library.module').then(
            //             (m) => m.MultimediaLibraryModule
            //         ),
            // },
            // {
            //     path: 'tenantUnit',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'tenantUnit' },
            //     loadChildren: () =>
            //         import('../app/modules/tenant-unit/tenant-unit.module').then((m) => m.TenantUnitModule),
            // },
            // {
            //     path: 'gamification',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'gamification' },
            //     loadChildren: () =>
            //         import('../app/modules/gamification/gamification.module').then((m) => m.GamificationModule),
            // },
            // {
            //     path: 'leaderboard',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'leaderboard' },
            //     loadChildren: () =>
            //         import('../app/modules/leaderboard/leaderboard.module').then((m) => m.LeaderboardModule),
            // },

            // // Admin Routs
            // {
            //     path: 'phishing-category',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'phishing-category' },
            //     loadChildren: () =>
            //         import('../app/modules/phishing-category/phishing-category.module').then((m) => m.PhishingCategoryModule),
            // },
            // {
            //     path: 'phishing-templates',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'phishing-templates' },
            //     loadChildren: () =>
            //         import('../app/modules/phishing-email-template/phishing-email-template.module').then((m) => m.PhishingEmailTemplateModule),
            // },
            // {
            //     path: 'Subscription',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'subscription' },
            //     loadChildren: () =>
            //         import('../app/modules/subscription/subscription.module').then((m) => m.SubscriptionModule),
            // },
            // {
            //     path: 'Security-Training',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'security-training' },
            //     loadChildren: () =>
            //         import('../app/modules/security-training/security-training.module').then((m) => m.SecurityTrainingModule),
            // },
            // {
            //     path: 'roles',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'roles' },
            //     loadChildren: () => import('./modules/role/role.module').then((m) => m.RoleModule),
            // },
            // {
            //     path: 'pages-managment',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'pages' },
            //     loadChildren: () =>
            //         import('./modules/page-management/page-management.module').then((m) => m.PageManagementModule),
            // },
            // {
            //     path: 'account-setting',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'account-setting' },
            //     loadChildren: () => import('./modules/account/account.module').then((m) => m.AccountModule),
            // },
            // {
            //     path: 'language',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'language' },
            //     loadChildren: () => import('./modules/language/language.module').then((m) => m.LanguageModule),
            // },
            // {
            //     path: 'badge',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'badge' },
            //     loadChildren: () => import('./modules/badge/badge.module').then((m) => m.BadgeModule),
            // },
            // {
            //     path: 'notifications',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'notifications' },
            //     loadChildren: () => import('./modules/notification-settings/notification-settings.module').then((m) => m.NotificationSettingsModule),
            // },
            // {
            //     path: 'pointing-system',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'pointing-system' },
            //     loadChildren: () => import('./modules/pointing-system/pointing-system.module').then((m) => m.PointingSystemModule),
            // },
            // {
            //     path: 'industry',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'pointing-system' },
            //     loadChildren: () => import('./modules/industry/induetry.module').then((m) => m.InduetryModule),
            // },
            // {
            //     path: 'tages',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'tages' },
            //     loadChildren: () => import('./modules/tages/tages.module').then((m) => m.TagesModule),
            // },
            // {
            //     path: 'marketing',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'marketing' },
            //     loadChildren: () => import('./modules/marketing/marketing.module').then((m) => m.MarketingModule),
            // },
            // {
            //     path: 'blogs',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'blogs' },
            //     loadChildren: () => import('./modules/marketing/blogs/blogs.module').then((m) => m.BlogsModule),
            // },
            // {
            //     path: 'news',
            //     canActivate: [AuthGuard],
            //     data: { breadcrumb: 'news' },
            //     loadChildren: () => import('./modules/marketing/news/news.module').then((m) => m.NewsModule),
            // },

        ],
    },
    {
        path: 'auth',
        data: { breadcrumb: 'auth' },
        loadChildren: () => import('./modules/auth/auth.module').then((m) => m.AuthModule),
    },
    {
        path: 'GetQuote',
        data: { breadcrumb: 'auth' },
        loadChildren: () => import('./modules/auth/auth.module').then((m) => m.AuthModule),
    },
    {
        path: 'notfound',
        loadChildren: () => import('./demo/components/notfound/notfound.module').then((m) => m.NotfoundModule),
    },
    {
        path: 'notfound2',
        loadChildren: () => import('./demo/components/notfound2/notfound2.module').then((m) => m.Notfound2Module),
    },
    {
        path: 'landing',
        loadChildren: () => import('./demo/components/landing/landing.module').then((m) => m.LandingModule),
    },
    { path: '**', redirectTo: '/notfound' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, routerOptions)],
    exports: [RouterModule],
})
export class AppRoutingModule { }