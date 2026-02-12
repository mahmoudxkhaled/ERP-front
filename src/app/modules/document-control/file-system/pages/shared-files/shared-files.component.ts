import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface SharedFileItem {
    name: string;
    sharedBy: string;
    permission: 'Read' | 'Write' | 'Download';
}

@Component({
    selector: 'app-shared-files',
    templateUrl: './shared-files.component.html',
    styleUrls: ['./shared-files.component.scss']
})
export class SharedFilesComponent {
    sharedFiles: SharedFileItem[] = [
        { name: 'Project-Brief.pdf', sharedBy: 'John Smith', permission: 'Read' },
        { name: 'Design-Specs.docx', sharedBy: 'Sarah Jones', permission: 'Write' },
        { name: 'Budget-Overview.xlsx', sharedBy: 'Finance Team', permission: 'Download' },
        { name: 'Meeting-Minutes-Jan.pdf', sharedBy: 'Mike Wilson', permission: 'Read' },
        { name: 'Contract-Draft.docx', sharedBy: 'Legal Team', permission: 'Write' }
    ];

    downloadProgressVisible = false;
    downloadFileName = '';

    constructor(
        private translate: TranslationService,
        private messageService: MessageService
    ) {}

    onView(row: SharedFileItem): void {
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('fileSystem.sharedFiles.viewToastSummary'),
            detail: this.translate.getInstant('fileSystem.sharedFiles.viewToastDetail') + ' ' + row.name
        });
    }

    onDownload(row: SharedFileItem): void {
        this.downloadFileName = row.name;
        this.downloadProgressVisible = true;
    }

    hideDownloadProgress(): void {
        this.downloadProgressVisible = false;
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.sharedFiles.downloadSuccessSummary'),
            detail: this.translate.getInstant('fileSystem.sharedFiles.downloadSuccessDetail') + ' ' + this.downloadFileName
        });
    }

    getPermissionLabel(permission: string): string {
        const key = 'fileSystem.sharedFiles.permission' + permission.charAt(0).toUpperCase() + permission.slice(1).toLowerCase();
        return this.translate.getInstant(key);
    }

    getPermissionSeverity(permission: string): string {
        if (permission === 'Write') return 'success';
        if (permission === 'Download') return 'info';
        return 'secondary';
    }
}
