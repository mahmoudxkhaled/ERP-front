import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { NotificationCategory, NotificationCategoryBackend } from 'src/app/modules/summary/models/notifications.model';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';

type CategoryActionContext = 'list' | 'delete';

@Component({
    selector: 'app-categories-list',
    templateUrl: './categories-list.component.html',
    styleUrls: ['./categories-list.component.scss']
})
export class CategoriesListComponent implements OnInit, OnDestroy {
    categories: NotificationCategory[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    menuItems: MenuItem[] = [];
    currentCategory?: NotificationCategory;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    isSystemAdmin: boolean = false;
    isEntityAdmin: boolean = false;
    currentEntityId: number = 0;

    // Dialog for form
    formDialogVisible: boolean = false;
    formCategoryId?: number;
    isSystemCategory: boolean = true; // true for System, false for Entity

    // Pagination
    lastCategoryId: number = 0;
    totalCount: number = 0;
    filterCount: number = 20;

    // Delete dialog
    deleteCategoryDialog: boolean = false;
    currentCategoryForDelete?: NotificationCategory;

    constructor(
        private notificationsService: NotificationsService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.isLoading$ = this.notificationsService.isLoadingSubject.asObservable();
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
        this.isSystemAdmin = this.notificationsService.isSystemAdmin();
        this.isEntityAdmin = this.notificationsService.isEntityAdmin();
        this.currentEntityId = this.notificationsService.getCurrentEntityId();
    }

    ngOnInit(): void {
        this.configureMenuItems();
        this.loadCategories();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    configureMenuItems(): void {
        this.menuItems = [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => {
                    if (this.currentCategory) {
                        this.viewDetails(this.currentCategory);
                    }
                }
            },
            {
                label: 'Edit',
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.currentCategory) {
                        this.edit(this.currentCategory);
                    }
                }
            },
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                command: () => {
                    if (this.currentCategory) {
                        this.confirmDelete(this.currentCategory);
                    }
                }
            }
        ];
    }

    loadCategories(): void {
        this.tableLoadingSpinner = true;

        if (this.isSystemAdmin) {
            // Load System Categories
            const sub = this.notificationsService.listNotificationCategories(this.lastCategoryId, this.filterCount).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('list', response);
                        return;
                    }

                    const responseData = response?.message || response;
                    this.totalCount = responseData?.Total_Count || 0;
                    const categoriesData = responseData?.Notification_Categories || responseData?.message || [];

                    const systemCategories = Array.isArray(categoriesData) ? categoriesData.map((item: any) => {
                        const categoryBackend = item as NotificationCategoryBackend;
                        return {
                            id: categoryBackend?.Category_ID || 0,
                            typeId: categoryBackend?.Type_ID || 0,
                            title: this.isRegional ? (categoryBackend?.Title_Regional || categoryBackend?.Title || '') : (categoryBackend?.Title || ''),
                            description: this.isRegional ? (categoryBackend?.Description_Regional || categoryBackend?.Description || '') : (categoryBackend?.Description || ''),
                            titleRegional: categoryBackend?.Title_Regional,
                            descriptionRegional: categoryBackend?.Description_Regional,
                            canBeUnsubscribed: Boolean(categoryBackend?.Can_Be_Unsubscribed),
                            entityId: undefined,
                            isSystemCategory: true
                        };
                    }) : [];

                    this.categories = [...this.categories, ...systemCategories];
                },
                error: () => {
                    this.resetLoadingFlags();
                },
                complete: () => {
                    this.resetLoadingFlags();
                }
            });
            this.subscriptions.push(sub);
        }

        if (this.isEntityAdmin && this.currentEntityId > 0) {
            // Load Entity Categories
            const sub = this.notificationsService.listEntityNotificationCategories(this.currentEntityId, this.lastCategoryId, this.filterCount).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('list', response);
                        return;
                    }

                    const responseData = response?.message || response;
                    const categoriesData = responseData?.Notification_Categories || responseData?.message || [];

                    const entityCategories = Array.isArray(categoriesData) ? categoriesData.map((item: any) => {
                        const categoryBackend = item as NotificationCategoryBackend;
                        return {
                            id: categoryBackend?.Category_ID || 0,
                            typeId: categoryBackend?.Type_ID || 0,
                            title: this.isRegional ? (categoryBackend?.Title_Regional || categoryBackend?.Title || '') : (categoryBackend?.Title || ''),
                            description: this.isRegional ? (categoryBackend?.Description_Regional || categoryBackend?.Description || '') : (categoryBackend?.Description || ''),
                            titleRegional: categoryBackend?.Title_Regional,
                            descriptionRegional: categoryBackend?.Description_Regional,
                            canBeUnsubscribed: Boolean(categoryBackend?.Can_Be_Unsubscribed),
                            entityId: categoryBackend?.Entity_ID,
                            isSystemCategory: false
                        };
                    }) : [];

                    this.categories = [...this.categories, ...entityCategories];
                },
                error: () => {
                    this.resetLoadingFlags();
                },
                complete: () => {
                    this.resetLoadingFlags();
                }
            });
            this.subscriptions.push(sub);
        }
    }

    navigateToNew(isSystem: boolean = true): void {
        this.isSystemCategory = isSystem;
        this.formCategoryId = undefined;
        this.formDialogVisible = true;
    }

    edit(category: NotificationCategory): void {
        this.isSystemCategory = category.isSystemCategory;
        this.formCategoryId = category.id;
        this.formDialogVisible = true;
    }

    viewDetails(category: NotificationCategory): void {
        this.router.navigate(['/summary/notifications/categories', category.id]);
    }

    openMenu(menu: any, category: NotificationCategory, event: Event): void {
        this.currentCategory = category;
        menu.toggle(event);
    }

    confirmDelete(category: NotificationCategory): void {
        this.currentCategoryForDelete = category;
        this.deleteCategoryDialog = true;
    }

    deleteCategory(): void {
        if (!this.currentCategoryForDelete) {
            return;
        }

        const category = this.currentCategoryForDelete;
        const sub = category.isSystemCategory
            ? this.notificationsService.deleteNotificationCategory(category.id).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('delete', response);
                        return;
                    }

                    this.categories = this.categories.filter(c => c.id !== category.id);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Category deleted successfully.'
                    });
                    this.deleteCategoryDialog = false;
                    this.currentCategoryForDelete = undefined;
                }
            })
            : this.notificationsService.deleteEntityNotificationCategory(category.id).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('delete', response);
                        return;
                    }

                    this.categories = this.categories.filter(c => c.id !== category.id);
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Category deleted successfully.'
                    });
                    this.deleteCategoryDialog = false;
                    this.currentCategoryForDelete = undefined;
                }
            });

        this.subscriptions.push(sub);
    }

    onFormDialogClose(): void {
        this.formDialogVisible = false;
        this.formCategoryId = undefined;
    }

    onFormSaved(): void {
        this.onFormDialogClose();
        this.lastCategoryId = 0; // Reset pagination
        this.categories = []; // Clear list to reload
        this.loadCategories();
    }

    canManageCategory(category: NotificationCategory): boolean {
        if (category.isSystemCategory) {
            return this.permissionService.canUpdateNotificationCategory() || this.permissionService.canDeleteNotificationCategory();
        } else {
            return this.permissionService.canUpdateEntityNotificationCategory() || this.permissionService.canDeleteEntityNotificationCategory();
        }
    }

    private handleBusinessError(context: CategoryActionContext, response: any): void | null {
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
        switch (code) {
            case 'ERP11455':
                return 'Invalid Entity ID';
            case 'ERP11458':
                return 'Filter_Count must be between 5 and 100';
            default:
                return null;
        }
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11450':
                return 'Invalid Category ID';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }
}
