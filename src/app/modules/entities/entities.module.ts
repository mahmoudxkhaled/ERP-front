import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { EntitiesRoutingModule } from './entities-routing.module';

// Components
import { AssignAdminComponent } from './components/assign-admin/assign-admin.component';
import { EntitiesListComponent } from './components/entities-list/entities-list.component';
import { EntityFormComponent } from './components/entity-form/entity-form.component';

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
    ],
    providers: [MessageService]
})
export class EntitiesModule { }

