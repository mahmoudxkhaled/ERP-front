import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { FileSystemsFilters } from '../models/file-system.model';

/**
 * Service for Storage (2B) File Systems APIs.
 * Pattern matches VirtualDrivesService: isLoadingSubject, callAPI, finalize.
 * Function IDs 1120-1129 per permissions matrix in API doc.
 */
@Injectable({
  providedIn: 'root',
})
export class FileSystemsService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) { }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }

  /**
   * List_File_System_Types (1120). No input.
   */
  listFileSystemTypes(): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1120, this.getAccessToken(), [])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * List_File_Systems (1121).
   * Input: Entity_Filter, Drive_ID, Active_Only
   */
  listFileSystems(filters: FileSystemsFilters): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      filters.entityFilter.toString(),
      filters.driveId.toString(),
      filters.activeOnly.toString(),
    ];
    return this.apiService
      .callAPI(1121, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Create_File_System (1122).
   * Input: Name, Type, Owner_ID, Is_Entity_ID, Drive_ID
   */
  createFileSystem(
    name: string,
    type: number,
    ownerId: number,
    isEntityId: number,
    driveId: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      name,
      type.toString(),
      ownerId.toString(),
      isEntityId.toString(),
      driveId.toString(),
    ];
    return this.apiService
      .callAPI(1122, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Get_File_System_Details (1123). Input: File_System_ID
   */
  getFileSystemDetails(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1123, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Update_File_System_Details (1124). Input: File_System_ID, Name, Type
   */
  updateFileSystemDetails(
    fileSystemId: number,
    name: string,
    type: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [fileSystemId.toString(), name, type.toString()];
    console.log('params update file system details', params);
    return this.apiService
      .callAPI(1124, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Delete_File_System (1125). Input: File_System_ID, Delete_All_Contents
   */
  deleteFileSystem(fileSystemId: number, deleteAllContents: boolean): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileSystemId.toString(),
      deleteAllContents.toString()
    ];
    return this.apiService
      .callAPI(1125, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Restore_Deleted_File_System (1126). Input: File_System_ID
   */
  restoreDeletedFileSystem(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1126, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Clear_File_System_Recycle_Bin (1127). Input: File_System_ID
   */
  clearFileSystemRecycleBin(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1127, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Restore_File_System_Recycle_Bin_Contents (1128). Input: File_System_ID
   */
  restoreFileSystemRecycleBinContents(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1128, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Get_File_System_Recycle_Bin_Contents (1129). Input: File_System_ID
   */
  getFileSystemRecycleBinContents(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1129, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }
}
