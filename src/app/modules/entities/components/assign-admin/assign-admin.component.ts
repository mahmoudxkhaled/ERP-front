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

    }

    cancel(): void {
        this.router.navigate(['/company-administration/entities/list']);
    }

    get f() {
        return this.form.controls;
    }
}

