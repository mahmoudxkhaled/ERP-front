import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval, takeUntil } from 'rxjs';
import { LocalStorageService } from '../../services/local-storage.service';

@Component({
  selector: 'app-session-expired-dialog',
  templateUrl: './session-expired-dialog.component.html',
  styleUrls: ['./session-expired-dialog.component.scss']
})
export class SessionExpiredDialogComponent implements OnInit, OnDestroy {
  countdown: number = 5;
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private localStorageService: LocalStorageService) { }

  ngOnInit(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.countdown > 0) {
          this.countdown--;
        } else {
          this.onLogout();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLogout(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.localStorageService.clearToken();
    this.router.navigate(['/auth']);
    document.location.reload();
  }
}
