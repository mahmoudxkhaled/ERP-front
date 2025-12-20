import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { UsersService } from '../../../services/users.service';

@Component({
    selector: 'app-merge-account-confirm',
    templateUrl: './merge-account-confirm.component.html',
    styleUrls: ['./merge-account-confirm.component.scss']
})
export class MergeAccountConfirmComponent implements OnInit, OnDestroy {
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

    @Input() dominantUserId: number = 0;
    @Input() otherUserEmail: string = '';

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() mergeConfirmed = new EventEmitter<void>();

    form!: FormGroup;
    loading: boolean = false;
    submitted: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private usersService: UsersService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.initForm();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private initForm(): void {
        this.form = this.fb.group({
            mergeOTP: ['', [Validators.required]],
            mergeData: [true, [Validators.required]]
        });
    }

    private prepareDialog(): void {
        if (!this.dominantUserId) {
            return;
        }
        this.form.reset({
            mergeOTP: '',
            mergeData: true
        });
        this.submitted = false;
    }

    submit(): void {
        this.submitted = true;

        if (this.form.invalid || this.loading) {
            return;
        }

        const mergeOTP = this.form.get('mergeOTP')?.value?.trim() || '';
        const mergeData = this.form.get('mergeData')?.value || false;

        this.loading = true;
        const sub = this.usersService.mergeAccountConfirm(mergeOTP, this.dominantUserId, mergeData).subscribe({
            next: (response: any) => {
                this.loading = false;
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account merge completed successfully.',
                    life: 5000
                });

                this.mergeConfirmed.emit();
                this.closeDialog();
            }
        });

        this.subscriptions.push(sub);
    }

    closeDialog(): void {
        this.onVisibleChange(false);
    }

    onDialogHide(): void {
        this.form.reset();
        this.loading = false;
        this.submitted = false;
        this.onVisibleChange(false);
    }

    onVisibleChange(value: boolean): void {
        this._visible = value;
        this.visibleChange.emit(value);
    }

    get mergeOTPError(): string {
        const control = this.form.get('mergeOTP');
        if (control?.errors?.['required'] && this.submitted) {
            return 'OTP is required.';
        }
        return '';
    }

    private handleBusinessError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11190':
                detail = 'Invalid User ID -> For provided Dominant User ID, either not in the database, or is neither equal to the User of the Current Account nor to the User of the Selected Email Address';
                break;
            case 'ERP11198':
                detail = 'Invalid OTP';
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
        return null;
    }
}

