import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResult } from 'src/app/core/Dtos/ApiResult';
import { DataService } from 'src/app/core/Services/data-service.service';

@Injectable({
    providedIn: 'root',
})
export class MyTicketChatBoxService {
    constructor(private dataService: DataService) {}

    getTicketActivities(id: string): Observable<ApiResult> {
        return this.dataService.getByReguest<ApiResult>('/HelpTicketActivity/GetAllWithinTicketId', id);
    }

    getTicketStatus(): Observable<ApiResult> {
        return this.dataService.getAllReguest<ApiResult>('/HelpStatus');
    }

    getTicketStatusForCategory(id: string): Observable<ApiResult> {
        return this.dataService.getByReguest<ApiResult>('/HelpStatus/GetAllForCategory', id);
    }

    sendMessage(data: any): Observable<ApiResult> {
        return this.dataService.postReguest<ApiResult>('/HelpTicketActivity/Add', data);
    }

    addChatAttchments(data: any): Observable<ApiResult> {
        return this.dataService.postReguest<ApiResult>('/HelpTicketActivity/AddAttchments', data);
    }
}
