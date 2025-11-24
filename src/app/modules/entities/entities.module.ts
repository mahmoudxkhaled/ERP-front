import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { EntitiesRoutingModule } from './entities-routing.module';

// Components
import { AssignAdminComponent } from './components/assign-admin/assign-admin.component';
import { EntitiesListComponent } from './components/entities-list/entities-list.component';
import { EntityDetailsComponent } from './components/entity-details/entity-details.component';
import { EntityFormComponent } from './components/entity-form/entity-form.component';
import { CreateEntityAccountComponent } from './components/create-entity-account/create-entity-account.component';
import { EntityContactComponent } from './components/entity-contact/entity-contact.component';

@NgModule({
    declarations: [
        EntitiesListComponent,
        EntityFormComponent,
        AssignAdminComponent,
        CreateEntityAccountComponent,
        EntityDetailsComponent,
        EntityContactComponent
    ],
    imports: [
        EntitiesRoutingModule,
        SharedModule,
        ReactiveFormsModule
    ],
    providers: [MessageService]
})
export class EntitiesModule { }

