import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { EntityAccountsModule } from '../entity-accounts/entity-accounts.module';
import { EntityUserAccountsRoutingModule } from './entity-user-accounts-routing.module';
import { EntityUserAccountsPageComponent } from './components/entity-user-accounts-page/entity-user-accounts-page.component';

@NgModule({
    declarations: [
        EntityUserAccountsPageComponent
    ],
    imports: [
        CommonModule,
        EntityAccountsModule,
        EntityUserAccountsRoutingModule
    ],
    providers: [MessageService]
})
export class EntityUserAccountsModule { }
