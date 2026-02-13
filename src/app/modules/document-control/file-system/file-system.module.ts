import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { FileSystemRoutingModule } from './file-system-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';

import { FileSystemMainComponent } from './pages/file-system-main/file-system-main.component';
import { FileSystemLandingComponent } from './pages/file-system-landing/file-system-landing.component';
import { StorageContentLayoutComponent } from './pages/storage-content-layout/storage-content-layout.component';
import { StorageContentLandingComponent } from './pages/storage-content-landing/storage-content-landing.component';
import { CompanyStorageComponent } from './pages/company-storage/company-storage.component';
import { SharedFilesComponent } from './pages/shared-files/shared-files.component';
import { AdminComponent } from './pages/system-storage-management/system-storage-management.component';
import { EntityAdministratorComponent } from './pages/entity-storage-management/entity-storage-management.component';
import { DcsComponent } from './pages/dcs/dcs.component';
import { EdmsComponent } from './pages/edms/edms.component';
import { FileSystemSharedModule } from './shared/file-system-shared.module';

@NgModule({
    declarations: [
        FileSystemMainComponent,
        FileSystemLandingComponent,
        StorageContentLayoutComponent,
        StorageContentLandingComponent,
        CompanyStorageComponent,
        SharedFilesComponent,
        AdminComponent,
        EntityAdministratorComponent,
        DcsComponent,
        EdmsComponent
    ],
    imports: [
        CommonModule,
        BreadcrumbModule,
        FileSystemRoutingModule,
        SharedModule,
        FileSystemSharedModule
    ]
})
export class FileSystemModule { }
