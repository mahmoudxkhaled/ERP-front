import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { SharedDocumentsComponent } from './components/shared-documents/shared-documents.component';

const routes: Routes = [
    { path: '', component: SharedDocumentsComponent, data: { breadcrumb: 'sharedDocuments' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DocumentControlRoutingModule { }
