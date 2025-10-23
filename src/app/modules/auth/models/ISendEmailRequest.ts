export interface ISendEmailRequest{
    to?: string;
    subject?: string;
    body?: string;
    callbackURL?: string;
}