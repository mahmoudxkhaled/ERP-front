import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';

@Component({
    selector: 'app-entity-form',
    templateUrl: './entity-form.component.html',
    styleUrls: ['./entity-form.component.scss'],
    providers: [MessageService]
})
export class EntityFormComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    entityId: string = '';
    isEdit: boolean = false;
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
        this.isEdit = !!this.entityId;
        this.initForm();

        if (this.isEdit) {
            this.loadEntity();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            name: ['', [Validators.required]],
            countryCode: ['', [Validators.required]],
            timezone: [''],
            taxId: ['']
        });
    }

    loadEntity(): void {
        if (!this.entityId) return;

        this.loading = true;
        const sub = this.entitiesService.getById(this.entityId).subscribe({
            next: (response: any) => {
                if (response?.success === true && response?.data) {
                    this.form.patchValue(response.data);
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

    submit(): void {
        this.submitted = true;

        if (this.form.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please fill in all required fields'
            });
            return;
        }

        this.loading = true;
        const formData = this.form.value;

        // Add id if editing
        if (this.isEdit && this.entityId) {
            formData.id = this.entityId;
        }

        const action = this.isEdit
            ? this.entitiesService.update(formData)
            : this.entitiesService.create(formData);

        const sub = action.subscribe({
            next: (response: any) => {
                if (response?.success === true) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: this.isEdit ? 'Entity updated successfully' : 'Entity created successfully'
                    });
                    setTimeout(() => {
                        this.router.navigate(['/company-administration/entities/list']);
                    }, 1500);
                } else {
                    const errorMsg = response?.message || 'Failed to save entity';
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: errorMsg
                    });
                }
                this.loading = false;
            },
            error: (error: any) => {
                const errorMsg = error?.message || 'Error saving entity';
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

