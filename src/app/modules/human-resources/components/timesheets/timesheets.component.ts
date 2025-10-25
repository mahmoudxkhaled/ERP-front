import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/Services/translation.service';

@Component({
    selector: 'app-timesheets',
    templateUrl: './timesheets.component.html',
    styleUrls: ['./timesheets.component.scss']
})
export class TimesheetsComponent implements OnInit {

    constructor(public translate: TranslationService) { }

    ngOnInit(): void {
    }

}
