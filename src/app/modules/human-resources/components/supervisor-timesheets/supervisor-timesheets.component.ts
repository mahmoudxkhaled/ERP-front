import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { IApprovalModel } from '../../models/IApprovalModel';

@Component({
    selector: 'app-supervisor-timesheets',
    templateUrl: './supervisor-timesheets.component.html',
    styleUrls: ['./supervisor-timesheets.component.scss'],
    providers: [MessageService]
})
export class SupervisorTimesheetsComponent implements OnInit, OnDestroy {

    pendingApprovals: IApprovalModel[] = [];
    recentlyApproved: IApprovalModel[] = [];
    menuItems: MenuItem[] = [];

    currentSelected: IApprovalModel = {
        id: '',
        date: new Date(),
        project: '',
        task: '',
        hours: 0,
        remarks: '',
        status: '',
        employeeName: '',
        employeeEmail: '',
        submittedDate: new Date()
    };

    approveDialog: boolean = false;
    rejectDialog: boolean = false;
    tableLoadingSpinner: boolean = false;

    selectedEmployee: string = '';
    selectedPeriod: string = '';

    employeeOptions = [
        { label: 'All Employees', value: '' },
        { label: 'John Smith', value: 'John Smith' },
        { label: 'Sarah Johnson', value: 'Sarah Johnson' },
        { label: 'Mike Wilson', value: 'Mike Wilson' },
        { label: 'Lisa Brown', value: 'Lisa Brown' }
    ];

    periodOptions = [
        { label: 'This Week', value: 'week' },
        { label: 'This Month', value: 'month' },
        { label: 'Last 3 Months', value: 'quarter' },
        { label: 'All Time', value: 'all' }
    ];

    constructor(
        public translate: TranslationService,
        private messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.buildMenuItems();
        this.loadPendingApprovals();
        this.loadRecentlyApproved();
    }

    buildMenuItems() {
        this.menuItems = [
            {
                label: 'Approve',
                icon: 'pi pi-fw pi-check',
                command: () => this.openApproveDialog(this.currentSelected),
            },
            {
                label: 'Reject',
                icon: 'pi pi-fw pi-times',
                command: () => this.openRejectDialog(this.currentSelected),
            }
        ];
    }

    assignCurrent(approval: IApprovalModel) {
        this.currentSelected = approval;
    }

    loadPendingApprovals() {
        this.tableLoadingSpinner = true;

        // Static mock data for pending approvals
        this.pendingApprovals = [
            {
                id: '1',
                date: new Date('2025-01-15'),
                project: 'ERP System',
                task: 'Login Module Development',
                hours: 8,
                remarks: 'Completed user authentication system',
                status: 'Pending',
                employeeName: 'John Smith',
                employeeEmail: 'john@acme.com',
                submittedDate: new Date('2025-01-15')
            },
            {
                id: '2',
                date: new Date('2025-01-14'),
                project: 'HR Portal',
                task: 'Employee Management',
                hours: 6,
                remarks: 'Created employee CRUD operations',
                status: 'Pending',
                employeeName: 'Sarah Johnson',
                employeeEmail: 'sarah@acme.com',
                submittedDate: new Date('2025-01-14')
            },
            {
                id: '3',
                date: new Date('2025-01-13'),
                project: 'Invoicing',
                task: 'Invoice Generation',
                hours: 4,
                remarks: 'Implemented invoice template system',
                status: 'Pending',
                employeeName: 'Mike Wilson',
                employeeEmail: 'mike@global.com',
                submittedDate: new Date('2025-01-13')
            },
            {
                id: '4',
                date: new Date('2025-01-12'),
                project: 'Document Control',
                task: 'File Upload System',
                hours: 7,
                remarks: 'Built secure file upload functionality',
                status: 'Pending',
                employeeName: 'Lisa Brown',
                employeeEmail: 'lisa@techstart.com',
                submittedDate: new Date('2025-01-12')
            }
        ];

        this.tableLoadingSpinner = false;
    }

    loadRecentlyApproved() {
        // Static mock data for recently approved
        this.recentlyApproved = [
            {
                id: '5',
                date: new Date('2025-01-11'),
                project: 'ERP System',
                task: 'Database Optimization',
                hours: 5,
                remarks: 'Optimized database queries for better performance',
                status: 'Approved',
                employeeName: 'John Smith',
                employeeEmail: 'john@acme.com',
                submittedDate: new Date('2025-01-11'),
                approvedDate: new Date('2025-01-11'),
                approvedBy: 'Supervisor'
            },
            {
                id: '6',
                date: new Date('2025-01-10'),
                project: 'HR Portal',
                task: 'Timesheet Module',
                hours: 6,
                remarks: 'Developed timesheet tracking system',
                status: 'Approved',
                employeeName: 'Sarah Johnson',
                employeeEmail: 'sarah@acme.com',
                submittedDate: new Date('2025-01-10'),
                approvedDate: new Date('2025-01-10'),
                approvedBy: 'Supervisor'
            }
        ];
    }

    onGlobalFilter(table: any, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openApproveDialog(approval: IApprovalModel) {
        this.approveDialog = true;
        this.currentSelected = approval;
    }

    openRejectDialog(approval: IApprovalModel) {
        this.rejectDialog = true;
        this.currentSelected = approval;
    }

    approve() {
        const index = this.pendingApprovals.findIndex(a => a.id === this.currentSelected.id);
        if (index !== -1) {
            const approvedEntry = {
                ...this.pendingApprovals[index],
                status: 'Approved',
                approvedDate: new Date(),
                approvedBy: 'Supervisor'
            };

            this.recentlyApproved.unshift(approvedEntry);
            this.pendingApprovals.splice(index, 1);
        }

        this.approveDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Timesheet entry approved successfully',
            life: 3000
        });
    }

    reject() {
        const index = this.pendingApprovals.findIndex(a => a.id === this.currentSelected.id);
        if (index !== -1) {
            this.pendingApprovals[index].status = 'Rejected';
            this.pendingApprovals.splice(index, 1);
        }

        this.rejectDialog = false;
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Timesheet entry rejected successfully',
            life: 3000
        });
    }

    getTotalPendingHours(): number {
        return this.pendingApprovals.reduce((total, approval) => total + approval.hours, 0);
    }

    getTotalApprovedHours(): number {
        return this.recentlyApproved.reduce((total, approval) => total + approval.hours, 0);
    }

    getTotalTeamHours(): number {
        return this.getTotalPendingHours() + this.getTotalApprovedHours();
    }

    getStatusSeverity(status: string): string {
        switch (status) {
            case 'Approved': return 'success';
            case 'Pending': return 'warning';
            case 'Rejected': return 'danger';
            default: return 'secondary';
        }
    }

    filterByEmployee() {
        // Filter logic would be implemented here
        console.log('Filter by employee:', this.selectedEmployee);
    }

    filterByPeriod() {
        // Filter logic would be implemented here
        console.log('Filter by period:', this.selectedPeriod);
    }

    ngOnDestroy(): void {
        // Cleanup if needed
    }
}
