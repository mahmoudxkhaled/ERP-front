import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { EntitiesService } from '../../../services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { Entity } from '../../../models/entities.model';

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

    // Entity selection table properties
    entitiesForSelection: Entity[] = [];
    selectedParentEntity?: Entity;
    parentEntityDialogVisible: boolean = false;
    entityTableFirst: number = 0;
    entityTableRows: number = 10;
    entityTableTotalRecords: number = 0;
    entityTableTextFilter: string = '';
    loadingEntitiesTable: boolean = false;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];
    private accountSettings?: IAccountSettings;

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.initForm();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private initForm(): void {
        this.form = this.fb.group({
            code: ['', [Validators.required, textFieldValidator()]],
            name: ['', [Validators.required, textFieldValidator()]],
            description: ['', [Validators.required, textFieldValidator()]],
            parentEntityId: [0],
            isPersonal: [false]
        });
    }

    private prepareDialog(): void {
        if (!this.entityId) {
            return;
        }
        this.loadEntityDetails();
    }

    // Entity Selection Table Methods
    openParentEntityDialog(): void {
        this.parentEntityDialogVisible = true;
        this.entityTableTextFilter = '';
        this.entityTableFirst = 0;
        this.loadEntitiesForSelection(true);
    }

    closeParentEntityDialog(): void {
        this.parentEntityDialogVisible = false;
    }

    loadEntitiesForSelection(forceReload: boolean = false): void {
        if (this.entitiesService.isLoadingSubject.value && !forceReload) {
            return;
        }

        this.loadingEntitiesTable = true;

        // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
        const currentPage = Math.floor(this.entityTableFirst / this.entityTableRows) + 1;
        const lastEntityId = -currentPage;

        const sub = this.entitiesService.listEntities(lastEntityId, this.entityTableRows, this.entityTableTextFilter).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.loadingEntitiesTable = false;
                    return;
                }

                this.entityTableTotalRecords = Number(response.message.Total_Count || 0);

                let entitiesData: any = {};
                const messageData = response.message.Entities || {};
                Object.keys(messageData).forEach((key) => {
                    const item = messageData[key];
                    if (typeof item === 'object' && item !== null && item.Entity_ID !== undefined) {
                        entitiesData[key] = item;
                    }
                });

                let allEntities = Object.values(entitiesData).map((item: any) => {
                    return {
                        id: String(item?.Entity_ID || ''),
                        code: item?.Code || '',
                        name: this.isRegional ? (item?.Name_Regional || item?.Name || '') : (item?.Name || ''),
                        description: this.isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
                        parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
                        active: Boolean(item?.Is_Active),
                        isPersonal: Boolean(item?.Is_Personal)
                    };
                });

                // Exclude current entity to prevent circular references
                if (this.entityId) {
                    allEntities = allEntities.filter((entity: Entity) => entity.id !== this.entityId);
                }

                this.entitiesForSelection = allEntities;
                this.loadingEntitiesTable = false;
            },
            error: () => {
                this.loadingEntitiesTable = false;
            }
        });

        this.subscriptions.push(sub);
    }

    onEntityTablePageChange(event: any): void {
        this.entityTableFirst = event.first;
        this.entityTableRows = event.rows;
        this.loadEntitiesForSelection(true);
    }

    onEntityTableSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        const searchValue = target?.value || '';
        this.entityTableTextFilter = searchValue;
        this.entityTableFirst = 0; // Reset to first page when filter changes
        this.loadEntitiesForSelection(true);
    }

    selectParentEntity(entity: Entity): void {
        this.selectedParentEntity = entity;
        this.form.patchValue({
            parentEntityId: Number(entity.id)
        });
    }

    selectRootEntity(): void {
        this.selectedParentEntity = undefined;
        this.form.patchValue({
            parentEntityId: 0
        });
        this.closeParentEntityDialog();
    }

    isParentEntitySelected(entity: Entity): boolean {
        return this.selectedParentEntity?.id === entity.id;
    }

    getParentEntityDisplayText(): string {
        const parentId = this.form.get('parentEntityId')?.value || 0;
        if (parentId === 0) {
            return 'Root Entity';
        }
        if (this.selectedParentEntity) {
            return `${this.selectedParentEntity.name} (${this.selectedParentEntity.code})`;
        }
        // Try to find in current selection list
        const entity = this.entitiesForSelection.find(e => e.id === String(parentId));
        if (entity) {
            return `${entity.name} (${entity.code})`;
        }
        return 'Select parent entity';
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

                // Set selected parent entity if parentId exists
                if (parentEntityId && parentEntityId !== 0) {
                    // We'll need to load entities to find the parent, but for now set it as undefined
                    // It will be resolved when user opens the dialog
                    this.selectedParentEntity = undefined;
                } else {
                    this.selectedParentEntity = undefined;
                }

                this.loadingDetails = false;
            },
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
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
    }

    private getErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11250':
                return 'Invalid Parent Entity ID';
            case 'ERP11251':
                return 'Invalid \'Code\' format';
            case 'ERP11252':
                return 'Invalid \'Name\' format';
            case 'ERP11253':
                return 'Invalid \'Description\' format';
            case 'ERP11254':
                return 'The \'Code\' is not unique in the main root Entity tree. The administrator adding the entity should be notified to adjust the \'Code\' field';
            default:
                return null;
        }
    }

    get codeError(): string {
        const control = this.form.get('code');
        return getTextFieldError(control, 'Code', control?.touched || false);
    }

    get nameError(): string {
        const control = this.form.get('name');
        return getTextFieldError(control, 'Name', control?.touched || false);
    }

    get descriptionError(): string {
        const control = this.form.get('description');
        return getTextFieldError(control, 'Description', control?.touched || false);
    }
}

