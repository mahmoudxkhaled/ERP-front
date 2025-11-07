import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent {

  isLoading$: Observable<boolean>;

  constructor(private router: Router) {
  }

  onConfirmLogout() {

    this.router.navigate(['/auth']);
    console.log('confirmLogout');
  }
}