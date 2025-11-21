import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';
import { Roles } from 'src/app/core/models/system-roles';

type EntityFormContext = 'create' | 'update' | 'details';

@Component({
    selector: 'app-entity-form',
    templateUrl: './entity-form.component.html',
    styleUrls: ['./entity-form.component.scss']
})
export class EntityFormComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    entityId: string = '';
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    showParentSelector: boolean = false;
    showIsPersonal: boolean = false;
    parentEntities: any[] = [];
    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) { }

    ngOnInit(): void {
        this.entityId = this.route.snapshot.paramMap.get('id') || '';
        this.isEdit = !!this.entityId;
        this.initForm();
        this.initializeRoleBasedLogic();

        if (this.isEdit) {
            this.loadEntity();
        }
    }

    private initializeRoleBasedLogic(): void {
        const accountDetails = this.localStorageService.getAccountDetails();
        const systemRole = accountDetails?.System_Role_ID;

        switch (systemRole) {
            case Roles.Developer:
                this.showParentSelector = true;
                this.showIsPersonal = true;
                this.loadAllEntities();
                break;
            case Roles.SystemAdministrator:
                this.showParentSelector = false;
                this.showIsPersonal = false;
                this.form.patchValue({ parentEntityId: 0, isPersonal: false });
                break;
            case Roles.EntityAdministrator:
                this.showParentSelector = true;
                this.showIsPersonal = false;
                this.form.patchValue({ isPersonal: false });
                this.loadEntityTree();
                break;
            default:
                this.showParentSelector = false;
                this.showIsPersonal = false;
                this.form.patchValue({ parentEntityId: 0, isPersonal: false });
                break;
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            code: ['', [Validators.required, this.entityCodeNameDescValidator]],
            name: ['', [Validators.required, this.entityCodeNameDescValidator]],
            description: ['', [Validators.required, this.entityCodeNameDescValidator]],
            parentEntityId: [0],
            isPersonal: [false]
        });
    }

    /**
     * Custom validator for entity code and name
     * Allows: letters (A–Z, a–z, any language letters), space, hyphen, apostrophe, dot, underscore
     */
    private entityCodeNameDescValidator(control: any) {
        if (!control.value) {
            return null;
        }

        const pattern = /^[\p{L}\s'\-._]+$/u;
        const isValid = pattern.test(control.value);

        return isValid ? null : { invalidFormat: true };
    }

    loadAllEntities(): void {
        const sub = this.entitiesService.listEntities().subscribe({
            next: (res: any) => {
                if (res?.success) {
                    const entitiesData = res.message || {};
                    const entities = Object.values(entitiesData).map((item: any) => ({
                        ID: item?.Entity_ID || item?.id,
                        Name: item?.Name || item?.name || '',
                        Code: item?.Code || item?.code || ''
                    }));

                    this.parentEntities = [
                        { ID: 0, Name: 'Root Entity', Code: 'ROOT' },
                        ...entities
                    ];
                }
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load entities.'
                });
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntityTree(): void {
        const sub = this.entitiesService.listEntities().subscribe({
            next: (res: any) => {
                if (res?.success) {
                    const entitiesData = res.message || {};
                    const currentEntityId = this.localStorageService.getParentEntityId();
                    const allEntities = Object.values(entitiesData);

                    const filteredEntities = allEntities
                        .filter((x: any) => {
                            const treePath = x?.TreePath || x?.treePath || '';
                            return treePath.includes(String(currentEntityId));
                        })
                        .map((item: any) => ({
                            ID: item?.Entity_ID || item?.id,
                            Name: item?.Name || item?.name || '',
                            Code: item?.Code || item?.code || ''
                        }));

                    this.parentEntities = [
                        { ID: 0, Name: 'Root Entity', Code: 'ROOT' },
                        ...filteredEntities
                    ];
                }
            },
            error: () => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load entity tree.'
                });
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntity(): void {
        if (!this.entityId) {
            return;
        }

        this.loading = true;
        const sub = this.entitiesService.getEntityDetails(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }

                const entity = response?.message ?? {};
                const parentId = entity?.parentEntityId ?? entity?.Parent_Entity_ID ?? 0;

                this.form.patchValue({
                    code: entity?.code ?? entity?.Code ?? '',
                    name: entity?.name ?? entity?.Name ?? '',
                    description: entity?.description ?? entity?.Description ?? '',
                    parentEntityId: parentId ? Number(parentId) : 0,
                    isPersonal: entity?.isPersonal ?? entity?.Is_Personal ?? false
                });

                if (!this.showIsPersonal) {
                    this.form.patchValue({ isPersonal: false });
                }
            },
            error: () => {
                this.handleUnexpectedError();
                this.loading = false;
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    submit(): void {
        this.submitted = true;
        if (this.loading || this.form.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please fill in all required fields.'
            });
            return;
        }

        const accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        const isRegional = accountSettings?.Language !== 'English';

        this.loading = true;
        const { code, name, description, parentEntityId, isPersonal } = this.form.value;

        const sub = (this.isEdit
            ? this.entitiesService.updateEntityDetails(
                this.entityId,
                code,
                name,
                description,
                Number(parentEntityId) || 0,
                isRegional,
                isPersonal || false
            )
            : this.entitiesService.addEntity(
                code,
                name,
                description,
                isPersonal || false,
                Number(parentEntityId) || 0
            )
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(this.isEdit ? 'update' : 'create', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: this.isEdit ? 'Entity updated successfully.' : 'Entity created successfully.'
                });
                this.router.navigate(['/company-administration/entities/list']);
            },
            error: () => {
                this.handleUnexpectedError();
                this.loading = false;
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    cancel(): void {
        this.router.navigate(['/company-administration/entities/list']);
    }

    get f() {
        return this.form.controls;
    }

    get codeError(): string {
        const control = this.f['code'];
        if (control?.errors?.['required'] && this.submitted) {
            return 'Entity code is required.';
        }
        if (control?.errors?.['invalidFormat'] && this.submitted) {
            return 'Only letters, spaces, hyphens (-), apostrophes (\'), dots (.), and underscores (_) are allowed.';
        }
        return '';
    }

    get nameError(): string {
        const control = this.f['name'];
        if (control?.errors?.['required'] && this.submitted) {
            return 'Company name is required.';
        }
        if (control?.errors?.['invalidFormat'] && this.submitted) {
            return 'Only letters, spaces, hyphens (-), apostrophes (\'), dots (.), and underscores (_) are allowed.';
        }
        return '';
    }

    private handleBusinessError(context: EntityFormContext, response: any): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'create':
                detail = this.getCreationErrorMessage(code);
                break;
            case 'update':
                detail = this.getUpdateErrorMessage(code);
                break;
            case 'details':
                detail = this.getDetailsErrorMessage(code);
                break;
            default:
                detail = 'Unexpected error occurred.';
        }

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
        this.loading = false;
    }

    private getCreationErrorMessage(code: string): string {
        console.log('code', code);
        switch (code) {
            case 'ERP11250':
                return 'Invalid parent entity.';
            case 'ERP11251':
                return 'Invalid entity code format. Only letters, spaces, hyphens, apostrophes, dots, and underscores are allowed.';
            case 'ERP11252':
                return 'Invalid entity name format. Only letters, spaces, hyphens, apostrophes, dots, and underscores are allowed.';
            case 'ERP11253':
                return 'Invalid description format.';
            case 'ERP11254':
                return 'Duplicate entity code.';
            default:
                return 'Session expired. Please login again.';
        }
    }

    private getUpdateErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid entity.';
            case 'ERP11250':
                return 'Invalid parent entity.';
            case 'ERP11251':
                return 'Invalid entity code format. Only letters, spaces, hyphens, apostrophes, dots, and underscores are allowed.';
            case 'ERP11252':
                return 'Invalid entity name format. Only letters, spaces, hyphens, apostrophes, dots, and underscores are allowed.';
            case 'ERP11253':
                return 'Invalid description format.';
            case 'ERP11254':
                return 'Duplicate entity code.';
            default:
                return 'Session expired. Please login again.';
        }
    }

    private getDetailsErrorMessage(code: string): string {
        if (code === 'ERP11260') {
            return 'Invalid entity selected.';
        }

        return 'Session expired. Please login again.';
    }

    private handleUnexpectedError(): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Session expired. Please login again.'
        });
    }
}

