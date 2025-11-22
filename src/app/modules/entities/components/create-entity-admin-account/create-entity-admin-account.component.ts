import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { Entity } from '../../models/entities.model';

@Component({
    selector: 'app-create-entity-admin-account',
    templateUrl: './create-entity-admin-account.component.html',
    styleUrls: ['./create-entity-admin-account.component.scss']
})
export class CreateEntityAdminAccountComponent implements OnInit, OnDestroy {
    @Input() entity!: Entity;
    @Output() accountCreated = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    form!: FormGroup;
    loading: boolean = false;
    submitted: boolean = false;
    private subscriptions: Subscription[] = [];

    // Entity Role ID constant - Entity Administrator Role ID
    readonly ENTITY_ROLE_ID = 5;

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.initForm();
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
        const entityId = parseInt(this.entity.id, 10);

        // Validate entity ID
        if (isNaN(entityId)) {
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
            entityId,
            this.ENTITY_ROLE_ID
        ).subscribe({
            next: (response: any) => {
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

                // Emit event to close dialog and optionally reload entities
                this.accountCreated.emit();
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
        this.cancel.emit();
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

