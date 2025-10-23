import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResult } from 'src/app/core/Dtos/ApiResult';
import { DataService } from 'src/app/core/Services/data-service.service';

@Injectable({
    providedIn: 'root',
})
export class SupportAllTicketsService {
    constructor(private dataService: DataService) {}

    getAllTickets(): Observable<ApiResult> {
        return this.dataService.getAllReguest<ApiResult>('/HelpTicket');
    }
}
