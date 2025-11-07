import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
  constructor(private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let userData: any = localStorage.getItem("userData");
    const tokenFromLocalStorage: any = JSON.parse(userData);
    if (tokenFromLocalStorage?.token) {
      return true;
    }
    this.router.navigateByUrl('/auth');
    return false;
  }
}
