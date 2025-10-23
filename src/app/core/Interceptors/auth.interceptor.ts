import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export class authInterceptor implements HttpInterceptor {
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let date : any  = localStorage.getItem('userData');
    let tokenFromLocalStorage : any = JSON.parse(date);
    const authReq = req.clone({
      headers: req.headers.set('Authorization',
        `Bearer ${tokenFromLocalStorage?.token}`)
    });
    return next.handle(authReq);
  }  
};
