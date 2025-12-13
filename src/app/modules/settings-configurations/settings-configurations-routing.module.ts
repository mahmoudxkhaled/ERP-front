import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { FunctionsListComponent } from './components/Function/functions-list/functions-list.component';
import { FunctionFormComponent } from './components/Function/function-form/function-form.component';
import { FunctionDetailsComponent } from './components/Function/function-details/function-details.component';
import { ModulesListComponent } from './components/Module/modules-list/modules-list.component';
import { ModuleFormComponent } from './components/Module/module-form/module-form.component';
import { ModuleDetailsComponent } from './components/Module/module-details/module-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'functions/list', pathMatch: 'full' },
    // Functions routes
    { path: 'functions/list', component: FunctionsListComponent, data: { breadcrumb: 'functionsList' } },
    { path: 'functions/new', component: FunctionFormComponent, data: { breadcrumb: 'newFunction' } },
    { path: 'functions/:id', component: FunctionDetailsComponent, data: { breadcrumb: 'functionDetails' } },
    { path: 'functions/:id/edit', component: FunctionFormComponent, data: { breadcrumb: 'editFunction' } },
    // Modules routes
    { path: 'modules/list', component: ModulesListComponent, data: { breadcrumb: 'modulesList' } },
    { path: 'modules/new', component: ModuleFormComponent, data: { breadcrumb: 'newModule' } },
    { path: 'modules/:id', component: ModuleDetailsComponent, data: { breadcrumb: 'moduleDetails' } },
    { path: 'modules/:id/edit', component: ModuleFormComponent, data: { breadcrumb: 'editModule' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SettingsConfigurationsRoutingModule { }
