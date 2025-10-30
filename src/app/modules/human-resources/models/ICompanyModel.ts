export interface ICompanyModel {
    id: string;
    name: string;
    status: string;
    adminCount: number;
    industry?: string;
    founded?: number;
    employees?: number;
}
