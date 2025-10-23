import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResult } from 'src/app/core/Dtos/ApiResult';
import { DataService } from 'src/app/core/Services/data-service.service';

@Injectable({
    providedIn: 'root',
})
export class SupportNewTicketService {
    constructor(private dataService: DataService) {}

    addNewTicket(data: any): Observable<ApiResult> {
        return this.dataService.postReguest<ApiResult>('/HelpTicket/Add', data);
    }

    forwardTicketToAnotherCategory(data: any): Observable<ApiResult> {
        return this.dataService.postReguest<ApiResult>('/HelpTicket/Forward', data);
    }
}
