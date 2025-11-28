import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { EntitiesRoutingModule } from './entities-routing.module';

// Components
import { AssignAdminComponent } from './components/assign-admin/assign-admin.component';
import { EditEntityDialogComponent } from './components/edit-entity-dialog/edit-entity-dialog.component';
import { EntitiesListComponent } from './components/entities-list/entities-list.component';
import { EntityAccountAdminListComponent } from './components/entity-account-admin-list/entity-account-admin-list.component';
import { EntityAccountListComponent } from './components/entity-account-list/entity-account-list.component';
import { EntityContactComponent } from './components/entity-contact/entity-contact.component';
import { EntityDetailsComponent } from './components/entity-details/entity-details.component';
import { EntityFormComponent } from './components/entity-form/entity-form.component';

@NgModule({
    declarations: [
        EntitiesListComponent,
        EntityFormComponent,
        AssignAdminComponent,
        EntityDetailsComponent,
        EntityContactComponent,
        EditEntityDialogComponent,
        EntityAccountListComponent,
        EntityAccountAdminListComponent
    ],
    imports: [
        EntitiesRoutingModule,
        SharedModule,
    ],
    providers: [MessageService]
})
export class EntitiesModule { }

