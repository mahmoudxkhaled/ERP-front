import { IHelpCategoryTicketActivitiesModel } from "./IHelpCategoryTicketActivitiesModel";

export interface IHelpCategoryTicketModel {
    id: string;
    ticketNo: string;
    fileUrl: string;
    requestDetail: string;
    isArchive: boolean;
    archiveUserId: string;
    archiveTime: Date;
    languageId: string;
    helpCategoryId: string;
    helpCategoryName: string;
    insertedTime: Date;
    HelpCategorySubjectId: string;
    userImageUrl: string;
    userName: string;
    userId: string;
    isRead: boolean;
    isActive: boolean;
    helpCategoryTicketActivities?: IHelpCategoryTicketActivitiesModel[];
}
