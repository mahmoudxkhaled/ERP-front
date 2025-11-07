import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorHandlingInterceptor implements HttpInterceptor {
    private router: Router;
    constructor(private injector: Injector, private dialogService: DialogService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        this.router = this.injector.get(Router);

        return next.handle(req).pipe(
            catchError((error: HttpErrorResponse) => {
                this.handleError(error);
                return throwError(() => new Error(error.message || 'An unknown error occurred'));
            })
        );
    }

    private handleError(error: HttpErrorResponse): void {
        let errorMessage = 'An error occurred. Please try again.';

        if (error.error && error.error.message) {
            errorMessage = error.error.message;
        } else if (error.error && error.error.errorList && error.error.errorList.length > 0) {
            errorMessage = error.error.errorList.map((err: any) => err.message).join(', ');
        }

    }

}
