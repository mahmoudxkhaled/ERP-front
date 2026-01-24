import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-notifications-management-main',
    templateUrl: './notifications-management-main.component.html',
    styleUrls: ['./notifications-management-main.component.scss']
})
export class NotificationsManagementMainComponent implements OnInit {
    activeTabIndex: number = 0;

    constructor(
    ) {

    }

    ngOnInit(): void {
        // Start with Types tab (index 0)
        this.activeTabIndex = 0;
    }



}
