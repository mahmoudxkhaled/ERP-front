import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResult } from 'src/app/core/Dtos/ApiResult';
import { DataService } from 'src/app/core/Services/data-service.service';

@Injectable({
    providedIn: 'root',
})
export class AwarenessCampaignScheduleUserQuoteService {
    constructor(private dataService: DataService) {}

    getAwarenessCampaignScheduleUserQuotes(): Observable<ApiResult> {
        return this.dataService.getAllReguest('/AwarenessCampaign/GetAllAwarenessCampaignScheduleUserQuote');
    }

    updateShowingTimeForQuote(id: string): Observable<ApiResult> {
        return this.dataService.getByReguest('/AwarenessCampaign/UpdateShowingTimeForQuote', id);
    }

    updateHideTimeForQuote(id: string): Observable<ApiResult> {
        return this.dataService.getByReguest('/AwarenessCampaign/UpdateHideTimeForQuote', id);
    }
}
