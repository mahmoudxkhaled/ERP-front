import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-session-expired-dialog',
  templateUrl: './session-expired-dialog.component.html',
  styleUrls: ['./session-expired-dialog.component.scss']
})
export class SessionExpiredDialogComponent {

  constructor(private router: Router) {}

  onLogout() {
    localStorage.removeItem('userData');
    this.router.navigate(['/auth']);
    document.location.reload();
  }
}
