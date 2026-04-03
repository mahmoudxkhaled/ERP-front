import { Component } from '@angular/core';


@Component({
    selector: 'app-storage-content-layout',
    template: `
        <router-outlet></router-outlet>
        <p-toast></p-toast>
    `
})
export class StorageContentLayoutComponent { }
