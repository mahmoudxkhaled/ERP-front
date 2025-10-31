import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

@Component({
    selector: 'app-logout',
    templateUrl: './logout.component.html',
    styleUrls: ['./logout.component.scss']
})
export class LogoutComponent implements OnInit {

    constructor(
        public translate: TranslationService,
        private router: Router,
        private localStorageService: LocalStorageService
    ) { }

    ngOnInit(): void {
    }

    confirmLogout(): void {

        this.router.navigate(['/auth']);

        console.log('confirmLogout');
        // this.localStorageService.removeItem('userData');
    }

    cancelLogout(): void {
        this.router.navigate(['/dashboard']);
    }

}
