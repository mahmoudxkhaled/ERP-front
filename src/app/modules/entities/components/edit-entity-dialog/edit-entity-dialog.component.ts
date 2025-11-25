import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';

interface ParentOption {
    label: string;
    value: number;
}

@Component({
    selector: 'app-edit-entity-dialog',
    templateUrl: './edit-entity-dialog.component.html',
    styleUrls: ['./edit-entity-dialog.component.scss']
})
export class EditEntityDialogComponent implements OnInit, OnDestroy {
    private _visible: boolean = false;

    @Input()
    get visible(): boolean {
        return this._visible;
    }
    set visible(value: boolean) {
        this._visible = value;
        if (value) {
            this.prepareDialog();
        }
    }

    @Input() entityId: string = '';
    @Input() entityName: string = '';

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    form!: FormGroup;
    loadingDetails: boolean = false;
    saving: boolean = false;
    parentOptions: ParentOption[] = [];
    private parentOptionsLoaded: boolean = false;
    private subscriptions: Subscription[] = [];
    private accountSettings?: IAccountSettings;

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
    }

    ngOnInit(): void {
        this.initForm();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private initForm(): void {
        this.form = this.fb.group({
            code: ['', Validators.required],
            name: ['', Validators.required],
            description: ['', Validators.required],
            parentEntityId: [0],
            isPersonal: [false]
        });
    }

    private prepareDialog(): void {
        if (!this.entityId) {
            return;
        }
        if (!this.parentOptionsLoaded) {
            this.loadParentOptions();
        }
        this.loadEntityDetails();
    }

    private loadParentOptions(): void {
        const sub = this.entitiesService.listEntities().subscribe({
            next: (response) => {
                if (response?.success) {
                    const entities = response.message || {};
                    const options = Object.values(entities).map((item: any) => {
                        const label = `${item?.Name || 'Entity'} (${item?.Code || 'N/A'})`;
                        const value = Number(item?.Entity_ID || item?.id || 0);
                        return { label, value };
                    }).filter((option: ParentOption) => !isNaN(option.value));

                    this.parentOptions = [
                        { label: 'Root Entity', value: 0 },
                        ...options
                    ];
                    this.parentOptionsLoaded = true;
                }
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Unable to load parent entities.'
                });
            }
        });

        this.subscriptions.push(sub);
    }

    private loadEntityDetails(): void {
        if (!this.entityId) {
            return;
        }

        this.loadingDetails = true;
        const sub = this.entitiesService.getEntityDetails(this.entityId).subscribe({
            next: (response) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    this.loadingDetails = false;
                    return;
                }

                const details = response.message || {};
                const parentIdRaw = details?.Parent_Entity_ID ?? details?.parent_Entity_ID;
                const parentEntityId = parentIdRaw ? Number(parentIdRaw) : 0;

                this.form.patchValue({
                    code: details?.Code || details?.code || '',
                    name: details?.Name || details?.name || '',
                    description: details?.Description || details?.description || '',
                    parentEntityId: parentEntityId || 0,
                    isPersonal: details?.Is_Personal ?? details?.is_Personal ?? false
                });

                this.loadingDetails = false;
            },
            error: () => {
                this.loadingDetails = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Unable to load entity details.'
                });
            }
        });

        this.subscriptions.push(sub);
    }

    submit(): void {
        if (this.form.invalid || !this.entityId) {
            this.form.markAllAsTouched();
            return;
        }

        const { code, name, description, parentEntityId, isPersonal } = this.form.value;
        const isRegional = this.accountSettings?.Language !== 'English';

        this.saving = true;
        const sub = this.entitiesService
            .updateEntityDetails(
                this.entityId,
                code.trim(),
                name.trim(),
                description.trim(),
                Number(parentEntityId) || 0,
                !!isRegional,
                !!isPersonal
            )
            .subscribe({
                next: (response) => {
                    this.saving = false;
                    if (!response?.success) {
                        this.handleBusinessError(response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Updated',
                        detail: 'Entity details saved successfully.'
                    });

                    this.saved.emit();
                    this.closeDialog();
                },
                error: () => {
                    this.saving = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Unable to update entity.'
                    });
                }
            });

        this.subscriptions.push(sub);
    }

    closeDialog(): void {
        this.onVisibleChange(false);
    }

    onDialogHide(): void {
        this.onVisibleChange(false);
    }

    onVisibleChange(value: boolean): void {
        this._visible = value;
        this.visibleChange.emit(value);
    }

    private handleBusinessError(response: any): void {
        const detail = response?.message || 'Something went wrong.';
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
    }
}

