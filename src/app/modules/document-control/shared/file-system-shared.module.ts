import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { VirtualDrivesSectionComponent } from './virtual-drives-section/virtual-drives-section.component';
import { VirtualDrivesService } from '../services/virtual-drives.service';

/**
 * Shared module for file system components that can be used across different modules.
 * Exports VirtualDrivesSectionComponent so it can be imported by:
 * - System Storage Management (SSM) module
 * - Entity Storage Management (ESM) module
 * - Any other modules that need Virtual Drives functionality
 */
@NgModule({
    declarations: [
        VirtualDrivesSectionComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        SharedModule
    ],
    exports: [
        VirtualDrivesSectionComponent
    ],
    providers: [
        VirtualDrivesService
    ]
})
export class FileSystemSharedModule { }
