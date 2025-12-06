import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface IContractModel {
    id: string;
    employeeName: string;
    position: string;
    contractType: string;
    startDate: string;
    endDate: string;
    status: string;
    salary?: number;
    department?: string;
}

@Component({
    selector: 'app-contract',
    templateUrl: './contract.component.html',
    styleUrls: ['./contract.component.scss'],
    providers: [MessageService]
})
export class ContractComponent implements OnInit, OnDestroy {

    contracts: IContractModel[] = [];
    contractMenuItems: MenuItem[] = [];

    currentSelectedContract: IContractModel = {
        id: '',
        employeeName: '',
        position: '',
        contractType: '',
        startDate: '',
        endDate: '',
        status: ''
    };

    contractForm!: FormGroup;

    contractDialog: boolean = false;
    deleteContractDialog: boolean = false;

    tableLoadingSpinner: boolean = false;

    contractTypeOptions = [
        { label: 'Full-time', value: 'Full-time' },
        { label: 'Part-time', value: 'Part-time' },
        { label: 'Contract', value: 'Contract' },
        { label: 'Internship', value: 'Internship' }
    ];

    statusOptions = [
        { label: 'Active', value: 'Active' },
        { label: 'Expired', value: 'Expired' },
        { label: 'Expiring Soon', value: 'Expiring Soon' },
        { label: 'Terminated', value: 'Terminated' }
    ];

    constructor(
        public translate: TranslationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.buildContractMenuItems();
        this.initiateContractForm();
        this.loadContracts();
    }

    buildContractMenuItems() {
        this.contractMenuItems = [
            {
                label: this.translate.getInstant('shared.actions.edit'),
                icon: 'pi pi-fw pi-pencil',
                command: () => this.openContractEditDialog(this.currentSelectedContract),
            },
            {
                label: this.translate.getInstant('shared.actions.delete'),
                icon: 'pi pi-fw pi-trash',
                command: () => this.openContractDeleteDialog(this.currentSelectedContract),
            }
        ];
    }

    assignCurrentContract(contract: IContractModel) {
        this.currentSelectedContract = contract;
    }

    loadContracts() {
        this.tableLoadingSpinner = true;

        // Static mock data for contracts
        this.contracts = [
            {
                id: '1',
                employeeName: 'John Doe',
                position: 'Software Developer',
                contractType: 'Full-time',
                startDate: '2023-01-15',
                endDate: '2025-12-31',
                status: 'Active',
                salary: 75000,
                department: 'IT'
            },
            {
                id: '2',
                employeeName: 'Jane Smith',
                position: 'Project Manager',
                contractType: 'Full-time',
                startDate: '2023-03-01',
                endDate: '2024-03-15',
                status: 'Expiring Soon',
                salary: 85000,
                department: 'Management'
            },
            {
                id: '3',
                employeeName: 'Mike Wilson',
                position: 'UI/UX Designer',
                contractType: 'Contract',
                startDate: '2023-06-01',
                endDate: '2024-06-01',
                status: 'Active',
                salary: 65000,
                department: 'Design'
            },
            {
                id: '4',
                employeeName: 'Sarah Johnson',
                position: 'Marketing Specialist',
                contractType: 'Part-time',
                startDate: '2023-09-01',
                endDate: '2024-09-01',
                status: 'Active',
                salary: 45000,
                department: 'Marketing'
            },
            {
                id: '5',
                employeeName: 'David Lee',
                position: 'Data Analyst',
                contractType: 'Full-time',
                startDate: '2022-11-15',
                endDate: '2024-11-15',
                status: 'Expired',
                salary: 70000,
                department: 'Analytics'
            }
        ];

        this.tableLoadingSpinner = false;
    }

    onGlobalFilter(table: any, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    navigateToCreateContract() {
        this.contractDialog = true;
        this.contractForm.reset();
    }

    openContractEditDialog(contract: IContractModel) {
        this.contractDialog = true;
        this.currentSelectedContract = contract;
        this.contractForm.patchValue({
            employeeName: contract.employeeName,
            position: contract.position,
            contractType: contract.contractType,
            startDate: contract.startDate,
            endDate: contract.endDate,
            status: contract.status,
            salary: contract.salary,
            department: contract.department
        });
    }

    openContractDeleteDialog(contract: IContractModel) {
        this.deleteContractDialog = true;
        this.currentSelectedContract = contract;
    }

    hideContractDialog() {
        this.contractDialog = false;
    }

    saveContract() {
        if (this.contractForm.valid) {
            if (this.currentSelectedContract.id) {
                // Edit existing contract
                const index = this.contracts.findIndex(c => c.id === this.currentSelectedContract.id);
                if (index !== -1) {
                    this.contracts[index] = {
                        ...this.contracts[index],
                        employeeName: this.contractForm.value.employeeName,
                        position: this.contractForm.value.position,
                        contractType: this.contractForm.value.contractType,
                        startDate: this.contractForm.value.startDate,
                        endDate: this.contractForm.value.endDate,
                        status: this.contractForm.value.status,
                        salary: this.contractForm.value.salary,
                        department: this.contractForm.value.department
                    };
                }
            } else {
                // Add new contract
                const newContract: IContractModel = {
                    id: (this.contracts.length + 1).toString(),
                    employeeName: this.contractForm.value.employeeName,
                    position: this.contractForm.value.position,
                    contractType: this.contractForm.value.contractType,
                    startDate: this.contractForm.value.startDate,
                    endDate: this.contractForm.value.endDate,
                    status: this.contractForm.value.status,
                    salary: this.contractForm.value.salary,
                    department: this.contractForm.value.department
                };
                this.contracts.push(newContract);
            }

            this.hideContractDialog();
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Contract saved successfully',
                life: 3000
            });
        }
    }

    deleteContract() {
        const index = this.contracts.findIndex(c => c.id === this.currentSelectedContract.id);
        if (index !== -1) {
            this.contracts.splice(index, 1);
        }

        this.deleteContractDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Contract deleted successfully',
            life: 3000
        });
    }

    initiateContractForm() {
        this.contractForm = new FormGroup({
            employeeName: new FormControl<string>('', [Validators.required]),
            position: new FormControl<string>('', [Validators.required]),
            contractType: new FormControl<string>('', [Validators.required]),
            startDate: new FormControl<string>('', [Validators.required]),
            endDate: new FormControl<string>('', [Validators.required]),
            status: new FormControl<string>('Active', [Validators.required]),
            salary: new FormControl<number>(0),
            department: new FormControl<string>('')
        });
    }

    getStatusSeverity(status: string): string {
        switch (status) {
            case 'Active': return 'success';
            case 'Expiring Soon': return 'warning';
            case 'Expired': return 'danger';
            case 'Terminated': return 'secondary';
            default: return 'secondary';
        }
    }

    ngOnDestroy(): void {
        // Cleanup if needed
    }
}
