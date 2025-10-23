import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IHelpCategoryTicketModel } from '../api/IHelpCategoryTicketModel';
import { ChatHubService } from 'src/app/core/Services/ChatHub.service';
import { ChatService } from 'src/app/demo/components/apps/chat/service/chat.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAspNetPageItemModel } from 'src/app/modules/page-management/models/IAspNetPageItemModel';
import { PermessionsService } from 'src/app/core/Services/permessions.service';
import { constants } from 'src/app/core/constatnts/constatnts';
@Component({
    selector: 'app-all-ticket-card',
    templateUrl: './all-ticket-card.component.html',
    styleUrl: './all-ticket-card.component.scss',
})
export class AllTicketCardComponent {
    @Input() ticket: IHelpCategoryTicketModel;
    @Output() CardClicked: EventEmitter<IHelpCategoryTicketModel> = new EventEmitter<IHelpCategoryTicketModel>();
    @Output() ForwardCardClicked: EventEmitter<IHelpCategoryTicketModel> = new EventEmitter<IHelpCategoryTicketModel>();
    pagePermessions: IAspNetPageItemModel[] = [];
    actions = constants.pageActions;
    currentUserId: string;
    constructor(private chatServ: ChatHubService, private localStorageService: LocalStorageService, private permessionService: PermessionsService,) {
        this.pagePermessions = this.permessionService.getPagePermessions(constants.pages.supportTapMenue);
    }

    changeView(ticket: IHelpCategoryTicketModel) {
        const userData = this.localStorageService.getCurrentUserData();
        this.currentUserId = userData != null ? userData?.userId : '';
        this.chatServ
            .joinRoom(this.currentUserId, ticket.id)
            .then(() => {
                this.CardClicked.emit(ticket);
            })
            .catch((err) => {
                
            });
    }

    hasPermission(controlKey: string): boolean {
        return this.pagePermessions.some((p) => p.controlKey === controlKey);
    }

    forwardTicket(ticket : IHelpCategoryTicketModel){
        this.ForwardCardClicked.emit(ticket);
    } 
}
