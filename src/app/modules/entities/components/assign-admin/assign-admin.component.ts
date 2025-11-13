import { Component, OnInit, OnDestroy } from '@angular/core';
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

@Component({
    selector: 'app-assign-admin',
    templateUrl: './assign-admin.component.html',
    styleUrls: ['./assign-admin.component.scss'],
    providers: [MessageService]
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
        // TODO: Load available users list from a users service
        // For now, using mock data
        this.loadUsers();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            userId: ['', [Validators.required]]
        });
    }

    loadEntity(): void {
        if (!this.entityId) return;

        this.loading = true;
        const sub = this.entitiesService.getById(this.entityId).subscribe({
            next: (response: any) => {
                if (response?.success === true && response?.data) {
                    this.entityName = response.data.name || 'Entity';
                } else {
                    const errorMsg = response?.message || 'Failed to load entity';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMsg
                    });
                }
                this.loading = false;
            },
            error: (error: any) => {
                const errorMsg = error?.message || 'Error loading entity';
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: errorMsg
                });
                this.loading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    loadUsers(): void {
        // TODO: Replace with actual users service call
        // For now, using mock data
        this.users = [
            { id: '1', name: 'John Doe', email: 'john@example.com' },
            { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
        ];
    }

    submit(): void {
        this.submitted = true;

        if (this.form.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please select a user'
            });
            return;
        }

        if (!this.entityId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Entity ID is missing'
            });
            return;
        }

        this.loading = true;
        const userId = this.form.value.userId;

        const sub = this.entitiesService.assignAdmin(this.entityId, userId).subscribe({
            next: (response: any) => {
                if (response?.success === true) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Admin assigned successfully'
                    });
                    setTimeout(() => {
                        this.router.navigate(['/company-administration/entities/list']);
                    }, 1500);
                } else {
                    const errorMsg = response?.message || 'Failed to assign admin';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMsg
                    });
                }
                this.loading = false;
            },
            error: (error: any) => {
                const errorMsg = error?.message || 'Error assigning admin';
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: errorMsg
                });
                this.loading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    cancel(): void {
        this.router.navigate(['/company-administration/entities/list']);
    }

    get f() {
        return this.form.controls;
    }
}

