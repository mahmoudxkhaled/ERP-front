import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StorageContentLayoutComponent } from './storage-content-layout/storage-content-layout.component';
import { StorageContentLandingComponent } from './storage-content-landing/storage-content-landing.component';
import { CompanyStorageComponent } from './company-storage/company-storage.component';
import { SharedFilesComponent } from './shared-files/shared-files.component';
import { DcsComponent } from './dcs/dcs.component';
import { EdmsComponent } from './edms/edms.component';

const routes: Routes = [
    {
        path: '',
        component: StorageContentLayoutComponent,
        children: [
            { path: '', component: StorageContentLandingComponent },
            { path: 'company-storage', component: CompanyStorageComponent, data: { breadcrumb: 'fileSystemOSFS' } },
            { path: 'shared-files', component: SharedFilesComponent, data: { breadcrumb: 'fileSystemSFS' } },
            { path: 'document-control-system', component: DcsComponent, data: { breadcrumb: 'fileSystemDCS' } },
            { path: 'electronic-document-management-system', component: EdmsComponent, data: { breadcrumb: 'fileSystemEDMS' } }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class StorageContentManagementRoutingModule { }
