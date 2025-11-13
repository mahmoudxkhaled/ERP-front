import { NgModule } from '@angular/core';
import { EntitiesRoutingModule } from './entities-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';

// Components
import { EntitiesListComponent } from './components/entities-list/entities-list.component';
import { EntityFormComponent } from './components/entity-form/entity-form.component';
import { AssignAdminComponent } from './components/assign-admin/assign-admin.component';

@NgModule({
    declarations: [
        EntitiesListComponent,
        EntityFormComponent,
        AssignAdminComponent
    ],
    imports: [
        EntitiesRoutingModule,
        SharedModule,
        ReactiveFormsModule
    ]
})
export class EntitiesModule { }

