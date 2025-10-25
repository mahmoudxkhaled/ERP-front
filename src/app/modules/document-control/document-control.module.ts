import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentControlRoutingModule } from './document-control-routing.module';

// Components
import { SharedDocumentsComponent } from './components/shared-documents/shared-documents.component';

@NgModule({
    declarations: [
        SharedDocumentsComponent
    ],
    imports: [
        CommonModule,
        DocumentControlRoutingModule
    ]
})
export class DocumentControlModule { }
