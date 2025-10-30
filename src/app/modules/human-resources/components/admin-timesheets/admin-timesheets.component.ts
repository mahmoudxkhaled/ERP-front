import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { ICompanyModel } from '../../models/ICompanyModel';
import { IUserAdminModel } from '../../models/IUserAdminModel';

@Component({
    selector: 'app-admin-timesheets',
    templateUrl: './admin-timesheets.component.html',
    styleUrls: ['./admin-timesheets.component.scss'],
    providers: [MessageService]
})
export class AdminTimesheetsComponent implements OnInit, OnDestroy {

    companies: ICompanyModel[] = [];
    users: IUserAdminModel[] = [];
    companyMenuItems: MenuItem[] = [];
    userMenuItems: MenuItem[] = [];

    currentSelectedCompany: ICompanyModel = {
        id: '',
        name: '',
        status: '',
        adminCount: 0
    };

    currentSelectedUser: IUserAdminModel = {
        id: '',
        name: '',
        email: '',
        role: '',
        company: '',
        status: ''
    };

    companyForm!: FormGroup;
    userForm!: FormGroup;

    companyDialog: boolean = false;
    userDialog: boolean = false;
    deleteCompanyDialog: boolean = false;
    deleteUserDialog: boolean = false;

    tableLoadingSpinner: boolean = false;

    roleOptions = [
        { label: 'System Admin', value: 'System Admin' },
        { label: 'Company Admin', value: 'Company Admin' },
        { label: 'Supervisor', value: 'Supervisor' },
        { label: 'Employee', value: 'Employee' }
    ];

    statusOptions = [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' }
    ];

    constructor(
        public translate: TranslationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.buildCompanyMenuItems();
        this.buildUserMenuItems();
        this.initiateCompanyForm();
        this.initiateUserForm();
        this.loadCompanies();
        this.loadUsers();
    }

    buildCompanyMenuItems() {
        this.companyMenuItems = [
            {
                label: this.translate.getInstant('shared.actions.edit'),
                icon: 'pi pi-fw pi-pencil',
                command: () => this.openCompanyEditDialog(this.currentSelectedCompany),
            },
            {
                label: this.translate.getInstant('shared.actions.delete'),
                icon: 'pi pi-fw pi-trash',
                command: () => this.openCompanyDeleteDialog(this.currentSelectedCompany),
            }
        ];
    }

    buildUserMenuItems() {
        this.userMenuItems = [
            {
                label: this.translate.getInstant('shared.actions.edit'),
                icon: 'pi pi-fw pi-pencil',
                command: () => this.openUserEditDialog(this.currentSelectedUser),
            },
            {
                label: this.translate.getInstant('shared.actions.delete'),
                icon: 'pi pi-fw pi-trash',
                command: () => this.openUserDeleteDialog(this.currentSelectedUser),
            }
        ];
    }

    assignCurrentCompany(company: ICompanyModel) {
        this.currentSelectedCompany = company;
    }

    assignCurrentUser(user: IUserAdminModel) {
        this.currentSelectedUser = user;
    }

    loadCompanies() {
        this.tableLoadingSpinner = true;

        // Static mock data for companies
        this.companies = [
            { id: '1', name: 'Acme Corporation', status: 'Active', adminCount: 2, industry: 'Technology', founded: 2015, employees: 150 },
            { id: '2', name: 'Global Solutions Ltd', status: 'Active', adminCount: 1, industry: 'Consulting', founded: 2010, employees: 75 },
            { id: '3', name: 'TechStart Inc', status: 'Inactive', adminCount: 0, industry: 'Software', founded: 2020, employees: 25 },
            { id: '4', name: 'Manufacturing Co', status: 'Active', adminCount: 1, industry: 'Manufacturing', founded: 2005, employees: 300 },
            { id: '5', name: 'Service Provider LLC', status: 'Active', adminCount: 2, industry: 'Services', founded: 2018, employees: 50 }
        ];

        this.tableLoadingSpinner = false;
    }

    loadUsers() {
        // Static mock data for users
        this.users = [
            { id: '1', name: 'John Smith', email: 'john@acme.com', role: 'Company Admin', company: 'Acme Corporation', status: 'Active' },
            { id: '2', name: 'Sarah Johnson', email: 'sarah@acme.com', role: 'Supervisor', company: 'Acme Corporation', status: 'Active' },
            { id: '3', name: 'Mike Wilson', email: 'mike@global.com', role: 'Company Admin', company: 'Global Solutions Ltd', status: 'Active' },
            { id: '4', name: 'Lisa Brown', email: 'lisa@techstart.com', role: 'Employee', company: 'TechStart Inc', status: 'Inactive' },
            { id: '5', name: 'David Lee', email: 'david@manufacturing.com', role: 'Supervisor', company: 'Manufacturing Co', status: 'Active' },
            { id: '6', name: 'Emma Davis', email: 'emma@service.com', role: 'Company Admin', company: 'Service Provider LLC', status: 'Active' },
            { id: '7', name: 'Tom Anderson', email: 'tom@service.com', role: 'Employee', company: 'Service Provider LLC', status: 'Active' }
        ];
    }

