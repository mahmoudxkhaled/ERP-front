import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { FsPermissionsService } from '../../storage/folder-management/services/fs-permissions.service';

export interface OsfsFileSystemCard {
  id: number;
  name: string;
  accessRight: number;
  driveId: number;
}

@Component({
  selector: 'app-company-storage',
  templateUrl: './company-storage.component.html',
  styleUrls: ['./company-storage.component.scss'],
})
export class CompanyStorageComponent implements OnInit {
  fileSystems: OsfsFileSystemCard[] = [];
  loadingList = false;
  readonly cardSkeletonIndices = Array.from({ length: 15 }, (_, i) => i);

  constructor(
    private translate: TranslationService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService,
    private fsPermissionsService: FsPermissionsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadAccountFileSystems();
  }

  loadAccountFileSystems(): void {
    const accountId = this.localStorageService.getAccountDetails()?.Account_ID ?? 0;
    if (accountId <= 0) {
      this.fileSystems = [];
      return;
    }
    this.loadingList = true;
    this.fileSystems = [];
    this.fsPermissionsService.listAccountFileSystems(accountId, true).subscribe({
      next: (response: any) => {
        this.loadingList = false;
        if (!response?.success) {
          this.handleBusinessError('list', response);
          this.fileSystems = [];
          return;
        }
        const msg = response?.message;
        const list = Array.isArray(msg) ? msg : msg && typeof msg === 'object' ? Object.values(msg as object) : [];
        this.fileSystems = (list || [])
          .map((item: any) => ({
            id: Number(item?.file_system_id ?? item?.file_System_ID ?? item?.File_System_ID ?? 0),
            name: String(item?.file_system_name ?? item?.name ?? item?.Name ?? ''),
            accessRight: Number(
              item?.access_right ?? item?.access_Right ?? item?.Access_Right ?? item?.effective_access_right ?? -1
            ),
            driveId: Number(item?.drive_ID ?? item?.Drive_ID ?? item?.driveId ?? 0),
          }))
          .filter((fs: OsfsFileSystemCard) => fs.id > 0 && fs.name.trim() !== '');
      },
      error: () => {
        this.loadingList = false;
        this.fileSystems = [];
      },
    });
  }

  openFileSystem(row: OsfsFileSystemCard): void {
    void this.router.navigate(['folder', row.id], { relativeTo: this.route.parent });
  }

  fileSystemCardAccessRight(card: OsfsFileSystemCard | null | undefined): number {
    if (!card) {
      return -1;
    }
    return Number.isFinite(card.accessRight) ? card.accessRight : -1;
  }

  getAccessRightSeverity(accessRight: number): 'secondary' | 'info' | 'success' | 'warning' | 'danger' {
    if (accessRight <= 0) {
      return 'secondary';
    }
    if (accessRight === 1) {
      return 'info';
    }
    if (accessRight === 2) {
      return 'success';
    }
    if (accessRight === 3) {
      return 'warning';
    }
    if (accessRight >= 4) {
      return 'danger';
    }
    return 'secondary';
  }

  getAccessRightLabel(accessRight: number): string {
    switch (accessRight) {
      case 0:
        return this.translate.getInstant('fileSystem.permissions.accessRight.none');
      case 1:
        return this.translate.getInstant('fileSystem.permissions.accessRight.list');
      case 2:
        return this.translate.getInstant('fileSystem.permissions.accessRight.read');
      case 3:
        return this.translate.getInstant('fileSystem.permissions.accessRight.amend');
      case 4:
        return this.translate.getInstant('fileSystem.permissions.accessRight.modify');
      case 5:
        return this.translate.getInstant('fileSystem.permissions.accessRight.full');
      default:
        return this.translate.getInstant('fileSystem.permissions.accessRight.unknown');
    }
  }

  // #region Business errors
  private handleBusinessError(context: 'list', response: any): void {
    const code = String(response?.message || '');
    let detail = '';
    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code) || '';
        break;
      default:
        detail = '';
    }
    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }
  }

  private getListErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP12296':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccountId');
      case 'ERP12000':
        return this.translate.getInstant('fileSystem.admin.errorAccessDenied');
      case 'ERP12007':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedAction');
      default:
        return null;
    }
  }
  // #endregion
}
