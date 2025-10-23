import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export class authInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip adding Authorization header for mock mode
    if (environment.useMockData) {
      console.log('🔐 Mock Mode: Skipping Authorization header');
      return next.handle(req);
    }

    // Real API mode - add Authorization header
    let date: any = localStorage.getItem('userData');
    let tokenFromLocalStorage: any = JSON.parse(date);
    const authReq = req.clone({
      headers: req.headers.set('Authorization',
        `Bearer ${tokenFromLocalStorage?.token}`)
    });
    return next.handle(authReq);
  }
};
