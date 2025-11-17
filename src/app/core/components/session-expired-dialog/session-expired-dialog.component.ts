import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval, takeUntil } from 'rxjs';

@Component({
  selector: 'app-session-expired-dialog',
  templateUrl: './session-expired-dialog.component.html',
  styleUrls: ['./session-expired-dialog.component.scss']
})
export class SessionExpiredDialogComponent implements OnInit, OnDestroy {
  // Countdown timer starting from 5 seconds
  countdown: number = 5;
  private destroy$ = new Subject<void>();

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Start countdown timer that decreases every second
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.countdown > 0) {
          this.countdown--;
        } else {
          // When countdown reaches 0, automatically logout
          this.onLogout();
        }
      });
  }

  ngOnDestroy(): void {
    // Clean up the subscription when component is destroyed
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLogout(): void {
    // Clear the countdown
    this.destroy$.next();
    this.destroy$.complete();

    // Perform logout actions
    localStorage.removeItem('userData');
    this.router.navigate(['/auth']);
    document.location.reload();
  }
}
