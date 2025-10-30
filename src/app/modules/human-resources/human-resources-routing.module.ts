import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { TimesheetsComponent } from './components/timesheets/timesheets.component';
import { ContractComponent } from './components/contract/contract.component';
import { AdminTimesheetsComponent } from './components/admin-timesheets/admin-timesheets.component';
import { SupervisorTimesheetsComponent } from './components/supervisor-timesheets/supervisor-timesheets.component';

const routes: Routes = [
    { path: '', redirectTo: 'timesheets', pathMatch: 'full' },
    { path: 'timesheets', component: TimesheetsComponent, data: { breadcrumb: 'timesheets' } },
    { path: 'admin-timesheets', component: AdminTimesheetsComponent, data: { breadcrumb: 'adminTimesheets' } },
    { path: 'supervisor-timesheets', component: SupervisorTimesheetsComponent, data: { breadcrumb: 'supervisorTimesheets' } },
    { path: 'contract', component: ContractComponent, data: { breadcrumb: 'contract' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HumanResourcesRoutingModule { }
