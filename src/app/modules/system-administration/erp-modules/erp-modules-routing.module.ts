import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { ModulesListComponent } from './components/modules-list/modules-list.component';
import { ModuleFormComponent } from './components/module-form/module-form.component';
import { ModuleDetailsComponent } from './components/module-details/module-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: ModulesListComponent, data: { breadcrumb: 'modulesList' } },
    { path: 'new', component: ModuleFormComponent, data: { breadcrumb: 'newModule' } },
    { path: ':id', component: ModuleDetailsComponent, data: { breadcrumb: 'moduleDetails' } },
    { path: ':id/edit', component: ModuleFormComponent, data: { breadcrumb: 'editModule' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ErpModulesRoutingModule { }

