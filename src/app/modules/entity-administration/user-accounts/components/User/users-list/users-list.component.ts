import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { UsersService } from '../../../services/users.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { User, UserBackend } from '../../../models/user.model';
import { IAccountSettings } from 'src/app/core/models/account-status.model';

type UserActionContext = 'list' | 'delete';

@Component({
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit, OnDestroy {
    users: User[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    menuItems: MenuItem[] = [];
    currentUser?: User;
    accountSettings: IAccountSettings;
    deleteUserDialog: boolean = false;
    currentUserForDelete?: User;

    // Search functionality
    searchText: string = '';
    filteredUsers: User[] = [];

    /** When loading and filteredUsers is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): User[] {
        if (this.tableLoadingSpinner && this.filteredUsers.length === 0) {
            return Array(10).fill(null).map(() => ({} as User));
        }
        return this.filteredUsers;
    }

    constructor(
        private usersService: UsersService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoading$ = this.usersService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.configureMenuItems();
        // Note: There's no "List Users" API, so we'll need to get users through accounts
        // For now, we'll create a placeholder that can be enhanced when we have account data
        this.loadUsers();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadUsers(): void {
        // TODO: Since there's no List Users API (only Get_User_Details for individual users),
        // we need to get users through accounts or create a different approach
        // For now, this is a placeholder that will need to be connected to account data
        this.tableLoadingSpinner = true;

        // Placeholder: In a real scenario, you would:
        // 1. Get list of accounts (if available)
        // 2. Extract user IDs from accounts
        // 3. Call getUserDetails for each user ID
        // OR
        // 4. If accounts API returns user data, parse it directly

        // For now, we'll show an empty list with a message
        this.users = [];
        this.applySearchFilter();
        this.tableLoadingSpinner = false;

        this.messageService.add({
            severity: 'info',
            summary: 'Info',
            detail: 'User list functionality will be available once account data is integrated.',
            life: 5000
        });
    }

    onSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.searchText = target?.value || '';
        this.applySearchFilter();
        // Reset to first page when searching
    }

    clearSearch(): void {
        this.searchText = '';
        this.applySearchFilter();
    }

    private applySearchFilter(): void {
        if (!this.searchText || this.searchText.trim() === '') {
            this.filteredUsers = [...this.users];
            return;
        }

        const searchTerm = this.searchText.toLowerCase().trim();
        this.filteredUsers = this.users.filter((user) => {
            const firstNameMatch = user.firstName?.toLowerCase().includes(searchTerm) || false;
            const lastNameMatch = user.lastName?.toLowerCase().includes(searchTerm) || false;
            const idMatch = String(user.id).includes(searchTerm) || false;
            const fullNameMatch = `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm) || false;

            return firstNameMatch || lastNameMatch || idMatch || fullNameMatch;
        });
    }

    edit(user: User): void {
        if (user.id) {
            this.router.navigate(['/company-administration/user-accounts', user.id, 'edit']);
        }
    }

    viewDetails(user: User): void {
        if (user.id) {
            this.router.navigate(['/company-administration/user-accounts', user.id]);
        }
    }

    openMenu(menuRef: any, user: User, event: Event): void {
        this.currentUser = user;
        menuRef.toggle(event);
    }

    confirmDelete(user: User): void {
        this.currentUserForDelete = user;
        this.deleteUserDialog = true;
    }

    onCancelDeleteDialog(): void {
        this.deleteUserDialog = false;
        this.currentUserForDelete = undefined;
    }

    deleteUser(): void {
        if (!this.currentUserForDelete) {
            return;
        }

        const user = this.currentUserForDelete;

        const sub = this.usersService.deleteUser(Number(user.id)).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    this.deleteUserDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `User "${user.firstName} ${user.lastName}" deleted successfully.`,
                    life: 3000
                });
                this.deleteUserDialog = false;
                this.loadUsers();
            },
            complete: () => {
                this.currentUserForDelete = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    navigateToNew(): void {
        this.router.navigate(['/company-administration/user-accounts/new']);
    }

    getUserDisplayName(user: User): string {
        const parts = [user.prefix, user.firstName, user.middleName, user.lastName].filter(p => p);
        return parts.join(' ') || `User #${user.id}`;
    }

    getGenderLabel(gender: boolean): string {
        return gender ? 'Male' : 'Female';
    }

    getStatusSeverity(status: boolean): string {
        return status ? 'success' : 'danger';
    }

    getStatusLabel(status: boolean): string {
        return status ? 'Active' : 'Inactive';
    }

    private configureMenuItems(): void {
        this.menuItems = [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => this.currentUser && this.viewDetails(this.currentUser)
            },
            {
                label: 'Edit',
                icon: 'pi pi-pencil',
                command: () => this.currentUser && this.edit(this.currentUser)
            },
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                command: () => this.currentUser && this.confirmDelete(this.currentUser)
            }
        ];
    }

    private handleBusinessError(context: UserActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'delete':
                detail = this.getDeleteErrorMessage(code) || '';
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

        if (context === 'list') {
            this.resetLoadingFlags();
        }
        return null;
    }

    private getListErrorMessage(code: string): string | null {
        // Get_User_Details (201) has no specific list error codes
        return null;
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11190':
                return 'Invalid User ID';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }
}

