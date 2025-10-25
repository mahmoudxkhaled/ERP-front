import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/Services/translation.service';

@Component({
    selector: 'app-contract',
    templateUrl: './contract.component.html',
    styleUrls: ['./contract.component.scss']
})
export class ContractComponent implements OnInit {

    constructor(public translate: TranslationService) { }

    ngOnInit(): void {
    }

}
