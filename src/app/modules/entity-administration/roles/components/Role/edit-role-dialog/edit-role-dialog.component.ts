import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { RolesService } from '../../../services/roles.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';

@Component({
    selector: 'app-edit-role-dialog',
    templateUrl: './edit-role-dialog.component.html',
    styleUrls: ['./edit-role-dialog.component.scss']
})
export class EditRoleDialogComponent implements OnInit, OnDestroy {
    private _visible: boolean = false;

    @Input()
    get visible(): boolean {
        return this._visible;
    }
    set visible(value: boolean) {
        this._visible = value;
        if (value) {
            this.prepareDialog();
        }
    }

    @Input() roleId: string = '';
    @Input() roleTitle: string = '';

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    form!: FormGroup;
    loadingDetails: boolean = false;
    saving: boolean = false;

    private subscriptions: Subscription[] = [];
    private accountSettings?: IAccountSettings;

    constructor(
        private fb: FormBuilder,
        private rolesService: RolesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
    }

    ngOnInit(): void {
        this.initForm();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private initForm(): void {
        this.form = this.fb.group({
            title: ['', [Validators.required, textFieldValidator()]],
            description: ['', [Validators.required, textFieldValidator()]]
        });
    }

    private prepareDialog(): void {
        if (!this.roleId) {
            return;
        }
        this.loadRoleDetails();
    }

    private loadRoleDetails(): void {
        if (!this.roleId) {
            return;
        }

        this.loadingDetails = true;
        const sub = this.rolesService.getEntityRoleDetails(Number(this.roleId)).subscribe({
            next: (response) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    this.loadingDetails = false;
                    return;
                }

                const details = response.message || {};
                const isRegional = this.accountSettings?.Language !== 'English';

                this.form.patchValue({
                    title: isRegional ? (details?.Title_Regional || details?.Title || '') : (details?.Title || ''),
                    description: isRegional ? (details?.Description_Regional || details?.Description || '') : (details?.Description || '')
                });

                this.loadingDetails = false;
            },
        });

        this.subscriptions.push(sub);
    }

    submit(): void {
        if (this.form.invalid || !this.roleId) {
            this.form.markAllAsTouched();
            return;
        }

        const { title, description } = this.form.value;
        const isRegional = this.accountSettings?.Language !== 'English';

        this.saving = true;
        const sub = this.rolesService
            .updateEntityRole(
                Number(this.roleId),
                title.trim(),
                description.trim(),
                !!isRegional
            )
            .subscribe({
                next: (response) => {
                    this.saving = false;
                    if (!response?.success) {
                        this.handleBusinessError(response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Updated',
                        detail: 'Role details saved successfully.'
                    });

                    this.saved.emit();
                    this.closeDialog();
                },

            });

        this.subscriptions.push(sub);
    }

    closeDialog(): void {
        this.onVisibleChange(false);
    }

    onDialogHide(): void {
        // Reset form when dialog is hidden (cancel or close)
        this.form.reset();
        this.loadingDetails = false;
        this.saving = false;
        this.onVisibleChange(false);
    }

    onVisibleChange(value: boolean): void {
        this._visible = value;
        this.visibleChange.emit(value);
    }

    private handleBusinessError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
    }

    private getErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11310':
                return 'Invalid Entity Role ID';
            case 'ERP11301':
                return 'Invalid Title Format';
            case 'ERP11302':
                return 'Invalid Description Format';
            case 'ERP11303':
                return 'Duplicate Title with another Role in the same Entity';
            case 'ERP11305':
                return 'Access Denied to Entity Roles';
            default:
                return null;
        }
    }

    get titleError(): string {
        const control = this.form.get('title');
        return getTextFieldError(control, 'Title', control?.touched || false);
    }

    get descriptionError(): string {
        const control = this.form.get('description');
        return getTextFieldError(control, 'Description', control?.touched || false);
    }
}
