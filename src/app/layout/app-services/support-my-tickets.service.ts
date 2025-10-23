import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResult } from 'src/app/core/Dtos/ApiResult';
import { DataService } from 'src/app/core/Services/data-service.service';

@Injectable({
    providedIn: 'root',
})
export class SupportMyTicketsService {
    constructor(private dataService: DataService) {}

    getMyTickets(): Observable<ApiResult> {
        return this.dataService.getAllReguest<ApiResult>('/HelpTicket/MyTickets');
    }

    getAllTickets(): Observable<ApiResult> {
        return this.dataService.getAllReguest<ApiResult>('/HelpTicket/AllTickets');
    }

    readHelpDepartmentTicket(id: string): Observable<ApiResult> {
        return this.dataService.postReguest<ApiResult>(`/HelpTicket/ReadHelpCategoryTicket/${id}`, null);
    }
}
