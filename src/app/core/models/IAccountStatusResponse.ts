/**
 * Interface for Get Login Data Package
 * Complete login data package structure returned from the API
 */
export interface Get_Login_Data_Package {
    Account_Details: IAccountDetails;
    User_Details: IUserDetails;
    Entity_Details: IEntityDetails;
    Functions_Details: IFunctionsDetails;
    Modules_Details: IModulesDetails;
    Account_Settings: IAccountSettings;
}

/**
 * Interface for Account Details
 * Contains information about the user account
 */
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

/**
 * Interface for User Details
 * Contains personal information about the user
 */
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

/**
 * Interface for Entity Details
 * Contains information about the entity (company/department)
 */
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

/**
 * Interface for Functions Details
 * Contains permissions/access details for different system functions
 */
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

/**
 * Interface for Modules Details
 * Contains information about system modules
 */
export interface IModulesDetails {
    [key: string]: any;
}

/**
 * Interface for Account Settings
 * Contains user preferences and settings
 */
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

