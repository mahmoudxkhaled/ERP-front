import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { GroupsService } from '../../../services/groups.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Group } from '../../../models/groups.model';

@Component({
    selector: 'app-group-details',
    templateUrl: './group-details.component.html',
    styleUrls: ['./group-details.component.scss']
})
export class GroupDetailsComponent implements OnInit, OnDestroy {
    groupId: string = '';
    loading: boolean = false;
    loadingDetails: boolean = false;
    activeTabIndex: number = 0;

    groupDetails: any = null;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private groupsService: GroupsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.groupId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.groupId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid group ID.'
            });
            this.router.navigate(['/summary/groups/list']);
            return;
        }

        this.loadAllData();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadAllData(): void {
        this.loading = true;
        this.loadingDetails = true;

        const sub = this.groupsService.getGroup(Number(this.groupId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }
                this.groupDetails = response?.message || {};
                this.loadingDetails = false;
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
    }

    getGroupTitle(): string {
        if (!this.groupDetails) return '';
        return this.isRegional
            ? (this.groupDetails.Title_Regional || this.groupDetails.title_Regional || this.groupDetails.title || this.groupDetails.Title || '')
            : (this.groupDetails.Title || this.groupDetails.title || '');
    }

    getGroupDescription(): string {
        if (!this.groupDetails) return '';
        return this.isRegional
            ? (this.groupDetails.Description_Regional || this.groupDetails.description_Regional || this.groupDetails.description || this.groupDetails.Description || '')
            : (this.groupDetails.Description || this.groupDetails.description || '');
    }

    getGroupId(): string {
        if (!this.groupDetails) return '';
        return String(this.groupDetails.Group_ID || this.groupDetails.group_ID || this.groupId || '');
    }

    getStatusLabel(): string {
        if (!this.groupDetails) return 'Unknown';
        const isActive = this.groupDetails.Is_Active !== undefined
            ? this.groupDetails.Is_Active
            : (this.groupDetails.is_Active || this.groupDetails.active || false);
        return isActive ? 'Active' : 'Inactive';
    }

    getStatusSeverity(): 'success' | 'danger' {
        if (!this.groupDetails) return 'danger';
        const isActive = this.groupDetails.Is_Active !== undefined
            ? this.groupDetails.Is_Active
            : (this.groupDetails.is_Active || this.groupDetails.active || false);
        return isActive ? 'success' : 'danger';
    }

    openEditGroupDialog(): void {
        if (this.groupId) {
            this.router.navigate(['/summary/groups', this.groupId, 'edit']);
        }
    }

    handleGroupUpdated(): void {
        this.loadAllData();
    }

    navigateBack(): void {
        this.router.navigate(['/summary/groups/list']);
    }

    getGroupIdAsNumber(): number {
        return Number(this.groupId) || 0;
    }

    private handleBusinessError(context: string, response: any): void | null {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(context, code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        return null
    }

    private getErrorMessage(context: string, code: string): string | null {
        switch (code) {
            case 'ERP11290':
                return 'Invalid Group ID';
            default:
                return null;
        }
    }
}

