import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { EntityAccountListComponent } from 'src/app/modules/entity-administration/entity-accounts/components/entity-account-list/entity-account-list.component';
import { EntityAccountDetailsComponent } from 'src/app/modules/entity-administration/entity-accounts/components/entity-account-details/entity-account-details.component';
import { EntityAccountUpdateComponent } from 'src/app/modules/entity-administration/entity-accounts/components/entity-account-update/entity-account-update.component';

@NgModule({
    declarations: [
        EntityAccountListComponent,
        EntityAccountDetailsComponent,
        EntityAccountUpdateComponent
    ],
    imports: [
        SharedModule,
        ReactiveFormsModule
    ],
    exports: [
        EntityAccountListComponent,
        EntityAccountDetailsComponent,
        EntityAccountUpdateComponent
    ]
})
export class SharedUserAccountsModule { }
