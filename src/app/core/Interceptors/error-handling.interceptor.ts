import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { LocalStorageService } from '../services/local-storage.service';
import { SessionExpiredDialogComponent } from '../components/session-expired-dialog/session-expired-dialog.component';

@Injectable()
export class ErrorHandlingInterceptor implements HttpInterceptor {
    private router: Router;
    private sessionExpiredDialogRef: DynamicDialogRef | null = null;
    constructor(
        private injector: Injector,
        private localStorageService: LocalStorageService,
        private dialogService: DialogService,
        private authService: AuthService,
        private messageService: MessageService
    ) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        this.router = this.injector.get(Router);

        // Check if this is a logout request - skip error handling for logout
        const isLogoutRequest = this.isLogoutRequest(req);

        return next.handle(req).pipe(
            // Check successful responses for error codes in the body
            tap((event: HttpEvent<any>) => {
                if (event instanceof HttpResponse && !isLogoutRequest) {
                    this.handleBusinessError(event);
                }
            }),
            catchError((error: HttpErrorResponse) => {
                // Skip error handling for logout requests
                if (!isLogoutRequest) {
                    this.showErrorMessage(error);
                }
                return throwError(() => new Error(error.message || 'An unknown error occurred'));
            })
        );
    }

    /**
     * Check if the request is a logout API call (request code 102)
     * The request code is stored in the first byte of the Contents array
     */
    private isLogoutRequest(req: HttpRequest<any>): boolean {
        // Check if request body exists and contains Contents array
        if (req.body && req.body.Contents && Array.isArray(req.body.Contents)) {
            // Request code 102 is stored in the first byte
            return req.body.Contents[0] === 102;
        }
        return false;
    }


    private handleBusinessError(response: HttpResponse<any>): void {

        // Check if response body exists and contains error information
        if (!response || !response.body) {
            return;
        }

        const body = response.body;
        let errorCode: string | null = null;

        // Extract error code from different possible response structures
        if (body.message && !body.success) {
            errorCode = body.message.toString();
        }

        // If no error code found, return early
        if (!errorCode) {
            return;
        }

        // Check if this is a generic error code (ERP11000-ERP11099)
        if (this.isGenericErrorCode(errorCode)) {
            // Handle session expired codes
            if (this.isSessionExpiredCode(errorCode)) {
                this.showSessionExpiredDialog();
                return;
            }

            // Handle all other generic errors with toast message
            const errorMessage = this.getGenericErrorMessage(errorCode);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: errorMessage,
                life: 6000
            });
        }
        // If not a generic error code, let components handle it (business errors)
    }

    private showErrorMessage(error: HttpErrorResponse): void {
        let errorMessage = 'An error occurred. Please try again.';
        let errorCode: string | null = null;

        // If server returned error object
        if (error.error) {

            // Case: error is JSON string
            if (typeof error.error === 'string') {
                try {
                    const parsed = JSON.parse(error.error);
                    errorMessage = parsed.message || errorMessage;
                    errorCode = parsed.errorCode || parsed.message || null;

                } catch {
                    // Error is plain string
                    errorMessage = error.error;
                    errorCode = error.error;
                }
            }

            // Case: structured object
            else if (error.error.message) {
                errorMessage = error.error.message;
                errorCode = error.error.errorCode || error.error.message;
            }

            // Case: error list (common in ERP)
            else if (error.error.errorList && Array.isArray(error.error.errorList)) {
                errorMessage = error.error.errorList.map((e: any) => e.message).join(', ');
                errorCode = error.error.errorList[0].errorCode || null;
            }
        }

        // Check if this is a generic error code (ERP11000-ERP11099)
        if (errorCode && this.isGenericErrorCode(errorCode)) {
            // Handle session expired codes
            if (this.isSessionExpiredCode(errorCode)) {
                this.showSessionExpiredDialog();
                return;
            }

            // Handle all other generic errors with toast message
            const genericErrorMessage = this.getGenericErrorMessage(errorCode);
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: genericErrorMessage,
                life: 6000
            });
            return;
        }

        // If not a generic error code, do nothing - let components handle business errors
        // Business errors (ERP11100+) should be handled by components, not interceptor

        // Fallback UI message for non-generic errors
        this.messageService.add({
            severity: 'error',
            summary: `Error ${error.status}`,
            detail: errorMessage,
            life: 6000
        });
    }

    private showSessionExpiredDialog(): void {
        // Prevent multiple dialogs from opening
        if (this.sessionExpiredDialogRef) {
            return;
        }

        this.sessionExpiredDialogRef = this.dialogService.open(SessionExpiredDialogComponent, {
            header: '',
            showHeader: false,
            width: '450px',
            modal: true,
            closable: false,
            dismissableMask: false,
            styleClass: 'session-expired-dialog-container'
        });

        // Handle dialog close event
        this.sessionExpiredDialogRef.onClose.subscribe((data) => {
            if (data && data.logout) {
                // Perform logout: clear storage, navigate, and reload
                this.localStorageService.clearLoginDataPackage()
                this.router.navigate(['/auth']);
                window.location.reload();
            }
            this.sessionExpiredDialogRef = null;
        });
    }

    /**
     * Check if error code is a generic error code (ERP11000-ERP11099)
     */
    private isGenericErrorCode(code: string): boolean {
        if (!code || typeof code !== 'string') {
            return false;
        }
        const match = code.match(/^ERP11(\d{3})$/);
        if (!match) {
            return false;
        }
        const number = parseInt(match[1], 10);
        return number >= 0 && number <= 99;
    }

    /**
     * Check if error code requires session expired dialog
     */
    private isSessionExpiredCode(code: string): boolean {
        const sessionExpiredCodes = [
            'ERP11040', // Access Token missing
            'ERP11041', // Access Token invalid
            'ERP11042', // Access Token expired
            'ERP11062', // Error removing Access Token
            'ERP11063'  // Entity Deactivated (account's entity is inactive → login blocked)
        ];
        return sessionExpiredCodes.includes(code);
    }

    /**
     * Get user-friendly error message for generic error codes
     */
    private getGenericErrorMessage(code: string): string {
        const errorMessages: { [key: string]: string } = {
            // Access Denied
            'ERP11000': 'Access denied. You do not have permission to perform this action.',
            'ERP11055': 'Access denied. You do not have enough privilege to perform this action.',

            // Blocked IP
            'ERP11005': 'Your IP address has been permanently blocked. Please contact support.',
            'ERP11006': 'Your IP address has been temporarily blocked. Please try again later.',

            // Request Format Errors
            'ERP11020': 'Invalid request format. Request is null.',
            'ERP11021': 'Invalid request format. Request contents is null.',
            'ERP11022': 'Invalid request format. Request contents is empty.',
            'ERP11030': 'Unable to unpack ERP request. Please try again.',

            // Execution/System Errors
            'ERP11010': 'A global execution error occurred. Please try again.',
            'ERP11050': 'Request implementation error. Global execution error occurred.',
            'ERP11051': 'Request type is under development.',
            'ERP11052': 'Unknown request type.',
            'ERP11053': 'Error initializing Core database. Please contact support.',
            'ERP11054': 'Error initializing ERP database. Please contact support.',
            'ERP11056': 'Error logging request and response. Please try again.',
            'ERP11057': 'Internal routing error occurred. Please try again.',
            'ERP11058': 'Internal routing error - database issue. Please contact support.',
            'ERP11059': 'Internal routing error - IP issues. Please contact support.',
            'ERP11060': 'Error adding new Access Token. Please try again.',
            'ERP11061': 'Error extending Access Token. Please try again.',
            'ERP11065': 'Missing Routing header. Please contact support.',
            'ERP11066': 'Invalid Routing header. Please contact support.',
            'ERP11068': 'Core database transaction error. Please try again.',
            'ERP11069': 'ERP database transaction error. Please try again.',

            // Parameter Errors
            'ERP11070': 'Invalid parameters count. Please check your request.'
        };

        // Handle parameter errors (ERP11071-ERP11099)
        if (code.match(/^ERP11(071|072|073|074|075|076|077|078|079|08[0-9]|09[0-9])$/)) {
            const match = code.match(/^ERP11(\d{3})$/);
            if (match) {
                const paramNumber = parseInt(match[1], 10) - 70;
                return `Invalid data type for parameter ${paramNumber}. Please check your request.`;
            }
        }

        return errorMessages[code] || `System error occurred (${code}). Please contact support.`;
    }

}


