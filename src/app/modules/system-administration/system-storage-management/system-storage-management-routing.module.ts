import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SsmPageComponent } from './ssm-page.component';

const routes: Routes = [
    {
        path: '',
        component: SsmPageComponent,
        data: { breadcrumb: 'fileSystemSSM' }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SystemStorageManagementRoutingModule { }
