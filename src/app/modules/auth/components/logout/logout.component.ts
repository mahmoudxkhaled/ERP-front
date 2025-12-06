import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.scss'
})
export class LogoutComponent implements OnDestroy {

  isLoading$: Observable<boolean>;
  unsubs: Subscription = new Subscription();
  constructor(private authService: AuthService) {
    this.isLoading$ = this.authService.isLoadingSubject
  }

  onConfirmLogout() {
    this.unsubs.add(this.authService.logout().subscribe());
  }
  ngOnDestroy(): void {
    this.unsubs.unsubscribe();
  }
}
