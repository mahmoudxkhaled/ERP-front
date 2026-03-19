import { NgModule } from '@angular/core';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
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
        EntityContactComponent,
        EntityDetailsComponent,
        EntityFormComponent
    ],
    imports: [
        SharedModule,
        RolesModule,
        EntityAccountsModule,
        EntityGroupsModule,
    ],
    exports: [
        EntitiesListComponent,
        EntityContactComponent,
        EntityDetailsComponent,
        EntityFormComponent
    ]
})
export class EntitiesComponentsModule { }

