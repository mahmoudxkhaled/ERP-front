import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { StorageContentManagementRoutingModule } from './storage-content-management-routing.module';
import { StorageContentLayoutComponent } from './storage-content-layout/storage-content-layout.component';
import { StorageContentLandingComponent } from './storage-content-landing/storage-content-landing.component';
import { CompanyStorageComponent } from './company-storage/company-storage.component';
import { SharedFilesComponent } from './shared-files/shared-files.component';
import { DcsComponent } from './dcs/dcs.component';
import { EdmsComponent } from './edms/edms.component';
import { FolderManagementModule } from '../storage/folder-management/folder-management.module';

@NgModule({
    declarations: [
        StorageContentLayoutComponent,
        StorageContentLandingComponent,
        CompanyStorageComponent,
        SharedFilesComponent,
        DcsComponent,
        EdmsComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        BreadcrumbModule,
        SharedModule,
        StorageContentManagementRoutingModule,
        FolderManagementModule
    ],
    exports: [
        StorageContentLayoutComponent
    ]
})
export class StorageContentManagementModule { }
