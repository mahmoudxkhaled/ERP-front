import { Component, OnInit } from '@angular/core';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Roles } from 'src/app/core/models/system-roles';
import { TranslationService } from 'src/app/core/services/translation.service';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
    activeTabIndex = 0;
    canShowEntityTab = false;
    canShowSystemTab = false;

    constructor(
        public translate: TranslationService,
        private permissionService: PermissionService
    ) { }

    ngOnInit(): void {
        this.canShowEntityTab = this.permissionService.hasAnyRole([
            Roles.Developer,
            Roles.SystemAdministrator,
            Roles.EntityAdministrator,
        ]);
        this.canShowSystemTab = this.permissionService.hasAnyRole([Roles.Developer]);
    }
}
