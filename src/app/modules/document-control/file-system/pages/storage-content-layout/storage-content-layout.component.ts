import { Component } from '@angular/core';

/**
 * Wrapper for Storage & Content Management routes.
 * Provides a router-outlet for: landing (4 cards), company-storage, shared-files, DCS, EDMS.
 */
@Component({
    selector: 'app-storage-content-layout',
    template: '<router-outlet></router-outlet>'
})
export class StorageContentLayoutComponent {}
