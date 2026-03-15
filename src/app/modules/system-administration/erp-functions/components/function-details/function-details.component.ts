import { Component, OnDestroy, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { SettingsConfigurationsService } from '../../services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Function } from '../../models/settings-configurations.model';

@Component({
    selector: 'app-function-details',
    templateUrl: './function-details.component.html',
    styleUrls: ['./function-details.component.scss']
})
export class FunctionDetailsComponent implements OnInit, OnChanges, OnDestroy {
    @Input() functionIdInput: number | null = null;
    @Input() dialogMode: boolean = false;
    @Output() closed = new EventEmitter<void>();
    @Output() editRequested = new EventEmitter<void>();

    private _routeId: number = 0;
    get functionId(): number {
        return this.dialogMode ? (this.functionIdInput ?? 0) : this._routeId;
    }
    loading: boolean = false;
    loadingDetails: boolean = false;

    functionDetails: Function | null = null;
    functionLogoUrl: string | null = null;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private settingsConfigurationsService: SettingsConfigurationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        if (this.dialogMode) {
            if (!this.functionId || this.functionId === 0) {
                this.closed.emit();
                return;
            }
            this.loadAllData();
            return;
        }
        const idParam = this.route.snapshot.paramMap.get('id');
        this._routeId = idParam ? Number(idParam) : 0;
        if (!this.functionId || this.functionId === 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid function ID.'
            });
            this.router.navigate(['/system-administration/erp-functions/list']);
            return;
        }
        this.loadAllData();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.dialogMode && changes['functionIdInput'] && this.functionId > 0) {
            this.loadAllData();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadAllData(): void {
        this.loading = true;
        this.loadingDetails = true;

        const options = this.dialogMode ? { silent: true } : undefined;
        const sub = this.settingsConfigurationsService.getFunctionDetails(this.functionId, options).subscribe({
            next: (response: any) => {
                console.log('response function details', response);
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                const functionData = response?.message || {};
                const isActive = functionData.Is_Active ?? true;
                this.functionDetails = {
                    id: functionData.Function_ID || 0,
                    code: functionData.Code || '',
                    name: this.isRegional ? (functionData.Name_Regional || functionData.Name || '') : (functionData.Name || ''),
                    nameRegional: functionData.Name_Regional || '',
                    defaultOrder: functionData.Default_Order,
                    url: functionData.URL || '',
                    isActive: isActive
                };

                this.loadLogo();

                this.loadingDetails = false;
                this.loading = false;
            },
            complete: () => {
                this.loading = false;
                this.loadingDetails = false;
            }
        });

        this.subscriptions.push(sub);
    }

    private loadLogo(): void {
        if (!this.functionId || this.functionId === 0) {
            return;
        }
        const sub = this.settingsConfigurationsService.getFunctionLogo(this.functionId, { silent: true }).subscribe({
            next: (response: any) => {
                if (response?.success && response?.message?.Image?.trim()) {
                    const fmt = response.message.Image_Format || 'png';
                    this.functionLogoUrl = `data:image/${fmt.toLowerCase()};base64,${response.message.Image}`;
                } else {
                    this.functionLogoUrl = null;
                }
            }
        });
        this.subscriptions.push(sub);
    }

    navigateBack(): void {
        if (this.dialogMode) {
            this.closed.emit();
            return;
        }
        this.router.navigate(['/system-administration/erp-functions/list']);
    }

    editFunction(): void {
        if (this.dialogMode) {
            this.editRequested.emit();
            return;
        }
        this.router.navigate(['/system-administration/erp-functions', this.functionId, 'edit']);
    }

    private handleBusinessError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11400':
                detail = 'Invalid Function ID';
                break;
            default:
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
        return null;
    }
}
