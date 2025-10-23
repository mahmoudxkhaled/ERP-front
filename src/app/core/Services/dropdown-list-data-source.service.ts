import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from './data-service.service';
import { ApiResult } from '../Dtos/ApiResult';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DropdownListDataSourceService {
  private API_USERS_URL = `${environment.apiUrl}/DropdownListDataSource`;
  private httpHeaders = new HttpHeaders({tenant: environment.defaultTenantId});
  constructor(private httpClient: HttpClient) { }

  getActiveLanguages(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetActiveLanguages`, {headers : this.httpHeaders});
  }

  getCountries() : Observable<ApiResult> {
		return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetCountries`, {headers : this.httpHeaders});
  }

  getIndustries(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetIndustries`, {headers : this.httpHeaders});
  }
  
  getAllTimeZones(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetTimeZones`, {headers : this.httpHeaders});
  }

  getAllSystemEmails(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetSystemEmails`, {headers : this.httpHeaders});
  }   

  getPhishingDomains(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetPhishingDomains`, {headers : this.httpHeaders});
  }   

  getPhishingCategories(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetPhishingCategories`);
  }
  
  getTrainingCategories(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetTrainingCategories`);
  }

  getTenantUnits(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetTenantUnites`);
  }

  getTenantGroups(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetTenantGroups`);
  }

  getTenantUsers(): Observable<ApiResult> {
    return this.httpClient.get<ApiResult>(`${this.API_USERS_URL}/GetTenantUsers`);
  }
}