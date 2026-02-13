import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemStorageManagementRoutingModule } from './system-storage-management-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { FileSystemSharedModule } from 'src/app/modules/document-control/file-system/shared/file-system-shared.module';
import { SsmPageComponent } from './ssm-page.component';

/**
 * System Storage Management (SSM) Module.
 * Provides full management of Virtual Drives, monitoring, and File Systems management
 * for Developers and System Administrators.
 */
@NgModule({
    declarations: [
        SsmPageComponent
    ],
    imports: [
        CommonModule,
        SystemStorageManagementRoutingModule,
        SharedModule,
        FileSystemSharedModule
    ]
})
export class SystemStorageManagementModule { }
