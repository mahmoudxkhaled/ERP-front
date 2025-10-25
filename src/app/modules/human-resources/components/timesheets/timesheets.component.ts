import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslationService } from 'src/app/core/Services/translation.service';
import { ITimesheetModel } from '../../models/ITimesheetModel';

@Component({
    selector: 'app-timesheets',
    templateUrl: './timesheets.component.html',
    styleUrls: ['./timesheets.component.scss'],
    providers: [MessageService]
})
export class TimesheetsComponent implements OnInit, OnDestroy {

    timesheets: ITimesheetModel[] = [];
    menuItems: MenuItem[] = [];
    currentSelected: ITimesheetModel = {
        id: '',
        date: new Date(),
        project: '',
        task: '',
        hours: 0,
        remarks: '',
        status: ''
    };
    timesheetAddForm!: FormGroup;
    timesheetEditForm!: FormGroup;
    deleteDialog: boolean = false;
    editDialog: boolean = false;
    addDialog: boolean = false;
    statusDialog: boolean = false;
    tableLoadingSpinner: boolean = false;
    selectedStatus: string = '';

    projectOptions = [
        { label: 'ERP System', value: 'ERP System' },
        { label: 'HR Portal', value: 'HR Portal' },
        { label: 'Invoicing', value: 'Invoicing' },
        { label: 'Document Control', value: 'Document Control' }
    ];

    statusOptions = [
        { label: 'Draft', value: 'Draft' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Rejected', value: 'Rejected' }
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
        const statusBtn = {
            label: 'Change Status',
            icon: 'pi pi-fw pi-refresh',
            command: () => this.openStatusDialog(this.currentSelected),
        };

        this.menuItems.push(editBtn);
        this.menuItems.push(deleteBtn);
        this.menuItems.push(statusBtn);

        this.initiateAddForm();
        this.initiateEditForm();
        this.loadTimesheets();
    }

    assigneCurrentSelect(timesheet: ITimesheetModel) {
        this.currentSelected = timesheet;
    }

    loadTimesheets() {
        this.tableLoadingSpinner = true;

        // Static mock data
        this.timesheets = [
            { id: '1', date: new Date('2025-01-15'), project: 'ERP System', task: 'Login Module', hours: 4, remarks: 'Completed login wireframe', status: 'Draft' },
            { id: '2', date: new Date('2025-01-14'), project: 'ERP System', task: 'Dashboard UI', hours: 6, remarks: 'Created dashboard layout', status: 'Pending' },
            { id: '3', date: new Date('2025-01-13'), project: 'ERP System', task: 'Admin Panel', hours: 5, remarks: 'User management interface', status: 'Approved' },
            { id: '4', date: new Date('2025-01-12'), project: 'ERP System', task: 'API Integration', hours: 3, remarks: 'REST API setup', status: 'Rejected' },
            { id: '5', date: new Date('2025-01-11'), project: 'HR Portal', task: 'Employee Management', hours: 7, remarks: 'Employee CRUD operations', status: 'Approved' },
            { id: '6', date: new Date('2025-01-10'), project: 'Invoicing', task: 'Invoice Generation', hours: 4.5, remarks: 'Invoice template creation', status: 'Pending' },
            { id: '7', date: new Date('2025-01-09'), project: 'Document Control', task: 'File Upload', hours: 3.5, remarks: 'File upload functionality', status: 'Draft' },
            { id: '8', date: new Date('2025-01-08'), project: 'ERP System', task: 'Database Design', hours: 8, remarks: 'Schema creation and optimization', status: 'Approved' },
            { id: '9', date: new Date('2025-01-07'), project: 'HR Portal', task: 'Timesheet Module', hours: 6.5, remarks: 'Timesheet tracking system', status: 'Pending' },
            { id: '10', date: new Date('2025-01-06'), project: 'Invoicing', task: 'Payment Processing', hours: 5.5, remarks: 'Payment gateway integration', status: 'Rejected' },
            { id: '11', date: new Date('2025-01-05'), project: 'Document Control', task: 'Version Control', hours: 4, remarks: 'Document versioning system', status: 'Approved' },
            { id: '12', date: new Date('2025-01-04'), project: 'ERP System', task: 'Testing', hours: 3, remarks: 'Unit testing for login module', status: 'Draft' }
        ];

        this.tableLoadingSpinner = false;
    }

    onGlobalFilter(table: any, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    navigateToCreate() {
        this.addDialog = true;
    }

    openEditDialog(timesheet: ITimesheetModel) {
        this.editDialog = true;
        this.currentSelected = timesheet;
        this.timesheetEditForm.patchValue({
            dateToEdit: timesheet.date,
            projectToEdit: timesheet.project,
            taskToEdit: timesheet.task,
            hoursToEdit: timesheet.hours,
            remarksToEdit: timesheet.remarks
        });
    }

    openDeleteDialog(timesheet: ITimesheetModel) {
        this.deleteDialog = true;
        this.currentSelected = timesheet;
    }

    openStatusDialog(timesheet: ITimesheetModel) {
        this.statusDialog = true;
        this.currentSelected = timesheet;
        this.selectedStatus = timesheet.status;
    }

    hideDialog() {
        this.editDialog = false;
        this.addDialog = false;
    }

    onSubmit() {
        if (this.timesheetAddForm.valid) {
            const newTimesheet: ITimesheetModel = {
                id: (this.timesheets.length + 1).toString(),
                date: this.timesheetAddForm.value.dateToAdd,
                project: this.timesheetAddForm.value.projectToAdd,
                task: this.timesheetAddForm.value.taskToAdd,
                hours: this.timesheetAddForm.value.hoursToAdd,
                remarks: this.timesheetAddForm.value.remarksToAdd,
                status: 'Draft'
            };

            this.timesheets.push(newTimesheet);
            this.addDialog = false;
            this.timesheetAddForm.reset();

            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Timesheet entry added successfully',
                life: 3000
            });
        }
    }

