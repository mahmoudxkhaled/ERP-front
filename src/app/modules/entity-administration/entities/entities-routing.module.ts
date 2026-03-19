import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { EntitiesListComponent } from './components/entities-list/entities-list.component';
import { EntityFormComponent } from './components/entity-form/entity-form.component';
import { EntityDetailsComponent } from './components/entity-details/entity-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: EntitiesListComponent, data: { breadcrumb: 'entitiesList', requestedSystemRole: 3 } },
    { path: 'new', component: EntityFormComponent, data: { breadcrumb: 'newEntity', requestedSystemRole: 3 } },
    { path: ':id', component: EntityDetailsComponent, data: { breadcrumb: 'entityDetails', requestedSystemRole: 3 } },
    { path: ':id/edit', component: EntityFormComponent, data: { breadcrumb: 'editEntity', requestedSystemRole: 3 } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntitiesRoutingModule { }

