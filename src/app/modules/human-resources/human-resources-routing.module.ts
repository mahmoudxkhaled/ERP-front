import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { TimesheetsComponent } from './components/timesheets/timesheets.component';
import { ContractComponent } from './components/contract/contract.component';

const routes: Routes = [
    { path: '', redirectTo: 'timesheets', pathMatch: 'full' },
    { path: 'timesheets', component: TimesheetsComponent },
    { path: 'contract', component: ContractComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HumanResourcesRoutingModule { }