    edit() {
        if (this.timesheetEditForm.valid) {
            const index = this.timesheets.findIndex(t => t.id === this.currentSelected.id);
            if (index !== -1) {
                this.timesheets[index] = {
                    ...this.timesheets[index],
                    date: this.timesheetEditForm.value.dateToEdit,
                    project: this.timesheetEditForm.value.projectToEdit,
                    task: this.timesheetEditForm.value.taskToEdit,
                    hours: this.timesheetEditForm.value.hoursToEdit,
                    remarks: this.timesheetEditForm.value.remarksToEdit
                };
            }

            this.hideDialog();
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Timesheet entry updated successfully',
                life: 3000
            });
        }
    }

    delete() {
        const index = this.timesheets.findIndex(t => t.id === this.currentSelected.id);
        if (index !== -1) {
            this.timesheets.splice(index, 1);
        }

        this.deleteDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Timesheet entry deleted successfully',
            life: 3000
        });
    }

    changeStatus(newStatus: string) {
        const index = this.timesheets.findIndex(t => t.id === this.currentSelected.id);
        if (index !== -1) {
            this.timesheets[index].status = newStatus;
        }

        this.statusDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Timesheet status changed to ${newStatus}`,
            life: 3000
        });
    }

    initiateAddForm() {
        this.timesheetAddForm = new FormGroup({
            dateToAdd: new FormControl<Date>(new Date(), [Validators.required]),
            projectToAdd: new FormControl<string>('', [Validators.required]),
            taskToAdd: new FormControl<string>('', [Validators.required]),
            hoursToAdd: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
            remarksToAdd: new FormControl<string>('')
        });
    }

    initiateEditForm() {
        this.timesheetEditForm = new FormGroup({
            dateToEdit: new FormControl<Date>(new Date(), [Validators.required]),
            projectToEdit: new FormControl<string>('', [Validators.required]),
            taskToEdit: new FormControl<string>('', [Validators.required]),
            hoursToEdit: new FormControl<number>(0, [Validators.required, Validators.min(0)]),
            remarksToEdit: new FormControl<string>('')
        });
    }

    getTotalHoursThisWeek(): number {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));

        return this.timesheets
            .filter(t => t.date >= startOfWeek && t.date <= endOfWeek)
            .reduce((total, t) => total + t.hours, 0);
    }

    getStatusSeverity(status: string): string {
        switch (status) {
            case 'Approved': return 'success';
            case 'Pending': return 'warning';
            case 'Rejected': return 'danger';
            case 'Draft': return 'info';
            default: return 'secondary';
        }
    }

    ngOnDestroy(): void {
        // Cleanup if needed
    }
}
