import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from './local-storage.service';



@Injectable({
    providedIn: 'root',
})
export class PermessionsService {

    constructor(private route: Router, private localStorageService: LocalStorageService) {
    }

}