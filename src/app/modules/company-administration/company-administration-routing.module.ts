import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { CompanyDetailsComponent } from './components/company-details/company-details.component';
import { UsersDetailsComponent } from './components/users-details/users-details.component';
import { WorkflowsComponent } from './components/workflows/workflows.component';

const routes: Routes = [
    { path: '', redirectTo: 'company-details', pathMatch: 'full' },
    { path: 'company-details', component: CompanyDetailsComponent },
    { path: 'users-details', component: UsersDetailsComponent },
    { path: 'workflows', component: WorkflowsComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class CompanyAdministrationRoutingModule { }
