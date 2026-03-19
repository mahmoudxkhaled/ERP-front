import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { EntitiesListComponent } from 'src/app/modules/entity-administration/entities/components/entities-list/entities-list.component';
import { EntityFormComponent } from 'src/app/modules/entity-administration/entities/components/entity-form/entity-form.component';
import { EntityDetailsComponent } from 'src/app/modules/entity-administration/entities/components/entity-details/entity-details.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    {
        path: 'list',
        component: EntitiesListComponent,
        data: { breadcrumb: 'entitiesList', requestedSystemRole: 2 }
    },
    {
        path: 'new',
        component: EntityFormComponent,
        data: { breadcrumb: 'newEntity', requestedSystemRole: 2 }
    },
    {
        path: ':id',
        component: EntityDetailsComponent,
        data: { breadcrumb: 'entityDetails', requestedSystemRole: 2 }
    },
    {
        path: ':id/edit',
        component: EntityFormComponent,
        data: { breadcrumb: 'editEntity', requestedSystemRole: 2 }
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SystemEntitiesRoutingModule { }

