import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';

@Component({
    selector: 'app-create-entity-account',
    templateUrl: './create-entity-account.component.html',
    styleUrls: ['./create-entity-account.component.scss']
})
export class CreateEntityAccountComponent implements OnInit, OnDestroy, OnChanges {
    @Input() entityId: string = '';
    @Input() entityName: string = '';
    @Output() accountCreated = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    form!: FormGroup;
    loading: boolean = false;
    loadingEntity: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private route: ActivatedRoute,
        private router: Router,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        // If entityId is provided via @Input, use it; otherwise try to get from route (for standalone page)
        if (!this.entityId && this.route) {
            this.entityId = this.route.snapshot.paramMap.get('id') || '';
        }

        if (!this.entityId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid entity ID.'
            });
            if (this.router) {
                this.router.navigate(['/company-administration/entities/list']);
            }
            return;
        }

        this.initForm();

        // Load entity name if not provided via @Input
        if (!this.entityName && this.entityId) {
            this.loadEntity();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        // If entityId changes and entityName is not provided, load entity details
        if (changes['entityId'] && !changes['entityId'].firstChange && this.entityId && !this.entityName) {
            this.loadEntity();
        }

        // Reset form when entityId changes
        if (changes['entityId'] && !changes['entityId'].firstChange && this.form) {
            this.form.reset();
            this.submitted = false;
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    /**
     * Initialize the form with validation rules
     */
    initForm(): void {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            firstName: ['', [Validators.required]],
            lastName: ['', [Validators.required]]
        });
    }

    /**
     * Load entity details to display entity name
     */
    loadEntity(): void {
        this.loadingEntity = true;
        const sub = this.entitiesService.getEntityDetails(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                const entity = response?.message || {};
                this.entityName = this.isRegional
                    ? (entity?.Name_Regional || entity?.name_Regional || entity?.name || entity?.Name || '')
                    : (entity?.Name || entity?.name || '');
            },
            error: () => {
                this.handleUnexpectedError();
                this.loadingEntity = false;
            },
            complete: () => this.loadingEntity = false
        });

        this.subscriptions.push(sub);
    }

    /**
     * Get form controls for easy access in template
     */
    get f() {
        return this.form.controls;
    }

    /**
     * Handle form submission
     */
    submit(): void {
        this.submitted = true;

        // Check if form is valid
        if (this.form.invalid || this.loading) {
            if (this.form.invalid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill in all required fields correctly.'
                });
            }
            return;
        }

        // Get form values
        const email = this.form.value.email;
        const firstName = this.form.value.firstName;
        const lastName = this.form.value.lastName;
        const entityIdNum = parseInt(this.entityId, 10);

        // Validate entity ID
        if (isNaN(entityIdNum)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid entity ID.'
            });
            return;
        }

        this.loading = true;

        // Step 1: Create Entity Role
        const roleTitle = `${this.entityName} System User`;
        const roleDescription = `Default System User role for ${this.entityName}`;

        console.log('roleTitle', roleTitle);
        console.log('roleDescription', roleDescription);
        const sub = this.entitiesService.createEntityRole(entityIdNum, roleTitle, roleDescription).pipe(
            switchMap((roleResponse: any) => {
                console.log('roleResponse', roleResponse);
                if (!roleResponse?.success) {
                    this.handleCreateEntityRoleError(roleResponse);
                    return throwError(() => roleResponse);
                }
                console.log('roleResponse.message', roleResponse.message);
                // Extract Entity_Role_ID from response
                const entityRoleId = roleResponse.message.Entity_Role_ID; // int Entity_Role_ID
                console.log('entityRoleId', entityRoleId);
                // Step 2: Create Account
                return this.entitiesService.createAccount(email, firstName, lastName, entityIdNum, entityRoleId);
            })
        ).subscribe({
            next: (accountResponse: any) => {
                console.log('accountResponse', accountResponse);
                if (!accountResponse?.success) {
                    this.handleCreateAccountError(accountResponse);
                    return;
                }

                // Success - show success message
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account created successfully.',
                    life: 3000
                });

                // Reset form
                this.form.reset();
                this.submitted = false;
                this.loading = false;

                // Emit event to parent component
                this.accountCreated.emit();
            },
            error: (error: any) => {
                // Error already handled in switchMap or handleCreateAccountError or handleCreateEntityRoleError
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
    }

    /**
     * Handle cancel button click
     */
    onCancel(): void {
        // Reset form
        this.form.reset();
        this.submitted = false;

        // Emit event to parent component
        this.cancelled.emit();

        // If used as standalone page, navigate back
        if (this.router) {
            this.router.navigate(['/company-administration/entities', this.entityId]);
        }
    }

    /**
     * Handle business errors from API response
     */
    private handleBusinessError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(code);

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
        this.loading = false;
    }

    /**
     * Handle create entity role errors
     */
    private handleCreateEntityRoleError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getCreateEntityRoleErrorMessage(code);

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
        this.loading = false;
    }

    /**
     * Get error message for create entity role
     */
    private getCreateEntityRoleErrorMessage(code: string): string {
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
                return code || 'An error occurred while creating the role. Please try again.';
        }
    }

    /**
     * Handle create account errors
     */
    private handleCreateAccountError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getCreateAccountErrorMessage(code);

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
        this.loading = false;
    }

    /**
     * Get error message for create account
     */
    private getCreateAccountErrorMessage(code: string): string {
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
                return code || 'An error occurred while creating the account. Please try again.';
        }
    }

    /**
     * Get user-friendly error message based on error code
     * Error codes from Create_Account API documentation
     * @deprecated Use handleCreateAccountError or handleCreateEntityRoleError instead
     */
    private getErrorMessage(code: string): string {
        console.log('code', code);
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
                return 'Session expired. Please login again.';
        }
    }

    /**
     * Handle unexpected errors
     */
    private handleUnexpectedError(): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An unexpected error occurred. Please try again.'
        });
    }
}

