import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

export type AccessRight = 'None' | 'List' | 'Read' | 'Amend' | 'Modify' | 'Full';

export interface FileSystemPermissionsResult {
  effectiveAccessRight: AccessRight;
  /** Optional raw payload for troubleshooting / future UI needs. */
  raw: any;
}

/**
 * Service for account permissions on File Systems (Storage 2B).
 *
 * APIs:
 * - List_Account_File_Systems (1174)
 * - List_Account_FS_Permissions (1175)
 */
@Injectable({
  providedIn: 'root',
})
export class FsPermissionsService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) { }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }

  /**
   * List_Account_File_Systems (1174)
   * Input: Account_ID, Active_Only
   */
  listAccountFileSystems(accountId: number, activeOnly: boolean): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1174, this.getAccessToken(), [accountId.toString(), activeOnly.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * List_Account_FS_Permissions (1175)
   * Input: File_System_ID, Account_ID (order may vary by backend version).
   *
   * To stay robust, we try [fileSystemId, accountId] first, then swap once if we
   * detect an invalid ID error code.
   */
  listAccountFsPermissions(accountId: number, fileSystemId: number): Observable<FileSystemPermissionsResult> {
    this.isLoadingSubject.next(true);

    const tryRequest = (params: string[]) => this.apiService.callAPI(1175, this.getAccessToken(), params);

    const primaryParams = [fileSystemId.toString(), accountId.toString()];
    const fallbackParams = [accountId.toString(), fileSystemId.toString()];

    return new Observable<FileSystemPermissionsResult>((subscriber) => {
      tryRequest(primaryParams).subscribe({
        next: (response: any) => {
          console.log('List_Account_FS_Permissions response:', response);
          if (!response?.success) {
            const code = String(response?.errorCode ?? response?.message?.code ?? response?.code ?? response?.message ?? '');
            const shouldRetrySwap = code === 'ERP12260' || code === 'ERP12296';
            if (!shouldRetrySwap) {
              subscriber.error(response);
              return;
            }

            tryRequest(fallbackParams).subscribe({
              next: (fallbackResponse: any) => {
                if (!fallbackResponse?.success) {
                  subscriber.error(fallbackResponse);
                  return;
                }
                subscriber.next(this.mapPermissionsResponse(fallbackResponse));
                subscriber.complete();
              },
              error: (err) => subscriber.error(err),
            });
            return;
          }

          subscriber.next(this.mapPermissionsResponse(response));
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    }).pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  private mapPermissionsResponse(response: any): FileSystemPermissionsResult {
    const raw = response?.message ?? response;

    // Common backend shape for List_Account_FS_Permissions: array of permission entries.
    // Example item: { file_System_ID, access_Right, access_Right_Type, permission_ID, ... }
    // Effective access right = highest access_Right found.
    if (Array.isArray(raw)) {
      const maxRight = raw.reduce((max: number, item: any) => {
        const right = Number(item?.access_Right ?? item?.Access_Right ?? -1);
        return Number.isFinite(right) ? Math.max(max, right) : max;
      }, -1);
      return { effectiveAccessRight: this.normalizeAccessRight(maxRight), raw };
    }
    // API contract we received is an array. If backend returns an unexpected shape,
    // fall back to None to avoid showing actions by mistake.
    return { effectiveAccessRight: 'None', raw };
  }

  private normalizeAccessRight(value: any): AccessRight {
    const text = String(value ?? '').trim();
    const lower = text.toLowerCase();

    // If backend returns numbers, map them to a safe order (most APIs use 0..5).
    const asNumber = Number(text);
    if (!Number.isNaN(asNumber) && text !== '') {
      const map: Record<number, AccessRight> = {
        0: 'None',
        1: 'List',
        2: 'Read',
        3: 'Amend',
        4: 'Modify',
        5: 'Full',
      };
      return map[asNumber] ?? 'None';
    }

    if (lower.includes('full')) return 'Full';
    if (lower.includes('modify')) return 'Modify';
    if (lower.includes('amend')) return 'Amend';
    if (lower.includes('read')) return 'Read';
    if (lower.includes('list')) return 'List';
    return 'None';
  }
}

