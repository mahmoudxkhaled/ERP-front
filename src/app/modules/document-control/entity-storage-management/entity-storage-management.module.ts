import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { FileSystemSharedModule } from '../shared/file-system-shared.module';
import { EntityAdministratorComponent } from './entity-storage-management.component';

@NgModule({
    declarations: [
        EntityAdministratorComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        SharedModule,
        FileSystemSharedModule
    ],
    exports: [
        EntityAdministratorComponent
    ]
})
export class EntityStorageManagementModule { }
