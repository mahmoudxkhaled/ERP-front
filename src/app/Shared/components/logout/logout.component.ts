import { Component } from '@angular/core';
import { IawareSharedService } from 'src/app/core/Services/iaware-shared.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent {

  isLoading$: Observable<boolean>;

  constructor(private iawareSharedService: IawareSharedService) {
    this.isLoading$ = this.iawareSharedService.isLoadingSubject
  }

  onConfirmLogout() {
    this.iawareSharedService.logout().subscribe({
      next: () => {
        localStorage.removeItem('userData');
        document.location.reload();
      },
    });
  }
}