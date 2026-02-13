import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FileSystemLandingComponent } from './storage-content-management/file-system-landing/file-system-landing.component';
import { AdminComponent } from './system-storage-management/system-storage-management.component';
import { EntityAdministratorComponent } from './entity-storage-management/entity-storage-management.component';

const routes: Routes = [
    { path: '', component: FileSystemLandingComponent, data: { breadcrumb: 'fileSystem' } },
    { path: 'system-storage-management', component: AdminComponent, data: { breadcrumb: 'fileSystemSSM' } },
    { path: 'entity-storage-management', component: EntityAdministratorComponent, data: { breadcrumb: 'fileSystemESM' } },
    {
        path: 'storage-content-management',
        data: { breadcrumb: 'fileSystemStorageContent' },
        loadChildren: () => import('./storage-content-management/storage-content-management.module').then((m) => m.StorageContentManagementModule)
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DocumentControlRoutingModule { }