    onGlobalFilter(table: any, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    navigateToCreateCompany() {
        this.companyDialog = true;
        this.companyForm.reset();
    }

    navigateToCreateUser() {
        this.userDialog = true;
        this.userForm.reset();
    }

    openCompanyEditDialog(company: ICompanyModel) {
        this.companyDialog = true;
        this.currentSelectedCompany = company;
        this.companyForm.patchValue({
            name: company.name,
            status: company.status,
            industry: company.industry,
            founded: company.founded,
            employees: company.employees
        });
    }

    openUserEditDialog(user: IUserAdminModel) {
        this.userDialog = true;
        this.currentSelectedUser = user;
        this.userForm.patchValue({
            name: user.name,
            email: user.email,
            role: user.role,
            company: user.company,
            status: user.status
        });
    }

    openCompanyDeleteDialog(company: ICompanyModel) {
        this.deleteCompanyDialog = true;
        this.currentSelectedCompany = company;
    }

    openUserDeleteDialog(user: IUserAdminModel) {
        this.deleteUserDialog = true;
        this.currentSelectedUser = user;
    }

    hideCompanyDialog() {
        this.companyDialog = false;
    }

    hideUserDialog() {
        this.userDialog = false;
    }

    saveCompany() {
        if (this.companyForm.valid) {
            if (this.currentSelectedCompany.id) {
                // Edit existing company
                const index = this.companies.findIndex(c => c.id === this.currentSelectedCompany.id);
                if (index !== -1) {
                    this.companies[index] = {
                        ...this.companies[index],
                        name: this.companyForm.value.name,
                        status: this.companyForm.value.status,
                        industry: this.companyForm.value.industry,
                        founded: this.companyForm.value.founded,
                        employees: this.companyForm.value.employees
                    };
                }
            } else {
                // Add new company
                const newCompany: ICompanyModel = {
                    id: (this.companies.length + 1).toString(),
                    name: this.companyForm.value.name,
                    status: this.companyForm.value.status,
                    adminCount: 0,
                    industry: this.companyForm.value.industry,
                    founded: this.companyForm.value.founded,
                    employees: this.companyForm.value.employees
                };
                this.companies.push(newCompany);
            }

            this.hideCompanyDialog();
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Company saved successfully',
                life: 3000
            });
        }
    }

    saveUser() {
        if (this.userForm.valid) {
            if (this.currentSelectedUser.id) {
                // Edit existing user
                const index = this.users.findIndex(u => u.id === this.currentSelectedUser.id);
                if (index !== -1) {
                    this.users[index] = {
                        ...this.users[index],
                        name: this.userForm.value.name,
                        email: this.userForm.value.email,
                        role: this.userForm.value.role,
                        company: this.userForm.value.company,
                        status: this.userForm.value.status
                    };
                }
            } else {
                // Add new user
                const newUser: IUserAdminModel = {
                    id: (this.users.length + 1).toString(),
                    name: this.userForm.value.name,
                    email: this.userForm.value.email,
                    role: this.userForm.value.role,
                    company: this.userForm.value.company,
                    status: this.userForm.value.status
                };
                this.users.push(newUser);
            }

            this.hideUserDialog();
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'User saved successfully',
                life: 3000
            });
        }
    }

    deleteCompany() {
        const index = this.companies.findIndex(c => c.id === this.currentSelectedCompany.id);
        if (index !== -1) {
            this.companies.splice(index, 1);
        }

        this.deleteCompanyDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Company deleted successfully',
            life: 3000
        });
    }

    deleteUser() {
        const index = this.users.findIndex(u => u.id === this.currentSelectedUser.id);
        if (index !== -1) {
            this.users.splice(index, 1);
        }

        this.deleteUserDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'User deleted successfully',
            life: 3000
        });
    }

    initiateCompanyForm() {
        this.companyForm = new FormGroup({
            name: new FormControl<string>('', [Validators.required]),
            status: new FormControl<string>('Active', [Validators.required]),
            industry: new FormControl<string>(''),
            founded: new FormControl<number>(new Date().getFullYear()),
            employees: new FormControl<number>(1, [Validators.min(1)])
        });
    }

    initiateUserForm() {
        this.userForm = new FormGroup({
            name: new FormControl<string>('', [Validators.required]),
            email: new FormControl<string>('', [Validators.required, Validators.email]),
            role: new FormControl<string>('', [Validators.required]),
            company: new FormControl<string>('', [Validators.required]),
            status: new FormControl<string>('Active', [Validators.required])
        });
    }

    getStatusSeverity(status: string): string {
        switch (status) {
            case 'Active': return 'success';
            case 'Inactive': return 'danger';
            default: return 'secondary';
        }
    }

    getRoleSeverity(role: string): string {
        switch (role) {
            case 'System Admin': return 'danger';
            case 'Company Admin': return 'warning';
            case 'Supervisor': return 'info';
            case 'Employee': return 'success';
            default: return 'secondary';
        }
    }

    ngOnDestroy(): void {
        // Cleanup if needed
    }
}
