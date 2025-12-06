import { NgModule } from '@angular/core';
import { CompanyAdministrationRoutingModule } from './company-administration-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';

// Components
import { UsersDetailsComponent } from './components/users-details/users-details.component';
import { WorkflowsComponent } from './components/workflows/workflows.component';
import { CompanyDetailsComponent } from './components/company-details/company-details.component';

@NgModule({
    declarations: [
        UsersDetailsComponent,
        WorkflowsComponent,
        CompanyDetailsComponent
    ],
    imports: [
        CompanyAdministrationRoutingModule,
        SharedModule,
        ReactiveFormsModule
    ]
})
export class CompanyAdministrationModule { }
