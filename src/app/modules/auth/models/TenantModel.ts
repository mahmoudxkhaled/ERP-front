export class TenantModel {
    firstname?: string;
    lastname?: string;
    companyname?: string;
    email?: string;
    timeZoneId?: string;
    // password?: string;
    language?: string;
    currency?: string;
    phone?: string;
    country?: string;
    id?: string;
    requestUserCount?: number;
    subscriptionPlanId?: string;
    countryIso?: string;

    setTenat(_tenant: unknown) {
        const tenant = _tenant as TenantModel;
        this.firstname = tenant.firstname;
        this.lastname = tenant.lastname;
        this.companyname = tenant.companyname;
        this.email = tenant.email;
        // this.password = tenant.password;
        this.language = tenant.language;
        this.phone = tenant.phone;
        this.countryIso = tenant.countryIso;
        // this.country = tenant.country;
        this.timeZoneId = tenant.timeZoneId;
        this.requestUserCount = tenant.requestUserCount;
    }
}
