import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { GroupsService } from '../../../services/groups.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';

type GroupFormContext = 'create' | 'update' | 'details';

@Component({
    selector: 'app-group-form',
    templateUrl: './group-form.component.html',
    styleUrls: ['./group-form.component.scss']
})
export class GroupFormComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    groupId: string = '';
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private groupsService: GroupsService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.groupId = this.route.snapshot.paramMap.get('id') || '';
        this.isEdit = !!this.groupId;
        this.initForm();

        if (this.isEdit) {
            this.loadGroup();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            title: ['', [Validators.required, textFieldValidator()]],
            description: ['', [Validators.required, textFieldValidator()]]
        });
    }

    loadGroup(): void {
        if (!this.groupId) {
            return;
        }

        this.loading = true;
        const sub = this.groupsService.getGroup(Number(this.groupId)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }

                const group = response?.message ?? {};
                const title = this.isRegional && group?.Title_Regional
                    ? group.Title_Regional
                    : (group?.Title || '');
                const description = this.isRegional && group?.Description_Regional
                    ? group.Description_Regional
                    : (group?.Description || '');

                this.form.patchValue({
                    title: title,
                    description: description
                });
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    submit(): void {
        this.submitted = true;

        if (this.loading) {
            return;
        }

        if (this.form.get('title')?.invalid || this.form.get('description')?.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please fill in all required fields.'
            });
            return;
        }

        this.loading = true;
        const { title, description } = this.form.value;

        if (this.isEdit) {
            const sub = this.groupsService.updateGroup(
                Number(this.groupId),
                title,
                description,
                this.isRegional
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('update', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Group updated successfully.'
                    });
                    this.router.navigate(['/summary/groups', this.groupId]);
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

        // Create new group - always use Entity_ID = 0 for personal groups
        const sub = this.groupsService.createGroup(title, description, 0).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('create', response);
                    return;
                }

                const groupId = response.message?.Group_ID;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Group created successfully.'
                });
                if (groupId) {
                    this.router.navigate(['/summary/groups', groupId]);
                } else {
                    this.router.navigate(['/summary/groups/list']);
                }
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    cancel(): void {
        this.router.navigate(['/summary/groups/list']);
    }

    get f() {
        return this.form.controls;
    }

    get titleError(): string {
        return getTextFieldError(this.f['title'], 'Group title', this.submitted);
    }

    get descriptionError(): string {
        return getTextFieldError(this.f['description'], 'Group description', this.submitted);
    }

    private handleBusinessError(context: GroupFormContext, response: any): void | null {
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
        switch (code) {
            case 'ERP11285':
                return 'Invalid \'Title\' format';
            case 'ERP11286':
                return 'Invalid \'Description\' format';
            case 'ERP11260':
                return 'Invalid Entity ID';
            default:
                return null;
        }
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11290':
                return 'Invalid Group ID';
            case 'ERP11285':
                return 'Invalid \'Title\' format';
            case 'ERP11286':
                return 'Invalid \'Description\' format';
            default:
                return null;
        }
    }

    private getDetailsErrorMessage(code: string): string | null {
        if (code === 'ERP11290') {
            return 'Invalid Group ID';
        }

        return null;
    }
}

