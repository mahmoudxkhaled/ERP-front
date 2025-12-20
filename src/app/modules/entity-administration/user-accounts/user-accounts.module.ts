import { NgModule } from '@angular/core';
import { MessageService } from 'primeng/api';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { UserAccountsRoutingModule } from './user-accounts-routing.module';

// Components
import { UsersListComponent } from './components/User/users-list/users-list.component';
import { UserDetailsComponent } from './components/User/user-details/user-details.component';
import { UserFormComponent } from './components/User/user-form/user-form.component';
import { UserContactInfoComponent } from './components/User/user-contact-info/user-contact-info.component';
import { MergeAccountRequestComponent } from './components/User/merge-account/merge-account-request.component';
import { MergeAccountConfirmComponent } from './components/User/merge-account/merge-account-confirm.component';

@NgModule({
    declarations: [
        UsersListComponent,
        UserDetailsComponent,
        UserFormComponent,
        UserContactInfoComponent,
        MergeAccountRequestComponent,
        MergeAccountConfirmComponent
    ],
    imports: [
        UserAccountsRoutingModule,
        SharedModule,
        ReactiveFormsModule
    ],
    providers: [MessageService]
})
export class UserAccountsModule { }

