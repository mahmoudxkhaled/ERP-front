/**
 * Backend Entity Response Structure
 * Represents the raw entity data structure from the API
 */
export interface EntityBackend {
    Entity_ID: number;
    Code: string;
    Name: string;
    Description: string;
    Name_Regional: string;
    Description_Regional: string;
    Parent_Entity_ID: number | string | null;
    Is_Active: boolean;
    Is_Personal: boolean;
}

/**
 * Backend API Response Structure
 * The message contains an object where keys are entity IDs and values are EntityBackend objects
 */
export interface EntitiesListResponse {
    success: boolean;
    message: Record<string, EntityBackend>;
}

/**
 * Frontend Entity Model
 * Represents the normalized entity data used in components
 */
export interface Entity {
    id: string;
    code: string;
    name: string;
    description: string;
    parentEntityId?: string;
    active: boolean;
    isPersonal: boolean;
}

