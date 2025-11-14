import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { LocalStorageService } from '../Services/local-storage.service';
import { SessionExpiredDialogComponent } from '../components/session-expired-dialog/session-expired-dialog.component';

@Injectable()
export class ErrorHandlingInterceptor implements HttpInterceptor {
    private router: Router;
    private sessionExpiredDialogRef: DynamicDialogRef | null = null;
    constructor(private injector: Injector, private localStorageService: LocalStorageService, private dialogService: DialogService, private authService: AuthService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        this.router = this.injector.get(Router);
        console.log('req', req);
        return next.handle(req).pipe(
            // Check successful responses for error codes in the body
            tap((event: HttpEvent<any>) => {
                if (event instanceof HttpResponse) {
                    this.checkResponseForErrorCodes(event);
                }
            }),
            catchError((error: HttpErrorResponse) => {
                console.log('error', error);
                this.handleError(error);
                return throwError(() => new Error(error.message || 'An unknown error occurred'));
            })
        );
    }

    private checkResponseForErrorCodes(response: HttpResponse<any>): void {
        let responseBody: any = null;
        let errorCode: string | null = null;

        console.log('response', response);
        // Extract response body
        const body = response.body;

        // Parse response body if it's a string
        if (typeof body === 'string') {
            try {
                responseBody = JSON.parse(body);
            } catch (e) {
                // If parsing fails, check if the string itself contains JSON
                const jsonMatch = body.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        responseBody = JSON.parse(jsonMatch[0]);
                    } catch (parseError) {
                        // If still can't parse, return early
                        return;
                    }
                } else {
                    return;
                }
            }
        } else if (body && typeof body === 'object') {
            // Body is already an object
            responseBody = body;
        } else {
            return;
        }

        // Check if response indicates an error (success: false)
        if (responseBody && responseBody.success === false) {
            console.log('responseBody', responseBody);
            // Extract error code from message field
            if (responseBody.message) {
                errorCode = responseBody.message.toString();
            }

            // Show session expired dialog if error code matches
            if (errorCode && (errorCode === 'ERP11041' || errorCode === 'ERP11042')) {
                this.showSessionExpiredDialog();
                return;
            }
        }
    }

    private handleError(error: HttpErrorResponse): void {
        let errorMessage = 'An error occurred. Please try again.';
        let errorCode: string | null = null;

        // Extract error message and code from different possible error structures
        if (error.error) {
            // Check if error.error is a string (JSON string) that needs parsing
            if (typeof error.error === 'string') {
                try {
                    const parsedError = JSON.parse(error.error);
                    errorMessage = parsedError.message || errorMessage;
                    errorCode = parsedError.message || parsedError.errorCode || null;
                } catch (e) {
                    // If parsing fails, check if the string itself is an error code
                    errorCode = error.error;
                }
            } else if (error.error.message) {
                errorMessage = error.error.message;
                errorCode = error.error.message;
            } else if (error.error.errorCode) {
                errorCode = error.error.errorCode;
            } else if (error.error.errorList && error.error.errorList.length > 0) {
                errorMessage = error.error.errorList.map((err: any) => err.message).join(', ');
                // Check if errorList contains error codes
                const firstError = error.error.errorList[0];
                errorCode = firstError.errorCode || firstError.message || null;
            }
        }

        // Handle specific error codes that require navigation
        if (errorCode) {
            const codeString = errorCode.toString();
            if (codeString === 'ERP11041' || codeString === 'ERP11042') {
                // Show session expired dialog for these authentication errors
                this.showSessionExpiredDialog();
                return;
            }
        }
    }

    private showSessionExpiredDialog(): void {
        // Prevent multiple dialogs from opening
        if (this.sessionExpiredDialogRef) {
            return;
        }

        this.sessionExpiredDialogRef = this.dialogService.open(SessionExpiredDialogComponent, {
            header: '',
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
