import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { EntityAccountsRoutingModule } from './entity-accounts-routing.module';

// Components
import { EntityAccountListComponent } from './components/entity-account-list/entity-account-list.component';
import { EntityAccountAdminListComponent } from './components/entity-account-admin-list/entity-account-admin-list.component';
import { EntityAccountDetailsComponent } from './components/entity-account-details/entity-account-details.component';
import { EntityAccountUpdateComponent } from './components/entity-account-update/entity-account-update.component';

@NgModule({
    declarations: [
        EntityAccountListComponent,
        EntityAccountAdminListComponent,
        EntityAccountDetailsComponent,
        EntityAccountUpdateComponent,
    ],
    imports: [
        EntityAccountsRoutingModule,
        SharedModule,
        ReactiveFormsModule,
    ],
    exports: [
        // Export components so they can be used in entities module
        EntityAccountListComponent,
        EntityAccountAdminListComponent,
        EntityAccountDetailsComponent,
        EntityAccountUpdateComponent,
    ],
    providers: [MessageService]
})
export class EntityAccountsModule { }
