import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    providers: [MessageService]
})
export class ProfileComponent implements OnInit {

    profileForm!: FormGroup;

    roleOptions = [
        { label: 'System Admin', value: 'System Admin' },
        { label: 'Company Admin', value: 'Company Admin' },
        { label: 'Supervisor', value: 'Supervisor' },
        { label: 'Employee', value: 'Employee' }
    ];

    constructor(
        private fb: FormBuilder,
        public translate: TranslationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.initFormModels();
    }

    initFormModels() {
        this.profileForm = this.fb.group({
            firstName: ['John', [Validators.required]],
            lastName: ['Doe', [Validators.required]],
            email: ['john.doe@company.com', [Validators.required, Validators.email]],
            phone: ['(555) 123-4567'],
            role: ['System Admin', [Validators.required]],
            department: ['IT Administration']
        });
    }

    saveProfileInfo(): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Profile information saved successfully!'
        });
    }

    resetForm(): void {
        this.profileForm.reset({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com',
            phone: '(555) 123-4567',
            role: 'System Admin',
            department: 'IT Administration'
        });

        this.messageService.add({
            severity: 'info',
            summary: 'Form Reset',
            detail: 'Profile information has been reset to default values.'
        });
    }

    cancelEdit(): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Cancelled',
            detail: 'Changes have been cancelled.'
        });
    }

}
