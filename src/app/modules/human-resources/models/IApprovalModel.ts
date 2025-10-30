import { ITimesheetModel } from './ITimesheetModel';

export interface IApprovalModel extends ITimesheetModel {
    employeeName: string;
    employeeEmail: string;
    submittedDate: Date;
    approvedDate?: Date;
    approvedBy?: string;
}
