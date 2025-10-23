// rtl.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class LanguageDIRService {
    //Language DIR

    private rtlKey = 'isRtl';
    private rtlSubject = new BehaviorSubject<boolean>(this.getRtlFromStorage());
    isRtl$ = this.rtlSubject.asObservable();

    //Language Code

    private languageSubject = new BehaviorSubject<string>(this.getLanguageFromStorage());
    userLanguageCode$ = this.languageSubject.asObservable();

    constructor(private localStorage: LocalStorageService) {
        this.rtlSubject.next(this.getRtlFromStorage());
        this.languageSubject.next(this.getLanguageFromStorage());
    }

    //Language DIR
    setRtl(isRtl: boolean) {
        this.rtlSubject.next(isRtl);
        this.saveRtlToStorage(isRtl);
    }

    private saveRtlToStorage(value: boolean) {
        localStorage.setItem(this.rtlKey, JSON.stringify(value));
    }

    getRtlFromStorage(): boolean {
        const storedValue = localStorage.getItem(this.rtlKey);
        return storedValue ? JSON.parse(storedValue) : false;
    }

    //Language Code
    setUserLanguageCode(lang: string) {
        this.languageSubject.next(lang);
        this.saveLanguageToStorage(lang);
    }

    private saveLanguageToStorage(lang: string) {
        const data = this.localStorage.getCurrentUserData();
        data.userLanguageCode = lang;
        this.localStorage.setItem('userData', data);
    }

    getLanguageFromStorage(): string {
        const data = this.localStorage.getCurrentUserData();
        const storedLang = data?.userLanguageCode;
        return storedLang ? storedLang : 'en';
    }
}
