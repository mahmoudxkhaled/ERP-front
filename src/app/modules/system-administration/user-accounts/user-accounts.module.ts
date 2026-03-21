import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { SystemUserAccountsRoutingModule } from './user-accounts-routing.module';
import { EntityAccountsModule } from '../../entity-administration/entity-accounts/entity-accounts.module';
import { SystemUserAccountsPageComponent } from './components/system-user-accounts-page/system-user-accounts-page.component';

@NgModule({
    declarations: [
        SystemUserAccountsPageComponent
    ],
    imports: [
        CommonModule,
        SystemUserAccountsRoutingModule,
        EntityAccountsModule
    ],
    providers: [MessageService]
})
export class SystemUserAccountsModule { }
