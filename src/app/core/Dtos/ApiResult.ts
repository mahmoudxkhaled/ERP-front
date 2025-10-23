import { ApiError } from './ApiError';

export interface ApiResult {
    message: string;
    isSuccess: boolean;
    data: any | null;
    code: number;
    totalRecords: number;
    errorList: ApiError[] | null;
}
