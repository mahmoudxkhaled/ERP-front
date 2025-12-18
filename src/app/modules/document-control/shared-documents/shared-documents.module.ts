import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedDocumentsRoutingModule } from './shared-documents-routing.module';

// Components
import { SharedDocumentsComponent } from './components/shared-documents.component';

@NgModule({
    declarations: [
        SharedDocumentsComponent
    ],
    imports: [
        CommonModule,
        SharedDocumentsRoutingModule
    ]
})
export class SharedDocumentsModule { }
