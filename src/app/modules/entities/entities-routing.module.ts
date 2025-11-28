import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { EntitiesListComponent } from './components/Entity/entities-list/entities-list.component';
import { EntityFormComponent } from './components/Entity/entity-form/entity-form.component';
import { EntityDetailsComponent } from './components/Entity/entity-details/entity-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: EntitiesListComponent, data: { breadcrumb: 'entitiesList' } },
    { path: 'new', component: EntityFormComponent, data: { breadcrumb: 'newEntity' } },
    { path: ':id', component: EntityDetailsComponent, data: { breadcrumb: 'entityDetails' } },
    { path: ':id/edit', component: EntityFormComponent, data: { breadcrumb: 'editEntity' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntitiesRoutingModule { }

