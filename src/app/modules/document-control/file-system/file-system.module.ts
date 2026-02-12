import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { FileSystemRoutingModule } from './file-system-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';

import { FileSystemMainComponent } from './pages/file-system-main/file-system-main.component';
import { FileSystemLandingComponent } from './pages/file-system-landing/file-system-landing.component';
import { CompanyStorageComponent } from './pages/company-storage/company-storage.component';
import { SharedFilesComponent } from './pages/shared-files/shared-files.component';
import { AdminComponent } from './pages/admin/admin.component';
import { EntityAdministratorComponent } from './pages/entity-administrator/entity-administrator.component';

@NgModule({
    declarations: [
        FileSystemMainComponent,
        FileSystemLandingComponent,
        CompanyStorageComponent,
        SharedFilesComponent,
        AdminComponent,
        EntityAdministratorComponent
    ],
    imports: [
        CommonModule,
        BreadcrumbModule,
        FileSystemRoutingModule,
        SharedModule
    ]
})
export class FileSystemModule { }
