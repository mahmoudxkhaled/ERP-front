import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HumanResourcesRoutingModule } from './human-resources-routing.module';

// Components
import { TimesheetsComponent } from './components/timesheets/timesheets.component';
import { ContractComponent } from './components/contract/contract.component';

@NgModule({
    declarations: [
        TimesheetsComponent,
        ContractComponent
    ],
    imports: [
        CommonModule,
        HumanResourcesRoutingModule
    ]
})
export class HumanResourcesModule { }
