import { Component, OnDestroy, OnInit } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Subject, takeUntil, timer } from 'rxjs';

@Component({
    selector: 'app-session-expired-dialog',
    templateUrl: './session-expired-dialog.component.html',
    styleUrls: ['./session-expired-dialog.component.scss']
})
export class SessionExpiredDialogComponent implements OnInit, OnDestroy {
    countdown: number = 5;
    private destroy$ = new Subject<void>();

    constructor(private ref: DynamicDialogRef) { }

    ngOnInit(): void {
        this.startCountdown();
    }

    private startCountdown(): void {
        // Use RxJS timer for countdown
        timer(0, 1000)
            .pipe(takeUntil(this.destroy$))
            .subscribe((elapsed) => {
                this.countdown = 5 - elapsed;

                if (this.countdown <= 0) {
                    // Countdown completed, close dialog and trigger logout
                    this.onCountdownComplete();
                }
            });
    }

    private onCountdownComplete(): void {
        // Close the dialog and return a signal that logout should proceed
        this.ref.close({ logout: true });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

