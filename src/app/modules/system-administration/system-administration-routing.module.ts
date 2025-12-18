import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: 'erp-functions',
        loadChildren: () => import('./erp-functions/erp-functions.module').then((m) => m.ErpFunctionsModule)
    },
    {
        path: 'erp-modules',
        loadChildren: () => import('./erp-modules/erp-modules.module').then((m) => m.ErpModulesModule)
    },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SystemAdministrationRoutingModule { }

