import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiServices } from 'src/app/core/API_Interface/ApiServices';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';

@Injectable({
    providedIn: 'root',
})
export class EntitiesService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiServices: ApiServices,
        private localStorageService: LocalStorageService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }

    private getEntityId(): string {
        return this.localStorageService.getEntityId()?.toString() ?? '';
    }

    private getParentEntityId(): string {
        return this.localStorageService.getParentEntityId()?.toString() ?? '';
    }

    addEntity(code: string, name: string, description: string, parentEntityId: number, isPersonal: boolean): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [code, name, description, parentEntityId.toString(), isPersonal.toString()];
        return this.apiServices.callAPI(200, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    activateEntity(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(401, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    deactivateEntity(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(402, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    getEntityDetails(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(403, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    updateEntityDetails(
        entityId: string,
        code: string,
        name: string,
        description: string,
        parentEntityId: number,
        IsRegional: boolean,
        isPersonal: boolean
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            entityId.toString(),
            code,
            name,
            description,
            parentEntityId.toString(),
            IsRegional.toString(),
            isPersonal.toString()
        ];
        console.log('params', params);

        return this.apiServices.callAPI(404, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    deleteEntity(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(405, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    listEntities(): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(406, this.getAccessToken(), []).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    getEntityContacts(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(407, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    updateEntityContacts(
        entityId: string,
        address: string,
        isRegional: boolean,
        phoneNumbers: string[],
        faxNumbers: string[],
        emails: string[]
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            entityId,
            address,
            isRegional.toString(),
            JSON.stringify(phoneNumbers),
            JSON.stringify(faxNumbers),
            JSON.stringify(emails)
        ];
        return this.apiServices.callAPI(408, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    assignEntityAdmin(entityId: string, accountId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(410, this.getAccessToken(), [entityId, accountId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    getEntityAdmins(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(411, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    deleteEntityAdmin(entityId: string, accountId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(412, this.getAccessToken(), [entityId, accountId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    assignEntityLogo(entityId: string, imageFormat: string, byteArray: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(420, this.getAccessToken(), [entityId, imageFormat, byteArray]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    getEntityLogo(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(421, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    removeEntityLogo(entityId: string): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(422, this.getAccessToken(), [entityId]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    createAccount(email: string, firstName: string, lastName: string, entityId: number, entityRoleId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [email, firstName, lastName, entityId.toString(), entityRoleId.toString()];
        return this.apiServices.callAPI(120, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }
}

