import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { FunctionsListComponent } from './components/functions-list/functions-list.component';
import { FunctionFormComponent } from './components/function-form/function-form.component';
import { FunctionDetailsComponent } from './components/function-details/function-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: FunctionsListComponent, data: { breadcrumb: 'functionsList' } },
    { path: 'new', component: FunctionFormComponent, data: { breadcrumb: 'newFunction' } },
    { path: ':id', component: FunctionDetailsComponent, data: { breadcrumb: 'functionDetails' } },
    { path: ':id/edit', component: FunctionFormComponent, data: { breadcrumb: 'editFunction' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ErpFunctionsRoutingModule { }

