import { Component, OnInit } from '@angular/core';
import { TranslationService } from 'src/app/core/Services/translation.service';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

    constructor(public translate: TranslationService) { }

    ngOnInit(): void {
    }

}
