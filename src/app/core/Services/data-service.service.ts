import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class DataService {
    BASE_URL = environment.apiUrl;
    BASE_URLII = environment.apiUrlWithoutAPI;
    constructor(private httpClient: HttpClient) {}

    getAllReguest<T>(path: string): Observable<T> {
        return this.httpClient.get<T>(`${this.BASE_URL}${path}`);
    }

    getByReguest<T>(path: string, identifier: any): Observable<T> {
        return this.httpClient.get<T>(`${this.BASE_URL}${path}/${identifier}`);
    }

    getByTwoIdsReguest<T>(path: string, identifier1: any, identifier2: any): Observable<T> {
        return this.httpClient.get<T>(`${this.BASE_URL}${path}/${identifier1}/${identifier2}`);
    }

    postReguest<T>(path: string, data: any): Observable<T> {
        return this.httpClient.post<T>(`${this.BASE_URL}${path}`, data);
    }

    anotherReguest<T>(path: string, identifier: any): Observable<T> {
        return this.httpClient.get<T>(`${this.BASE_URLII}${path}/${identifier}`);
    }
}
