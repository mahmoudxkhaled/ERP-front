import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/Services/translation.service';

@Component({
    selector: 'app-invoices',
    templateUrl: './invoices.component.html',
    styleUrls: ['./invoices.component.scss']
})
export class InvoicesComponent implements OnInit {

    constructor(public translate: TranslationService) { }

    ngOnInit(): void {
    }

}
