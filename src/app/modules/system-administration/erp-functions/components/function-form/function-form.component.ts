import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { SettingsConfigurationsService } from '../../../services/settings-configurations.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';

type FunctionFormContext = 'create' | 'update' | 'details';

@Component({
    selector: 'app-function-form',
    templateUrl: './function-form.component.html',
    styleUrls: ['./function-form.component.scss']
})
export class FunctionFormComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    functionId: number = 0;
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private settingsConfigurationsService: SettingsConfigurationsService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        this.functionId = idParam ? Number(idParam) : 0;
        this.isEdit = !!this.functionId && this.functionId > 0;
        this.initForm();

        if (this.isEdit) {
            this.loadFunction();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            code: ['', [Validators.required, Validators.maxLength(10), textFieldValidator()]],
            name: ['', [Validators.required, Validators.maxLength(30), textFieldValidator()]],
            isRegional: [false],
            defaultOrder: [0, [Validators.required, Validators.min(1)]],
            url: ['']
        });
    }

    loadFunction(): void {
        if (!this.functionId || this.functionId === 0) {
            return;
        }

        this.loading = true;
        const sub = this.settingsConfigurationsService.getFunctionDetails(this.functionId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }

                const functionData = response?.message || {};
                this.form.patchValue({
                    code: functionData.Code || '',
                    name: this.isRegional ? (functionData.Name_Regional || functionData.Name || '') : (functionData.Name || ''),
                    isRegional: !!functionData.Name_Regional,
                    defaultOrder: functionData.Default_Order || 0,
                    url: functionData.URL || ''
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

        if (this.form.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please fill in all required fields correctly.'
            });
            return;
        }

        const { code, name, isRegional, defaultOrder, url } = this.form.value;

        this.loading = true;

        if (this.isEdit) {
            const sub = this.settingsConfigurationsService.updateFunctionDetails(
                this.functionId,
                code.trim(),
                name.trim(),
                isRegional,
                Number(defaultOrder),
                url.trim()
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('update', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Function updated successfully.'
                    });
                    this.router.navigate(['/company-administration/settings-configurations/functions', this.functionId]);
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

        // Create new function
        const sub = this.settingsConfigurationsService.addFunction(code.trim(), name.trim()).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('create', response);
                    return;
                }

                const newFunctionId = response?.message?.Function_ID;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Function created successfully.'
                });
                if (newFunctionId) {
                    this.router.navigate(['/company-administration/settings-configurations/functions', newFunctionId]);
                } else {
                    this.router.navigate(['/company-administration/settings-configurations/functions/list']);
                }
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    cancel(): void {
        this.router.navigate(['/company-administration/settings-configurations/functions/list']);
    }

    get f() {
        return this.form.controls;
    }

    get codeError(): string {
        const control = this.f['code'];
        if (control?.hasError('required')) {
            return 'Code is required.';
        }
        if (control?.hasError('maxlength')) {
            return 'Code must be 10 characters or less.';
        }
        return getTextFieldError(control, 'Code', this.submitted);
    }

    get nameError(): string {
        const control = this.f['name'];
        if (control?.hasError('required')) {
            return 'Name is required.';
        }
        if (control?.hasError('maxlength')) {
            return 'Name must be 30 characters or less.';
        }
        return getTextFieldError(control, 'Name', this.submitted);
    }

    get defaultOrderError(): string {
        const control = this.f['defaultOrder'];
        if (control?.hasError('required')) {
            return 'Default Order is required.';
        }
        if (control?.hasError('min')) {
            return 'Default Order must be greater than zero.';
        }
        return '';
    }

    private handleBusinessError(context: FunctionFormContext, response: any): void | null {
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
            case 'ERP11401':
                return 'Invalid Code format, duplicate code, or length > 10 characters';
            case 'ERP11402':
                return 'Invalid Name format, or length > 30 characters';
            default:
                return null;
        }
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11400':
                return 'Invalid Function ID';
            case 'ERP11401':
                return 'Invalid Code format';
            case 'ERP11402':
                return 'Invalid Name format';
            case 'ERP11403':
                return 'Invalid Default Order value -> value must be greater than zero';
            case 'ERP11404':
                return 'Invalid URL format';
            default:
                return null;
        }
    }

    private getDetailsErrorMessage(code: string): string | null {
        if (code === 'ERP11400') {
            return 'Invalid Function ID';
        }
        return null;
    }
}
