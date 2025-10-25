import { Component, forwardRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { MessageService } from 'primeng/api';

interface IndustryOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-company-details',
    templateUrl: './company-details.component.html',
    styleUrls: ['./company-details.component.scss'],

})
export class CompanyDetailsComponent implements OnInit {

    companyForm!: FormGroup;

    industryOptions: IndustryOption[] = [
        { label: 'Technology Solutions', value: 'Technology Solutions' },
        { label: 'Healthcare', value: 'Healthcare' },
        { label: 'Finance', value: 'Finance' },
        { label: 'Manufacturing', value: 'Manufacturing' },
        { label: 'Retail', value: 'Retail' },
        { label: 'Education', value: 'Education' },
        { label: 'Consulting', value: 'Consulting' },
        { label: 'Other', value: 'Other' }
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
        this.companyForm = this.fb.group({
            companyName: ['Acme Corporation'],
            industry: ['Technology Solutions'],
            founded: [2020],
            employees: [150],
            phone: ['(555) 123-4567'],
            email: ['info@acmecorp.com'],
            website: ['www.acmecorp.com'],
            address: ['123 Business Street, City, State 12345']
        });

    }
    saveCompanyInfo(): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Company information saved successfully!'
        });
    }

    resetForm(): void {
        this.companyForm.reset({
            companyName: 'Acme Corporation',
            industry: 'Technology Solutions',
            founded: 2020,
            employees: 150,
            phone: '(555) 123-4567',
            email: 'info@acmecorp.com',
            website: 'www.acmecorp.com',
            address: '123 Business Street, City, State 12345'
        });

        this.messageService.add({
            severity: 'info',
            summary: 'Form Reset',
            detail: 'Company information has been reset to default values.'
        });
    }

    cancelEdit(): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Cancelled',
            detail: 'Changes have been cancelled.'
        });
    }

    getCompanyAge(): number {
        const currentYear = new Date().getFullYear();
        return currentYear - this.companyForm.get('founded')?.value;
    }

}
