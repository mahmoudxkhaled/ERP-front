import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { IUserModel } from '../../models/IUserModel';

@Component({
    selector: 'app-users-details',
    templateUrl: './users-details.component.html',
    styleUrls: ['./users-details.component.scss'],
    providers: [MessageService]
})
export class UsersDetailsComponent implements OnInit, OnDestroy {

    users: IUserModel[] = [];
    menuItems: MenuItem[] = [];
    currentSelected: IUserModel = {
        id: '',
        name: '',
        email: '',
        role: '',
        isActive: false
    };
    userAddForm!: FormGroup;
    userEditForm!: FormGroup;
    deleteDialog: boolean = false;
    editDialog: boolean = false;
    activationDialog: boolean = false;
    addDialog: boolean = false;
    tableLoadingSpinner: boolean = false;

    roleOptions = [
        { label: 'System Admin', value: 'System Admin' },
        { label: 'Company Admin', value: 'Company Admin' },
        { label: 'Supervisor', value: 'Supervisor' },
        { label: 'Employee', value: 'Employee' }
    ];

    constructor(
        public translate: TranslationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.menuItems = [];
        const editBtn = {
            label: this.translate.getInstant('shared.actions.edit'),
            icon: 'pi pi-fw pi-pencil',
            command: () => this.openEditDialog(this.currentSelected),
        };
        const deleteBtn = {
            label: this.translate.getInstant('shared.actions.delete'),
            icon: 'pi pi-fw pi-trash',
            command: () => this.openDeleteDialog(this.currentSelected),
        };

        this.menuItems.push(editBtn);
        this.menuItems.push(deleteBtn);

        this.initiateAddForm();
        this.initiateEditForm();
        this.loadUsers();
    }

    assigneCurrentSelect(user: IUserModel) {
        this.currentSelected = user;
    }

    loadUsers() {
        this.tableLoadingSpinner = true;

        // Static mock data
        this.users = [
            { id: '1', name: 'John Doe', email: 'john.doe@company.com', role: 'System Admin', isActive: true },
            { id: '2', name: 'Jane Smith', email: 'jane.smith@company.com', role: 'Company Admin', isActive: true },
            { id: '3', name: 'Mike Johnson', email: 'mike.johnson@company.com', role: 'Supervisor', isActive: true },
            { id: '4', name: 'Sarah Wilson', email: 'sarah.wilson@company.com', role: 'Employee', isActive: true },
            { id: '5', name: 'David Brown', email: 'david.brown@company.com', role: 'Employee', isActive: false },
            { id: '6', name: 'Lisa Davis', email: 'lisa.davis@company.com', role: 'Supervisor', isActive: true },
            { id: '7', name: 'Robert Miller', email: 'robert.miller@company.com', role: 'Employee', isActive: true },
            { id: '8', name: 'Emily Garcia', email: 'emily.garcia@company.com', role: 'Company Admin', isActive: true },
            { id: '9', name: 'James Rodriguez', email: 'james.rodriguez@company.com', role: 'Employee', isActive: false },
            { id: '10', name: 'Maria Martinez', email: 'maria.martinez@company.com', role: 'Supervisor', isActive: true },
            { id: '11', name: 'William Anderson', email: 'william.anderson@company.com', role: 'Employee', isActive: true },
            { id: '12', name: 'Jennifer Taylor', email: 'jennifer.taylor@company.com', role: 'System Admin', isActive: true }
        ];

        this.tableLoadingSpinner = false;
    }

    onGlobalFilter(table: any, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    navigateToCreate() {
        this.addDialog = true;
    }

    openEditDialog(user: IUserModel) {
        this.editDialog = true;
        this.currentSelected = user;
        this.userEditForm.patchValue({
            nameUserToEdit: user.name,
            emailUserToEdit: user.email,
            roleUserToEdit: user.role
        });
    }

    openDeleteDialog(user: IUserModel) {
        this.deleteDialog = true;
        this.currentSelected = user;
    }

    openActivationDialog(user: IUserModel) {
        this.activationDialog = true;
        this.currentSelected = user;
    }

    hideDialog() {
        this.editDialog = false;
        this.addDialog = false;
    }

    onSubmit() {
        if (this.userAddForm.valid) {
            const newUser: IUserModel = {
                id: (this.users.length + 1).toString(),
                name: this.userAddForm.value.nameUserToAdd,
                email: this.userAddForm.value.emailUserToAdd,
                role: this.userAddForm.value.roleUserToAdd,
                isActive: this.userAddForm.value.isActiveUserToAdd
            };

            this.users.push(newUser);
            this.addDialog = false;
            this.userAddForm.reset();

            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'User added successfully',
                life: 3000
            });
        }
    }

    edit() {
        if (this.userEditForm.valid) {
            const index = this.users.findIndex(u => u.id === this.currentSelected.id);
            if (index !== -1) {
                this.users[index] = {
                    ...this.users[index],
                    name: this.userEditForm.value.nameUserToEdit,
                    email: this.userEditForm.value.emailUserToEdit,
                    role: this.userEditForm.value.roleUserToEdit
                };
            }

            this.hideDialog();
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'User updated successfully',
                life: 3000
            });
        }
    }

    delete() {
        const index = this.users.findIndex(u => u.id === this.currentSelected.id);
        if (index !== -1) {
            this.users.splice(index, 1);
        }

        this.deleteDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'User deleted successfully',
            life: 3000
        });
    }

    activation(value: boolean) {
        const index = this.users.findIndex(u => u.id === this.currentSelected.id);
        if (index !== -1) {
            this.users[index].isActive = value;
        }

        this.activationDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: value ? 'User activated successfully' : 'User deactivated successfully',
            life: 3000
        });
    }

    initiateAddForm() {
        this.userAddForm = new FormGroup({
            nameUserToAdd: new FormControl<string>('', [Validators.required]),
            emailUserToAdd: new FormControl<string>('', [Validators.required, Validators.email]),
            roleUserToAdd: new FormControl<string>('', [Validators.required]),
            isActiveUserToAdd: new FormControl<boolean>(true)
        });
    }

    initiateEditForm() {
        this.userEditForm = new FormGroup({
            nameUserToEdit: new FormControl<string>('', [Validators.required]),
            emailUserToEdit: new FormControl<string>('', [Validators.required, Validators.email]),
            roleUserToEdit: new FormControl<string>('', [Validators.required])
        });
    }

    ngOnDestroy(): void {
        // Cleanup if needed
    }
}
