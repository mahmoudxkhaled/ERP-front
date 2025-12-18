import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/services/translation.service';

@Component({
    selector: 'app-shared-documents',
    templateUrl: './shared-documents.component.html',
    styleUrls: ['./shared-documents.component.scss']
})
export class SharedDocumentsComponent implements OnInit {

    constructor(public translate: TranslationService) { }

    ngOnInit(): void {
    }

}
