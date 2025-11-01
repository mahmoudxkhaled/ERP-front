import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-account-locked',
    templateUrl: './account-locked.component.html',
    styleUrls: ['./account-locked.component.scss']
})
export class AccountLockedComponent implements OnInit {
    status: string = 'Locked'; // Default to 'Locked'
    isInactive: boolean = false;

    constructor(
        private router: Router,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {
        // Read status from query params
        this.route.queryParams.subscribe(params => {
            this.status = params['status'] || 'Locked';
            this.isInactive = this.status === 'Inactive';
        });
    }

    backToLogin(): void {
        this.router.navigate(['/auth']);
    }

    contactSupport(): void {
        // Open mailto link for support
        window.location.href = 'mailto:support@company.com?subject=Account Deactivated - Support Request';
    }
}
