import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { VirtualDrivesSectionComponent } from './virtual-drives-section/virtual-drives-section.component';
import { FileSystemsSectionComponent } from './file-systems-section/file-systems-section.component';
import { VirtualDrivesService } from '../services/virtual-drives.service';

/**
 * Shared module for file system components that can be used across different modules.
 * Exports VirtualDrivesSectionComponent and FileSystemsSectionComponent so they can be imported by:
 * - System Storage Management (SSM) module
 * - Entity Storage Management (ESM) module
 * - Any other modules that need Virtual Drives or File Systems functionality
 */
@NgModule({
    declarations: [
        VirtualDrivesSectionComponent,
        FileSystemsSectionComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        SharedModule
    ],
    exports: [
        VirtualDrivesSectionComponent,
        FileSystemsSectionComponent
    ],
    providers: [
        VirtualDrivesService
    ]
})
export class FileSystemSharedModule { }
