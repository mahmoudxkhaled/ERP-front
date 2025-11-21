import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';

interface User {
    id: string;
    name: string;
    email: string;
}

type AssignAdminContext = 'details' | 'assign';

@Component({
    selector: 'app-assign-admin',
    templateUrl: './assign-admin.component.html',
    styleUrls: ['./assign-admin.component.scss']
})
export class AssignAdminComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    entityId: string = '';
    entityName: string = '';
    users: User[] = [];
    loading: boolean = false;
    submitted: boolean = false;
    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.entityId = this.route.snapshot.paramMap.get('id') || '';
        this.initForm();
        this.loadEntity();
        this.loadUsers();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            userId: ['', [Validators.required]]
        });
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
                this.entityName = entity?.name ?? entity?.Name ?? '';
            },
            error: () => {
                this.handleUnexpectedError();
                this.loading = false;
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    loadUsers(): void {
        this.users = [
            { id: '1', name: 'John Doe', email: 'john@example.com' },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
        ];
    }

    submit(): void {
        this.submitted = true;
        if (this.loading || this.form.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please select a user.'
            });
            return;
        }

        this.loading = true;
        const userId = this.form.value.userId;

        const sub = this.entitiesService.assignEntityAdmin(this.entityId, userId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('assign', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Admin assigned successfully.'
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

    private handleBusinessError(context: AssignAdminContext, response: any): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'assign':
                detail = this.getAssignErrorMessage(code);
                break;
            case 'details':
                detail = this.getDetailsErrorMessage(code);
                break;
            default:
                detail = code || 'Unexpected error occurred.';
        }

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });
        this.loading = false;
    }

    private getAssignErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid entity selected.';
            case 'ERP11277':
                return 'Invalid account selected.';
            case 'ERP11278':
                return 'Account does not belong to this entity.';
            default:
                return code || 'Unexpected error occurred.';
        }
    }

    private getDetailsErrorMessage(code: string): string {
        if (code === 'ERP11260') {
            return 'Invalid entity selected.';
        }

        return code || 'Unexpected error occurred.';
    }

    private handleUnexpectedError(): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Unexpected error occurred.'
        });
    }
}

