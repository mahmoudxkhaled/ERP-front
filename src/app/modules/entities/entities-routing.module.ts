import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { EntitiesListComponent } from './components/entities-list/entities-list.component';
import { EntityFormComponent } from './components/entity-form/entity-form.component';
import { AssignAdminComponent } from './components/assign-admin/assign-admin.component';
import { EntityDetailsComponent } from './components/entity-details/entity-details.component';
import { CreateEntityAccountComponent } from './components/create-entity-account/create-entity-account.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: EntitiesListComponent, data: { breadcrumb: 'entitiesList' } },
    { path: 'new', component: EntityFormComponent, data: { breadcrumb: 'newEntity' } },
    { path: ':id', component: EntityDetailsComponent, data: { breadcrumb: 'entityDetails' } },
    { path: ':id/edit', component: EntityFormComponent, data: { breadcrumb: 'editEntity' } },
    { path: ':id/assign-admin', component: AssignAdminComponent, data: { breadcrumb: 'assignAdmin' } },
    { path: ':id/add-account', component: CreateEntityAccountComponent, data: { breadcrumb: 'addAccount' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntitiesRoutingModule { }

