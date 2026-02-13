import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { VirtualDrivesFilters } from '../models/virtual-drive.model';

/**
 * Service responsible for calling the Storage (2B) Virtual Drives APIs.
 *
 * The style intentionally follows EntitiesService so it is easy to understand:
 * - expose a simple isLoadingSubject
 * - wrap ApiService.callAPI
 * - keep parameters order exactly as documented in the API spec
 */
@Injectable({
  providedIn: 'root',
})
export class VirtualDrivesService {
  /** Indicates if a Virtual Drives request is currently in progress. */
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) {}

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }

  /**
   * List_Drives (1150)
   * Input: short Entity_Filter, int License_ID, boolean Active_Only
   */
  listDrives(filters: VirtualDrivesFilters): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      filters.entityFilter.toString(),
      filters.licenseId.toString(),
      filters.activeOnly.toString(),
    ];

    return this.apiService
      .callAPI(1150, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Create_Virtual_Drive (1151)
   * Input: string Drive_Name, int License_ID, long Capacity
   */
  createDrive(
    driveName: string,
    licenseId: number,
    capacity: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      driveName,
      licenseId.toString(),
      capacity.toString(),
    ];

    return this.apiService
      .callAPI(1151, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Get_Virtual_Drive_Details (1152)
   * Input: int Drive_ID
   */
  getDriveDetails(driveId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString()];

    return this.apiService
      .callAPI(1152, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Rename_Virtual_Drive (1153)
   * Input: int Drive_ID, string New_Name
   */
  renameDrive(driveId: number, newName: string): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString(), newName];

    return this.apiService
      .callAPI(1153, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Update_Drive_Capacity (1154)
   * Input: int Drive_ID, long New_Capacity
   */
  updateDriveCapacity(
    driveId: number,
    newCapacity: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString(), newCapacity.toString()];

    return this.apiService
      .callAPI(1154, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Activate_Drive (1155)
   * Input: int Drive_ID
   */
  activateDrive(driveId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString()];

    return this.apiService
      .callAPI(1155, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Deactivate_Drive (1156)
   * Input: int Drive_ID
   */
  deactivateDrive(driveId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString()];

    return this.apiService
      .callAPI(1156, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }
}

