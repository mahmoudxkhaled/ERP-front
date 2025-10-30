export interface IUserAdminModel {
    id: string;
    name: string;
    email: string;
    role: string;
    company: string;
    status: string;
    supervisor?: string;
}
