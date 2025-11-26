import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { EntitiesService } from '../../services/entities.service';
import { LocalStorageService } from 'src/app/core/Services/local-storage.service';
import { Entity, EntityBackend, EntitiesListResponse } from '../../models/entities.model';
import { IAccountSettings } from 'src/app/core/models/IAccountStatusResponse';
import { Roles } from 'src/app/core/models/system-roles';

type EntityActionContext = 'list' | 'activate' | 'deactivate' | 'delete';

@Component({
    selector: 'app-entities-list',
    templateUrl: './entities-list.component.html',
    styleUrls: ['./entities-list.component.scss']
})
export class EntitiesListComponent implements OnInit, OnDestroy {
    entities: Entity[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    activationControls: Record<string, FormControl<boolean>> = {};
    menuItems: MenuItem[] = [];
    currentEntity?: Entity;
    accountSettings: IAccountSettings;
    activationEntityDialog: boolean = false;
    currentEntityForActivation?: Entity;
    deleteEntityDialog: boolean = false;
    currentEntityForDelete?: Entity;

    // Pagination state properties
    first: number = 0; // Current first record index
    rows: number = 10; // Number of rows per page
    totalRecords: number = 0; // Total number of entities
    constructor(
        private entitiesService: EntitiesService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.isLoading$ = this.entitiesService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.configureMenuItems();
        this.loadEntities();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadEntities(forceReload: boolean = false): void {
        if (this.entitiesService.isLoadingSubject.value && !forceReload) {
            return;
        }

        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        const isRegional = this.accountSettings?.Language !== 'English';
        this.tableLoadingSpinner = true;

        // Calculate page number from first and rows
        // Mapping: -1 = page 1, -2 = page 2, -3 = page 3, etc.
        // Examples:
        //   first = 0,  rows = 10 -> page = (0/10) + 1 = 1 -> lastEntityId = -1 (page 1)
        //   first = 10, rows = 10 -> page = (10/10) + 1 = 2 -> lastEntityId = -2 (page 2)
        //   first = 20, rows = 10 -> page = (20/10) + 1 = 3 -> lastEntityId = -3 (page 3)
        const currentPage = Math.floor(this.first / this.rows) + 1;
        const lastEntityId = -currentPage; // Convert to negative: page 1 = -1, page 2 = -2, etc.

        // Call service with pagination parameters
        const sub = this.entitiesService.listEntities(lastEntityId, this.rows).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }
                console.log('response', response);
                console.log('response.message', response?.message);
                console.log('response.message["0"]', response?.message?.["0"]);

                // Extract Total_Count from response.message["0"].Total_Count
                // The API returns Total_Count in the "0" key of the message object
                if (response?.message?.["0"]?.Total_Count !== undefined) {
                    // Ensure it's a number, not a string
                    this.totalRecords = Number(response.message["0"].Total_Count);
                    console.log('Total_Count extracted and set to totalRecords:', this.totalRecords);
                } else if (response?.message?.Total_Count !== undefined) {
                    // Fallback: check if Total_Count is directly in message
                    this.totalRecords = Number(response.message.Total_Count);
                    console.log('Total_Count found in message (fallback):', this.totalRecords);
                } else {
                    console.error('Total_Count not found. Available keys in message:', Object.keys(response?.message || {}));
                    console.error('response.message["0"] content:', response?.message?.["0"]);
                    // Don't update totalRecords if Total_Count is not found
                    // This prevents overwriting with incorrect value
                }

                console.log('Final totalRecords value (type:', typeof this.totalRecords, '):', this.totalRecords);

                // Extract entities from response.message, excluding the "0" key which contains Total_Count
                // The API returns entities as keys "1", "2", "8", "11", etc. in the message object
                let entitiesData: any = {};
                if (response?.message) {
                    // Extract all keys except "0" which contains Total_Count
                    const messageData = response.message;
                    entitiesData = {};
                    console.log('Extracting entities from message keys:', Object.keys(messageData));
                    Object.keys(messageData).forEach((key) => {
                        // Skip key "0" (contains Total_Count) and only include entity objects
                        if (key !== "0") {
                            const item = messageData[key];
                            console.log(`Checking key "${key}":`, item, 'Type:', typeof item, 'Has Entity_ID:', item?.Entity_ID !== undefined);
                            if (typeof item === 'object' && item !== null && item.Entity_ID !== undefined) {
                                entitiesData[key] = item;
                                console.log(`Entity added from key "${key}"`);
                            }
                        }
                    });
                    console.log('Final entitiesData keys:', Object.keys(entitiesData));
                    console.log('Number of entities extracted:', Object.keys(entitiesData).length);
                    console.log('entitiesData values:', Object.values(entitiesData));
                }

                console.log('About to map entitiesData. entitiesData:', entitiesData);
                console.log('Object.values(entitiesData):', Object.values(entitiesData));

                this.entities = Object.values(entitiesData).map((item: any) => {
                    console.log('Mapping item:', item);
                    return {
                        id: String(item?.Entity_ID || ''),
                        code: item?.Code || '',
                        name: isRegional ? item?.Name_Regional || '' : item?.Name || '',
                        description: isRegional ? item?.Description_Regional || '' : item?.Description || '',
                        parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
                        active: Boolean(item?.Is_Active),
                        isPersonal: Boolean(item?.Is_Personal)
                    };
                });

                console.log('Final entities array length:', this.entities.length);
                console.log('Final entities:', this.entities);

                this.buildActivationControls();
            },
            complete: () => this.resetLoadingFlags()
        });

        this.subscriptions.push(sub);
    }

    /**
     * Handles page change event from PrimeNG table paginator
     * @param event - PrimeNG pagination event containing first and rows
     */
    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        this.loadEntities(true);
    }

    /**
     * Checks if currently on the first page
     */
    isFirstPage(): boolean {
        return this.first === 0;
    }

    /**
     * Checks if currently on the last page
     */
    isLastPage(): boolean {
        return this.totalRecords > 0 ? this.first + this.rows >= this.totalRecords : true;
    }

    edit(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/company-administration/entities', entity.id, 'edit']);
        }
    }

    viewDetails(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/company-administration/entities', entity.id]);
        }
    }

    addAccount(entity: Entity): void {
        if (entity.id) {
            this.router.navigate(['/company-administration/entities', entity.id, 'add-account']);
        }
    }

    openMenu(menuRef: any, entity: Entity, event: Event): void {
        this.currentEntity = entity;
        menuRef.toggle(event);
    }

    onStatusToggle(entity: Entity): void {
        this.currentEntityForActivation = entity;
        this.activationEntityDialog = true;
    }

    onCancelActivationDialog(): void {
        this.activationEntityDialog = false;
        if (this.currentEntityForActivation) {
            const control = this.activationControls[this.currentEntityForActivation.id];
            if (control) {
                control.setValue(this.currentEntityForActivation.active, { emitEvent: false });
            }
        }
        this.currentEntityForActivation = undefined;
    }

    activation(value: boolean): void {
        if (!this.currentEntityForActivation) {
            return;
        }

        const entity = this.currentEntityForActivation;
        const control = this.activationControls[entity.id];
        if (!control) {
            return;
        }

        control.disable();
        const context: EntityActionContext = value ? 'activate' : 'deactivate';
        const toggle$ = value
            ? this.entitiesService.activateEntity(entity.id)
            : this.entitiesService.deactivateEntity(entity.id);

        const sub = toggle$.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(context, response);
                    control.setValue(!value, { emitEvent: false });
                    this.activationEntityDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: value ? 'Entity activated successfully.' : 'Entity deactivated successfully.',
                    life: 3000
                });
                entity.active = value;
                this.activationEntityDialog = false;
                this.loadEntities(true);
            },
            complete: () => {
                control.enable();
                this.currentEntityForActivation = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    confirmDelete(entity: Entity): void {
        this.currentEntityForDelete = entity;
        this.deleteEntityDialog = true;
    }

    onCancelDeleteDialog(): void {
        this.deleteEntityDialog = false;
        this.currentEntityForDelete = undefined;
    }

    deleteEntity(): void {
        if (!this.currentEntityForDelete) {
            return;
        }

        const entity = this.currentEntityForDelete;

        const sub = this.entitiesService.deleteEntity(entity.id).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    this.deleteEntityDialog = false;
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: `${entity.name} deleted successfully.`,
                    life: 3000
                });
                this.deleteEntityDialog = false;
                this.loadEntities(true);
            },
            complete: () => {
                this.currentEntityForDelete = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    navigateToNew(): void {
        this.router.navigate(['/company-administration/entities/new']);
    }

    onSearchInput(event: Event, table: any): void {
        const target = event.target as HTMLInputElement;
        const searchValue = target?.value || '';
        table.filterGlobal(searchValue, 'contains');
    }

    getTypeLabel(entity: Entity): string {
        return entity.isPersonal ? 'Personal' : 'Organization';
    }

    getTypeSeverity(entity: Entity): 'success' | 'warning' | 'info' | 'danger' | 'secondary' {
        return entity.isPersonal ? 'warning' : 'info';
    }

    getStatusSeverity(status: boolean): string {
        return status ? 'success' : 'danger';
    }

    getStatusLabel(status: boolean): string {
        return status ? 'Active' : 'Inactive';
    }

    getParentLabel(entity: Entity): string {
        return entity.parentEntityId ? `Sub from #${entity.parentEntityId}` : 'Root Entity';
    }

    private buildActivationControls(): void {
        this.activationControls = {};
        this.entities.forEach((entity) => {
            this.activationControls[entity.id] = new FormControl<boolean>(entity.active, { nonNullable: true });
        });
    }

    private configureMenuItems(): void {
        // Get user role to determine if "Add Account" should be shown
        // SystemAdmin (2) OR EntityAdmin (3) can add accounts
        // System_Role_ID is in AccountDetails, not AccountSettings
        const accountDetails = this.localStorageService.getAccountDetails();
        const systemRoleId = accountDetails?.System_Role_ID || 0;
        const canAddAccount = systemRoleId === 2 || systemRoleId === 3; // SystemAdmin OR EntityAdmin

        this.menuItems = [
            {
                label: 'View Details',
                icon: 'pi pi-eye',
                command: () => this.currentEntity && this.viewDetails(this.currentEntity)
            },
            {
                label: 'Edit',
                icon: 'pi pi-user-edit',
                command: () => this.currentEntity && this.edit(this.currentEntity)
            },
            ...(canAddAccount ? [{
                label: 'Add Account',
                icon: 'pi pi-user-plus',
                command: () => this.currentEntity && this.addAccount(this.currentEntity)
            }] : []),
            {
                label: 'Delete',
                icon: 'pi pi-trash',
                command: () => this.currentEntity && this.confirmDelete(this.currentEntity)
            }
        ];
    }

    private handleBusinessError(context: EntityActionContext, response: any): void {
        const code = String(response?.message || '');
        console.log('code', code);
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code);
                break;
            case 'activate':
                detail = this.getActivateErrorMessage(code);
                break;
            case 'deactivate':
                detail = this.getDeactivateErrorMessage(code);
                break;
            case 'delete':
                detail = this.getDeleteErrorMessage(code);
                break;
            default:
                detail = 'An unexpected error occurred. Please try again.';
        }

        this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail
        });

        if (context === 'list') {
            this.resetLoadingFlags();
        }
    }

    private getListErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11255':
                return 'Invalid value for the Filter_Count parameter. Should be a minimum of 10 records and a maximum of 100 records.';
            default:
                return 'An error occurred while loading entities. Please try again.';
        }
    }

    private getActivateErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid entity selected.';
            case 'ERP11261':
                return 'Parent entities cannot be activated or deactivated from this screen.';
            case 'ERP11262':
                return 'Entity is already active.';
            default:
                return 'Session expired. Please login again.';
        }
    }

    private getDeactivateErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid entity selected.';
            case 'ERP11261':
                return 'Parent entities cannot be activated or deactivated from this screen.';
            case 'ERP11263':
                return 'Entity is already inactive.';
            default:
                return 'Session expired. Please login again.';
        }
    }

    private getDeleteErrorMessage(code: string): string {
        switch (code) {
            case 'ERP11260':
                return 'Invalid entity selected.';
            case 'ERP11270':
                return 'Entity cannot be removed because it still has data.';
            default:
                return 'Session expired. Please login again.';
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }
}

