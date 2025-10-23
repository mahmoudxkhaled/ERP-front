import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { IawareSharedService } from '../Services/iaware-shared.service';

@Injectable()
export class tokenInterceptor implements HttpInterceptor {
    constructor(private router: Router, private iawareSharedService: IawareSharedService) { }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        // Skip token expiration check for mock mode
        if (environment.useMockData) {
            console.log('🔐 Mock Mode: Skipping token expiration check');
            return next.handle(request);
        }

        // Real API mode - check token expiration
        let date: any = localStorage.getItem('userData');
        let expiryDate = JSON.parse(date);
        const isExpired = expiryDate?.expiresIn ? expiryDate?.expiresIn < Date.now() / 1000 : false;
        if (isExpired) {
            console.log('🔐 Token expired, logging out');
            this.logOut();
            this.router.navigateByUrl('/auth');
        }
        return next.handle(request);
    }

    logOut() {
        if (environment.useMockData) {
            console.log('🔐 Mock Mode: Clearing userData');
            localStorage.removeItem('userData');
            document.location.reload();
            return;
        }

        // Real API logout
        this.iawareSharedService.logout().subscribe({
            next: () => {
                localStorage.removeItem('userData');
                document.location.reload();
            },
        });
    }
}
