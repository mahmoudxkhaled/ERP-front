import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { EntitiesRoutingModule } from './entities-routing.module';
import { RolesModule } from '../roles/roles.module';
import { EntityAccountsModule } from '../entity-accounts/entity-accounts.module';
import { EntityGroupsModule } from '../entity-groups/entity-groups.module';

// Components
import { EntitiesListComponent } from './components/entities-list/entities-list.component';
import { EntityContactComponent } from './components/entity-contact/entity-contact.component';
import { EntityDetailsComponent } from './components/entity-details/entity-details.component';
import { EntityFormComponent } from './components/entity-form/entity-form.component';

@NgModule({
    declarations: [
        EntitiesListComponent,
        EntityFormComponent,
        EntityDetailsComponent,
        EntityContactComponent,
    ],
    imports: [
        EntitiesRoutingModule,
        SharedModule,
        RolesModule,
        EntityAccountsModule, // Import to use exported account components
        EntityGroupsModule, // Import to use EntityGroupsListComponent
    ],
    providers: [MessageService]
})
export class EntitiesModule { }

