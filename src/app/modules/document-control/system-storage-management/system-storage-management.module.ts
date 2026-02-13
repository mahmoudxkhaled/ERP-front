import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/Shared/shared/shared.module';
import { FileSystemSharedModule } from '../shared/file-system-shared.module';
import { AdminComponent } from './system-storage-management.component';

@NgModule({
    declarations: [
        AdminComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        SharedModule,
        FileSystemSharedModule
    ],
    exports: [
        AdminComponent
    ]
})
export class SystemStorageManagementModule { }
