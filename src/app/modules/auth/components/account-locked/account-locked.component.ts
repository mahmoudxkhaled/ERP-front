import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-account-locked',
    templateUrl: './account-locked.component.html',
    styleUrls: ['./account-locked.component.scss']
})
export class AccountLockedComponent implements OnInit {

    constructor(private router: Router) { }

    ngOnInit(): void {
    }

    backToLogin(): void {
        this.router.navigate(['/auth']);
    }

    contactSupport(): void {
        // Open mailto link for support
        window.location.href = 'mailto:support@company.com?subject=Account Locked - Support Request';
    }
}
