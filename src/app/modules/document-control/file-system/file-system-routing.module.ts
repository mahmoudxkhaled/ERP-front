import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FileSystemMainComponent } from './pages/file-system-main/file-system-main.component';
import { FileSystemLandingComponent } from './pages/file-system-landing/file-system-landing.component';
import { AdminComponent } from './pages/admin/admin.component';
import { EntityAdministratorComponent } from './pages/entity-administrator/entity-administrator.component';
import { SharedFilesComponent } from './pages/shared-files/shared-files.component';
import { CompanyStorageComponent } from './pages/company-storage/company-storage.component';

const routes: Routes = [
    {
        path: '',
        component: FileSystemMainComponent,
        data: { breadcrumb: 'fileSystem' },
        children: [
            { path: '', component: FileSystemLandingComponent },
            { path: 'system-admin', component: AdminComponent, data: { breadcrumb: 'fileSystemSystemAdmin' } },
            { path: 'entity-admin', component: EntityAdministratorComponent, data: { breadcrumb: 'fileSystemEntityAdmin' } },
            { path: 'file-sharing', component: SharedFilesComponent, data: { breadcrumb: 'fileSystemFileSharing' } },
            { path: 'company-storage', component: CompanyStorageComponent, data: { breadcrumb: 'fileSystemCompanyStorage' } }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class FileSystemRoutingModule { }
