import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/Services/translation.service';

@Component({
    selector: 'app-users-details',
    templateUrl: './users-details.component.html',
    styleUrls: ['./users-details.component.scss']
})
export class UsersDetailsComponent implements OnInit {

    constructor(public translate: TranslationService) { }

    ngOnInit(): void {
    }

}
