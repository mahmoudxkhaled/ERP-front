import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
    imports: [RouterModule.forChild([
        { path: '', data: {breadcrumb: 'E-Commerce Dashboard'}, loadChildren: () => import('./e-commerce/dashboardecommerce.module').then(m => m.DashboardEcommerceModule) },
        { path: 'dashboard-banking', data: {breadcrumb: 'Banking Dashboard'}, loadChildren: () => import('./banking/dashboardbanking.module').then(m => m.DashboardBankingModule) },
    ])],
    exports: [RouterModule]
})
export class DashboardsRoutingModule { }