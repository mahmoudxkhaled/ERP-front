import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntityStorageManagementRoutingModule } from './entity-storage-management-routing.module';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { FileSystemSharedModule } from 'src/app/modules/document-control/file-system/shared/file-system-shared.module';
import { EsmPageComponent } from './esm-page.component';

/**
 * Entity Storage Management (ESM) Module.
 * Provides full management of Virtual Drives owned by the Entity, File Systems,
 * Synchronization, Entity Storage Settings, and Access Rights for Entity Administrators.
 */
@NgModule({
    declarations: [
        EsmPageComponent
    ],
    imports: [
        CommonModule,
        EntityStorageManagementRoutingModule,
        SharedModule,
        FileSystemSharedModule
    ]
})
export class EntityStorageManagementModule { }
