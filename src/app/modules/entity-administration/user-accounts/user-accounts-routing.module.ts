import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { UsersListComponent } from './components/User/users-list/users-list.component';
import { UserFormComponent } from './components/User/user-form/user-form.component';
import { UserDetailsComponent } from './components/User/user-details/user-details.component';
import { UserContactInfoComponent } from './components/User/user-contact-info/user-contact-info.component';

const routes: Routes = [
    { path: '', redirectTo: 'list', pathMatch: 'full' },
    { path: 'list', component: UsersListComponent, data: { breadcrumb: 'usersList' } },
    { path: 'new', component: UserFormComponent, data: { breadcrumb: 'newUser' } },
    { path: ':id', component: UserDetailsComponent, data: { breadcrumb: 'userDetails' } },
    { path: ':id/edit', component: UserFormComponent, data: { breadcrumb: 'editUser' } },
    { path: ':id/contact', component: UserContactInfoComponent, data: { breadcrumb: 'userContactInfo' } },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class UserAccountsRoutingModule { }

