import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FileSystemMainComponent } from './pages/file-system-main/file-system-main.component';
import { FileSystemLandingComponent } from './pages/file-system-landing/file-system-landing.component';
import { StorageContentLayoutComponent } from './pages/storage-content-layout/storage-content-layout.component';
import { StorageContentLandingComponent } from './pages/storage-content-landing/storage-content-landing.component';
import { AdminComponent } from './pages/admin/admin.component';
import { EntityAdministratorComponent } from './pages/entity-administrator/entity-administrator.component';
import { SharedFilesComponent } from './pages/shared-files/shared-files.component';
import { CompanyStorageComponent } from './pages/company-storage/company-storage.component';
import { DcsComponent } from './pages/dcs/dcs.component';
import { EdmsComponent } from './pages/edms/edms.component';

const routes: Routes = [
    {
        path: '',
        component: FileSystemMainComponent,
        data: { breadcrumb: 'fileSystem' },
        children: [
            { path: '', component: FileSystemLandingComponent },
            { path: 'shared-documents', loadChildren: () => import('../shared-documents/shared-documents.module').then((m) => m.SharedDocumentsModule) },
            { path: 'system-storage-management', component: AdminComponent, data: { breadcrumb: 'fileSystemSSM' } },
            { path: 'entity-storage-management', component: EntityAdministratorComponent, data: { breadcrumb: 'fileSystemESM' } },
            {
                path: 'storage-content-management',
                component: StorageContentLayoutComponent,
                data: { breadcrumb: 'fileSystemStorageContent' },
                children: [
                    { path: '', component: StorageContentLandingComponent },
                    { path: 'company-storage', component: CompanyStorageComponent, data: { breadcrumb: 'fileSystemOSFS' } },
                    { path: 'shared-files', component: SharedFilesComponent, data: { breadcrumb: 'fileSystemSFS' } },
                    { path: 'document-control-system', component: DcsComponent, data: { breadcrumb: 'fileSystemDCS' } },
                    { path: 'electronic-document-management-system', component: EdmsComponent, data: { breadcrumb: 'fileSystemEDMS' } }
                ]
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class FileSystemRoutingModule { }
