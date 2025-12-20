import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { UsersService } from '../../../services/users.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Component({
    selector: 'app-merge-account-request',
    templateUrl: './merge-account-request.component.html',
    styleUrls: ['./merge-account-request.component.scss']
})
export class MergeAccountRequestComponent implements OnInit, OnDestroy {
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

    @Input() userId: number = 0;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() mergeRequested = new EventEmitter<{ otherUserId: number; email: string }>();

    form!: FormGroup;
    loading: boolean = false;
    submitted: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private usersService: UsersService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) { }

    ngOnInit(): void {
        this.initForm();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private initForm(): void {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });
    }

    private prepareDialog(): void {
        if (!this.userId) {
            return;
        }
        this.form.reset();
        this.submitted = false;
    }

    submit(): void {
        this.submitted = true;

        if (this.form.invalid || this.loading) {
            return;
        }

        const email = this.form.get('email')?.value?.trim() || '';

        this.loading = true;
        const sub = this.usersService.mergeAccountRequest(this.userId, email).subscribe({
            next: (response: any) => {
                this.loading = false;
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                const otherUserId = response?.message?.Other_User_ID;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Merge request sent. Please check your email for the OTP code.',
                    life: 5000
                });

                this.mergeRequested.emit({ otherUserId, email });
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

    get emailError(): string {
        const control = this.form.get('email');
        if (control?.errors?.['required'] && this.submitted) {
            return 'Email is required.';
        }
        if (control?.errors?.['email'] && this.submitted) {
            return 'Please enter a valid email address.';
        }
        return '';
    }

    private handleBusinessError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11190':
                detail = 'Invalid User ID';
                break;
            case 'ERP11197':
                detail = 'Invalid Email Address';
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

