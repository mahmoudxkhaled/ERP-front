/**
 * Backend User Response Structure
 * Represents the raw user data structure from the API
 */
export interface UserBackend {
    User_ID: number;
    First_Name: string;
    Middle_Name: string;
    Last_Name: string;
    Prefix: string;
    First_Name_Regional: string;
    Middle_Name_Regional: string;
    Last_Name_Regional: string;
    Prefix_Regional: string;
    Gender: boolean; // true: Male, false: Female
    Is_Active: boolean; // true if user has an active account
}

/**
 * Backend User Contact Info Response Structure
 */
export interface UserContactInfoBackend {
    Address: string;
    Address_Regional: string;
    Phone_Numbers: string[];
    Linkedin_Page: string;
    Facebook_Page: string;
    Instagram_Page: string;
    Twitter_Page: string;
}

/**
 * Frontend User Model
 * Represents the normalized user data used in components
 */
export interface User {
    id: string;
    firstName: string;
    middleName: string;
    lastName: string;
    prefix: string;
    gender: boolean;
    isActive: boolean;
}

/**
 * Frontend User Contact Info Model
 */
export interface UserContactInfo {
    address: string;
    phoneNumbers: string[];
    linkedinPage: string;
    facebookPage: string;
    instagramPage: string;
    twitterPage: string;
}

/**
 * User Preferences Model
 * Dictionary of string key-value pairs
 */
export interface UserPreferences {
    [key: string]: string;
}

/**
 * Profile Picture Response
 */
export interface ProfilePictureResponse {
    Image_Format: string;
    Image: string; // Base64 encoded image
}

