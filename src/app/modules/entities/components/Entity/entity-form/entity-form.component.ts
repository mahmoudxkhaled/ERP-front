import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EntitiesService } from '../../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';
import { Roles } from 'src/app/core/models/system-roles';
import { textFieldValidator, getTextFieldError } from 'src/app/core/Services/textFieldValidator';
import { dE } from '@fullcalendar/core/internal-common';

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
    showAccountSection: boolean = false;
    systemRole: number = 0;
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
        this.systemRole = accountDetails?.System_Role_ID || 0;

        switch (this.systemRole) {
            case Roles.Developer:
                this.showParentSelector = true;
                this.showIsPersonal = true;
                this.showAccountSection = true;
                this.loadAllEntities();
                break;
            case Roles.SystemAdministrator:
                this.showParentSelector = false;
                this.showIsPersonal = false;
                this.showAccountSection = true;
                this.form.patchValue({ parentEntityId: 0, isPersonal: false });
                break;
            case Roles.EntityAdministrator:
                this.showParentSelector = true;
                this.showIsPersonal = false;
                this.showAccountSection = false;
                this.form.patchValue({ isPersonal: false });
                this.loadEntityTree();
                break;
            default:
                this.showParentSelector = false;
                this.showIsPersonal = false;
                this.showAccountSection = false;
                this.form.patchValue({ parentEntityId: 0, isPersonal: false });
                break;
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            code: ['', [Validators.required, textFieldValidator()]],
            name: ['', [Validators.required, textFieldValidator()]],
            description: ['', [Validators.required, textFieldValidator()]],
            parentEntityId: [0],
            isPersonal: [false],
            email: ['', [Validators.required, Validators.email]],
            firstName: ['', [Validators.required, textFieldValidator()]],
            lastName: ['', [Validators.required, textFieldValidator()]]
        });
    }

    loadAllEntities(): void {
        const sub = this.entitiesService.listEntities().subscribe({
            next: (res: any) => {
                if (res?.success) {

                    console.log('res', res);
                    const entitiesData = res.message.Entities
                        || {};
                    const entities = Object.values(entitiesData).map((item: any) => ({
                        ID: item?.Entity_ID,
                        Name: item?.Name || '',
                        Code: item?.Code || ''
                    }));

                    this.parentEntities = [
                        { ID: 0, Name: 'Root Entity', Code: 'ROOT' },
                        ...entities
                    ];
                }
            },

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
                            Name: item?.Name || '',
                            Code: item?.Code || ''
                        }));

                    this.parentEntities = [
                        { ID: 0, Name: 'Root Entity', Code: 'ROOT' },
                        ...filteredEntities
                    ];
                }
            },
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

                // Convert parentEntityId to number and ensure 0 is used for root entity
                const parentId = entity?.Parent_Entity_ID;
                const parentEntityId = parentId === null || parentId === undefined || parentId === '' || parentId === '0'
                    ? 0
                    : Number(parentId) || 0;

                this.form.patchValue({
                    code: entity?.Code ?? '',
                    name: entity?.Name ?? '',
                    description: entity?.Description ?? '',
                    parentEntityId: parentEntityId,
                    isPersonal: entity?.Is_Personal || false
                });

                if (!this.showIsPersonal) {
                    this.form.patchValue({ isPersonal: false });
                }
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    submit(): void {
        this.submitted = true;

        // Validate form - check account fields only if account section is shown
        if (this.loading) {
            return;
        }

        // Check if account fields are required and valid
        if (this.showAccountSection && !this.isEdit) {
            const accountFieldsValid = this.form.get('email')?.valid &&
                this.form.get('firstName')?.valid &&
                this.form.get('lastName')?.valid;
            if (!accountFieldsValid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill in all required fields including account information.'
                });
                return;
            }
        }

        // Check entity fields
        if (this.form.get('code')?.invalid || this.form.get('name')?.invalid || this.form.get('description')?.invalid) {
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
        const { code, name, description, parentEntityId, isPersonal, email, firstName, lastName } = this.form.value;

        // Handle edit mode (keep existing logic)
        if (this.isEdit) {
            const sub = this.entitiesService.updateEntityDetails(
                this.entityId,
                code,
                name,
                description,
                Number(parentEntityId) || 0,
                isRegional,
                isPersonal || false
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('update', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Entity updated successfully.'
                    });
                    this.router.navigate(['/company-administration/entities/list']);
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

        // Handle create mode
        const parentId = Number(parentEntityId) || 0;
        const isPersonalValue = isPersonal || false;

        // For SystemAdministrator or Developer: Validate email first, then Create Entity → Create Entity Role → Create Account
        if (this.systemRole === Roles.SystemAdministrator || this.systemRole === Roles.Developer) {
            // Step 0: Pre-validate email before creating entity
            this.validateEmailBeforeCreation(email, code, name, description, parentId, isPersonalValue, firstName, lastName);
            return;
        }
        // For EntityAdministrator: Create Entity only
        else if (this.systemRole === Roles.EntityAdministrator) {
            const sub = this.entitiesService.addEntity(
                code,
                name,
                description,
                parentId,
                isPersonalValue
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('create', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Entity created successfully.'
                    });
                    this.router.navigate(['/company-administration/entities/list']);
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
        }
    }

    cancel(): void {
        this.router.navigate(['/company-administration/entities/list']);
    }

    get f() {
        return this.form.controls;
    }

    get codeError(): string {
        return getTextFieldError(this.f['code'], 'Entity code', this.submitted);
    }

    get nameError(): string {
        return getTextFieldError(this.f['name'], 'Company name', this.submitted);
    }

    get emailError(): string {
        const control = this.f['email'];
        if (!this.showAccountSection) {
            return '';
        }
        if (control?.errors?.['required'] && this.submitted) {
            return 'Email is required.';
        }
        if (control?.errors?.['email'] && this.submitted) {
            return 'Please enter a valid email address.';
        }
        return '';
    }

    get firstNameError(): string {
        if (!this.showAccountSection) {
            return '';
        }
        return getTextFieldError(this.f['firstName'], 'First name', this.submitted);
    }

    get lastNameError(): string {
        if (!this.showAccountSection) {
            return '';
        }
        return getTextFieldError(this.f['lastName'], 'Last name', this.submitted);
    }

    private handleBusinessError(context: EntityFormContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'create':
                detail = this.getCreationErrorMessage(code) || '';
                break;
            case 'update':
                detail = this.getUpdateErrorMessage(code) || '';
                break;
            case 'details':
                detail = this.getDetailsErrorMessage(code) || '';
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

    private getCreationErrorMessage(code: string): string | null {
        console.log('code', code);
        switch (code) {
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

    private getUpdateErrorMessage(code: string): string | null {
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

    private getDetailsErrorMessage(code: string): string | null {
        if (code === 'ERP11260') {
            return 'Invalid Entity ID';
        }

        return null;
    }



    private handleCreateEntityRoleError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getCreateEntityRoleErrorMessage(code);

        if (detail) {

            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
    }

    private getCreateEntityRoleErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11300':
                return 'Invalid entity selected.';
            case 'ERP11301':
                return 'Invalid role title format.';
            case 'ERP11302':
                return 'Invalid role description format.';
            case 'ERP11303':
                return 'A role with this title already exists for this entity.';
            default:
                return null;
        }
    }

    private handleCreateAccountError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getCreateAccountErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
    }

    private getCreateAccountErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11130':
                return 'Invalid email address format';
            case 'ERP11141':
                return 'An account with the same email already exists';
            case 'ERP11142':
                return 'Invalid First Name format -> Empty or contains special characters';
            case 'ERP11143':
                return 'Invalid Last Name format -> Empty or contains special characters';
            case 'ERP11144':
                return 'Invalid Entity ID -> The database does not have an Entity with this ID';
            case 'ERP11145':
                return 'Invalid Role ID -> The entity does not have a Role with this ID';
            default:
                return null;
        }
    }

    /**
     * Pre-validate email before creating entity to prevent orphaned entities
     * If email exists (API returns success), show error and prevent entity creation
     * If email doesn't exist (error ERP11150), proceed with entity creation
     */
    private validateEmailBeforeCreation(
        email: string,
        code: string,
        name: string,
        description: string,
        parentId: number,
        isPersonalValue: boolean,
        firstName: string,
        lastName: string
    ): void {
        const sub = this.entitiesService.getAccountDetails(email).subscribe({
            next: (response: any) => {
                // If API returns success, email already exists
                if (response?.success) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Email Exists',
                        detail: 'An account with this email already exists. Please use a different email address.',
                        life: 5000
                    });
                    this.loading = false;
                    return;
                }
                // If not success, proceed with entity creation
                this.proceedWithEntityCreation(code, name, description, parentId, isPersonalValue, email, firstName, lastName);
            },
            error: (error: any) => {
                const errorCode = String(error?.message || '');
                // If error is ERP11150, email doesn't exist - proceed with creation
                if (errorCode === 'ERP11150') {
                    this.proceedWithEntityCreation(code, name, description, parentId, isPersonalValue, email, firstName, lastName);
                } else {
                    // Other error - show and stop
                    this.handleBusinessError('create', error);
                }
            }
        });
        this.subscriptions.push(sub);
    }

    /**
     * Proceed with entity creation after email validation passes
     */
    private proceedWithEntityCreation(
        code: string,
        name: string,
        description: string,
        parentId: number,
        isPersonalValue: boolean,
        email: string,
        firstName: string,
        lastName: string
    ): void {
        const sub = this.entitiesService.addEntity(
            code,
            name,
            description,
            parentId,
            isPersonalValue
        ).pipe(
            switchMap((entityResponse: any) => {
                if (!entityResponse?.success) {
                    this.handleBusinessError('create', entityResponse);
                    return throwError(() => entityResponse);
                }

                console.log('entityResponse', entityResponse);
                // Extract Entity_ID from response
                const entityId = entityResponse.message.Entity_ID; // int Entity_ID

                // Step 2: Create Entity Role
                const roleTitle = `${name} Entity Administrator`;
                const roleDescription = `Default Entity Administrator role for ${name}`;
                return this.entitiesService.createEntityRole(entityId, roleTitle, roleDescription).pipe(
                    switchMap((roleResponse: any) => {
                        if (!roleResponse?.success) {
                            this.handleCreateEntityRoleError(roleResponse);
                            return throwError(() => roleResponse);
                        }

                        // Extract Entity_Role_ID from response
                        const entityRoleId = roleResponse.message.Entity_Role_ID; // int Entity_Role_ID

                        // Step 3: Create Account
                        return this.entitiesService.createAccount(email, firstName, lastName, entityId, entityRoleId);
                    })
                );
            })
        ).subscribe({
            next: (accountResponse: any) => {
                if (!accountResponse?.success) {
                    this.handleCreateAccountError(accountResponse);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Entity, role, and administrator account created successfully.'
                });
                this.router.navigate(['/company-administration/entities/list']);
            },
            error: (error: any) => {
                // Error already handled in switchMap or handleCreateAccountError or handleCreateEntityRoleError
                this.loading = false;
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }
}

