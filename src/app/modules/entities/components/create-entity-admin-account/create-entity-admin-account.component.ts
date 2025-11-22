import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';

@Component({
    selector: 'app-create-entity-admin-account',
    templateUrl: './create-entity-admin-account.component.html',
    styleUrls: ['./create-entity-admin-account.component.scss']
})
export class CreateEntityAdminAccountComponent implements OnInit, OnDestroy {
    entityId: string = '';
    entityName: string = '';
    form!: FormGroup;
    loading: boolean = false;
    loadingEntity: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    private subscriptions: Subscription[] = [];

    // Entity Role ID constant - Entity Administrator Role ID
    readonly ENTITY_ROLE_ID = 5;

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
        this.entityId = this.route.snapshot.paramMap.get('id') || '';
        if (!this.entityId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid entity ID.'
            });
            this.router.navigate(['/company-administration/entities/list']);
            return;
        }

        this.initForm();
        this.loadEntity();
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

        // Call the API to create the account
        const sub = this.entitiesService.createAccount(
            email,
            firstName,
            lastName,
            entityIdNum,
            this.ENTITY_ROLE_ID
        ).subscribe({
            next: (response: any) => {
                console.log('response', response);
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                // Success - show success message
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account created successfully.',
                    life: 3000
                });

                // Navigate to entity details page
                this.router.navigate(['/company-administration/entities', this.entityId]);
            },
            error: () => {
                this.handleUnexpectedError();
                this.loading = false;
            },
            complete: () => {
                this.loading = false;
            }
        });

        this.subscriptions.push(sub);
    }

    /**
     * Handle cancel button click
     */
    onCancel(): void {
        this.router.navigate(['/company-administration/entities', this.entityId]);
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
     * Get user-friendly error message based on error code
     * Error codes from Create_Account API documentation
     */
    private getErrorMessage(code: string): string {
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

