import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/Services/translation.service';

@Component({
    selector: 'app-notifications',
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {

    constructor(public translate: TranslationService) { }

    ngOnInit(): void {
    }

}
