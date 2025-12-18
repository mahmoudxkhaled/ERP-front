import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { UsersDetailsComponent } from './components/users-details/users-details.component';
import { WorkflowsComponent } from './components/workflows/workflows.component';

const routes: Routes = [
    { path: '', redirectTo: 'entities/list', pathMatch: 'full' },
    {
        path: 'entities',
        loadChildren: () => import('../entity-administration/entities/entities.module').then((m) => m.EntitiesModule)
    },
    {
        path: 'roles',
        loadChildren: () => import('../entity-administration/roles/roles.module').then((m) => m.RolesModule)
    },
    {
        path: 'settings-configurations',
        loadChildren: () => import('../settings-configurations/settings-configurations.module').then((m) => m.SettingsConfigurationsModule)
    },
    { path: 'users-details', component: UsersDetailsComponent, data: { breadcrumb: 'usersDetails' } },
    { path: 'workflows', component: WorkflowsComponent, data: { breadcrumb: 'workflows' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class CompanyAdministrationRoutingModule { }
