import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WorkflowsComponent } from './workflows/workflows.component';

// Components


const routes: Routes = [
    { path: '', redirectTo: 'entities/list', pathMatch: 'full' },
    {
        path: 'entities',
        loadChildren: () => import('../entity-administration/entities/entities.module').then((m) => m.EntitiesModule),
        data: { breadcrumb: 'companyDetails' }
    },
    {
        path: 'roles',
        loadChildren: () => import('../entity-administration/roles/roles.module').then((m) => m.RolesModule),
        data: { breadcrumb: 'roles&Permissions' }
    },
    {
        path: 'user-accounts',
        loadChildren: () => import('../entity-administration/user-accounts/user-accounts.module').then((m) => m.UserAccountsModule),
        data: { breadcrumb: 'userAccounts' }
    },
    {
        path: 'entity-groups',
        loadChildren: () => import('../entity-administration/entity-groups/entity-groups.module').then((m) => m.EntityGroupsModule),
        data: { breadcrumb: 'entityGroups' }
    },

    { path: 'workflows', component: WorkflowsComponent, data: { breadcrumb: 'workflows' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntityAdministrationRoutingModule { }
