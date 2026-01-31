import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

/**
 * Used by app component to request a refresh of notifications (e.g. on page load).
 * Topbar subscribes and calls loadNotifications when requested.
 * ReplaySubject(1) so late subscribers (e.g. topbar after app init) still get the refresh.
 */
@Injectable({
    providedIn: 'root'
})
export class NotificationRefreshService {
    private refreshRequested$ = new ReplaySubject<void>(1);

    /** Call this to request that notifications be reloaded (e.g. on app init / page refresh). */
    requestRefresh(): void {
        this.refreshRequested$.next();
    }

    /** Subscribe to this to react when a refresh is requested. */
    onRefreshRequested() {
        return this.refreshRequested$.asObservable();
    }
}
