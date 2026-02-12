import { Component } from '@angular/core';
import { Router } from '@angular/router';

export interface FileSystemBox {
    id: string;
    route: string;
    labelKey: string;
    icon: string;
}

@Component({
    selector: 'app-file-system-landing',
    templateUrl: './file-system-landing.component.html',
    styleUrls: ['./file-system-landing.component.scss']
})
export class FileSystemLandingComponent {
    boxes: FileSystemBox[] = [
        { id: 'system-admin', route: 'system-admin', labelKey: 'fileSystem.tabs.systemAdmin', icon: 'pi pi-cog' },
        { id: 'entity-admin', route: 'entity-admin', labelKey: 'fileSystem.tabs.entityAdmin', icon: 'pi pi-building' },
        { id: 'file-sharing', route: 'file-sharing', labelKey: 'fileSystem.tabs.fileSharing', icon: 'pi pi-share-alt' },
        { id: 'company-storage', route: 'company-storage', labelKey: 'fileSystem.tabs.companyStorage', icon: 'pi pi-folder-open' }
    ];

    constructor(private router: Router) {}

    onBoxClick(box: FileSystemBox): void {
        this.router.navigate(['/document-control/file-system', box.route]);
    }
}
