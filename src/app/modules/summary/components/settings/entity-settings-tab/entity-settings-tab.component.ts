import { Component, OnInit } from '@angular/core';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Roles } from 'src/app/core/models/system-roles';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { SettingsApiService } from '../../../services/settings-api.service';

@Component({
    selector: 'app-entity-settings-tab',
    templateUrl: './entity-settings-tab.component.html',
    styleUrls: ['./entity-settings-tab.component.scss'],
})
export class EntitySettingsTabComponent implements OnInit {
    canManageDefault = false;
    defaultEntityData: Record<string, string> | null = null;
    entityCustomData: Record<string, string> | null = null;
    entitySettingsReady = false;
    loading = false;
    entityDisplayName = '';

    constructor(
        private permissionService: PermissionService,
        private settingsApiService: SettingsApiService,
        private localStorageService: LocalStorageService
    ) {}

    ngOnInit(): void {
        this.canManageDefault = this.permissionService.hasAnyRole([
            Roles.Developer,
            Roles.SystemAdministrator,
        ]);
        this.refreshEntityDisplayName();
        this.loadEntityTab();
    }

    reloadEntityTab(): void {
        this.loadEntityTab();
    }

    private loadEntityTab(): void {
        this.refreshEntityDisplayName();
        const entityId = Number(this.localStorageService.getEntityDetails()?.Entity_ID || 0);
        if (!entityId) {
            this.defaultEntityData = {};
            this.entityCustomData = {};
            this.entitySettingsReady = true;
            return;
        }

        this.loading = true;
        this.settingsApiService.getEntitySettings(entityId).subscribe({
            next: (response: any) => {
                this.loading = false;
                if (response?.success && response?.message) {
                    const msg = response.message;
                    this.defaultEntityData = { ...(msg.Default_Entity_Settings ?? msg.default_Entity_Settings ?? {}) };
                    this.entityCustomData = { ...(msg.Entity_Settings ?? msg.entity_Settings ?? {}) };
                } else {
                    this.defaultEntityData = {};
                    this.entityCustomData = {};
                }
                this.entitySettingsReady = true;
            },
            error: () => {
                this.loading = false;
                this.defaultEntityData = {};
                this.entityCustomData = {};
                this.entitySettingsReady = true;
            },
        });
    }

    private refreshEntityDisplayName(): void {
        const d = this.localStorageService.getEntityDetails();
        if (!d) {
            this.entityDisplayName = '';
            return;
        }
        const lang = this.localStorageService.getPreferredLanguageCode();
        if (lang === 'ar') {
            const regional = (d.Name_Regional || '').trim();
            this.entityDisplayName = regional || (d.Name || '').trim() || '';
            return;
        }
        this.entityDisplayName = (d.Name || '').trim() || '';
    }
}
