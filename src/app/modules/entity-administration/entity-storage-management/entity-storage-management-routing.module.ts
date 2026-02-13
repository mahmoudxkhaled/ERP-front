import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EsmPageComponent } from './esm-page.component';

const routes: Routes = [
    {
        path: '',
        component: EsmPageComponent,
        data: { breadcrumb: 'fileSystemESM' }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntityStorageManagementRoutingModule { }
