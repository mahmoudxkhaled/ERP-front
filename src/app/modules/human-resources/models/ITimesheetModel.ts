export interface ITimesheetModel {
    id: string;
    date: Date;
    project: string;
    task: string;
    hours: number;
    remarks: string;
    status: string;
}
