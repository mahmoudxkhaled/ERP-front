import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { LocalStorageService } from '../Services/local-storage.service';
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

        // Check if error code matches session expired codes
        if (errorCode && (errorCode === 'ERP11040' || errorCode === 'ERP11041' || errorCode === 'ERP11042' ||
            errorCode === 'ERP11060' || errorCode === 'ERP11061' || errorCode === 'ERP11062')) {
            this.showSessionExpiredDialog();
        }
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

        // Session expired codes (HTTP error version)
        if (errorCode && ['ERP11040', 'ERP11041', 'ERP11042', 'ERP11060', 'ERP11061', 'ERP11062'].includes(errorCode)) {
            this.showSessionExpiredDialog();
            return;
        }

        // Fallback UI message
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
                this.localStorageService.removeItem('userData');
                this.router.navigate(['/auth']);
                window.location.reload();
            }
            this.sessionExpiredDialogRef = null;
        });
    }

}
