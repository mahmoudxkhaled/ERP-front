import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../Services/Loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
    constructor(private loadingService: LoadingService) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Trigger the loading state when a request starts
        this.loadingService.showLoading();

        return next.handle(req).pipe(
            // Stop the loading state when the request completes (success or error)
            finalize(() => this.loadingService.hideLoading())
        );
    }
}
