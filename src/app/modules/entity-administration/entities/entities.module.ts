import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { EntitiesRoutingModule } from './entities-routing.module';
import { RolesModule } from '../roles/roles.module';

// Components
import { EntityAccountAdminListComponent } from './components/Account/entity-account-admin-list/entity-account-admin-list.component';
import { EntityAccountDetailsComponent } from './components/Account/entity-account-details/entity-account-details.component';
import { EntityAccountListComponent } from './components/Account/entity-account-list/entity-account-list.component';
import { EntitiesListComponent } from './components/Entity/entities-list/entities-list.component';
import { EntityContactComponent } from './components/Entity/entity-contact/entity-contact.component';
import { EntityDetailsComponent } from './components/Entity/entity-details/entity-details.component';
import { EntityFormComponent } from './components/Entity/entity-form/entity-form.component';
import { EntityAccountUpdateComponent } from './components/Account/entity-account-update/entity-account-update.component';

@NgModule({
    declarations: [
        EntitiesListComponent,
        EntityFormComponent,
        EntityDetailsComponent,
        EntityContactComponent,
        EntityAccountListComponent,
        EntityAccountAdminListComponent,
        EntityAccountDetailsComponent,
        EntityAccountUpdateComponent,
    ],
    imports: [
        EntitiesRoutingModule,
        SharedModule,
        RolesModule,
    ],
    providers: [MessageService]
})
export class EntitiesModule { }

