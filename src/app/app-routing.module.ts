import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout/app.layout.component';
import { AuthGuard } from './core/guards/auth.guard';

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
                data: { breadcrumb: 'dashboard' },
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
        loadChildren: () => import('./core/components/notfound/notfound.module').then((m) => m.NotfoundModule),
    },
    {
        path: 'landing',
        loadChildren: () => import('./core/components/landing/landing.module').then((m) => m.LandingModule),
    },
    { path: '**', redirectTo: '/notfound' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, routerOptions)],
    exports: [RouterModule],
})
export class AppRoutingModule { }
