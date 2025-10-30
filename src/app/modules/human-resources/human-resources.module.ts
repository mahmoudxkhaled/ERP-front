import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HumanResourcesRoutingModule } from './human-resources-routing.module';

// Components
import { TimesheetsComponent } from './components/timesheets/timesheets.component';
import { ContractComponent } from './components/contract/contract.component';
import { AdminTimesheetsComponent } from './components/admin-timesheets/admin-timesheets.component';
import { SupervisorTimesheetsComponent } from './components/supervisor-timesheets/supervisor-timesheets.component';
import { SharedModule } from 'src/app/Shared/shared/shared.module';

@NgModule({
    declarations: [
        TimesheetsComponent,
        ContractComponent,
        AdminTimesheetsComponent,
        SupervisorTimesheetsComponent
    ],
    imports: [
        HumanResourcesRoutingModule,
        SharedModule
    ]
})
export class HumanResourcesModule { }
