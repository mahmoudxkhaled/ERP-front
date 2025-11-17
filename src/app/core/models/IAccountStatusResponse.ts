
export interface Get_Login_Data_Package {
    Account_Details: IAccountDetails;
    User_Details: IUserDetails;
    Entity_Details: IEntityDetails;
    Functions_Details: IFunctionsDetails;
    Modules_Details: IModulesDetails;
    Account_Settings: IAccountSettings;
}


export interface IAccountDetails {
    Account_ID: number;
    Email: string;
    Description: string;
    Description_Regional: string;
    User_ID: number;
    Entity_ID: number;
    Entity_Role_ID: number;
    Account_State: number;
    Profile_Picture: string;
}


export interface IUserDetails {
    User_ID: number;
    First_Name: string;
    Middle_Name: string;
    Last_Name: string;
    Prefix: string;
    First_Name_Regional: string;
    Middle_Name_Regional: string;
    Last_Name_Regional: string;
    Prefix_Regional: string;
    Gender: boolean;
    Is_Active: boolean;
}


export interface IEntityDetails {
    Entity_ID: number;
    Code: string;
    Name: string;
    Description: string;
    Name_Regional: string;
    Description_Regional: string;
    Parent_Entity_ID: number;
    Is_Active: boolean;
    Is_Personal: boolean;
    Logo: string;
}


export interface IFunctionsDetails {
    DBS: Record<string, any>;
    SysAdm: Record<string, any>;
    EntAdm: Record<string, any>;
    DC: Record<string, any>;
    FIN: Record<string, any>;
    HR: Record<string, any>;
    CRM: Record<string, any>;
    SCM: Record<string, any>;
    PC: Record<string, any>;
}

export interface IModulesDetails {
    [key: string]: any;
}

export interface IAccountSettings {
    Language: string;
    Theme: string;
    Functions_Order: string;
    Modules_Order: string;
}

/**
 * Main interface for Account Status Response
 * This is the complete response structure returned from the API
 */
export interface IAccountStatusResponse {
    Account_Details: IAccountDetails;
    User_Details: IUserDetails;
    Entity_Details: IEntityDetails;
    Functions_Details: IFunctionsDetails;
    Modules_Details: IModulesDetails;
    Account_Settings: IAccountSettings;
}

